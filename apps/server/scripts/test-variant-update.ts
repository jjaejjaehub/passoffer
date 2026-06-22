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

const [chan] = await db
  .select()
  .from(channels)
  .where(eq(channels.channelType, "SHOPIFY"));
const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(
    and(
      eq(channelCredentials.channelId, chan!.id),
      eq(channelCredentials.credentialType, "OAUTH"),
    ),
  );
const parsed = JSON.parse(decrypt(cred!.encryptedValue)) as {
  shopDomain?: string;
  accessToken?: string;
};

async function gql(query: string, variables?: unknown) {
  const res = await fetch(
    `https://${parsed.shopDomain}/admin/api/2025-04/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": parsed.accessToken ?? "",
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  return res.json();
}

const productId = "gid://shopify/Product/14959845212523";
const variantId = "gid://shopify/ProductVariant/53146174554475";

const mutation = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price sku }
      userErrors { field message code }
    }
  }
`;

const variants = [
  {
    id: variantId,
    price: "1000.00",
    inventoryItem: { sku: "Q10-TEST-01", tracked: true },
  },
];

console.log("Sending:", JSON.stringify({ productId, variants }, null, 2));
const result = await gql(mutation, { productId, variants });
console.log("Result:", JSON.stringify(result, null, 2));

await pool.end();
