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

const productGid = process.argv[2] ?? 'gid://shopify/Product/14960024322411';
const newQuantity = Number(process.argv[3] ?? '777');

const [chan] = await db.select().from(channels).where(eq(channels.channelType, 'SHOPIFY'));
if (!chan) throw new Error('No SHOPIFY channel');
const [cred] = await db
  .select()
  .from(channelCredentials)
  .where(and(eq(channelCredentials.channelId, chan.id), eq(channelCredentials.credentialType, 'OAUTH')));
if (!cred) throw new Error('No SHOPIFY credential');
const parsed = JSON.parse(decrypt(cred.encryptedValue)) as { shopDomain?: string; accessToken?: string };
const endpoint = `https://${parsed.shopDomain}/admin/api/2025-04/graphql.json`;
const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': parsed.accessToken ?? '' };

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return (await r.json()) as T;
}

// 1) primary location (id 미지정 → shop의 primary location)
const locRes = await gql<{ data?: { location?: { id: string; name: string; isActive: boolean } }; errors?: unknown }>(
  `query { location { id name isActive } }`,
);
console.log('[primary location]', JSON.stringify(locRes, null, 2));
const locationId = locRes.data?.location?.id;
if (!locationId) throw new Error('No primary location');

// 2) 상품의 variant + inventoryItem id + 현재 재고
const lookup = await gql<{
  data?: {
    product?: {
      id: string;
      title: string;
      variants: {
        nodes: Array<{
          id: string;
          inventoryQuantity: number;
          inventoryItem: { id: string; tracked: boolean };
        }>;
      };
    };
  };
  errors?: unknown;
}>(
  `query($id: ID!) {
    product(id: $id) {
      id title
      variants(first: 10) {
        nodes {
          id
          inventoryQuantity
          inventoryItem { id tracked }
        }
      }
    }
  }`,
  { id: productGid },
);
console.log('[before]', JSON.stringify(lookup, null, 2));
const variantNodes = lookup.data?.product?.variants?.nodes ?? [];
if (variantNodes.length === 0) throw new Error('No variants on product');
const target = variantNodes[0];
if (!target.inventoryItem?.tracked) {
  console.warn('[warn] inventoryItem.tracked === false → set to tracked=true 권장');
}

// 3) inventorySetQuantities (compare-and-swap 회피)
const setRes = await gql<{
  data?: {
    inventorySetQuantities?: {
      inventoryAdjustmentGroup: { reason: string; changes: Array<{ name: string; delta: number; quantityAfterChange: number | null }> } | null;
      userErrors: Array<{ code?: string; field?: string[]; message: string }>;
    };
  };
  errors?: unknown;
}>(
  `mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        reason
        changes { name delta quantityAfterChange }
      }
      userErrors { code field message }
    }
  }`,
  {
    input: {
      name: 'available',
      reason: 'correction',
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId: target.inventoryItem.id,
          locationId,
          quantity: newQuantity,
        },
      ],
    },
  },
);
console.log('[set result]', JSON.stringify(setRes, null, 2));

// 4) 검증
const verify = await gql<{
  data?: { product?: { variants: { nodes: Array<{ id: string; inventoryQuantity: number }> } } };
}>(
  `query($id: ID!) {
    product(id: $id) {
      variants(first: 10) { nodes { id inventoryQuantity } }
    }
  }`,
  { id: productGid },
);
console.log('[after]', JSON.stringify(verify, null, 2));

await pool.end();
