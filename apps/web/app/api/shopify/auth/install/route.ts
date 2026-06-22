/**
 * POST /api/shopify/auth/install
 *
 * Shopify OAuth 플로우 시작.
 * 1. shopDomain / clientId / clientSecret 을 암호화해 쿠키에 저장
 * 2. Shopify 인증 페이지로 리다이렉트
 *
 * body: { shopDomain, clientId, clientSecret }
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

const SCOPES = [
  "read_orders",
  "write_orders",
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_returns",
  "write_returns",
  "read_fulfillments",
  "write_fulfillments",
  "read_customers",
].join(",");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/shopify/auth/callback`;

interface InstallBody {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: InstallBody;
  try {
    body = (await req.json()) as InstallBody;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  // https:// 접두사와 trailing slash 제거
  const shopDomain = body.shopDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const { clientId, clientSecret } = body;

  if (!shopDomain || !clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: "MISSING_FIELDS",
        message: "shopDomain, clientId, clientSecret 모두 필요합니다.",
      },
      { status: 400 },
    );
  }

  // CSRF 방지용 state nonce 생성
  const state = crypto.randomBytes(16).toString("hex");

  // 임시 쿠키에 credentials + state 저장 (5분 TTL)
  const cookieValue = Buffer.from(
    JSON.stringify({ shopDomain, clientId, clientSecret, state }),
  ).toString("base64");

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}`;

  const res = NextResponse.json({ redirectUrl: authUrl });
  res.cookies.set("shopify_oauth_pending", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5분
    path: "/",
  });

  return res;
}
