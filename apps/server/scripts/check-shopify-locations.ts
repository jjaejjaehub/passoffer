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
if (!chan) {
  console.error("No SHOPIFY channel");
  process.exit(1);
}

const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(
    and(
      eq(channelCredentials.channelId, chan.id),
      eq(channelCredentials.credentialType, "OAUTH"),
    ),
  );
if (!cred) {
  console.error("No SHOPIFY credential");
  process.exit(1);
}

const parsed = JSON.parse(decrypt(cred.encryptedValue)) as {
  shopDomain?: string;
  accessToken?: string;
};
const shopDomain = parsed.shopDomain;
const accessToken = parsed.accessToken;
console.log("shopDomain:", shopDomain);
if (!shopDomain || !accessToken) process.exit(1);

const query = `
  query {
    locations(first: 20) {
      nodes {
        id
        name
        fulfillsOnlineOrders
        isActive
        shipsInventory
      }
    }
  }
`;

const res = await fetch(
  `https://${shopDomain}/admin/api/2025-04/graphql.json`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  },
);
const json = (await res.json()) as {
  data?: { locations?: { nodes?: Array<Record<string, unknown>> } };
  errors?: unknown;
};
console.log("errors:", JSON.stringify(json.errors));
console.log("locations:");
for (const n of json.data?.locations?.nodes ?? []) {
  console.log(JSON.stringify(n));
}

await pool.end();
