import type { FastifyInstance } from "fastify";
import { and, eq, ilike, desc, count, sql, inArray, asc } from "drizzle-orm";
import {
  masterProducts,
  masterProductVariants,
  masterProductOptionGroups,
  masterProductOptionValues,
  masterProductVariantOptionValues,
  listedProducts,
  listedProductVariantLinks,
  listedProductSkus,
  masterVariantSkus,
  skus,
  channels,
} from "../db/schema";
import { StockService } from "./StockService";

type MasterProductInsert = typeof masterProducts.$inferInsert;
type MasterProductVariantInsert = typeof masterProductVariants.$inferInsert;

export interface MasterProductCreateInput {
  code: string;
  title: string;
  attributes?: Record<string, unknown>;
}

export interface VariantOptionValueInput {
  groupName: string;
  value: string;
}

export interface MasterProductVariantInput {
  price?: string;
  extraAttributes?: Record<string, unknown>;
  optionValues?: VariantOptionValueInput[];
}

export interface OptionGroupInput {
  name: string;
  values: string[];
}

export interface VariantOptionView {
  groupId: string;
  groupName: string;
  groupPosition: number;
  optionValueId: string;
  value: string;
  valuePosition: number;
}

export class MasterProductService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly userId: string,
  ) {}

  // ─── 마스터 상품 목록 ─────────────────────────────────────────

  async listMasterProducts(opts: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, opts.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const where = opts.search
      ? and(
          eq(masterProducts.userId, this.userId),
          ilike(masterProducts.title, `%${opts.search}%`),
        )
      : eq(masterProducts.userId, this.userId);

    const [items, [{ total }]] = await Promise.all([
      this.app.db
        .select()
        .from(masterProducts)
        .where(where)
        .orderBy(desc(masterProducts.updatedAt))
        .limit(pageSize)
        .offset(offset),
      this.app.db.select({ total: count() }).from(masterProducts).where(where),
    ]);

    const ids = items.map((p) => p.id);
    const variantCounts =
      ids.length > 0
        ? await this.app.db
            .select({
              masterProductId: masterProductVariants.masterProductId,
              cnt: count(),
            })
            .from(masterProductVariants)
            .where(inArray(masterProductVariants.masterProductId, ids))
            .groupBy(masterProductVariants.masterProductId)
        : [];

    const listedCounts =
      ids.length > 0
        ? await this.app.db
            .select({
              masterProductId: listedProducts.masterProductId,
              cnt: count(),
            })
            .from(listedProducts)
            .where(inArray(listedProducts.masterProductId, ids))
            .groupBy(listedProducts.masterProductId)
        : [];

    const variantMap = new Map(
      variantCounts.map((r) => [r.masterProductId, r.cnt]),
    );
    const listedMap = new Map(
      listedCounts.map((r) => [r.masterProductId, r.cnt]),
    );

    return {
      items: items.map((p) => ({
        ...p,
        variantCount: variantMap.get(p.id) ?? 0,
        listedChannelCount: listedMap.get(p.id) ?? 0,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── 마스터 상품 상세 ─────────────────────────────────────────

  async getMasterProduct(id: string) {
    const [product] = await this.app.db
      .select()
      .from(masterProducts)
      .where(
        and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)),
      );

    if (!product) return null;

    const [variantRows, listed, optionGroups] = await Promise.all([
      this.app.db
        .select()
        .from(masterProductVariants)
        .where(eq(masterProductVariants.masterProductId, id))
        .orderBy(masterProductVariants.createdAt),
      this.app.db
        .select({
          id: listedProducts.id,
          channelId: listedProducts.channelId,
          channelItemId: listedProducts.channelItemId,
          linkedAt: listedProducts.linkedAt,
          channelType: channels.channelType,
          channelName: channels.name,
        })
        .from(listedProducts)
        .innerJoin(channels, eq(listedProducts.channelId, channels.id))
        .where(eq(listedProducts.masterProductId, id)),
      this.loadOptionGroups(id),
    ]);

    const variantIds = variantRows.map((v) => v.id);
    const [variantOptionMap, attachedSkuMap] = await Promise.all([
      this.loadVariantOptions(variantIds),
      this.loadAttachedSkusForVariants(variantIds),
    ]);
    const variants = variantRows.map((v) => {
      const opts = variantOptionMap.get(v.id) ?? [];
      const attached = attachedSkuMap.get(v.id) ?? [];
      const availableStock = this.computeAvailableStock(
        attached.map((a) => ({ qty: a.qty, stock: a.stock })),
      );
      return {
        ...v,
        stock: availableStock,
        options: opts,
        optionLabel: opts
          .slice()
          .sort((a, b) => a.groupPosition - b.groupPosition)
          .map((o) => `${o.groupName}=${o.value}`)
          .join(" / "),
        attachedSkus: attached,
      };
    });

    return { ...product, variants, listedProducts: listed, optionGroups };
  }

  // ─── 마스터 상품 생성 ─────────────────────────────────────────

  async createMasterProduct(input: MasterProductCreateInput) {
    const row: MasterProductInsert = {
      userId: this.userId,
      code: input.code,
      title: input.title,
      attributes: input.attributes ?? {},
    };

    const [created] = await this.app.db
      .insert(masterProducts)
      .values(row)
      .returning();
    return created;
  }

  // ─── 마스터 상품 수정 ─────────────────────────────────────────

  async updateMasterProduct(
    id: string,
    input: Partial<MasterProductCreateInput>,
  ) {
    const [existing] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(
        and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)),
      );

    if (!existing) return null;

    const [updated] = await this.app.db
      .update(masterProducts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(masterProducts.id, id))
      .returning();

    const linked = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(eq(listedProducts.masterProductId, id));

    if (linked.length > 0) {
      await this.app.db
        .update(listedProducts)
        .set({ syncStatus: "PENDING", updatedAt: new Date() })
        .where(eq(listedProducts.masterProductId, id));
    }

    return { ...updated, linkedCount: linked.length };
  }

  // ─── 마스터 상품 삭제 ─────────────────────────────────────────

  async deleteMasterProduct(id: string) {
    const [existing] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(
        and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)),
      );

    if (!existing) return false;

    // delete child rows first to avoid FK constraint violations
    const linkedListedProducts = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(eq(listedProducts.masterProductId, id));

    if (linkedListedProducts.length > 0) {
      const listedIds = linkedListedProducts.map((lp) => lp.id);
      await this.app.db
        .delete(listedProductVariantLinks)
        .where(inArray(listedProductVariantLinks.listedProductId, listedIds));
      await this.app.db
        .delete(listedProducts)
        .where(eq(listedProducts.masterProductId, id));
    }

    // option groups/values/mapping → CASCADE from masterProducts.id
    await this.app.db.delete(masterProducts).where(eq(masterProducts.id, id));
    return true;
  }

  // ─── 옵션 그룹 / 값 일괄 설정 ────────────────────────────────

  /**
   * 마스터 상품의 옵션 축을 일괄 설정한다.
   * - 기존 그룹/값/매핑을 모두 제거하고 새로 생성한다 (단순/예측 가능).
   * - groups 배열의 순서가 position(0..n-1) 으로 매핑된다.
   */
  async setOptionGroups(masterProductId: string, groups: OptionGroupInput[]) {
    await this.assertOwnership(masterProductId);

    // 기존 그룹 제거 → CASCADE 로 값/매핑까지 정리됨
    await this.app.db
      .delete(masterProductOptionGroups)
      .where(eq(masterProductOptionGroups.masterProductId, masterProductId));

    if (groups.length === 0) return [];

    const seenGroupNames = new Set<string>();
    for (const g of groups) {
      const name = g.name.trim();
      if (!name) throw new Error("옵션 그룹 이름은 비워둘 수 없습니다.");
      if (seenGroupNames.has(name))
        throw new Error(`옵션 그룹 이름이 중복됩니다: ${name}`);
      seenGroupNames.add(name);
    }

    const insertedGroups: Array<typeof masterProductOptionGroups.$inferSelect> =
      [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]!;
      const [created] = await this.app.db
        .insert(masterProductOptionGroups)
        .values({
          masterProductId,
          name: g.name.trim(),
          position: i,
        })
        .returning();
      insertedGroups.push(created);

      const seenValues = new Set<string>();
      for (let j = 0; j < g.values.length; j++) {
        const v = g.values[j]!.trim();
        if (!v) continue;
        if (seenValues.has(v))
          throw new Error(`옵션 값이 중복됩니다: ${g.name}=${v}`);
        seenValues.add(v);
        await this.app.db.insert(masterProductOptionValues).values({
          groupId: created.id,
          value: v,
          position: j,
        });
      }
    }

    return this.loadOptionGroups(masterProductId);
  }

  // ─── 변형 추가 ────────────────────────────────────────────────

  async addVariant(masterProductId: string, input: MasterProductVariantInput) {
    await this.assertOwnership(masterProductId);

    const optionValueIds = await this.resolveOptionValueIds(
      masterProductId,
      input.optionValues ?? [],
    );
    await this.assertNoVariantWithSameOptions(masterProductId, optionValueIds);

    const row: MasterProductVariantInsert = {
      masterProductId,
      sku: "",
      price: input.price,
      stock: 0,
      extraAttributes: input.extraAttributes ?? {},
    };

    const [created] = await this.app.db
      .insert(masterProductVariants)
      .values(row)
      .returning();

    if (optionValueIds.length > 0) {
      await this.app.db
        .insert(masterProductVariantOptionValues)
        .values(
          optionValueIds.map((ovId) => ({
            variantId: created.id,
            optionValueId: ovId,
          })),
        );
    }

    return this.getVariantWithOptions(created.id);
  }

  // ─── 변형 수정 ────────────────────────────────────────────────

  async updateVariant(
    masterProductId: string,
    variantId: string,
    input: Partial<MasterProductVariantInput>,
  ) {
    await this.assertOwnership(masterProductId);

    const [before] = await this.app.db
      .select()
      .from(masterProductVariants)
      .where(
        and(
          eq(masterProductVariants.id, variantId),
          eq(masterProductVariants.masterProductId, masterProductId),
        ),
      );

    if (!before) return null;

    // optionValues 컬럼은 별도 테이블이므로 update.set 에서 분리
    const { optionValues, ...scalarPatch } = input;
    const setPatch: Partial<typeof masterProductVariants.$inferInsert> = {
      ...scalarPatch,
      updatedAt: new Date(),
    };

    const [updated] = await this.app.db
      .update(masterProductVariants)
      .set(setPatch)
      .where(
        and(
          eq(masterProductVariants.id, variantId),
          eq(masterProductVariants.masterProductId, masterProductId),
        ),
      )
      .returning();

    if (optionValues !== undefined) {
      const optionValueIds = await this.resolveOptionValueIds(
        masterProductId,
        optionValues,
      );
      await this.assertNoVariantWithSameOptions(
        masterProductId,
        optionValueIds,
        variantId,
      );

      await this.app.db
        .delete(masterProductVariantOptionValues)
        .where(eq(masterProductVariantOptionValues.variantId, variantId));

      if (optionValueIds.length > 0) {
        await this.app.db
          .insert(masterProductVariantOptionValues)
          .values(
            optionValueIds.map((ovId) => ({ variantId, optionValueId: ovId })),
          );
      }
    }

    return this.getVariantWithOptions(variantId);
  }

  // ─── 변형 삭제 ────────────────────────────────────────────────

  async deleteVariant(masterProductId: string, variantId: string) {
    await this.assertOwnership(masterProductId);

    await this.app.db
      .delete(masterProductVariants)
      .where(
        and(
          eq(masterProductVariants.id, variantId),
          eq(masterProductVariants.masterProductId, masterProductId),
        ),
      );
  }

  // ─── 변형 단건 조회 (옵션값 join 포함) ───────────────────────

  async getVariantWithOptions(variantId: string) {
    const [variant] = await this.app.db
      .select()
      .from(masterProductVariants)
      .where(eq(masterProductVariants.id, variantId));
    if (!variant) return null;

    const [optMap, attachedMap] = await Promise.all([
      this.loadVariantOptions([variantId]),
      this.loadAttachedSkusForVariants([variantId]),
    ]);
    const opts = optMap.get(variantId) ?? [];
    const attached = attachedMap.get(variantId) ?? [];
    const availableStock = this.computeAvailableStock(
      attached.map((a) => ({ qty: a.qty, stock: a.stock })),
    );
    return {
      ...variant,
      stock: availableStock,
      options: opts,
      optionLabel: opts
        .slice()
        .sort((a, b) => a.groupPosition - b.groupPosition)
        .map((o) => `${o.groupName}=${o.value}`)
        .join(" / "),
      attachedSkus: attached,
    };
  }

  // ─── 변형 목록 (옵션값 join 포함) ────────────────────────────

  async listVariants(masterProductId: string) {
    await this.assertOwnership(masterProductId);

    const variants = await this.app.db
      .select()
      .from(masterProductVariants)
      .where(eq(masterProductVariants.masterProductId, masterProductId))
      .orderBy(masterProductVariants.createdAt);

    const variantIds = variants.map((v) => v.id);
    const [optMap, attachedMap] = await Promise.all([
      this.loadVariantOptions(variantIds),
      this.loadAttachedSkusForVariants(variantIds),
    ]);
    return variants.map((v) => {
      const opts = optMap.get(v.id) ?? [];
      const attached = attachedMap.get(v.id) ?? [];
      const availableStock = this.computeAvailableStock(
        attached.map((a) => ({ qty: a.qty, stock: a.stock })),
      );
      return {
        ...v,
        stock: availableStock,
        options: opts,
        optionLabel: opts
          .slice()
          .sort((a, b) => a.groupPosition - b.groupPosition)
          .map((o) => `${o.groupName}=${o.value}`)
          .join(" / "),
        attachedSkus: attached,
      };
    });
  }

  // ─── 판매상품(링크) 목록 ──────────────────────────────────────

  async getListedProduct(id: string) {
    const [item] = await this.app.db
      .select({
        id: listedProducts.id,
        masterProductId: listedProducts.masterProductId,
        channelId: listedProducts.channelId,
        channelItemId: listedProducts.channelItemId,
        linkedAt: listedProducts.linkedAt,
        channelData: listedProducts.channelData,
        createdAt: listedProducts.createdAt,
        updatedAt: listedProducts.updatedAt,
        channelType: channels.channelType,
        channelName: channels.name,
      })
      .from(listedProducts)
      .innerJoin(channels, eq(listedProducts.channelId, channels.id))
      .where(
        and(eq(listedProducts.id, id), eq(listedProducts.userId, this.userId)),
      );

    if (!item) throw new Error("판매상품을 찾을 수 없습니다.");
    return item;
  }

  async listListedProducts(opts: {
    channelId?: string;
    masterProductId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, opts.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(listedProducts.userId, this.userId)];
    if (opts.channelId)
      conditions.push(eq(listedProducts.channelId, opts.channelId));
    if (opts.masterProductId)
      conditions.push(eq(listedProducts.masterProductId, opts.masterProductId));

    const where = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      this.app.db
        .select({
          id: listedProducts.id,
          masterProductId: listedProducts.masterProductId,
          channelId: listedProducts.channelId,
          channelItemId: listedProducts.channelItemId,
          linkedAt: listedProducts.linkedAt,
          createdAt: listedProducts.createdAt,
          channelType: channels.channelType,
          channelName: channels.name,
        })
        .from(listedProducts)
        .innerJoin(channels, eq(listedProducts.channelId, channels.id))
        .where(where)
        .orderBy(desc(listedProducts.linkedAt))
        .limit(pageSize)
        .offset(offset),
      this.app.db.select({ total: count() }).from(listedProducts).where(where),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── 마스터 ↔ 채널 연결 ──────────────────────────────────────

  async linkToChannel(
    masterProductId: string,
    channelId: string,
    channelItemId: string,
    variantLinks: Array<{
      masterVariantId: string;
      channelVariantId: string;
      channelSellerCode?: string;
    }>,
  ) {
    await this.assertOwnership(masterProductId);

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.userId, this.userId)));
    if (!channel) throw new Error("채널을 찾을 수 없습니다.");

    // 이미 같은 channelItemId로 링크된 항목이 있으면 반환
    const [existing] = await this.app.db
      .select()
      .from(listedProducts)
      .where(
        and(
          eq(listedProducts.masterProductId, masterProductId),
          eq(listedProducts.channelId, channelId),
          eq(listedProducts.channelItemId, channelItemId),
        ),
      );

    let listedProduct: typeof listedProducts.$inferSelect;
    if (existing) {
      listedProduct = existing;
    } else {
      const [created] = await this.app.db
        .insert(listedProducts)
        .values({
          userId: this.userId,
          masterProductId,
          channelId,
          channelItemId,
          linkedAt: new Date(),
          syncStatus: "PENDING",
        })
        .returning();
      listedProduct = created;
    }

    // 변형 링크 upsert
    if (variantLinks.length > 0) {
      for (const vl of variantLinks) {
        await this.app.db
          .insert(listedProductVariantLinks)
          .values({
            listedProductId: listedProduct.id,
            masterVariantId: vl.masterVariantId,
            channelVariantId: vl.channelVariantId,
            channelSellerCode: vl.channelSellerCode,
          })
          .onConflictDoNothing();
      }
    }

    return listedProduct;
  }

  // ─── 연결 해제 ────────────────────────────────────────────────

  async unlinkFromChannel(listedProductId: string) {
    const [item] = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(
        and(
          eq(listedProducts.id, listedProductId),
          eq(listedProducts.userId, this.userId),
        ),
      );

    if (!item) throw new Error("판매상품을 찾을 수 없습니다.");

    await this.app.db
      .delete(listedProducts)
      .where(eq(listedProducts.id, listedProductId));
    return true;
  }

  // ─── 판매상품 ↔ SKU 매핑 CRUD (listed_product_skus) ──────────
  // 채널 옵션(channelVariantId)에 어떤 SKU 가 BOM 으로 묶이는지 관리.
  // 같은 (listedProductId, channelVariantId, skuId) 는 unique.

  async listListedProductSkus(listedProductId: string) {
    await this.getListedProduct(listedProductId); // ownership 검증
    const rows = await this.app.db
      .select({
        id: listedProductSkus.id,
        channelVariantId: listedProductSkus.channelVariantId,
        channelSellerCode: listedProductSkus.channelSellerCode,
        skuId: listedProductSkus.skuId,
        skuCode: skus.code,
        skuName: skus.name,
        skuStock: skus.stock,
        qty: listedProductSkus.qty,
        createdAt: listedProductSkus.createdAt,
      })
      .from(listedProductSkus)
      .innerJoin(skus, eq(listedProductSkus.skuId, skus.id))
      .where(eq(listedProductSkus.listedProductId, listedProductId))
      .orderBy(
        asc(listedProductSkus.channelVariantId),
        asc(listedProductSkus.createdAt),
      );
    return rows;
  }

  /**
   * 한 listedProduct 의 SKU 매핑을 통째로 교체. 채널 변형별 BOM 을 새로 정의할 때 사용.
   * 같은 (channelVariantId, skuId) 는 unique 이므로 입력 단계에서 중복 체크.
   */
  async replaceListedProductSkus(
    listedProductId: string,
    rows: Array<{
      channelVariantId: string;
      channelSellerCode?: string | null;
      skuId: string;
      qty?: number;
    }>,
  ) {
    await this.getListedProduct(listedProductId);
    for (const r of rows) {
      await this.assertSkuOwnership(r.skuId);
    }
    const seen = new Set<string>();
    for (const r of rows) {
      const key = `${r.channelVariantId}::${r.skuId}`;
      if (seen.has(key)) {
        throw new Error(
          `중복된 매핑입니다: channelVariantId=${r.channelVariantId}, skuId=${r.skuId}`,
        );
      }
      seen.add(key);
    }
    return this.app.db.transaction(async (tx) => {
      await tx
        .delete(listedProductSkus)
        .where(eq(listedProductSkus.listedProductId, listedProductId));
      if (rows.length === 0)
        return [] as Array<typeof listedProductSkus.$inferSelect>;
      const inserted = await tx
        .insert(listedProductSkus)
        .values(
          rows.map((r) => ({
            listedProductId,
            channelVariantId: r.channelVariantId,
            channelSellerCode: r.channelSellerCode ?? null,
            skuId: r.skuId,
            qty: Math.max(1, r.qty ?? 1),
          })),
        )
        .returning();
      return inserted;
    });
  }

  async addListedProductSku(
    listedProductId: string,
    input: {
      channelVariantId: string;
      channelSellerCode?: string | null;
      skuId: string;
      qty?: number;
    },
  ) {
    await this.getListedProduct(listedProductId);
    await this.assertSkuOwnership(input.skuId);
    try {
      const [row] = await this.app.db
        .insert(listedProductSkus)
        .values({
          listedProductId,
          channelVariantId: input.channelVariantId,
          channelSellerCode: input.channelSellerCode ?? null,
          skuId: input.skuId,
          qty: Math.max(1, input.qty ?? 1),
        })
        .returning();
      return row;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new Error(
          `이미 존재하는 매핑입니다: channelVariantId=${input.channelVariantId}, skuId=${input.skuId}`,
        );
      }
      throw err;
    }
  }

  async updateListedProductSku(
    listedProductId: string,
    mappingId: string,
    patch: { channelSellerCode?: string | null; qty?: number },
  ) {
    await this.getListedProduct(listedProductId);
    const setPatch: Partial<typeof listedProductSkus.$inferInsert> = {};
    if (patch.channelSellerCode !== undefined)
      setPatch.channelSellerCode = patch.channelSellerCode;
    if (patch.qty !== undefined) setPatch.qty = Math.max(1, patch.qty);
    if (Object.keys(setPatch).length === 0) return null;
    const [row] = await this.app.db
      .update(listedProductSkus)
      .set(setPatch)
      .where(
        and(
          eq(listedProductSkus.id, mappingId),
          eq(listedProductSkus.listedProductId, listedProductId),
        ),
      )
      .returning();
    if (!row) throw new Error("매핑을 찾을 수 없습니다.");
    return row;
  }

  async removeListedProductSku(listedProductId: string, mappingId: string) {
    await this.getListedProduct(listedProductId);
    const result = await this.app.db
      .delete(listedProductSkus)
      .where(
        and(
          eq(listedProductSkus.id, mappingId),
          eq(listedProductSkus.listedProductId, listedProductId),
        ),
      )
      .returning({ id: listedProductSkus.id });
    if (result.length === 0) throw new Error("매핑을 찾을 수 없습니다.");
  }

  private async assertSkuOwnership(skuId: string) {
    const [row] = await this.app.db
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.id, skuId), eq(skus.userId, this.userId)));
    if (!row) throw new Error(`SKU 를 찾을 수 없습니다: ${skuId}`);
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      !!err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    );
  }

  // ─── 판매 동기화 (channel orders → master stock 차감) ─────────

  async pullSalesFromChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);

    const { ChannelService } = await import("./ChannelService");
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.getOrders) {
      return {
        status: "UNSUPPORTED" as const,
        message: "이 채널은 주문 조회를 지원하지 않습니다.",
      };
    }

    // 채널 변형 → SKU 매핑 (listed_product_skus). 같은 channelVariantId 에 여러 SKU 가 BOM 으로 묶일 수 있음.
    // channelSellerCode 매칭도 지원해야 함 (어댑터에 따라 channelVariantId 가 비어 있고 SKU 코드만 오는 경우)
    const skuRows = await this.app.db
      .select({
        channelVariantId: listedProductSkus.channelVariantId,
        channelSellerCode: listedProductSkus.channelSellerCode,
        skuId: listedProductSkus.skuId,
        skuCode: skus.code,
        qty: listedProductSkus.qty,
      })
      .from(listedProductSkus)
      .innerJoin(skus, eq(listedProductSkus.skuId, skus.id))
      .where(eq(listedProductSkus.listedProductId, listedProductId));

    if (skuRows.length === 0) {
      return {
        status: "NO_VARIANTS" as const,
        message: "연결된 SKU 매핑이 없습니다.",
      };
    }

    type ChannelSkuRow = {
      channelVariantId: string;
      skuId: string;
      skuCode: string;
      qty: number;
    };
    const skuByChannelVariant = new Map<string, ChannelSkuRow[]>();
    const skuBySellerCode = new Map<string, ChannelSkuRow[]>();
    for (const r of skuRows) {
      const row: ChannelSkuRow = {
        channelVariantId: r.channelVariantId,
        skuId: r.skuId,
        skuCode: r.skuCode,
        qty: r.qty,
      };
      const cvList = skuByChannelVariant.get(r.channelVariantId) ?? [];
      cvList.push(row);
      skuByChannelVariant.set(r.channelVariantId, cvList);
      if (r.channelSellerCode) {
        const scList = skuBySellerCode.get(r.channelSellerCode) ?? [];
        scList.push(row);
        skuBySellerCode.set(r.channelSellerCode, scList);
      }
    }

    // SKU 단위 차감을 위임할 StockService. 0006 이전 ledger 호환을 위해 variantId 를 같이 넘긴다.
    // 같은 SKU 가 여러 variant 에 매핑돼 있으면 첫 variant 를 ledger 용으로 사용.
    const skuToVariant = new Map<string, string>();
    const mvsRows = await this.app.db
      .select({
        skuId: masterVariantSkus.skuId,
        masterVariantId: masterVariantSkus.masterVariantId,
      })
      .from(masterVariantSkus)
      .where(
        inArray(
          masterVariantSkus.skuId,
          skuRows.map((r) => r.skuId),
        ),
      );
    for (const r of mvsRows) {
      if (!skuToVariant.has(r.skuId))
        skuToVariant.set(r.skuId, r.masterVariantId);
    }

    const stockSvc = new StockService(this.app);

    const channelData =
      (item.channelData as Record<string, unknown> | null) ?? {};
    const processedOrderIds = new Set<string>(
      Array.isArray(channelData["_processedOrderIds"])
        ? (channelData["_processedOrderIds"] as unknown[]).filter(
            (v): v is string => typeof v === "string",
          )
        : [],
    );
    const lastPullIso =
      typeof channelData["_lastSalesPullAt"] === "string"
        ? (channelData["_lastSalesPullAt"] as string)
        : null;
    const baselineIso =
      typeof channelData["_salesPullBaselineAt"] === "string"
        ? (channelData["_salesPullBaselineAt"] as string)
        : null;
    const baselineMs = baselineIso ? new Date(baselineIso).getTime() : null;

    const now = new Date();
    const defaultStartMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const lastPullMs = lastPullIso ? new Date(lastPullIso).getTime() : null;
    const startMs = Math.max(
      defaultStartMs,
      lastPullMs ?? defaultStartMs,
      baselineMs ?? defaultStartMs,
    );
    const start = new Date(startMs);
    const fmtYYYYMMDD = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

    const orders = await adapter.getOrders({
      startDate: fmtYYYYMMDD(start),
      endDate: fmtYYYYMMDD(now),
    });

    // 주문 라인을 (orderId, skuId) 단위로 누적. qty 는 채널 옵션 수량 × BOM qty.
    type SaleEntry = { orderId: string; skuId: string; qty: number };
    const sales: SaleEntry[] = [];
    const newProcessedIds: string[] = [];
    for (const ord of orders) {
      if (processedOrderIds.has(ord.id)) continue;
      const ordTime = new Date(ord.orderedAt).getTime();
      if (
        Number.isFinite(ordTime) &&
        baselineMs !== null &&
        ordTime < baselineMs
      ) {
        newProcessedIds.push(ord.id);
        continue;
      }
      let matched = false;
      for (const li of ord.items) {
        const channelQty = li.quantity ?? 0;
        if (channelQty <= 0) continue;
        // 1순위: channelVariantId, 2순위: channelSellerCode(li.sku)
        let skuRowsForLine: ChannelSkuRow[] | undefined;
        if (li.channelVariantId)
          skuRowsForLine = skuByChannelVariant.get(li.channelVariantId);
        if (!skuRowsForLine || skuRowsForLine.length === 0) {
          if (li.sku) skuRowsForLine = skuBySellerCode.get(li.sku);
        }
        if (!skuRowsForLine || skuRowsForLine.length === 0) continue;
        for (const r of skuRowsForLine) {
          sales.push({
            orderId: ord.id,
            skuId: r.skuId,
            qty: channelQty * Math.max(1, r.qty),
          });
        }
        matched = true;
      }
      if (matched) newProcessedIds.push(ord.id);
    }

    const deductions: Array<{
      sku: string;
      soldQty: number;
      prevStock: number;
      newStock: number;
    }> = [];
    const touchedSkuIds = new Set<string>();
    for (const entry of sales) {
      const ledgerVariantId = skuToVariant.get(entry.skuId);
      if (!ledgerVariantId) {
        this.app.log.warn(
          { skuId: entry.skuId },
          "skipping sale deduction — SKU not mapped to any master variant",
        );
        continue;
      }
      const result = await stockSvc.applySku({
        userId: this.userId,
        skuId: entry.skuId,
        variantId: ledgerVariantId,
        refType: "ORDER_RESERVE",
        refId: entry.orderId,
        qtyDelta: -entry.qty,
        channelId: item.channelId,
        listedProductId,
        allowNegative: true, // 초과 판매도 일단 기록 (음수 stock 허용) — OVERSELL ledger 는 추후 추가
      });
      if (result.ok && "prev" in result) {
        deductions.push({
          sku: result.ledgerId,
          soldQty: entry.qty,
          prevStock: result.prev,
          newStock: result.next,
        });
        touchedSkuIds.add(entry.skuId);
      }
    }

    // Phase 5: 판매 차감 후 연결된 채널에 새 재고 push (best-effort)
    // 차감된 SKU 들과 매핑된 모든 channelVariant 에 대해 push.
    if (touchedSkuIds.size > 0) {
      const { ChannelService } = await import("./ChannelService");
      const channelSvc = new ChannelService(this.app, this.userId);

      // 영향받은 SKU 들이 매핑된 모든 listed_product_skus (cross-listing 포함) 로드
      const allMappings = await this.app.db
        .select({
          listedProductId: listedProductSkus.listedProductId,
          channelVariantId: listedProductSkus.channelVariantId,
          channelId: listedProducts.channelId,
          channelItemId: listedProducts.channelItemId,
        })
        .from(listedProductSkus)
        .innerJoin(
          listedProducts,
          eq(listedProductSkus.listedProductId, listedProducts.id),
        )
        .where(inArray(listedProductSkus.skuId, Array.from(touchedSkuIds)));

      // (listedProductId, channelVariantId) 별로 중복 제거
      const uniqueTargets = new Map<
        string,
        {
          listedProductId: string;
          channelVariantId: string;
          channelId: string;
          channelItemId: string;
        }
      >();
      for (const m of allMappings) {
        uniqueTargets.set(`${m.listedProductId}::${m.channelVariantId}`, m);
      }

      for (const t of uniqueTargets.values()) {
        try {
          const rows = await this.loadSkusForChannelVariant(
            t.listedProductId,
            t.channelVariantId,
          );
          const newStock = this.computeAvailableStock(rows);
          const ad = await channelSvc.getAdapter(t.channelId);
          if (ad.pushVariantStock) {
            await ad.pushVariantStock(
              t.channelItemId,
              t.channelVariantId,
              newStock,
            );
          }
        } catch (pushErr) {
          this.app.log.warn(
            { err: pushErr, target: t },
            "channel stock push after pull-sales failed",
          );
        }
      }
    }

    const mergedProcessedIds = Array.from(
      new Set([...processedOrderIds, ...newProcessedIds]),
    );
    await this.app.db
      .update(listedProducts)
      .set({
        channelData: {
          ...channelData,
          _processedOrderIds: mergedProcessedIds,
          _lastSalesPullAt: now.toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(listedProducts.id, listedProductId));

    return {
      status: "OK" as const,
      window: { from: start.toISOString(), to: now.toISOString() },
      processedOrderCount: newProcessedIds.length,
      deductions,
    };
  }

  // ─── 채널에 신규 등록 (registerProduct 어댑터 호출 → listed_products 생성) ──

  async registerToChannel(
    masterProductId: string,
    channelId: string,
    overrides: Record<string, unknown> = {},
  ) {
    const master = await this.getMasterProduct(masterProductId);
    if (!master) throw new Error("마스터 상품을 찾을 수 없습니다.");

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.userId, this.userId)));
    if (!channel) throw new Error("채널을 찾을 수 없습니다.");

    // 이미 등록된 경우 중복 방지
    const [existing] = await this.app.db
      .select({
        id: listedProducts.id,
        channelItemId: listedProducts.channelItemId,
      })
      .from(listedProducts)
      .where(
        and(
          eq(listedProducts.masterProductId, masterProductId),
          eq(listedProducts.channelId, channelId),
        ),
      );
    if (existing) throw new Error("이미 해당 채널에 등록된 상품입니다.");

    const { ChannelService } = await import("./ChannelService");
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(channelId);

    if (!adapter.registerProduct) {
      throw new Error("이 채널은 상품 등록을 지원하지 않습니다.");
    }

    // vendor key: QTEN → qoo10, SHOPIFY → shopify, etc.
    const vendorKey =
      channel.channelType === "QOO10_JP"
        ? "qoo10"
        : channel.channelType.toLowerCase();
    const attrsRoot =
      (master.attributes as Record<string, unknown> | null) ?? {};
    const commonAttrs =
      (attrsRoot["common"] as Record<string, unknown> | undefined) ?? {};
    const channelAttrs =
      (attrsRoot[vendorKey] as Record<string, unknown> | undefined) ?? {};

    const variants = master.variants ?? [];
    const optionGroups = master.optionGroups ?? [];

    const commonStr = (key: string) =>
      typeof commonAttrs[key] === "string" ? (commonAttrs[key] as string) : "";
    const commonArr = (key: string) =>
      Array.isArray(commonAttrs[key]) ? (commonAttrs[key] as unknown[]) : [];
    const commonNum = (key: string) =>
      typeof commonAttrs[key] === "number"
        ? (commonAttrs[key] as number)
        : undefined;
    const commonRetailPrice = (() => {
      const v = commonAttrs["retailPrice"];
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
      return undefined;
    })();

    // ── 다축 옵션 인코딩 ───────────────────────────
    // Qoo10 ItemType: "그룹1||*값1$값2||*그룹2||*값1$값2"
    let itemTypeStr: string | undefined;
    let qoo10Variants:
      | Array<{
          optionPath: string;
          sku: string;
          price: string;
          qty: number;
        }>
      | undefined;
    if (
      channel.channelType === "QOO10_JP" &&
      optionGroups.length > 0 &&
      variants.length > 1
    ) {
      // Qoo10 ItemType format per combination row:
      // 그룹1||*값1||*그룹2||*값2||*가격||*수량||*판매자코드  — rows joined by $$
      qoo10Variants = variants.map((v) => {
        const optionPath = optionGroups
          .map((g) => {
            const match = v.options.find((o) => o.groupId === g.id);
            return `${g.name}||*${match ? match.value : ""}`;
          })
          .join("$$");
        return {
          optionPath,
          sku: v.sku,
          price: String(v.price ?? commonRetailPrice ?? "0"),
          qty: v.stock ?? 0,
        };
      });
      itemTypeStr = qoo10Variants
        .map((v) => {
          // optionPath: "그룹1||*값1$$그룹2||*값2" → "그룹1||*값1||*그룹2||*값2"
          const axesPart = v.optionPath.replace(/\$\$/g, "||*");
          const sellerCode = v.sku || "0";
          // 가격은 0 (차액=0, 실가격은 ItemPrice 기준), 수량은 실제값
          return `${axesPart}||*0||*${v.qty}||*${sellerCode}`;
        })
        .join("$$");
    }

    // Shopify productOptions/variants — 그룹별 name 과 값 배열을 보낸다.
    let shopifyOptions: Array<{ name: string; values: string[] }> | undefined;
    let shopifyVariants:
      | Array<{
          options: string[];
          price: string;
          sku?: string;
          inventoryQuantity?: number;
        }>
      | undefined;
    if (
      channel.channelType === "SHOPIFY" &&
      optionGroups.length > 0 &&
      variants.length > 1
    ) {
      shopifyOptions = optionGroups.map((g) => ({
        name: g.name,
        values: g.values.map((v) => v.value),
      }));
      shopifyVariants = variants.map((v) => {
        // 그룹 position 순서로 옵션값을 배열한다 — Shopify 는 productOptions 순서와 1:1 매칭을 기대.
        const optionValuesOrdered = optionGroups.map((g) => {
          const match = v.options.find((o) => o.groupId === g.id);
          return match ? match.value : "";
        });
        return {
          options: optionValuesOrdered,
          price: String(v.price ?? commonRetailPrice ?? "0"),
          sku: v.sku,
          inventoryQuantity: v.stock ?? 0,
        };
      });
    }

    // countryOfOrigin → originType 추론 (Qoo10 어댑터 폴백용)
    const countryOfOrigin = commonStr("countryOfOrigin");
    const originTypeFromCountry = (() => {
      const co = countryOfOrigin.trim();
      if (!co || co === "대한민국" || co === "국내") return "domestic";
      if (co === "기타" || co === "기타(ETC)") return "other";
      return "overseas";
    })();

    const flatInput: Record<string, unknown> = {
      ...channelAttrs,
      title: master.title,
      descriptionHtml: commonStr("descriptionHtml"),
      images: commonArr("images"),
      tags: commonArr("tags"),
      material: commonStr("material"),
      weightG: commonNum("weightG"),
      brand: commonStr("brand"),
      countryOfOrigin,
      originType: originTypeFromCountry,
      sku: variants[0]?.sku ?? "",
      price: String(variants[0]?.price ?? commonRetailPrice ?? "0"),
      inventoryQuantity: variants[0]?.stock ?? 0,
      stock: variants[0]?.stock ?? 0,
      ...(itemTypeStr ? { ItemType: itemTypeStr } : {}),
      ...(qoo10Variants ? { qoo10Variants } : {}),
      ...(shopifyOptions ? { options: shopifyOptions } : {}),
      ...(shopifyVariants ? { variants: shopifyVariants } : {}),
      ...overrides,
    };

    this.app.log.info(
      {
        channelType: channel.channelType,
        commonRetailPrice,
        variantCount: variants.length,
        optionGroupCount: optionGroups.length,
        firstVariantPrice: variants[0]?.price,
        firstVariantStock: variants[0]?.stock,
        flatInputPrice: flatInput.price,
        flatInputSku: flatInput.sku,
        flatInputQty: flatInput.inventoryQuantity,
        hasShopifyOptions: !!shopifyOptions,
        hasShopifyVariants: !!shopifyVariants,
        itemTypeStr,
        overrideKeys: Object.keys(overrides),
      },
      "[registerToChannel] dispatching to adapter",
    );
    const { productId, title } = await adapter.registerProduct(flatInput);

    const [created] = await this.app.db
      .insert(listedProducts)
      .values({
        userId: this.userId,
        masterProductId,
        channelId,
        channelItemId: productId,
        linkedAt: new Date(),
        channelData: { _registeredAt: new Date().toISOString() },
      })
      .returning();

    // 채널에서 실제 등록된 변형 정보 조회하여 link 생성
    if (adapter.getChannelProduct) {
      try {
        const channelProduct = await adapter.getChannelProduct(productId);
        const channelVariants = channelProduct.variants ?? [];
        const skuToMaster = new Map<string, string>();
        for (const v of variants) {
          if (v.sku) skuToMaster.set(v.sku, v.id);
        }
        const linkRows: Array<{
          listedProductId: string;
          masterVariantId: string;
          channelVariantId: string;
          channelSellerCode: string | null;
        }> = [];
        for (let i = 0; i < channelVariants.length; i++) {
          const cv = channelVariants[i]!;
          let masterVariantId: string | undefined;
          if (cv.optionCode && skuToMaster.has(cv.optionCode)) {
            masterVariantId = skuToMaster.get(cv.optionCode);
          } else if (variants.length === 1 && variants[0]) {
            masterVariantId = variants[0].id;
          } else if (variants[i]) {
            masterVariantId = variants[i]!.id;
          }
          if (!masterVariantId) continue;
          linkRows.push({
            listedProductId: created.id,
            masterVariantId,
            channelVariantId: cv.channelVariantId,
            channelSellerCode: cv.optionCode ?? null,
          });
        }
        if (linkRows.length > 0) {
          await this.app.db
            .insert(listedProductVariantLinks)
            .values(linkRows)
            .onConflictDoNothing();
        }
      } catch (err) {
        this.app.log.warn(
          { err, productId },
          "failed to fetch channel variants after register",
        );
      }
    }

    return { listedProductId: created.id, channelItemId: productId, title };
  }

  // ─── 전체 채널 주문 집계 (채널→마스터 재고 차감) ─────────────

  async pullSalesFromAllChannels(masterProductId: string) {
    await this.assertOwnership(masterProductId);

    const listed = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(eq(listedProducts.masterProductId, masterProductId));

    if (listed.length === 0) {
      return {
        status: "NO_CHANNELS" as const,
        message: "연결된 채널이 없습니다.",
        results: [],
      };
    }

    const results: Array<{
      listedProductId: string;
      status: string;
      deductions?: unknown;
    }> = [];
    for (const lp of listed) {
      try {
        const result = await this.pullSalesFromChannel(lp.id);
        results.push({
          listedProductId: lp.id,
          status: result.status,
          deductions: result.deductions,
        });
      } catch (err) {
        results.push({
          listedProductId: lp.id,
          status: err instanceof Error ? err.message : "error",
        });
      }
    }

    return { status: "OK" as const, results };
  }

  // ─── 마스터 상품 전체 채널 재고 전송 (마스터→채널) ───────────

  async pushMasterStockToAllChannels(masterProductId: string) {
    await this.assertOwnership(masterProductId);

    const listed = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(eq(listedProducts.masterProductId, masterProductId));

    if (listed.length === 0) {
      return {
        status: "NO_CHANNELS" as const,
        message: "연결된 채널이 없습니다.",
        results: [],
      };
    }

    const results: Array<{
      listedProductId: string;
      status: string;
      updates?: unknown;
    }> = [];
    for (const lp of listed) {
      try {
        const result = await this.pushStockToChannel(lp.id);
        results.push({
          listedProductId: lp.id,
          status: result.status,
          updates: "updates" in result ? result.updates : undefined,
        });
      } catch (err) {
        results.push({
          listedProductId: lp.id,
          status: err instanceof Error ? err.message : "error",
        });
      }
    }

    return { status: "OK" as const, results };
  }

  // ─── 재고 동기화 (master stock → channel) ────────────────────

  async pushStockToChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);

    const { ChannelService } = await import("./ChannelService");
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.pushVariantStock && !adapter.updateProduct) {
      return {
        status: "UNSUPPORTED" as const,
        message: "이 채널은 재고 업데이트를 지원하지 않습니다.",
      };
    }

    const channelType = item.channelType;

    // listed_product_skus 가 채널 변형 ↔ SKU 매핑의 정식 소스.
    // 같은 channelVariantId 에 여러 SKU 가 묶일 수 있으므로 (BOM) 그룹화 후 available = min(floor(stock/qty))
    const skuRows = await this.app.db
      .select({
        channelVariantId: listedProductSkus.channelVariantId,
        channelSellerCode: listedProductSkus.channelSellerCode,
        skuId: listedProductSkus.skuId,
        qty: listedProductSkus.qty,
        stock: skus.stock,
      })
      .from(listedProductSkus)
      .innerJoin(skus, eq(listedProductSkus.skuId, skus.id))
      .where(eq(listedProductSkus.listedProductId, listedProductId));

    if (skuRows.length === 0) {
      return {
        status: "NO_VARIANTS" as const,
        message: "연결된 SKU 매핑이 없습니다.",
      };
    }

    // channelVariantId → BOM rows
    const byChannelVariant = new Map<
      string,
      Array<{ qty: number; stock: number }>
    >();
    for (const r of skuRows) {
      const list = byChannelVariant.get(r.channelVariantId) ?? [];
      list.push({ qty: r.qty, stock: r.stock });
      byChannelVariant.set(r.channelVariantId, list);
    }

    // Qoo10 single-product (channelVariantId === channelItemId): updateProduct 로 라우팅
    const channelVariantIds = Array.from(byChannelVariant.keys());
    const isQoo10SingleProduct =
      channelType === "QOO10_JP" &&
      channelVariantIds.length === 1 &&
      channelVariantIds[0] === item.channelItemId;

    if (isQoo10SingleProduct && adapter.updateProduct) {
      const cvid = channelVariantIds[0]!;
      const stock = this.computeAvailableStock(byChannelVariant.get(cvid)!);
      try {
        await adapter.updateProduct(item.channelItemId, { qty: stock });
        return {
          status: "OK" as const,
          updates: [{ channelVariantId: cvid, stock, status: "ok" }],
        };
      } catch (err) {
        return {
          status: "OK" as const,
          updates: [
            {
              channelVariantId: cvid,
              stock,
              status: err instanceof Error ? err.message : "error",
            },
          ],
        };
      }
    }

    if (!adapter.pushVariantStock) {
      return {
        status: "UNSUPPORTED" as const,
        message: "이 채널은 변형 단위 재고 업데이트를 지원하지 않습니다.",
      };
    }

    const updates: Array<{
      channelVariantId: string;
      stock: number;
      status: string;
    }> = [];
    for (const [channelVariantId, rows] of byChannelVariant) {
      const stock = this.computeAvailableStock(rows);
      try {
        await adapter.pushVariantStock(
          item.channelItemId,
          channelVariantId,
          stock,
        );
        updates.push({ channelVariantId, stock, status: "ok" });
      } catch (err) {
        updates.push({
          channelVariantId,
          stock,
          status: err instanceof Error ? err.message : "error",
        });
      }
    }

    return { status: "OK" as const, updates };
  }

  // ─── 상품 정보 동기화 (master info → channel) ─────────────────

  async syncProductInfoToChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);
    const master = await this.getMasterProduct(item.masterProductId!);
    if (!master) throw new Error("마스터 상품을 찾을 수 없습니다.");

    const { ChannelService } = await import("./ChannelService");
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.updateProduct) {
      return {
        status: "UNSUPPORTED" as const,
        message: "이 채널은 상품 정보 수정을 지원하지 않습니다.",
      };
    }

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(eq(channels.id, item.channelId));

    const vendorKey =
      channel?.channelType === "QOO10_JP"
        ? "qoo10"
        : (channel?.channelType ?? "").toLowerCase();
    const attrsRoot =
      (master.attributes as Record<string, unknown> | null) ?? {};
    const commonAttrs =
      (attrsRoot["common"] as Record<string, unknown> | undefined) ?? {};
    const channelAttrs =
      (attrsRoot[vendorKey] as Record<string, unknown> | undefined) ?? {};

    const commonStr = (key: string) =>
      typeof commonAttrs[key] === "string" ? (commonAttrs[key] as string) : "";
    const commonArr = (key: string) =>
      Array.isArray(commonAttrs[key]) ? (commonAttrs[key] as unknown[]) : [];
    const commonNum = (key: string) =>
      typeof commonAttrs[key] === "number"
        ? (commonAttrs[key] as number)
        : undefined;
    const commonRetailPrice = (() => {
      const v = commonAttrs["retailPrice"];
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
      return undefined;
    })();

    // 연결된 변형 목록은 여전히 master_product_variants 기준이지만,
    // 재고는 SKU(masterVariantSkus → skus) 기준 available stock 으로 환산.
    const variantLinkRows = await this.app.db
      .select()
      .from(listedProductVariantLinks)
      .where(eq(listedProductVariantLinks.listedProductId, listedProductId));

    let totalStock: number | undefined;
    type LinkedVariant = {
      id: string;
      sku: string;
      price: string | null;
      stock: number;
      options: VariantOptionView[];
    };
    let linkedVariants: LinkedVariant[] = [];
    if (variantLinkRows.length > 0) {
      const masterVariantIds = variantLinkRows.map((vl) => vl.masterVariantId);
      const dbVariants = await this.app.db
        .select()
        .from(masterProductVariants)
        .where(inArray(masterProductVariants.id, masterVariantIds));
      const optMap = await this.loadVariantOptions(masterVariantIds);
      const variantStocks = await Promise.all(
        dbVariants.map(
          async (v) =>
            [
              v.id,
              this.computeAvailableStock(
                await this.loadSkusForMasterVariant(v.id),
              ),
            ] as const,
        ),
      );
      const stockByVariant = new Map(variantStocks);
      totalStock = Array.from(stockByVariant.values()).reduce(
        (sum, s) => sum + s,
        0,
      );
      linkedVariants = dbVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock: stockByVariant.get(v.id) ?? 0,
        options: optMap.get(v.id) ?? [],
      }));
    }

    type AnyVariantWithOptions = {
      id: string;
      sku: string;
      price: string | null;
      stock: number;
      options: VariantOptionView[];
    };
    const allVariants: AnyVariantWithOptions[] =
      linkedVariants.length > 0
        ? linkedVariants
        : (master.variants ?? []).map((v) => ({
            id: v.id,
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            options: v.options,
          }));
    const firstVariant = allVariants[0];
    const firstPrice = firstVariant?.price ?? commonRetailPrice ?? null;
    const firstSku = firstVariant?.sku ?? null;
    const masterTags = commonArr("tags") as string[];
    const brandStr = commonStr("brand");

    const payload: Record<string, unknown> = {
      ...channelAttrs,
      title: master.title,
      descriptionHtml: commonStr("descriptionHtml"),
      images: commonArr("images"),
      brand: brandStr,
      vendor: brandStr,
      material: commonStr("material"),
      weightG: commonNum("weightG"),
      tags: masterTags,
      hsCode: commonStr("hsCode"),
      countryOfOrigin: commonStr("countryOfOrigin"),
      ...(totalStock !== undefined ? { inventoryQuantity: totalStock } : {}),
      ...(firstPrice !== null && firstPrice !== undefined
        ? { price: String(firstPrice) }
        : {}),
      ...(firstSku ? { sku: firstSku } : {}),
    };

    // Shopify 다중 변형: variantPriceUpdates 로 옵션값 조합별 가격 전송
    // combination 은 그룹 position 순서대로 { name, value } 쌍을 보낸다.
    // 어댑터 측에서 selectedOptions 와 정확히 매칭하기 위해 name 까지 포함.
    if (channel?.channelType === "SHOPIFY" && allVariants.length > 1) {
      const groups = master.optionGroups ?? [];
      payload.variantPriceUpdates = allVariants
        .filter((v) => v.price !== null && v.price !== undefined)
        .map((v) => ({
          combination: groups.map((g) => {
            const match = v.options.find((o) => o.groupId === g.id);
            return { name: g.name, value: match ? match.value : "" };
          }),
          price: String(v.price),
        }));
    }

    this.app.log.info(
      {
        channelType: channel?.channelType,
        variantCount: allVariants.length,
        firstPrice,
        totalStock,
        hasVariantPriceUpdates: Array.isArray(payload.variantPriceUpdates),
      },
      "[syncProductInfoToChannel] dispatching to adapter",
    );

    await adapter.updateProduct(item.channelItemId, payload);

    return { status: "OK" as const, channelItemId: item.channelItemId };
  }

  // ─── Private ─────────────────────────────────────────────────

  private async assertOwnership(masterProductId: string) {
    const [p] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(
        and(
          eq(masterProducts.id, masterProductId),
          eq(masterProducts.userId, this.userId),
        ),
      );
    if (!p) throw new Error("마스터 상품을 찾을 수 없습니다.");
  }

  /**
   * 마스터 상품의 옵션 그룹 + 그룹별 값 목록을 position 순으로 반환.
   */
  private async loadOptionGroups(masterProductId: string) {
    const groups = await this.app.db
      .select()
      .from(masterProductOptionGroups)
      .where(eq(masterProductOptionGroups.masterProductId, masterProductId))
      .orderBy(asc(masterProductOptionGroups.position));

    if (groups.length === 0)
      return [] as Array<{
        id: string;
        name: string;
        position: number;
        values: Array<{ id: string; value: string; position: number }>;
      }>;

    const groupIds = groups.map((g) => g.id);
    const values = await this.app.db
      .select()
      .from(masterProductOptionValues)
      .where(inArray(masterProductOptionValues.groupId, groupIds))
      .orderBy(asc(masterProductOptionValues.position));

    const valuesByGroup = new Map<
      string,
      Array<{ id: string; value: string; position: number }>
    >();
    for (const v of values) {
      const arr = valuesByGroup.get(v.groupId) ?? [];
      arr.push({ id: v.id, value: v.value, position: v.position });
      valuesByGroup.set(v.groupId, arr);
    }

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      position: g.position,
      values: valuesByGroup.get(g.id) ?? [],
    }));
  }

  /**
   * variantId 배열에 대해 (groupId, groupName, groupPosition, optionValueId, value, valuePosition) 매핑을 한 번에 로드.
   */
  private async loadVariantOptions(
    variantIds: string[],
  ): Promise<Map<string, VariantOptionView[]>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.app.db
      .select({
        variantId: masterProductVariantOptionValues.variantId,
        optionValueId: masterProductVariantOptionValues.optionValueId,
        groupId: masterProductOptionGroups.id,
        groupName: masterProductOptionGroups.name,
        groupPosition: masterProductOptionGroups.position,
        value: masterProductOptionValues.value,
        valuePosition: masterProductOptionValues.position,
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
      .where(inArray(masterProductVariantOptionValues.variantId, variantIds));

    const map = new Map<string, VariantOptionView[]>();
    for (const r of rows) {
      const arr = map.get(r.variantId) ?? [];
      arr.push({
        groupId: r.groupId,
        groupName: r.groupName,
        groupPosition: r.groupPosition,
        optionValueId: r.optionValueId,
        value: r.value,
        valuePosition: r.valuePosition,
      });
      map.set(r.variantId, arr);
    }
    return map;
  }

  /**
   * 입력 (groupName, value) 배열을 해당 마스터 상품의 optionValueId 배열로 변환.
   * 존재하지 않는 그룹/값이 있으면 에러.
   */
  private async resolveOptionValueIds(
    masterProductId: string,
    optionValues: VariantOptionValueInput[],
  ): Promise<string[]> {
    if (optionValues.length === 0) return [];

    const groups = await this.loadOptionGroups(masterProductId);
    if (groups.length === 0) {
      throw new Error(
        "이 마스터 상품에는 옵션 그룹이 정의되어 있지 않습니다. setOptionGroups 를 먼저 호출하세요.",
      );
    }

    // 한 그룹당 한 값만 허용
    const seenGroupIds = new Set<string>();
    const result: string[] = [];

    for (const ov of optionValues) {
      const group = groups.find((g) => g.name === ov.groupName);
      if (!group) {
        throw new Error(`존재하지 않는 옵션 그룹: ${ov.groupName}`);
      }
      if (seenGroupIds.has(group.id)) {
        throw new Error(
          `한 변형에는 그룹당 옵션값을 하나만 지정할 수 있습니다: ${ov.groupName}`,
        );
      }
      seenGroupIds.add(group.id);

      const value = group.values.find((v) => v.value === ov.value);
      if (!value) {
        throw new Error(`존재하지 않는 옵션 값: ${ov.groupName}=${ov.value}`);
      }
      result.push(value.id);
    }

    return result;
  }

  /**
   * 동일한 (그룹별 옵션값) 조합을 가진 다른 variant 가 이미 있는지 검증.
   * excludeVariantId 가 주어지면 그 variant 는 제외하고 검사 (update 시 자기 자신 제외).
   */
  private async assertNoVariantWithSameOptions(
    masterProductId: string,
    optionValueIds: string[],
    excludeVariantId?: string,
  ) {
    if (optionValueIds.length === 0) {
      // 옵션 0개 변형은 마스터당 1개만 허용
      const variants = await this.app.db
        .select({ id: masterProductVariants.id })
        .from(masterProductVariants)
        .where(eq(masterProductVariants.masterProductId, masterProductId));

      for (const v of variants) {
        if (excludeVariantId && v.id === excludeVariantId) continue;
        const links = await this.app.db
          .select({ ovId: masterProductVariantOptionValues.optionValueId })
          .from(masterProductVariantOptionValues)
          .where(eq(masterProductVariantOptionValues.variantId, v.id));
        if (links.length === 0) {
          throw new Error(
            "옵션이 없는 변형은 마스터 상품당 하나만 허용됩니다.",
          );
        }
      }
      return;
    }

    const variants = await this.app.db
      .select({ id: masterProductVariants.id })
      .from(masterProductVariants)
      .where(eq(masterProductVariants.masterProductId, masterProductId));

    const target = new Set(optionValueIds);
    for (const v of variants) {
      if (excludeVariantId && v.id === excludeVariantId) continue;
      const links = await this.app.db
        .select({ ovId: masterProductVariantOptionValues.optionValueId })
        .from(masterProductVariantOptionValues)
        .where(eq(masterProductVariantOptionValues.variantId, v.id));
      if (links.length !== target.size) continue;
      const same = links.every((l) => target.has(l.ovId));
      if (same) {
        throw new Error("동일한 옵션 조합을 가진 변형이 이미 존재합니다.");
      }
    }
  }

  // ─── SKU 기반 재고 헬퍼 ─────────────────────────────────────
  // 0006 마이그레이션 전까지 master_product_variants.stock 컬럼은 살아있지만
  // 재고의 source of truth 는 skus.stock 으로 통일. 아래 헬퍼들이 그 변환을 담당.

  /**
   * 특정 채널 옵션(channelVariantId)에 매핑된 SKU 행과 BOM qty 를 로드.
   */
  private async loadSkusForChannelVariant(
    listedProductId: string,
    channelVariantId: string,
  ): Promise<Array<{ skuId: string; qty: number; stock: number }>> {
    const rows = await this.app.db
      .select({
        skuId: listedProductSkus.skuId,
        qty: listedProductSkus.qty,
        stock: skus.stock,
      })
      .from(listedProductSkus)
      .innerJoin(skus, eq(listedProductSkus.skuId, skus.id))
      .where(
        and(
          eq(listedProductSkus.listedProductId, listedProductId),
          eq(listedProductSkus.channelVariantId, channelVariantId),
        ),
      );
    return rows;
  }

  /**
   * 마스터 variant 에 매핑된 SKU 행(BOM)을 로드. variant 단위로 available stock 환산할 때 사용.
   */
  private async loadSkusForMasterVariant(
    masterVariantId: string,
  ): Promise<Array<{ skuId: string; qty: number; stock: number }>> {
    const rows = await this.app.db
      .select({
        skuId: masterVariantSkus.skuId,
        qty: masterVariantSkus.qty,
        stock: skus.stock,
      })
      .from(masterVariantSkus)
      .innerJoin(skus, eq(masterVariantSkus.skuId, skus.id))
      .where(eq(masterVariantSkus.masterVariantId, masterVariantId));
    return rows;
  }

  /**
   * 여러 마스터 variant 에 부착된 SKU 정보를 한 번에 로드 (N+1 회피).
   * projection 에 attachedSkus 필드를 포함시킬 때 사용.
   */
  private async loadAttachedSkusForVariants(
    variantIds: string[],
  ): Promise<
    Map<
      string,
      Array<{
        skuId: string;
        code: string;
        qty: number;
        position: number;
        stock: number;
      }>
    >
  > {
    const map = new Map<
      string,
      Array<{
        skuId: string;
        code: string;
        qty: number;
        position: number;
        stock: number;
      }>
    >();
    if (variantIds.length === 0) return map;

    const rows = await this.app.db
      .select({
        masterVariantId: masterVariantSkus.masterVariantId,
        skuId: masterVariantSkus.skuId,
        qty: masterVariantSkus.qty,
        position: masterVariantSkus.position,
        code: skus.code,
        stock: skus.stock,
      })
      .from(masterVariantSkus)
      .innerJoin(skus, eq(masterVariantSkus.skuId, skus.id))
      .where(inArray(masterVariantSkus.masterVariantId, variantIds))
      .orderBy(asc(masterVariantSkus.position));

    for (const r of rows) {
      const arr = map.get(r.masterVariantId) ?? [];
      arr.push({
        skuId: r.skuId,
        code: r.code,
        qty: r.qty,
        position: r.position,
        stock: r.stock,
      });
      map.set(r.masterVariantId, arr);
    }
    return map;
  }

  /**
   * BOM 행들로부터 채널에 push 할 수 있는 변형 단위 재고 = min over rows of floor(stock / qty).
   * BOM 이 비어 있으면 0 (= 매핑 누락 시 안전하게 품절 처리).
   */
  private computeAvailableStock(
    rows: Array<{ qty: number; stock: number }>,
  ): number {
    if (rows.length === 0) return 0;
    let minAvail = Number.POSITIVE_INFINITY;
    for (const r of rows) {
      const q = Math.max(1, r.qty);
      const avail = Math.floor(Math.max(0, r.stock) / q);
      if (avail < minAvail) minAvail = avail;
    }
    return Number.isFinite(minAvail) ? minAvail : 0;
  }
}
