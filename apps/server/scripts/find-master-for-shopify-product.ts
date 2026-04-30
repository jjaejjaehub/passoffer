import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import {
  channels,
  listedProducts,
  listedProductVariantLinks,
  masterProducts,
  masterProductVariants,
} from '../src/db/schema';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const target = 'gid://shopify/Product/14960024322411';
const [chan] = await db.select().from(channels).where(eq(channels.channelType, 'SHOPIFY'));
const lps = await db
  .select()
  .from(listedProducts)
  .where(and(eq(listedProducts.channelId, chan!.id), eq(listedProducts.channelItemId, target)));
console.log('[listedProducts]', lps.map((l) => ({ id: l.id, masterProductId: l.masterProductId, channelItemId: l.channelItemId })));

for (const lp of lps) {
  if (lp.masterProductId) {
    const [mp] = await db.select().from(masterProducts).where(eq(masterProducts.id, lp.masterProductId));
    console.log('[masterProduct]', mp && { id: mp.id, code: mp.code, title: mp.title });
    const mvs = await db.select().from(masterProductVariants).where(eq(masterProductVariants.masterProductId, lp.masterProductId));
    console.log('[masterVariants]', mvs.map((v) => ({ id: v.id, sku: v.sku, optionName: v.optionName, optionValue: v.optionValue, stock: v.stock })));
  }
  const links = await db.select().from(listedProductVariantLinks).where(eq(listedProductVariantLinks.listedProductId, lp.id));
  console.log('[variantLinks]', links);
}
await pool.end();
