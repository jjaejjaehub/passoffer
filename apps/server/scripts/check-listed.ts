import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { listedProducts, masterProducts } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const masterCode = process.argv[2] ?? 'Q10-TEST-01';
const [mp] = await db.select().from(masterProducts).where(eq(masterProducts.code, masterCode));
console.log('master:', { id: mp?.id, code: mp?.code, title: mp?.title });

if (mp) {
  const lps = await db.select().from(listedProducts).where(eq(listedProducts.masterProductId, mp.id));
  console.log('listed_products count:', lps.length);
  for (const lp of lps) {
    console.log({
      id: lp.id,
      channelItemCode: lp.channelItemCode,
      status: lp.status,
      syncStatus: lp.syncStatus,
      updatedAt: lp.updatedAt,
      lastSyncedAt: lp.lastSyncedAt,
    });
  }
}

await pool.end();
