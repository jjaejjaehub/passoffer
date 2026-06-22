/**
 * GET /api/shopify/auth/callback
 *
 * Shopify OAuth 콜백 처리:
 * 1. HMAC 서명 검증
 * 2. 쿠키에서 credentials + state 복원
 * 3. authorization_code → access_token 교환
 * 4. 서버 PUT /api/channels/shopify 로 토큰 저장
 * 5. /channels 로 리다이렉트
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function verifyHmac(params: URLSearchParams, clientSecret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hmac") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");

  const digest = crypto
    .createHmac("sha256", clientSecret)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !shop || !state) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  // 쿠키에서 OAuth 시작 시 저장한 credentials 복원
  const pendingCookie = req.cookies.get("shopify_oauth_pending")?.value;
  if (!pendingCookie) {
    return NextResponse.json(
      {
        error: "SESSION_EXPIRED",
        message: "OAuth 세션이 만료되었습니다. 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }

  let pending: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    state: string;
  };
  try {
    pending = JSON.parse(
      Buffer.from(pendingCookie, "base64").toString("utf-8"),
    );
  } catch {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 400 });
  }

  // CSRF 방지: state 검증
  if (state !== pending.state) {
    return NextResponse.json({ error: "STATE_MISMATCH" }, { status: 403 });
  }

  // shop 도메인 검증
  if (shop !== pending.shopDomain) {
    return NextResponse.json({ error: "SHOP_MISMATCH" }, { status: 403 });
  }

  // HMAC 서명 검증
  if (!verifyHmac(searchParams, pending.clientSecret)) {
    return NextResponse.json({ error: "HMAC_INVALID" }, { status: 403 });
  }

  // authorization code → access token 교환
  let shopifyTokenRes: Response;
  try {
    shopifyTokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: pending.clientId,
        client_secret: pending.clientSecret,
        code,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "NETWORK_ERROR", message: "Shopify 서버에 연결할 수 없습니다." },
      { status: 503 },
    );
  }

  const tokenData = (await shopifyTokenRes.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!shopifyTokenRes.ok || !tokenData.access_token) {
    const message =
      tokenData.error_description ??
      tokenData.error ??
      "토큰 교환에 실패했습니다.";
    return NextResponse.json(
      { error: "TOKEN_EXCHANGE_FAILED", message },
      { status: 400 },
    );
  }

  // JWT 쿠키에서 사용자 토큰 가져오기
  const authToken = req.cookies.get("oms-auth-token")?.value;
  if (!authToken) {
    const redirectUrl = new URL("/login", APP_URL);
    redirectUrl.searchParams.set("from", "/settings/channels");
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.delete("shopify_oauth_pending");
    return res;
  }

  // 서버에 Shopify 채널 저장
  const saveRes = await fetch(`${API_URL}/api/channels/shopify`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      shopDomain: shop,
      clientId: pending.clientId,
      clientSecret: pending.clientSecret,
      accessToken: tokenData.access_token,
    }),
  });

  if (!saveRes.ok) {
    const err = (await saveRes.json().catch(() => ({}))) as {
      message?: string;
    };
    return NextResponse.json(
      {
        error: "SAVE_FAILED",
        message: err.message ?? "채널 저장에 실패했습니다.",
      },
      { status: 500 },
    );
  }

  // 쿠키 정리 후 채널 관리 페이지로 리다이렉트
  const res = NextResponse.redirect(
    new URL("/settings/channels?shopify=connected", APP_URL),
  );
  res.cookies.delete("shopify_oauth_pending");
  return res;
}
