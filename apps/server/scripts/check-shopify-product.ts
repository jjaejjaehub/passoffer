import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { and, eq } from 'drizzle-orm';
import { createDecipheriv } from 'node:crypto';
import { channels, channelCredentials } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const ALGORITHM = 'aes-256-gcm';
function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error('Invalid ciphertext format');
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const key = Buffer.from(secret, 'utf8').subarray(0, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
}

const productGid = process.argv[2] ?? 'gid://shopify/Product/14959845212523';

const [chan] = await db.select().from(channels).where(eq(channels.channelType, 'SHOPIFY'));
if (!chan) throw new Error('No SHOPIFY channel');
const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(and(eq(channelCredentials.channelId, chan.id), eq(channelCredentials.credentialType, 'OAUTH')));
if (!cred) throw new Error('No SHOPIFY credential');
const parsed = JSON.parse(decrypt(cred.encryptedValue)) as { shopDomain?: string; accessToken?: string };

const query = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      status
      variants(first: 10) {
        nodes {
          id
          sku
          price
          compareAtPrice
          inventoryItem {
            id
            tracked
            inventoryLevels(first: 10) {
              nodes {
                location { id name shipsInventory fulfillsOnlineOrders }
                quantities(names: ["available","on_hand"]) { name quantity }
              }
            }
          }
        }
      }
    }
  }
`;

const res = await fetch(`https://${parsed.shopDomain}/admin/api/2025-04/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': parsed.accessToken ?? '' },
  body: JSON.stringify({ query, variables: { id: productGid } }),
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));

await pool.end();
