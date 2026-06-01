import type { FastifyInstance } from 'fastify';
import { and, eq, ilike, desc, count, sql, inArray, asc } from 'drizzle-orm';
import {
  masterProducts,
  masterProductVariants,
  masterProductOptionGroups,
  masterProductOptionValues,
  masterProductVariantOptionValues,
  listedProducts,
  listedProductVariantLinks,
  channels,
  masterStockLedger,
} from '../db/schema';

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
  sku: string;
  price?: string;
  stock?: number;
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

  async listMasterProducts(opts: { search?: string; page?: number; pageSize?: number }) {
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
      this.app.db
        .select({ total: count() })
        .from(masterProducts)
        .where(where),
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

    const variantMap = new Map(variantCounts.map((r) => [r.masterProductId, r.cnt]));
    const listedMap = new Map(listedCounts.map((r) => [r.masterProductId, r.cnt]));

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
      .where(and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)));

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

    const variantOptionMap = await this.loadVariantOptions(variantRows.map((v) => v.id));
    const variants = variantRows.map((v) => {
      const opts = variantOptionMap.get(v.id) ?? [];
      return {
        ...v,
        options: opts,
        optionLabel: opts
          .slice()
          .sort((a, b) => a.groupPosition - b.groupPosition)
          .map((o) => `${o.groupName}=${o.value}`)
          .join(' / '),
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

    const [created] = await this.app.db.insert(masterProducts).values(row).returning();
    return created;
  }

  // ─── 마스터 상품 수정 ─────────────────────────────────────────

  async updateMasterProduct(id: string, input: Partial<MasterProductCreateInput>) {
    const [existing] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)));

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
        .set({ syncStatus: 'PENDING', updatedAt: new Date() })
        .where(eq(listedProducts.masterProductId, id));
    }

    return { ...updated, linkedCount: linked.length };
  }

  // ─── 마스터 상품 삭제 ─────────────────────────────────────────

  async deleteMasterProduct(id: string) {
    const [existing] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(and(eq(masterProducts.id, id), eq(masterProducts.userId, this.userId)));

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
      if (!name) throw new Error('옵션 그룹 이름은 비워둘 수 없습니다.');
      if (seenGroupNames.has(name)) throw new Error(`옵션 그룹 이름이 중복됩니다: ${name}`);
      seenGroupNames.add(name);
    }

    const insertedGroups: Array<typeof masterProductOptionGroups.$inferSelect> = [];
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
        if (seenValues.has(v)) throw new Error(`옵션 값이 중복됩니다: ${g.name}=${v}`);
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

    const optionValueIds = await this.resolveOptionValueIds(masterProductId, input.optionValues ?? []);
    await this.assertNoVariantWithSameOptions(masterProductId, optionValueIds);

    const row: MasterProductVariantInsert = {
      masterProductId,
      sku: input.sku,
      price: input.price,
      stock: input.stock ?? 0,
      extraAttributes: input.extraAttributes ?? {},
    };

    const [created] = await this.app.db.insert(masterProductVariants).values(row).returning();

    if (optionValueIds.length > 0) {
      await this.app.db
        .insert(masterProductVariantOptionValues)
        .values(optionValueIds.map((ovId) => ({ variantId: created.id, optionValueId: ovId })));
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
      const optionValueIds = await this.resolveOptionValueIds(masterProductId, optionValues);
      await this.assertNoVariantWithSameOptions(masterProductId, optionValueIds, variantId);

      await this.app.db
        .delete(masterProductVariantOptionValues)
        .where(eq(masterProductVariantOptionValues.variantId, variantId));

      if (optionValueIds.length > 0) {
        await this.app.db
          .insert(masterProductVariantOptionValues)
          .values(optionValueIds.map((ovId) => ({ variantId, optionValueId: ovId })));
      }
    }

    if (before && updated && typeof input.stock === 'number' && before.stock !== updated.stock) {
      const now = new Date();
      await this.app.db.insert(masterStockLedger).values({
        userId: this.userId,
        variantId,
        type: 'MANUAL_ADJUST',
        qtyDelta: updated.stock - before.stock,
        prevStock: before.stock,
        newStock: updated.stock,
        refType: 'USER',
        refId: this.userId,
        note: '수동 재고 변경',
      });

      // 이 마스터에 연결된 모든 listedProducts의 _salesPullBaselineAt 갱신 + 채널 재고 push
      const linked = await this.app.db
        .select()
        .from(listedProducts)
        .where(eq(listedProducts.masterProductId, masterProductId));

      const { ChannelService } = await import('./ChannelService');
      const channelSvc = new ChannelService(this.app, this.userId);

      for (const lp of linked) {
        const cd = (lp.channelData as Record<string, unknown> | null) ?? {};
        await this.app.db
          .update(listedProducts)
          .set({
            channelData: { ...cd, _salesPullBaselineAt: now.toISOString() },
            updatedAt: now,
          })
          .where(eq(listedProducts.id, lp.id));

        // 이 variant에 매핑된 채널 variantId를 찾아 재고 push
        const variantLinks = await this.app.db
          .select({ channelVariantId: listedProductVariantLinks.channelVariantId })
          .from(listedProductVariantLinks)
          .where(
            and(
              eq(listedProductVariantLinks.listedProductId, lp.id),
              eq(listedProductVariantLinks.masterVariantId, variantId),
            ),
          );

        if (variantLinks.length > 0) {
          try {
            const adapter = await channelSvc.getAdapter(lp.channelId);
            if (adapter.pushVariantStock) {
              for (const vl of variantLinks) {
                await adapter.pushVariantStock(lp.channelItemId, vl.channelVariantId, updated.stock);
              }
            }
          } catch (pushErr) {
            // push 실패는 비치명적 — 로그만 남기고 진행
            this.app.log.warn({ err: pushErr, listedProductId: lp.id, variantId }, 'channel stock push failed');
          }
        }
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

    const optMap = await this.loadVariantOptions([variantId]);
    const opts = optMap.get(variantId) ?? [];
    return {
      ...variant,
      options: opts,
      optionLabel: opts
        .slice()
        .sort((a, b) => a.groupPosition - b.groupPosition)
        .map((o) => `${o.groupName}=${o.value}`)
        .join(' / '),
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

    const optMap = await this.loadVariantOptions(variants.map((v) => v.id));
    return variants.map((v) => {
      const opts = optMap.get(v.id) ?? [];
      return {
        ...v,
        options: opts,
        optionLabel: opts
          .slice()
          .sort((a, b) => a.groupPosition - b.groupPosition)
          .map((o) => `${o.groupName}=${o.value}`)
          .join(' / '),
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
      .where(and(eq(listedProducts.id, id), eq(listedProducts.userId, this.userId)));

    if (!item) throw new Error('판매상품을 찾을 수 없습니다.');
    return item;
  }

  async listListedProducts(opts: { channelId?: string; masterProductId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, opts.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(listedProducts.userId, this.userId)];
    if (opts.channelId) conditions.push(eq(listedProducts.channelId, opts.channelId));
    if (opts.masterProductId) conditions.push(eq(listedProducts.masterProductId, opts.masterProductId));

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

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── 마스터 ↔ 채널 연결 ──────────────────────────────────────

  async linkToChannel(
    masterProductId: string,
    channelId: string,
    channelItemId: string,
    variantLinks: Array<{ masterVariantId: string; channelVariantId: string; channelSellerCode?: string }>,
  ) {
    await this.assertOwnership(masterProductId);

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.userId, this.userId)));
    if (!channel) throw new Error('채널을 찾을 수 없습니다.');

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
          syncStatus: 'PENDING',
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
      .where(and(eq(listedProducts.id, listedProductId), eq(listedProducts.userId, this.userId)));

    if (!item) throw new Error('판매상품을 찾을 수 없습니다.');

    await this.app.db.delete(listedProducts).where(eq(listedProducts.id, listedProductId));
    return true;
  }

  // ─── 판매 동기화 (channel orders → master stock 차감) ─────────

  async pullSalesFromChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);

    const { ChannelService } = await import('./ChannelService');
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.getOrders) {
      return { status: 'UNSUPPORTED' as const, message: '이 채널은 주문 조회를 지원하지 않습니다.' };
    }

    // 변형 링크 조회: channelVariantId → masterVariantId
    const variantLinkRows = await this.app.db
      .select()
      .from(listedProductVariantLinks)
      .where(eq(listedProductVariantLinks.listedProductId, listedProductId));

    if (variantLinkRows.length === 0) {
      return { status: 'NO_VARIANTS' as const, message: '연결된 변형이 없습니다.' };
    }

    const channelVariantToMasterVariantId = new Map(
      variantLinkRows.map((vl) => [vl.channelVariantId, vl.masterVariantId]),
    );

    // 마스터 변형 목록 조회
    const masterVariantIds = variantLinkRows.map((vl) => vl.masterVariantId);
    const dbVariants = await this.app.db
      .select()
      .from(masterProductVariants)
      .where(inArray(masterProductVariants.id, masterVariantIds));
    const variantById = new Map(dbVariants.map((v) => [v.id, v]));

    const channelData = (item.channelData as Record<string, unknown> | null) ?? {};
    const processedOrderIds = new Set<string>(
      Array.isArray(channelData['_processedOrderIds'])
        ? (channelData['_processedOrderIds'] as unknown[]).filter((v): v is string => typeof v === 'string')
        : [],
    );
    const lastPullIso = typeof channelData['_lastSalesPullAt'] === 'string'
      ? (channelData['_lastSalesPullAt'] as string)
      : null;
    const baselineIso = typeof channelData['_salesPullBaselineAt'] === 'string'
      ? (channelData['_salesPullBaselineAt'] as string)
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
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;

    const orders = await adapter.getOrders({
      startDate: fmtYYYYMMDD(start),
      endDate: fmtYYYYMMDD(now),
    });

    const variantQty = new Map<string, number>();
    const variantOrderQty = new Map<string, Map<string, number>>();
    const newProcessedIds: string[] = [];
    for (const ord of orders) {
      if (processedOrderIds.has(ord.id)) continue;
      const ordTime = new Date(ord.orderedAt).getTime();
      if (Number.isFinite(ordTime) && baselineMs !== null && ordTime < baselineMs) {
        newProcessedIds.push(ord.id);
        continue;
      }
      let matched = false;
      for (const li of ord.items) {
        // channelVariantId 기반 매핑 (SKU 대신 채널 변형 ID 사용)
        const channelVarId = li.channelVariantId ?? li.sku;
        if (!channelVarId) continue;
        const masterVariantId = channelVariantToMasterVariantId.get(channelVarId);
        if (!masterVariantId) continue;
        const qty = li.quantity ?? 0;
        if (qty <= 0) continue;
        variantQty.set(masterVariantId, (variantQty.get(masterVariantId) ?? 0) + qty);
        const m = variantOrderQty.get(masterVariantId) ?? new Map<string, number>();
        m.set(ord.id, (m.get(ord.id) ?? 0) + qty);
        variantOrderQty.set(masterVariantId, m);
        matched = true;
      }
      if (matched) newProcessedIds.push(ord.id);
    }

    const deductions: Array<{ sku: string; soldQty: number; prevStock: number; newStock: number }> = [];
    for (const [masterVariantId, qty] of variantQty) {
      if (qty <= 0) continue;
      const dbVar = variantById.get(masterVariantId);
      if (!dbVar) continue;
      const [updated] = await this.app.db
        .update(masterProductVariants)
        .set({ stock: sql`GREATEST(${masterProductVariants.stock} - ${qty}, 0)`, updatedAt: new Date() })
        .where(eq(masterProductVariants.id, masterVariantId))
        .returning();

      const orderQtys = variantOrderQty.get(masterVariantId) ?? new Map<string, number>();
      let runningStock = dbVar.stock;
      const ledgerRows: Array<typeof masterStockLedger.$inferInsert> = [];
      for (const [orderId, oqty] of orderQtys) {
        const next = Math.max(0, runningStock - oqty);
        ledgerRows.push({
          userId: this.userId,
          variantId: masterVariantId,
          type: 'SALE',
          qtyDelta: -oqty,
          prevStock: runningStock,
          newStock: next,
          refType: 'ORDER',
          refId: orderId,
          channelId: item.channelId,
          listedProductId,
        });
        runningStock = next;
      }
      if (ledgerRows.length > 0) {
        await this.app.db.insert(masterStockLedger).values(ledgerRows);
      }

      deductions.push({
        sku: dbVar.sku ?? '',
        soldQty: qty,
        prevStock: dbVar.stock,
        newStock: updated?.stock ?? dbVar.stock,
      });
    }

    // Phase 5: 판매 차감 후 연결된 채널에 새 재고 push (best-effort)
    if (deductions.length > 0) {
      const { ChannelService } = await import('./ChannelService');
      const channelSvc = new ChannelService(this.app, this.userId);

      for (const [masterVariantId, qty] of variantQty) {
        const dbVar = variantById.get(masterVariantId);
        if (!dbVar) continue;
        const newStock = Math.max(0, dbVar.stock - qty);

        const allVariantLinks = await this.app.db
          .select({
            channelVariantId: listedProductVariantLinks.channelVariantId,
            listedProductId: listedProductVariantLinks.listedProductId,
            channelId: listedProducts.channelId,
            channelItemId: listedProducts.channelItemId,
          })
          .from(listedProductVariantLinks)
          .innerJoin(listedProducts, eq(listedProductVariantLinks.listedProductId, listedProducts.id))
          .where(eq(listedProductVariantLinks.masterVariantId, masterVariantId));

        for (const vl of allVariantLinks) {
          try {
            const adapter = await channelSvc.getAdapter(vl.channelId);
            if (adapter.pushVariantStock) {
              await adapter.pushVariantStock(vl.channelItemId, vl.channelVariantId, newStock);
            }
          } catch (pushErr) {
            this.app.log.warn({ err: pushErr, masterVariantId }, 'channel stock push after pull-sales failed');
          }
        }
      }
    }

    const mergedProcessedIds = Array.from(new Set([...processedOrderIds, ...newProcessedIds]));
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
      status: 'OK' as const,
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
    if (!master) throw new Error('마스터 상품을 찾을 수 없습니다.');

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.userId, this.userId)));
    if (!channel) throw new Error('채널을 찾을 수 없습니다.');

    // 이미 등록된 경우 중복 방지
    const [existing] = await this.app.db
      .select({ id: listedProducts.id, channelItemId: listedProducts.channelItemId })
      .from(listedProducts)
      .where(
        and(
          eq(listedProducts.masterProductId, masterProductId),
          eq(listedProducts.channelId, channelId),
        ),
      );
    if (existing) throw new Error('이미 해당 채널에 등록된 상품입니다.');

    const { ChannelService } = await import('./ChannelService');
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(channelId);

    if (!adapter.registerProduct) {
      throw new Error('이 채널은 상품 등록을 지원하지 않습니다.');
    }

    // vendor key: QTEN → qoo10, SHOPIFY → shopify, etc.
    const vendorKey = channel.channelType === 'QOO10_JP' ? 'qoo10' : channel.channelType.toLowerCase();
    const attrsRoot = (master.attributes as Record<string, unknown> | null) ?? {};
    const commonAttrs = (attrsRoot['common'] as Record<string, unknown> | undefined) ?? {};
    const channelAttrs = (attrsRoot[vendorKey] as Record<string, unknown> | undefined) ?? {};

    const variants = master.variants ?? [];
    const optionGroups = master.optionGroups ?? [];

    const commonStr = (key: string) => (typeof commonAttrs[key] === 'string' ? (commonAttrs[key] as string) : '');
    const commonArr = (key: string) => (Array.isArray(commonAttrs[key]) ? (commonAttrs[key] as unknown[]) : []);
    const commonNum = (key: string) => (typeof commonAttrs[key] === 'number' ? (commonAttrs[key] as number) : undefined);
    const commonRetailPrice = (() => {
      const v = commonAttrs['retailPrice'];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
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
    if (channel.channelType === 'QOO10_JP' && optionGroups.length > 0 && variants.length > 1) {
      // Qoo10 ItemType format per combination row:
      // 그룹1||*값1||*그룹2||*값2||*가격||*수량||*판매자코드  — rows joined by $$
      qoo10Variants = variants.map((v) => {
        const optionPath = optionGroups
          .map((g) => {
            const match = v.options.find((o) => o.groupId === g.id);
            return `${g.name}||*${match ? match.value : ''}`;
          })
          .join('$$');
        return {
          optionPath,
          sku: v.sku,
          price: String(v.price ?? commonRetailPrice ?? '0'),
          qty: v.stock ?? 0,
        };
      });
      itemTypeStr = qoo10Variants
        .map((v) => {
          // optionPath: "그룹1||*값1$$그룹2||*값2" → "그룹1||*값1||*그룹2||*값2"
          const axesPart = v.optionPath.replace(/\$\$/g, '||*');
          const sellerCode = v.sku || '0';
          // 가격은 0 (차액=0, 실가격은 ItemPrice 기준), 수량은 실제값
          return `${axesPart}||*0||*${v.qty}||*${sellerCode}`;
        })
        .join('$$');
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
    if (channel.channelType === 'SHOPIFY' && optionGroups.length > 0 && variants.length > 1) {
      shopifyOptions = optionGroups.map((g) => ({
        name: g.name,
        values: g.values.map((v) => v.value),
      }));
      shopifyVariants = variants.map((v) => {
        // 그룹 position 순서로 옵션값을 배열한다 — Shopify 는 productOptions 순서와 1:1 매칭을 기대.
        const optionValuesOrdered = optionGroups.map((g) => {
          const match = v.options.find((o) => o.groupId === g.id);
          return match ? match.value : '';
        });
        return {
          options: optionValuesOrdered,
          price: String(v.price ?? commonRetailPrice ?? '0'),
          sku: v.sku,
          inventoryQuantity: v.stock ?? 0,
        };
      });
    }

    // countryOfOrigin → originType 추론 (Qoo10 어댑터 폴백용)
    const countryOfOrigin = commonStr('countryOfOrigin');
    const originTypeFromCountry = (() => {
      const co = countryOfOrigin.trim();
      if (!co || co === '대한민국' || co === '국내') return 'domestic';
      if (co === '기타' || co === '기타(ETC)') return 'other';
      return 'overseas';
    })();

    const flatInput: Record<string, unknown> = {
      ...channelAttrs,
      title: master.title,
      descriptionHtml: commonStr('descriptionHtml'),
      images: commonArr('images'),
      tags: commonArr('tags'),
      material: commonStr('material'),
      weightG: commonNum('weightG'),
      brand: commonStr('brand'),
      countryOfOrigin,
      originType: originTypeFromCountry,
      sku: variants[0]?.sku ?? '',
      price: String(variants[0]?.price ?? commonRetailPrice ?? '0'),
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
      '[registerToChannel] dispatching to adapter',
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
          await this.app.db.insert(listedProductVariantLinks).values(linkRows).onConflictDoNothing();
        }
      } catch (err) {
        this.app.log.warn({ err, productId }, 'failed to fetch channel variants after register');
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
      return { status: 'NO_CHANNELS' as const, message: '연결된 채널이 없습니다.', results: [] };
    }

    const results: Array<{ listedProductId: string; status: string; deductions?: unknown }> = [];
    for (const lp of listed) {
      try {
        const result = await this.pullSalesFromChannel(lp.id);
        results.push({ listedProductId: lp.id, status: result.status, deductions: result.deductions });
      } catch (err) {
        results.push({ listedProductId: lp.id, status: err instanceof Error ? err.message : 'error' });
      }
    }

    return { status: 'OK' as const, results };
  }

  // ─── 마스터 상품 전체 채널 재고 전송 (마스터→채널) ───────────

  async pushMasterStockToAllChannels(masterProductId: string) {
    await this.assertOwnership(masterProductId);

    const listed = await this.app.db
      .select({ id: listedProducts.id })
      .from(listedProducts)
      .where(eq(listedProducts.masterProductId, masterProductId));

    if (listed.length === 0) {
      return { status: 'NO_CHANNELS' as const, message: '연결된 채널이 없습니다.', results: [] };
    }

    const results: Array<{ listedProductId: string; status: string; updates?: unknown }> = [];
    for (const lp of listed) {
      try {
        const result = await this.pushStockToChannel(lp.id);
        results.push({ listedProductId: lp.id, status: result.status, updates: 'updates' in result ? result.updates : undefined });
      } catch (err) {
        results.push({ listedProductId: lp.id, status: err instanceof Error ? err.message : 'error' });
      }
    }

    return { status: 'OK' as const, results };
  }

  // ─── 재고 동기화 (master stock → channel) ────────────────────

  async pushStockToChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);

    const { ChannelService } = await import('./ChannelService');
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.pushVariantStock && !adapter.updateProduct) {
      return { status: 'UNSUPPORTED' as const, message: '이 채널은 재고 업데이트를 지원하지 않습니다.' };
    }

    const channelType = item.channelType;

    let variantLinkRows = await this.app.db
      .select()
      .from(listedProductVariantLinks)
      .where(eq(listedProductVariantLinks.listedProductId, listedProductId));

    // Fallback: link이 비어있으면 채널에서 다시 가져와 생성
    if (variantLinkRows.length === 0 && adapter.getChannelProduct && item.masterProductId) {
      try {
        const master = await this.getMasterProduct(item.masterProductId);
        const masterVariants = master?.variants ?? [];
        const channelProduct = await adapter.getChannelProduct(item.channelItemId);
        const channelVariants = channelProduct.variants ?? [];
        const skuToMaster = new Map<string, string>();
        for (const v of masterVariants) {
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
          } else if (masterVariants.length === 1 && masterVariants[0]) {
            masterVariantId = masterVariants[0].id;
          } else if (masterVariants[i]) {
            masterVariantId = masterVariants[i]!.id;
          }
          if (!masterVariantId) continue;
          linkRows.push({
            listedProductId,
            masterVariantId,
            channelVariantId: cv.channelVariantId,
            channelSellerCode: cv.optionCode ?? null,
          });
        }
        if (linkRows.length > 0) {
          await this.app.db.insert(listedProductVariantLinks).values(linkRows).onConflictDoNothing();
          variantLinkRows = await this.app.db
            .select()
            .from(listedProductVariantLinks)
            .where(eq(listedProductVariantLinks.listedProductId, listedProductId));
        }
      } catch (err) {
        this.app.log.warn({ err, listedProductId }, 'failed to recover variant links from channel');
      }
    }

    if (variantLinkRows.length === 0) {
      return { status: 'NO_VARIANTS' as const, message: '연결된 변형이 없습니다.' };
    }

    const masterVariantIds = variantLinkRows.map((vl) => vl.masterVariantId);
    const dbVariants = await this.app.db
      .select()
      .from(masterProductVariants)
      .where(inArray(masterProductVariants.id, masterVariantIds));
    const variantById = new Map(dbVariants.map((v) => [v.id, v]));

    // Qoo10 single-product (channelVariantId === channelItemId, OptionCode 없음): updateProduct로 라우팅
    const isQoo10SingleProduct =
      channelType === 'QOO10_JP' &&
      variantLinkRows.length === 1 &&
      variantLinkRows[0]!.channelVariantId === item.channelItemId;

    if (isQoo10SingleProduct && adapter.updateProduct) {
      const vl = variantLinkRows[0]!;
      const masterVariant = variantById.get(vl.masterVariantId);
      const stock = masterVariant?.stock ?? 0;
      try {
        await adapter.updateProduct(item.channelItemId, { qty: stock });
        return {
          status: 'OK' as const,
          updates: [{ channelVariantId: vl.channelVariantId, stock, status: 'ok' }],
        };
      } catch (err) {
        return {
          status: 'OK' as const,
          updates: [
            {
              channelVariantId: vl.channelVariantId,
              stock,
              status: err instanceof Error ? err.message : 'error',
            },
          ],
        };
      }
    }

    if (!adapter.pushVariantStock) {
      return { status: 'UNSUPPORTED' as const, message: '이 채널은 변형 단위 재고 업데이트를 지원하지 않습니다.' };
    }

    const updates: Array<{ channelVariantId: string; stock: number; status: string }> = [];
    for (const vl of variantLinkRows) {
      const masterVariant = variantById.get(vl.masterVariantId);
      if (!masterVariant) continue;
      const stock = masterVariant.stock ?? 0;
      try {
        await adapter.pushVariantStock(item.channelItemId, vl.channelVariantId, stock);
        updates.push({ channelVariantId: vl.channelVariantId, stock, status: 'ok' });
      } catch (err) {
        updates.push({ channelVariantId: vl.channelVariantId, stock, status: err instanceof Error ? err.message : 'error' });
      }
    }

    return { status: 'OK' as const, updates };
  }

  // ─── 상품 정보 동기화 (master info → channel) ─────────────────

  async syncProductInfoToChannel(listedProductId: string) {
    const item = await this.getListedProduct(listedProductId);
    const master = await this.getMasterProduct(item.masterProductId!);
    if (!master) throw new Error('마스터 상품을 찾을 수 없습니다.');

    const { ChannelService } = await import('./ChannelService');
    const channelSvc = new ChannelService(this.app, this.userId);
    const adapter = await channelSvc.getAdapter(item.channelId);

    if (!adapter.updateProduct) {
      return { status: 'UNSUPPORTED' as const, message: '이 채널은 상품 정보 수정을 지원하지 않습니다.' };
    }

    const [channel] = await this.app.db
      .select()
      .from(channels)
      .where(eq(channels.id, item.channelId));

    const vendorKey = channel?.channelType === 'QOO10_JP' ? 'qoo10' : (channel?.channelType ?? '').toLowerCase();
    const attrsRoot = (master.attributes as Record<string, unknown> | null) ?? {};
    const commonAttrs = (attrsRoot['common'] as Record<string, unknown> | undefined) ?? {};
    const channelAttrs = (attrsRoot[vendorKey] as Record<string, unknown> | undefined) ?? {};

    const commonStr = (key: string) => (typeof commonAttrs[key] === 'string' ? (commonAttrs[key] as string) : '');
    const commonArr = (key: string) => (Array.isArray(commonAttrs[key]) ? (commonAttrs[key] as unknown[]) : []);
    const commonNum = (key: string) => (typeof commonAttrs[key] === 'number' ? (commonAttrs[key] as number) : undefined);
    const commonRetailPrice = (() => {
      const v = commonAttrs['retailPrice'];
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
      return undefined;
    })();

    // 연결된 변형의 재고 합산 — 다축 옵션값 join 포함
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
      totalStock = dbVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
      const optMap = await this.loadVariantOptions(masterVariantIds);
      linkedVariants = dbVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        options: optMap.get(v.id) ?? [],
      }));
    }

    type AnyVariantWithOptions = { id: string; sku: string; price: string | null; stock: number; options: VariantOptionView[] };
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
    const masterTags = commonArr('tags') as string[];
    const brandStr = commonStr('brand');

    const payload: Record<string, unknown> = {
      ...channelAttrs,
      title: master.title,
      descriptionHtml: commonStr('descriptionHtml'),
      images: commonArr('images'),
      brand: brandStr,
      vendor: brandStr,
      material: commonStr('material'),
      weightG: commonNum('weightG'),
      tags: masterTags,
      hsCode: commonStr('hsCode'),
      countryOfOrigin: commonStr('countryOfOrigin'),
      ...(totalStock !== undefined ? { inventoryQuantity: totalStock } : {}),
      ...(firstPrice !== null && firstPrice !== undefined ? { price: String(firstPrice) } : {}),
      ...(firstSku ? { sku: firstSku } : {}),
    };

    // Shopify 다중 변형: variantPriceUpdates 로 옵션값 조합별 가격 전송
    // combination 은 그룹 position 순서대로 { name, value } 쌍을 보낸다.
    // 어댑터 측에서 selectedOptions 와 정확히 매칭하기 위해 name 까지 포함.
    if (channel?.channelType === 'SHOPIFY' && allVariants.length > 1) {
      const groups = master.optionGroups ?? [];
      payload.variantPriceUpdates = allVariants
        .filter((v) => v.price !== null && v.price !== undefined)
        .map((v) => ({
          combination: groups.map((g) => {
            const match = v.options.find((o) => o.groupId === g.id);
            return { name: g.name, value: match ? match.value : '' };
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
      '[syncProductInfoToChannel] dispatching to adapter',
    );

    await adapter.updateProduct(item.channelItemId, payload);

    return { status: 'OK' as const, channelItemId: item.channelItemId };
  }

  // ─── Private ─────────────────────────────────────────────────

  private async assertOwnership(masterProductId: string) {
    const [p] = await this.app.db
      .select({ id: masterProducts.id })
      .from(masterProducts)
      .where(and(eq(masterProducts.id, masterProductId), eq(masterProducts.userId, this.userId)));
    if (!p) throw new Error('마스터 상품을 찾을 수 없습니다.');
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

    if (groups.length === 0) return [] as Array<{
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

    const valuesByGroup = new Map<string, Array<{ id: string; value: string; position: number }>>();
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
  private async loadVariantOptions(variantIds: string[]): Promise<Map<string, VariantOptionView[]>> {
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
        eq(masterProductVariantOptionValues.optionValueId, masterProductOptionValues.id),
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
      throw new Error('이 마스터 상품에는 옵션 그룹이 정의되어 있지 않습니다. setOptionGroups 를 먼저 호출하세요.');
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
        throw new Error(`한 변형에는 그룹당 옵션값을 하나만 지정할 수 있습니다: ${ov.groupName}`);
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
          throw new Error('옵션이 없는 변형은 마스터 상품당 하나만 허용됩니다.');
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
        throw new Error('동일한 옵션 조합을 가진 변형이 이미 존재합니다.');
      }
    }
  }
}
