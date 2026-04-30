import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { listedProducts } from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const listedId = process.argv[2] ?? 'c4c8c66f-5ceb-4480-9243-a19810a6a3ef';

const [lp] = await db.select().from(listedProducts).where(eq(listedProducts.id, listedId));
if (!lp) {
  console.log('not found');
  await pool.end();
  process.exit(0);
}

const cd = (lp.channelData as Record<string, unknown> | null) ?? {};
const cleaned = { ...cd };
delete cleaned.handle;
delete cleaned._error;

await db
  .update(listedProducts)
  .set({ channelData: cleaned, updatedAt: new Date() })
  .where(eq(listedProducts.id, listedId));

console.log('cleaned channelData (removed handle, _error). before keys:', Object.keys(cd), 'after keys:', Object.keys(cleaned));

await pool.end();
