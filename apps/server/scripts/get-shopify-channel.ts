import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { channels } from "../src/db/schema";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const [c] = await db
  .select()
  .from(channels)
  .where(eq(channels.channelType, "SHOPIFY"));
console.log(c?.id);
await pool.end();
