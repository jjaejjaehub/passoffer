import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, inArray, asc } from "drizzle-orm";
import {
  masterProducts,
  masterProductVariants,
  masterProductOptionGroups,
  masterProductOptionValues,
  masterProductVariantOptionValues,
} from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const code = process.argv[2] ?? "Q10-TEST-01";
const [mp] = await db
  .select()
  .from(masterProducts)
  .where(eq(masterProducts.code, code));
console.log("master:", {
  id: mp?.id,
  code: mp?.code,
  retailPrice: mp?.retailPrice,
});

if (mp) {
  const groups = await db
    .select()
    .from(masterProductOptionGroups)
    .where(eq(masterProductOptionGroups.masterProductId, mp.id))
    .orderBy(asc(masterProductOptionGroups.position));
  console.log(
    "option groups:",
    groups.map((g) => ({ name: g.name, position: g.position })),
  );

  const vs = await db
    .select()
    .from(masterProductVariants)
    .where(eq(masterProductVariants.masterProductId, mp.id));
  console.log("variants count:", vs.length);

  if (vs.length > 0) {
    const optsRows = await db
      .select({
        variantId: masterProductVariantOptionValues.variantId,
        groupName: masterProductOptionGroups.name,
        groupPos: masterProductOptionGroups.position,
        value: masterProductOptionValues.value,
      })
      .from(masterProductVariantOptionValues)
      .innerJoin(
        masterProductOptionValues,
        eq(
          masterProductVariantOptionValues.optionValueId,
          masterProductOptionValues.id,
        ),
      )
      .innerJoin(
        masterProductOptionGroups,
        eq(masterProductOptionValues.groupId, masterProductOptionGroups.id),
      )
      .where(
        inArray(
          masterProductVariantOptionValues.variantId,
          vs.map((v) => v.id),
        ),
      );

    const labelByVariant = new Map<string, string>();
    for (const r of optsRows) {
      const acc = labelByVariant.get(r.variantId);
      const part = `${r.groupName}=${r.value}`;
      labelByVariant.set(r.variantId, acc ? `${acc} / ${part}` : part);
    }

    for (const v of vs) {
      console.log({
        id: v.id,
        sku: v.sku,
        options: labelByVariant.get(v.id) ?? "(none)",
        price: v.price,
        stock: v.stock,
      });
    }
  }
}

await pool.end();
