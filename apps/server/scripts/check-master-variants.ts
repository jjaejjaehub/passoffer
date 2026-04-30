import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { masterProducts, masterProductVariants } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const code = process.argv[2] ?? 'Q10-TEST-01';
const [mp] = await db.select().from(masterProducts).where(eq(masterProducts.code, code));
console.log('master:', { id: mp?.id, code: mp?.code, retailPrice: mp?.retailPrice });

if (mp) {
  const vs = await db.select().from(masterProductVariants).where(eq(masterProductVariants.masterProductId, mp.id));
  console.log('variants count:', vs.length);
  for (const v of vs) {
    console.log({ id: v.id, sku: v.sku, optionValue: v.optionValue, price: v.price, stock: v.stock });
  }
}

await pool.end();
