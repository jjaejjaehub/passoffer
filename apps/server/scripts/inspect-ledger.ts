import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { desc, eq } from "drizzle-orm";
import {
  listedProducts,
  masterProducts,
  masterProductVariants,
  masterStockLedger,
} from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const code = process.argv[2] ?? "Q10-TEST-01";
const [mp] = await db
  .select()
  .from(masterProducts)
  .where(eq(masterProducts.code, code));
if (!mp) {
  console.error("no master");
  process.exit(1);
}

const variants = await db
  .select()
  .from(masterProductVariants)
  .where(eq(masterProductVariants.masterProductId, mp.id));

console.log("master:", { id: mp.id, code: mp.code });
console.log("variants:");
for (const v of variants)
  console.log(" ", { id: v.id, sku: v.sku, stock: v.stock });

console.log("\nledger (latest 20):");
for (const v of variants) {
  const rows = await db
    .select()
    .from(masterStockLedger)
    .where(eq(masterStockLedger.variantId, v.id))
    .orderBy(desc(masterStockLedger.createdAt))
    .limit(20);
  for (const r of rows) {
    console.log(" ", {
      at: r.createdAt,
      type: r.type,
      delta: r.qtyDelta,
      prev: r.prevStock,
      new: r.newStock,
      refType: r.refType,
      refId: r.refId,
      note: r.note,
    });
  }
}

const lps = await db
  .select()
  .from(listedProducts)
  .where(eq(listedProducts.masterProductId, mp.id));
console.log("\nlisted_products channelData:");
for (const lp of lps) {
  const cd = (lp.channelData as Record<string, unknown> | null) ?? {};
  console.log(" ", {
    id: lp.id,
    channelId: lp.channelId,
    _lastSalesPullAt: cd["_lastSalesPullAt"],
    _salesPullBaselineAt: cd["_salesPullBaselineAt"],
    _processedOrderIdsCount: Array.isArray(cd["_processedOrderIds"])
      ? (cd["_processedOrderIds"] as unknown[]).length
      : 0,
  });
}

await pool.end();
