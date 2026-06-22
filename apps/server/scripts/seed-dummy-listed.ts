/**
 * 더미 마스터 상품 1개 생성 + Qoo10/Shopify 채널에 등록
 *
 * 사용:
 *   bun run apps/server/scripts/seed-dummy-listed.ts
 */
const baseUrl = process.env.API_BASE ?? "http://localhost:4000";
const email = process.env.SEED_EMAIL ?? "jjaejjaehub@gmail.com";
const password = process.env.SEED_PASSWORD ?? "qwer1234";

// jjaejjaehub@gmail.com 소유 채널
const QOO10_CHANNEL_ID = "f6085522-9a57-44ff-aaa5-53617b9cfef5";
const SHOPIFY_CHANNEL_ID = "0c67439e-70cc-469a-9425-f1b9f99237b0";

let token = "";

async function rawPost(
  path: string,
  body: unknown,
  auth = true,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function loginOrSignup(): Promise<void> {
  const res = await rawPost("/api/auth/login", { email, password }, false);
  if (!res.ok)
    throw new Error(`로그인 실패 (${res.status}): ${await res.text()}`);
  token = ((await res.json()) as { token: string }).token;
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${method} ${path}] ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

await loginOrSignup();
console.log("✓ 로그인:", email);

const code = `LISTED-DUMMY-${Date.now()}`;
const master = await call<{ id: string; code: string }>(
  "POST",
  "/api/master-products",
  {
    code,
    title: "채널 등록용 더미 티셔츠",
    brand: "DUMMY BRAND",
    retailPrice: "35000",
    hsCode: "6109.10",
    countryOfOrigin: "KR",
    material: "면 100%",
    weightG: 250,
    tags: ["더미", "티셔츠", "테스트"],
    descriptionHtml: "<p>채널 등록 테스트용 더미 상품입니다.</p>",
  },
);
console.log("✓ 마스터 상품 생성:", master.code, "/", master.id);

const colors = ["블랙", "화이트"];
const sizes = ["S", "M", "L"];

await call("PUT", `/api/master-products/${master.id}/option-groups`, {
  groups: [
    { name: "색상", values: colors },
    { name: "사이즈", values: sizes },
  ],
});
console.log("✓ 옵션 그룹: 색상×사이즈");

let stock = 20;
for (const color of colors) {
  for (const size of sizes) {
    await call("POST", `/api/master-products/${master.id}/variants`, {
      sku: `${code}-${color}-${size}`,
      stock,
      optionValues: [
        { groupName: "색상", value: color },
        { groupName: "사이즈", value: size },
      ],
    });
    stock += 5;
  }
}
console.log("✓ variant 6개 등록");

console.log("▶ Qoo10 채널 등록...");
const qoo10Listed = await call<{ id: string }>(
  "POST",
  `/api/master-products/${master.id}/list`,
  {
    channelId: QOO10_CHANNEL_ID,
    overrides: {
      SecondSubCat: "300003249", // メンズファッション > トップス > Tシャツ
      ProductionPlaceType: "2", // 해외
      ProductionPlace: "Korea",
      ItemPrice: "3500", // JPY
      RetailPrice: "3500",
      ItemQty: "99",
      AvailableDateType: "0",
      AvailableDateValue: "1",
      ShippingNo: "0",
      TaxRate: "10",
      Condition: "NEW",
      BrandNo: "0",
    },
  },
);
console.log("✓ Qoo10 listed product ID:", qoo10Listed.id);

console.log("▶ Shopify 채널 등록...");
const shopifyListed = await call<{ id: string }>(
  "POST",
  `/api/master-products/${master.id}/list`,
  {
    channelId: SHOPIFY_CHANNEL_ID,
  },
);
console.log("✓ Shopify listed product ID:", shopifyListed.id);

console.log(`\n✓ 완료 — 마스터 상품 ID: ${master.id}`);
