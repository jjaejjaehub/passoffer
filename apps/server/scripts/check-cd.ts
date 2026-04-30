import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { listedProducts, masterProducts } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const id = process.argv[2] ?? 'c4c8c66f-5ceb-4480-9243-a19810a6a3ef';
const [lp] = await db.select().from(listedProducts).where(eq(listedProducts.id, id));
console.log('channelItemCode:', lp?.channelItemCode);
console.log('syncStatus:', lp?.syncStatus);
console.log('channelData keys:', Object.keys((lp?.channelData as Record<string, unknown> | null) ?? {}));
console.log('channelData:', JSON.stringify(lp?.channelData, null, 2));

if (lp?.masterProductId) {
  const [mp] = await db.select().from(masterProducts).where(eq(masterProducts.id, lp.masterProductId));
  console.log('master.attributes:', JSON.stringify(mp?.attributes, null, 2));
}

await pool.end();
