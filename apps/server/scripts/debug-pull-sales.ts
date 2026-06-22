import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq } from "drizzle-orm";
import { createDecipheriv } from "node:crypto";
import {
  channels,
  channelCredentials,
  listedProducts,
  masterProducts,
  masterProductVariants,
} from "../src/db/schema";

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

const code = process.argv[2] ?? "Q10-TEST-01";
const [mp] = await db
  .select()
  .from(masterProducts)
  .where(eq(masterProducts.code, code));
if (!mp) {
  console.error("no master");
  process.exit(1);
}

const variants = await db
  .select()
  .from(masterProductVariants)
  .where(eq(masterProductVariants.masterProductId, mp.id));
console.log("master_product_variants:");
for (const v of variants) console.log({ id: v.id, sku: v.sku, stock: v.stock });

const [lp] = await db
  .select()
  .from(listedProducts)
  .where(eq(listedProducts.masterProductId, mp.id));
if (!lp) {
  console.error("no listed product");
  process.exit(1);
}

const cd = (lp.channelData as Record<string, unknown> | null) ?? {};
console.log("\nlisted_product channelData keys:", Object.keys(cd));
console.log("  _lastSalesPullAt:", cd["_lastSalesPullAt"]);
console.log(
  "  _processedOrderIds count:",
  Array.isArray(cd["_processedOrderIds"])
    ? (cd["_processedOrderIds"] as unknown[]).length
    : "n/a",
);
console.log("  channelItemCode:", lp.channelItemCode);

const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(
    and(
      eq(channelCredentials.channelId, lp.channelId),
      eq(channelCredentials.credentialType, "OAUTH"),
    ),
  );
const [chan] = await db
  .select()
  .from(channels)
  .where(eq(channels.id, lp.channelId));
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

console.log("\nchannel:", chan?.name, chan?.channelType);

// 최근 주문 조회 (필터 없음)
const ordersQuery = `
  query($first: Int!, $query: String) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id name createdAt displayFinancialStatus displayFulfillmentStatus
        lineItems(first: 50) { nodes { title quantity sku variant { sku } } }
      }
    }
  }
`;

// 최근 30일
const now = new Date();
const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const fmt = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const queryString = `created_at:>=${fmt(start)} AND created_at:<=${fmt(now)}`;
console.log("\nshopify orders query:", queryString);

const res = (await gql(ordersQuery, { first: 20, query: queryString })) as {
  data?: { orders?: { nodes?: Array<Record<string, unknown>> } };
  errors?: unknown;
};
console.log("errors:", JSON.stringify(res.errors));
const nodes = res.data?.orders?.nodes ?? [];
console.log(`orders found: ${nodes.length}`);
for (const o of nodes) {
  const lis =
    (o["lineItems"] as { nodes?: Array<Record<string, unknown>> } | undefined)
      ?.nodes ?? [];
  console.log("---");
  console.log({
    id: o["id"],
    name: o["name"],
    createdAt: o["createdAt"],
    fin: o["displayFinancialStatus"],
    ful: o["displayFulfillmentStatus"],
  });
  for (const li of lis) {
    console.log("  line item:", {
      title: li["title"],
      qty: li["quantity"],
      directSku: li["sku"],
      variantSku: (li["variant"] as { sku?: string } | undefined)?.sku,
    });
  }
}

await pool.end();
