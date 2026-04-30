/**
 * POST /api/shopify/auth/refresh
 *
 * Shopify expiring offline token 갱신 프록시.
 * - 백엔드(외부 API)에 refreshToken이 없을 때 Next.js 레이어에서 직접 처리
 * - 요청: { shopDomain, clientId, clientSecret, refreshToken }
 * - 응답: { accessToken, refreshToken, expiresIn }
 *
 * Shopify refresh endpoint:
 *   POST https://{shop}/admin/oauth/access_token
 *   grant_type=refresh_token
 *   ref: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RefreshRequestBody {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface ShopifyRefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: RefreshRequestBody;
  try {
    body = (await req.json()) as RefreshRequestBody;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { shopDomain, clientId, clientSecret, refreshToken } = body;

  if (!shopDomain || !clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      { error: "MISSING_FIELDS", message: "shopDomain, clientId, clientSecret, refreshToken 모두 필요합니다." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  let shopifyRes: Response;
  try {
    shopifyRes = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "NETWORK_ERROR", message: "Shopify 서버에 연결할 수 없습니다." },
      { status: 503 },
    );
  }

  const data = (await shopifyRes.json()) as ShopifyRefreshResponse;

  if (!shopifyRes.ok || !data.access_token) {
    const message = data.error_description ?? data.error ?? "토큰 갱신에 실패했습니다.";
    return NextResponse.json(
      { error: "REFRESH_FAILED", message },
      { status: shopifyRes.status },
    );
  }

  return NextResponse.json({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // 새 refresh_token 없으면 기존 유지
    expiresIn: data.expires_in ?? 3600,
  });
}
