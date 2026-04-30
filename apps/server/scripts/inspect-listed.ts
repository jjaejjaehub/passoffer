import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { listedProducts, masterProducts } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const listedId = process.argv[2] ?? 'c4c8c66f-5ceb-4480-9243-a19810a6a3ef';

const [lp] = await db
  .select()
  .from(listedProducts)
  .where(eq(listedProducts.id, listedId));

console.log('===== LISTED PRODUCT =====');
console.log(
  JSON.stringify(
    {
      id: lp?.id,
      masterProductId: lp?.masterProductId,
      channelId: lp?.channelId,
      channelItemCode: lp?.channelItemCode,
      status: lp?.status,
      channelData: lp?.channelData,
    },
    null,
    2,
  ),
);

if (lp?.masterProductId) {
  const [mp] = await db
    .select()
    .from(masterProducts)
    .where(eq(masterProducts.id, lp.masterProductId));
  console.log('\n===== MASTER PRODUCT =====');
  console.log(
    JSON.stringify(
      {
        id: mp?.id,
        code: mp?.code,
        title: mp?.title,
        images: mp?.images,
        attributes: mp?.attributes,
      },
      null,
      2,
    ),
  );
}

await pool.end();
