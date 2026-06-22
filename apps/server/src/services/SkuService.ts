import type { FastifyInstance } from "fastify";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import {
  listedProductSkus,
  masterProductVariants,
  masterProducts,
  masterStockLedger,
  masterVariantSkus,
  skus,
} from "../db/schema";

type SkuInsert = typeof skus.$inferInsert;

export interface SkuPlayautoFields {
  // 기본정보
  warehouseText?: string | null;
  isPrimaryWarehouse?: boolean;
  vendorText?: string | null;
  leadTimeDays?: number | null;
  safetyStock?: number;
  modelName?: string | null;
  inventoryCode?: string | null;
  image?: string | null;
  standardCode?: string | null;
  hsCode?: string | null;
  isbn?: string | null;
  // 규격/가격
  isBundlable?: boolean;
  widthCm?: string | null;
  heightCm?: string | null;
  depthCm?: string | null;
  weightKg?: string | null;
  inboundUnit?: string | null;
  inboundUnitType?: string | null;
  purchaseCost?: string;
  purchaseFreight?: string;
  deliveryFee?: string;
  adCost?: string;
  etcCost?: string;
  supplyPrice?: string | null;
  salePrice?: string | null;
  currency?: string;
  // 추가정보
  originCountry?: string | null;
  originExtras?: unknown;
  requiresCaution?: boolean;
  taxType?: string;
  brand?: string | null;
  manufacturer?: string | null;
  manufacturerEn?: string | null;
  ageGroup?: string | null;
  infoNotice?: Record<string, unknown>;
  mainImage?: string | null;
  descriptionHtml?: string | null;
}

export interface SkuCreateInput extends SkuPlayautoFields {
  code: string;
  name?: string | null;
  stock?: number;
  barcode?: string | null;
  attributes?: Record<string, unknown>;
}

export type SkuUpdateInput = Partial<Omit<SkuCreateInput, "stock">>;

export interface SkuBulkCreateInput {
  items: SkuCreateInput[];
}

export interface SkuListOpts {
  search?: string;
  page?: number;
  pageSize?: number;
}

export class SkuService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly userId: string,
  ) {}

  // ─── 목록 ────────────────────────────────────────────────────

  async listSkus(opts: SkuListOpts) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, opts.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const where = opts.search
      ? and(
          eq(skus.userId, this.userId),
          or(
            ilike(skus.code, `%${opts.search}%`),
            ilike(skus.name, `%${opts.search}%`),
          ),
        )
      : eq(skus.userId, this.userId);

    const [items, [{ total }]] = await Promise.all([
      this.app.db
        .select()
        .from(skus)
        .where(where)
        .orderBy(desc(skus.updatedAt))
        .limit(pageSize)
        .offset(offset),
      this.app.db.select({ total: count() }).from(skus).where(where),
    ]);

    const ids = items.map((s) => s.id);
    const [variantUsage, listedUsage] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            this.app.db
              .select({ skuId: masterVariantSkus.skuId, cnt: count() })
              .from(masterVariantSkus)
              .where(inArray(masterVariantSkus.skuId, ids))
              .groupBy(masterVariantSkus.skuId),
            this.app.db
              .select({ skuId: listedProductSkus.skuId, cnt: count() })
              .from(listedProductSkus)
              .where(inArray(listedProductSkus.skuId, ids))
              .groupBy(listedProductSkus.skuId),
          ]);

    const variantMap = new Map(variantUsage.map((r) => [r.skuId, r.cnt]));
    const listedMap = new Map(listedUsage.map((r) => [r.skuId, r.cnt]));

    return {
      items: items.map((s) => ({
        ...s,
        masterVariantCount: variantMap.get(s.id) ?? 0,
        listedSkuCount: listedMap.get(s.id) ?? 0,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── 단건 조회 ───────────────────────────────────────────────

  async getSku(id: string) {
    const [sku] = await this.app.db
      .select()
      .from(skus)
      .where(and(eq(skus.id, id), eq(skus.userId, this.userId)));
    if (!sku) return null;

    const [variants, listed] = await Promise.all([
      this.app.db
        .select({
          masterVariantId: masterVariantSkus.masterVariantId,
          qty: masterVariantSkus.qty,
          position: masterVariantSkus.position,
          masterProductId: masterProductVariants.masterProductId,
          masterProductTitle: masterProducts.title,
          variantSku: masterProductVariants.sku,
        })
        .from(masterVariantSkus)
        .innerJoin(
          masterProductVariants,
          eq(masterVariantSkus.masterVariantId, masterProductVariants.id),
        )
        .innerJoin(
          masterProducts,
          eq(masterProductVariants.masterProductId, masterProducts.id),
        )
        .where(eq(masterVariantSkus.skuId, id))
        .orderBy(asc(masterVariantSkus.position)),
      this.app.db
        .select({
          listedProductId: listedProductSkus.listedProductId,
          channelVariantId: listedProductSkus.channelVariantId,
          channelSellerCode: listedProductSkus.channelSellerCode,
          qty: listedProductSkus.qty,
        })
        .from(listedProductSkus)
        .where(eq(listedProductSkus.skuId, id)),
    ]);

    return { ...sku, masterVariants: variants, listedSkus: listed };
  }

  // ─── 생성 ────────────────────────────────────────────────────

  async createSku(input: SkuCreateInput) {
    const values = this.toInsertValues(input);
    try {
      const [row] = await this.app.db.insert(skus).values(values).returning();
      return row;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new Error(`이미 존재하는 SKU 코드입니다: ${input.code}`);
      }
      throw err;
    }
  }

  // ─── 일괄 생성 ───────────────────────────────────────────────
  // 속성 축 조합으로 한 번에 여러 SKU를 등록할 때 사용.
  // 트랜잭션 단위로 처리하고, 중복 코드는 어느 행에서 났는지 알려준다.

  async createSkusBulk(input: SkuBulkCreateInput) {
    if (input.items.length === 0) return { items: [] };
    const codes = input.items.map((i) => i.code);
    const dupInBatch = codes.find((c, idx) => codes.indexOf(c) !== idx);
    if (dupInBatch) {
      throw new Error(`입력값에 중복된 SKU 코드가 있습니다: ${dupInBatch}`);
    }
    const valuesList = input.items.map((i) => this.toInsertValues(i));
    try {
      const rows = await this.app.db.transaction(async (tx) => {
        return tx.insert(skus).values(valuesList).returning();
      });
      return { items: rows };
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new Error("이미 존재하는 SKU 코드가 포함되어 있습니다.");
      }
      throw err;
    }
  }

  // ─── 수정 (재고 제외) ─────────────────────────────────────────

  async updateSku(id: string, input: SkuUpdateInput) {
    await this.assertOwnership(id);
    const patch: Partial<SkuInsert> = { updatedAt: new Date() };
    this.assignField(patch, input, "code");
    this.assignField(patch, input, "name");
    this.assignField(patch, input, "barcode");
    this.assignField(patch, input, "attributes");
    this.assignPlayautoFields(patch, input);
    try {
      const [row] = await this.app.db
        .update(skus)
        .set(patch)
        .where(and(eq(skus.id, id), eq(skus.userId, this.userId)))
        .returning();
      return row;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new Error(`이미 존재하는 SKU 코드입니다: ${input.code}`);
      }
      throw err;
    }
  }

  // ─── 삭제 ────────────────────────────────────────────────────
  // 참조하는 master_variant_skus / listed_product_skus 가 있으면 FK(restrict)로 막힘 → 사전 체크.

  async deleteSku(id: string) {
    await this.assertOwnership(id);
    const [{ vCount }] = await this.app.db
      .select({ vCount: count() })
      .from(masterVariantSkus)
      .where(eq(masterVariantSkus.skuId, id));
    const [{ lCount }] = await this.app.db
      .select({ lCount: count() })
      .from(listedProductSkus)
      .where(eq(listedProductSkus.skuId, id));
    if (vCount > 0 || lCount > 0) {
      throw new Error(
        `SKU 가 마스터 variant(${vCount}) 또는 판매상품 옵션(${lCount}) 에 매핑되어 있어 삭제할 수 없습니다.`,
      );
    }
    await this.app.db
      .delete(skus)
      .where(and(eq(skus.id, id), eq(skus.userId, this.userId)));
  }

  // ─── 수동 재고 변경 ──────────────────────────────────────────
  // 단순 관리자 조정. StockService.applySku 가 도입되면 그쪽으로 위임할 수 있음.

  async adjustStock(id: string, qtyDelta: number, note?: string) {
    await this.assertOwnership(id);
    return this.app.db.transaction(async (tx) => {
      const [sku] = await tx
        .select({ id: skus.id, stock: skus.stock })
        .from(skus)
        .where(and(eq(skus.id, id), eq(skus.userId, this.userId)))
        .for("update")
        .limit(1);
      if (!sku) throw new Error("SKU 를 찾을 수 없습니다.");

      const prev = sku.stock;
      const next = prev + qtyDelta;
      if (next < 0) {
        throw new Error(`재고가 음수가 됩니다. 현재=${prev}, 변경=${qtyDelta}`);
      }

      // 0006 이전: ledger 는 여전히 variant_id 컬럼을 요구. 해당 SKU 와 연결된 첫 variant 를 사용.
      const [variantRow] = await tx
        .select({ variantId: masterVariantSkus.masterVariantId })
        .from(masterVariantSkus)
        .where(eq(masterVariantSkus.skuId, id))
        .limit(1);

      if (variantRow) {
        await tx.insert(masterStockLedger).values({
          userId: this.userId,
          variantId: variantRow.variantId,
          type: "MANUAL_ADJUST",
          qtyDelta,
          prevStock: prev,
          newStock: next,
          refType: "USER",
          refId: this.userId,
          note: note ?? "SKU 수동 재고 조정",
        });
      }

      await tx
        .update(skus)
        .set({ stock: next, updatedAt: new Date() })
        .where(eq(skus.id, id));

      return { id, prev, next };
    });
  }

  // ─── 마스터 variant 매핑 ─────────────────────────────────────
  // BOM 한 행 추가 (qty 기본 1). 동일 (variant, sku) 중복은 onConflictDoNothing.

  async attachToMasterVariant(
    skuId: string,
    masterVariantId: string,
    qty = 1,
    position = 0,
  ) {
    await this.assertOwnership(skuId);
    await this.assertVariantOwnership(masterVariantId);
    await this.app.db
      .insert(masterVariantSkus)
      .values({ skuId, masterVariantId, qty, position })
      .onConflictDoNothing();
  }

  async detachFromMasterVariant(skuId: string, masterVariantId: string) {
    await this.assertOwnership(skuId);
    await this.assertVariantOwnership(masterVariantId);
    await this.app.db
      .delete(masterVariantSkus)
      .where(
        and(
          eq(masterVariantSkus.skuId, skuId),
          eq(masterVariantSkus.masterVariantId, masterVariantId),
        ),
      );
  }

  // ─── private ─────────────────────────────────────────────────

  private async assertOwnership(skuId: string) {
    const [row] = await this.app.db
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.id, skuId), eq(skus.userId, this.userId)));
    if (!row) throw new Error("SKU 를 찾을 수 없습니다.");
  }

  private async assertVariantOwnership(masterVariantId: string) {
    const [row] = await this.app.db
      .select({ id: masterProductVariants.id })
      .from(masterProductVariants)
      .innerJoin(
        masterProducts,
        eq(masterProductVariants.masterProductId, masterProducts.id),
      )
      .where(
        and(
          eq(masterProductVariants.id, masterVariantId),
          eq(masterProducts.userId, this.userId),
        ),
      );
    if (!row) throw new Error("마스터 variant 를 찾을 수 없습니다.");
  }

  private toInsertValues(input: SkuCreateInput): SkuInsert {
    return {
      userId: this.userId,
      code: input.code,
      name: input.name ?? null,
      stock: input.stock ?? 0,
      barcode: input.barcode ?? null,
      attributes: input.attributes ?? {},
      // 기본정보
      warehouseText: input.warehouseText ?? null,
      isPrimaryWarehouse: input.isPrimaryWarehouse ?? false,
      vendorText: input.vendorText ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      safetyStock: input.safetyStock ?? 0,
      modelName: input.modelName ?? null,
      inventoryCode: input.inventoryCode ?? null,
      image: input.image ?? null,
      standardCode: input.standardCode ?? null,
      hsCode: input.hsCode ?? null,
      isbn: input.isbn ?? null,
      // 규격/가격
      isBundlable: input.isBundlable ?? true,
      widthCm: input.widthCm ?? null,
      heightCm: input.heightCm ?? null,
      depthCm: input.depthCm ?? null,
      weightKg: input.weightKg ?? null,
      inboundUnit: input.inboundUnit ?? null,
      inboundUnitType: input.inboundUnitType ?? "EA",
      purchaseCost: input.purchaseCost ?? "0",
      purchaseFreight: input.purchaseFreight ?? "0",
      deliveryFee: input.deliveryFee ?? "0",
      adCost: input.adCost ?? "0",
      etcCost: input.etcCost ?? "0",
      supplyPrice: input.supplyPrice ?? null,
      salePrice: input.salePrice ?? null,
      currency: input.currency ?? "KRW",
      // 추가정보
      originCountry: input.originCountry ?? null,
      originExtras: (input.originExtras as SkuInsert["originExtras"]) ?? [],
      requiresCaution: input.requiresCaution ?? false,
      taxType: input.taxType ?? "GENERAL",
      brand: input.brand ?? null,
      manufacturer: input.manufacturer ?? null,
      manufacturerEn: input.manufacturerEn ?? null,
      ageGroup: input.ageGroup ?? null,
      infoNotice: (input.infoNotice as SkuInsert["infoNotice"]) ?? {},
      mainImage: input.mainImage ?? null,
      descriptionHtml: input.descriptionHtml ?? null,
    };
  }

  private assignField<K extends keyof SkuInsert>(
    patch: Partial<SkuInsert>,
    input: SkuUpdateInput,
    key: K & keyof SkuUpdateInput,
  ): void {
    const value = (input as Record<string, unknown>)[key as string];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key as string] = value;
    }
  }

  private assignPlayautoFields(
    patch: Partial<SkuInsert>,
    input: SkuUpdateInput,
  ): void {
    const keys: (keyof SkuPlayautoFields)[] = [
      "warehouseText",
      "isPrimaryWarehouse",
      "vendorText",
      "leadTimeDays",
      "safetyStock",
      "modelName",
      "inventoryCode",
      "image",
      "standardCode",
      "hsCode",
      "isbn",
      "isBundlable",
      "widthCm",
      "heightCm",
      "depthCm",
      "weightKg",
      "inboundUnit",
      "inboundUnitType",
      "purchaseCost",
      "purchaseFreight",
      "deliveryFee",
      "adCost",
      "etcCost",
      "supplyPrice",
      "salePrice",
      "currency",
      "originCountry",
      "originExtras",
      "requiresCaution",
      "taxType",
      "brand",
      "manufacturer",
      "manufacturerEn",
      "ageGroup",
      "infoNotice",
      "mainImage",
      "descriptionHtml",
    ];
    for (const k of keys) {
      const v = (input as Record<string, unknown>)[k];
      if (v !== undefined) {
        (patch as Record<string, unknown>)[k] = v;
      }
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      !!err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    );
  }
}
