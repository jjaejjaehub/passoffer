/**
 * SKU 재구조 백필 스크립트 (설계 문서 §4 단계 2~4, 6).
 *
 * 실행 방법:
 *   tsx src/db/backfill-skus.ts          # 실제 백필
 *   DRY_RUN=1 tsx src/db/backfill-skus.ts # 변경 없이 카운트만
 *
 * 사전 조건:
 *   - 0005_skus_and_junctions 마이그레이션 적용 완료
 *   - master_product_variants.sku / .stock, listed_product_variant_links 가 아직 살아있어야 함
 *
 * 단계:
 *   1) (userId, variant.sku) 단위로 skus 행 생성 — 같은 코드 충돌 시 첫 행 기준 stock 채택, 나머지는 경고 로그
 *   2) master_variant_skus 백필 (variantId, skuId, qty=1)
 *   3) listed_product_variant_links 각 행 → listed_product_skus 변환
 *   4) 검증 카운트 출력
 *
 * master_stock_ledger.variant_id → sku_id 컬럼 변환은 0006 마이그레이션에서 수행.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import {
  listedProductSkus,
  listedProductVariantLinks,
  masterProducts,
  masterProductVariants,
  masterVariantSkus,
  skus,
} from './schema';

const DRY_RUN = process.env.DRY_RUN === '1';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/oms',
});
const db = drizzle(pool);

async function main() {
  console.log(`[backfill-skus] start${DRY_RUN ? ' (DRY RUN)' : ''}`);

  // Step 1: 모든 variant 와 owner userId 조인해서 가져오기
  const variants = await db
    .select({
      variantId: masterProductVariants.id,
      sku: masterProductVariants.sku,
      stock: masterProductVariants.stock,
      userId: masterProducts.userId,
    })
    .from(masterProductVariants)
    .innerJoin(
      masterProducts,
      eq(masterProductVariants.masterProductId, masterProducts.id),
    );

  console.log(`[step1] master_product_variants total = ${variants.length}`);

  // (userId, code) → { skuId, stock }
  const skuKey = (userId: string, code: string) => `${userId}::${code}`;
  const skuByKey = new Map<string, { skuId: string; stock: number }>();
  const variantToSku = new Map<string, string>(); // variantId → skuId
  const conflicts: Array<{ userId: string; code: string; existingStock: number; ignoredStock: number; variantId: string }> = [];

  // 기존 skus 도 미리 적재 (재실행 안전)
  const existing = await db.select({ id: skus.id, userId: skus.userId, code: skus.code, stock: skus.stock }).from(skus);
  for (const s of existing) {
    skuByKey.set(skuKey(s.userId, s.code), { skuId: s.id, stock: s.stock });
  }
  console.log(`[step1] existing skus = ${existing.length}`);

  let createdSkus = 0;
  for (const v of variants) {
    if (!v.sku) {
      console.warn(`[step1] variant ${v.variantId} has empty sku — skipped`);
      continue;
    }
    const key = skuKey(v.userId, v.sku);
    const found = skuByKey.get(key);
    if (found) {
      if (found.stock !== v.stock) {
        conflicts.push({
          userId: v.userId,
          code: v.sku,
          existingStock: found.stock,
          ignoredStock: v.stock,
          variantId: v.variantId,
        });
      }
      variantToSku.set(v.variantId, found.skuId);
      continue;
    }
    if (DRY_RUN) {
      const fakeId = `dry-${createdSkus}`;
      skuByKey.set(key, { skuId: fakeId, stock: v.stock });
      variantToSku.set(v.variantId, fakeId);
    } else {
      const [row] = await db
        .insert(skus)
        .values({ userId: v.userId, code: v.sku, stock: v.stock })
        .returning({ id: skus.id });
      skuByKey.set(key, { skuId: row.id, stock: v.stock });
      variantToSku.set(v.variantId, row.id);
    }
    createdSkus++;
  }
  console.log(`[step1] created skus = ${createdSkus}, stock conflicts = ${conflicts.length}`);
  if (conflicts.length > 0) {
    console.log('[step1] conflict samples (first 10):');
    for (const c of conflicts.slice(0, 10)) console.log('  ', c);
  }

  // Step 2: master_variant_skus 백필
  let createdMvs = 0;
  const existingMvs = await db
    .select({ masterVariantId: masterVariantSkus.masterVariantId, skuId: masterVariantSkus.skuId })
    .from(masterVariantSkus);
  const mvsKey = new Set(existingMvs.map((r) => `${r.masterVariantId}::${r.skuId}`));
  console.log(`[step2] existing master_variant_skus = ${existingMvs.length}`);

  for (const [variantId, skuId] of variantToSku.entries()) {
    if (mvsKey.has(`${variantId}::${skuId}`)) continue;
    if (!DRY_RUN) {
      await db
        .insert(masterVariantSkus)
        .values({ masterVariantId: variantId, skuId, qty: 1, position: 0 })
        .onConflictDoNothing();
    }
    createdMvs++;
  }
  console.log(`[step2] created master_variant_skus = ${createdMvs}`);

  // Step 3: listed_product_variant_links → listed_product_skus
  const links = await db
    .select({
      listedProductId: listedProductVariantLinks.listedProductId,
      masterVariantId: listedProductVariantLinks.masterVariantId,
      channelVariantId: listedProductVariantLinks.channelVariantId,
      channelSellerCode: listedProductVariantLinks.channelSellerCode,
    })
    .from(listedProductVariantLinks);
  console.log(`[step3] listed_product_variant_links total = ${links.length}`);

  const existingLps = await db
    .select({
      listedProductId: listedProductSkus.listedProductId,
      channelVariantId: listedProductSkus.channelVariantId,
      skuId: listedProductSkus.skuId,
    })
    .from(listedProductSkus);
  const lpsKey = new Set(
    existingLps.map((r) => `${r.listedProductId}::${r.channelVariantId}::${r.skuId}`),
  );

  let createdLps = 0;
  let unmappedLinks = 0;
  for (const l of links) {
    const skuId = variantToSku.get(l.masterVariantId);
    if (!skuId) {
      unmappedLinks++;
      continue;
    }
    const k = `${l.listedProductId}::${l.channelVariantId}::${skuId}`;
    if (lpsKey.has(k)) continue;
    if (!DRY_RUN) {
      await db
        .insert(listedProductSkus)
        .values({
          listedProductId: l.listedProductId,
          channelVariantId: l.channelVariantId,
          channelSellerCode: l.channelSellerCode ?? null,
          skuId,
          qty: 1,
        })
        .onConflictDoNothing();
    }
    createdLps++;
  }
  console.log(`[step3] created listed_product_skus = ${createdLps}, unmapped variant links = ${unmappedLinks}`);

  // Step 4: 검증
  const [{ skuStockSum }] = await db
    .select({ skuStockSum: sql<number>`COALESCE(SUM(${skus.stock}), 0)::int` })
    .from(skus);
  const [{ variantStockSum }] = await db
    .select({ variantStockSum: sql<number>`COALESCE(SUM(${masterProductVariants.stock}), 0)::int` })
    .from(masterProductVariants);
  const [{ lpsCount }] = await db
    .select({ lpsCount: sql<number>`COUNT(*)::int` })
    .from(listedProductSkus);
  const [{ linksCount }] = await db
    .select({ linksCount: sql<number>`COUNT(*)::int` })
    .from(listedProductVariantLinks);

  console.log('[verify] sum(skus.stock) =', skuStockSum, ' sum(master_product_variants.stock) =', variantStockSum);
  console.log('[verify] listed_product_skus =', lpsCount, ' listed_product_variant_links =', linksCount);

  if (!DRY_RUN && variantStockSum !== skuStockSum && conflicts.length === 0) {
    console.warn('[verify] stock sums diverge without conflicts — investigate before proceeding to 0006');
  }
  if (!DRY_RUN && lpsCount < linksCount - unmappedLinks) {
    console.warn('[verify] listed_product_skus count is lower than expected — check unique conflicts');
  }

  console.log('[backfill-skus] done');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end().finally(() => process.exit(1));
});
