/**
 * Verify Shopify product has all variants
 * bun run apps/server/scripts/verify-shopify-variants.ts <masterProductId> <shopifyProductGid>
 */
const baseUrl = process.env.API_BASE ?? "http://localhost:4000";
const email = process.env.SEED_EMAIL ?? "jjaejjaehub@gmail.com";
const password = process.env.SEED_PASSWORD ?? "qwer1234";

const MASTER_ID = process.argv[2] ?? "909a7561-9177-4b34-b36e-9452a4b5d4da";
const SHOPIFY_GID = process.argv[3] ?? "gid://shopify/Product/14970169983339";

const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { token } = (await loginRes.json()) as { token: string };

// Use server's shopify-query endpoint if exists, otherwise just check master product
const res = await fetch(`${baseUrl}/api/master-products/${MASTER_ID}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = (await res.json()) as any;
console.log("Listed products:", JSON.stringify(data.listedProducts, null, 2));
console.log("Variants from master:", data.variants?.length ?? 0);
data.variants?.forEach((v: any) =>
  console.log(
    " -",
    v.sku,
    v.optionValues?.map((o: any) => o.value).join("/") ?? "",
  ),
);
