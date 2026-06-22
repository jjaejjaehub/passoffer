import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq } from "drizzle-orm";
import { createDecipheriv } from "node:crypto";
import { channels, channelCredentials } from "../src/db/schema";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const ALGORITHM = "aes-256-gcm";
function decrypt(c: string): string {
  const [ivHex, tagHex, encHex] = c.split(":");
  const secret = process.env.ENCRYPTION_SECRET!;
  const key = Buffer.from(secret, "utf8").subarray(0, 32);
  const d = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    d.update(Buffer.from(encHex, "hex"), undefined, "utf8") + d.final("utf8")
  );
}
const productGid = process.argv[2] ?? "gid://shopify/Product/14960024322411";
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
const p = JSON.parse(decrypt(cred!.encryptedValue)) as {
  shopDomain?: string;
  accessToken?: string;
};
const r = await fetch(
  `https://${p.shopDomain}/admin/api/2025-04/graphql.json`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": p.accessToken!,
    },
    body: JSON.stringify({
      query: `query($id:ID!){product(id:$id){variants(first:5){nodes{id inventoryQuantity}}}}`,
      variables: { id: productGid },
    }),
  },
);
console.log(JSON.stringify(await r.json(), null, 2));
await pool.end();
