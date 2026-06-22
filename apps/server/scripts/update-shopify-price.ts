import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq } from "drizzle-orm";
import { createDecipheriv } from "node:crypto";
import { channels, channelCredentials } from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const ALGORITHM = "aes-256-gcm";
function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !encryptedHex)
    throw new Error("Invalid ciphertext format");
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET not set");
  const key = Buffer.from(secret, "utf8").subarray(0, 32);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return (
    decipher.update(Buffer.from(encryptedHex, "hex"), undefined, "utf8") +
    decipher.final("utf8")
  );
}

const productGid = process.argv[2] ?? "gid://shopify/Product/14960024322411";
const newPrice = process.argv[3] ?? "1000";

const [chan] = await db
  .select()
  .from(channels)
  .where(eq(channels.channelType, "SHOPIFY"));
if (!chan) throw new Error("No SHOPIFY channel");
const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(
    and(
      eq(channelCredentials.channelId, chan.id),
      eq(channelCredentials.credentialType, "OAUTH"),
    ),
  );
if (!cred) throw new Error("No SHOPIFY credential");
const parsed = JSON.parse(decrypt(cred.encryptedValue)) as {
  shopDomain?: string;
  accessToken?: string;
};
const endpoint = `https://${parsed.shopDomain}/admin/api/2025-04/graphql.json`;
const headers = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": parsed.accessToken ?? "",
};

// 1) variant id 조회
const lookup = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    query: `query($id: ID!) { product(id:$id){ id title variants(first:10){ nodes { id price } } } }`,
    variables: { id: productGid },
  }),
}).then((r) => r.json());
console.log("[before]", JSON.stringify(lookup, null, 2));

const variantNodes = lookup?.data?.product?.variants?.nodes ?? [];
if (variantNodes.length === 0) throw new Error("No variants on product");

// 2) bulk update
const mutation = `
  mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }
`;
const updateRes = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    query: mutation,
    variables: {
      productId: productGid,
      variants: variantNodes.map((v: { id: string }) => ({
        id: v.id,
        price: newPrice,
      })),
    },
  }),
}).then((r) => r.json());
console.log("[update]", JSON.stringify(updateRes, null, 2));

// 3) verify
const verify = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    query: `query($id: ID!) { product(id:$id){ id title variants(first:10){ nodes { id price } } } }`,
    variables: { id: productGid },
  }),
}).then((r) => r.json());
console.log("[after]", JSON.stringify(verify, null, 2));

await pool.end();
