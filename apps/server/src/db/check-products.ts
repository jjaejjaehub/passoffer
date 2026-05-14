import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const products = await pool.query(
    "SELECT id, code, title, user_id FROM master_products WHERE user_id = '16f13daf-c550-4c81-825a-c9d35f16d113' LIMIT 10",
  );
  console.log("마스터 상품:", products.rows.length, "개");
  console.log(JSON.stringify(products.rows, null, 2));

  if (products.rows.length > 0) {
    const ids = products.rows.map((r: any) => `'${r.id}'`).join(",");
    const variants = await pool.query(
      `SELECT id, master_product_id, sku FROM master_product_variants WHERE master_product_id IN (${ids}) LIMIT 20`,
    );
    console.log("\n바리에이션:", variants.rows.length, "개");
    console.log(JSON.stringify(variants.rows, null, 2));
  }
  await pool.end();
}
main().catch(console.error);
