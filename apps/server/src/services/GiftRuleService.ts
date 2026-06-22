// GiftRuleService — PlayAuto 2.0 사은품규칙 CRUD + 자동/수동 분배 적용.
//
// 4블록 구성:
//   블록1 (기본설정): name, distributionMode(auto|manual), priority, channelFilter, activeFrom/To
//   블록2 (조건):     conditionType(sku|category|amount|qty|all), conditionCurrency, conditionMinAmount, conditionMinQty
//   블록3 (선택상품): conditionPayload.{skuIds, categoryIds} — 블록2 조건의 부속
//   블록4 (사은품):   giftSkuId, giftQty, maxApplyCount
//
// distributionMode:
//   auto   — 출고지시 전환 시 DispatchService 가 자동 평가
//   manual — 사용자가 주문 선택 후 명시적으로 적용

import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, sql, count, inArray } from "drizzle-orm";
import { giftRules, skus, channels, orders, orderItems } from "../db/schema";

type DbLike = FastifyInstance["db"];

export type GiftConditionType = "sku" | "category" | "amount" | "qty" | "all";
export type GiftDistributionMode = "auto" | "manual";
export type GiftCurrency =
  | "KRW"
  | "JPY"
  | "USD"
  | "EUR"
  | "GBP"
  | "CNY"
  | "TWD"
  | "HKD"
  | "SGD"
  | "AUD"
  | "CAD"
  | "THB";

export interface GiftRuleConditionPayload {
  skuIds?: string[];
  categoryIds?: string[];
}

export interface GiftRuleChannelFilter {
  channelIds?: string[];
}

export interface ListFilters {
  distributionMode?: GiftDistributionMode;
  conditionType?: GiftConditionType;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateInput {
  name: string;
  distributionMode?: GiftDistributionMode;
  channelFilter?: GiftRuleChannelFilter | null;
  conditionType: GiftConditionType;
  conditionCurrency?: GiftCurrency | null;
  conditionMinAmount?: number | null;
  conditionMinQty?: number | null;
  conditionPayload?: GiftRuleConditionPayload;
  giftSkuId: string;
  giftQty?: number;
  maxApplyCount?: number | null;
  priority?: number;
  isActive?: boolean;
  activeFrom?: Date | null;
  activeTo?: Date | null;
  note?: string | null;
}

export type UpdateInput = Partial<CreateInput>;

export interface AppliedGift {
  ruleId: string;
  skuId: string;
  qty: number;
}

export class GiftRuleService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly userId: string,
  ) {}

  private get db(): DbLike {
    return this.app.db as DbLike;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async list(filters: ListFilters = {}): Promise<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const where = and(
      eq(giftRules.userId, this.userId),
      filters.distributionMode
        ? eq(giftRules.distributionMode, filters.distributionMode)
        : undefined,
      filters.conditionType
        ? eq(giftRules.conditionType, filters.conditionType)
        : undefined,
      typeof filters.isActive === "boolean"
        ? eq(giftRules.isActive, filters.isActive)
        : undefined,
      filters.search
        ? sql`(${giftRules.name} ILIKE ${"%" + filters.search + "%"}
            OR ${giftRules.note} ILIKE ${"%" + filters.search + "%"})`
        : undefined,
    );

    const rows = await this.db
      .select({
        id: giftRules.id,
        name: giftRules.name,
        distributionMode: giftRules.distributionMode,
        channelFilter: giftRules.channelFilter,
        conditionType: giftRules.conditionType,
        conditionCurrency: giftRules.conditionCurrency,
        conditionMinAmount: giftRules.conditionMinAmount,
        conditionMinQty: giftRules.conditionMinQty,
        conditionPayload: giftRules.conditionPayload,
        giftSkuId: giftRules.giftSkuId,
        giftSkuCode: skus.code,
        giftSkuName: skus.name,
        giftQty: giftRules.giftQty,
        maxApplyCount: giftRules.maxApplyCount,
        appliedCount: giftRules.appliedCount,
        priority: giftRules.priority,
        isActive: giftRules.isActive,
        activeFrom: giftRules.activeFrom,
        activeTo: giftRules.activeTo,
        note: giftRules.note,
        createdAt: giftRules.createdAt,
        updatedAt: giftRules.updatedAt,
      })
      .from(giftRules)
      .innerJoin(skus, eq(skus.id, giftRules.giftSkuId))
      .where(where)
      .orderBy(asc(giftRules.priority), desc(giftRules.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const totalRows = await this.db
      .select({ n: count() })
      .from(giftRules)
      .where(where);

    return {
      items: rows as Array<Record<string, unknown>>,
      total: totalRows[0]?.n ?? 0,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const rows = await this.db
      .select()
      .from(giftRules)
      .where(and(eq(giftRules.id, id), eq(giftRules.userId, this.userId)))
      .limit(1);
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async create(input: CreateInput): Promise<{ id: string }> {
    await this.assertSkuOwned(input.giftSkuId);
    if (input.channelFilter?.channelIds?.length) {
      await this.assertChannelsOwned(input.channelFilter.channelIds);
    }
    if (input.conditionPayload?.skuIds?.length) {
      for (const skuId of input.conditionPayload.skuIds) {
        await this.assertSkuOwned(skuId);
      }
    }

    const [row] = await this.db
      .insert(giftRules)
      .values({
        userId: this.userId,
        name: input.name,
        distributionMode: input.distributionMode ?? "auto",
        channelFilter: input.channelFilter ?? null,
        conditionType: input.conditionType,
        conditionCurrency: input.conditionCurrency ?? null,
        conditionMinAmount:
          input.conditionMinAmount != null
            ? String(input.conditionMinAmount)
            : null,
        conditionMinQty: input.conditionMinQty ?? null,
        conditionPayload: input.conditionPayload ?? {},
        giftSkuId: input.giftSkuId,
        giftQty: input.giftQty ?? 1,
        maxApplyCount: input.maxApplyCount ?? null,
        priority: input.priority ?? 100,
        isActive: input.isActive ?? true,
        activeFrom: input.activeFrom ?? null,
        activeTo: input.activeTo ?? null,
        note: input.note ?? null,
      })
      .returning({ id: giftRules.id });
    return { id: row!.id };
  }

  async update(id: string, patch: UpdateInput): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("규칙을 찾을 수 없습니다.");
    if (patch.giftSkuId) await this.assertSkuOwned(patch.giftSkuId);
    if (patch.channelFilter?.channelIds?.length) {
      await this.assertChannelsOwned(patch.channelFilter.channelIds);
    }
    if (patch.conditionPayload?.skuIds?.length) {
      for (const skuId of patch.conditionPayload.skuIds) {
        await this.assertSkuOwned(skuId);
      }
    }

    await this.db
      .update(giftRules)
      .set({
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.distributionMode !== undefined && {
          distributionMode: patch.distributionMode,
        }),
        ...(patch.channelFilter !== undefined && {
          channelFilter: patch.channelFilter,
        }),
        ...(patch.conditionType !== undefined && {
          conditionType: patch.conditionType,
        }),
        ...(patch.conditionCurrency !== undefined && {
          conditionCurrency: patch.conditionCurrency,
        }),
        ...(patch.conditionMinAmount !== undefined && {
          conditionMinAmount:
            patch.conditionMinAmount != null
              ? String(patch.conditionMinAmount)
              : null,
        }),
        ...(patch.conditionMinQty !== undefined && {
          conditionMinQty: patch.conditionMinQty,
        }),
        ...(patch.conditionPayload !== undefined && {
          conditionPayload: patch.conditionPayload,
        }),
        ...(patch.giftSkuId !== undefined && { giftSkuId: patch.giftSkuId }),
        ...(patch.giftQty !== undefined && { giftQty: patch.giftQty }),
        ...(patch.maxApplyCount !== undefined && {
          maxApplyCount: patch.maxApplyCount,
        }),
        ...(patch.priority !== undefined && { priority: patch.priority }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
        ...(patch.activeFrom !== undefined && { activeFrom: patch.activeFrom }),
        ...(patch.activeTo !== undefined && { activeTo: patch.activeTo }),
        ...(patch.note !== undefined && { note: patch.note }),
        updatedAt: new Date(),
      })
      .where(and(eq(giftRules.id, id), eq(giftRules.userId, this.userId)));
  }

  async toggle(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(giftRules)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(giftRules.id, id), eq(giftRules.userId, this.userId)));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(giftRules)
      .where(and(eq(giftRules.id, id), eq(giftRules.userId, this.userId)));
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.db
      .delete(giftRules)
      .where(
        and(
          eq(giftRules.userId, this.userId),
          sql`${giftRules.id} = ANY(${ids})`,
        ),
      )
      .returning({ id: giftRules.id });
    return res.length;
  }

  // ---------------------------------------------------------------------------
  // 평가 — 단일 주문에 적용 가능한 모든 활성 룰 반환 (priority asc, maxApplyCount 미초과)
  // ---------------------------------------------------------------------------
  async evaluateForOrder(
    orderId: string,
    mode: GiftDistributionMode,
    txDb?: DbLike,
  ): Promise<AppliedGift[]> {
    const db = txDb ?? this.db;

    const orderRows = await db
      .select({
        id: orders.id,
        channelId: orders.channelId,
        total: orders.total,
        currency: orders.currency,
      })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, this.userId)))
      .limit(1);
    const order = orderRows[0];
    if (!order) return [];

    const items = await db
      .select({
        id: orderItems.id,
        skuId: orderItems.skuId,
        orderQty: orderItems.orderQty,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const totalQty = items.reduce((s, it) => s + (it.orderQty ?? 0), 0);
    const itemSkuIds = items
      .map((it) => it.skuId)
      .filter((v): v is string => !!v);

    const now = new Date();
    const rules = await db
      .select()
      .from(giftRules)
      .where(
        and(
          eq(giftRules.userId, this.userId),
          eq(giftRules.distributionMode, mode),
          eq(giftRules.isActive, true),
        ),
      )
      .orderBy(asc(giftRules.priority));

    const applied: AppliedGift[] = [];
    for (const r of rules) {
      if (r.activeFrom && r.activeFrom > now) continue;
      if (r.activeTo && r.activeTo < now) continue;
      if (r.maxApplyCount != null && r.appliedCount >= r.maxApplyCount)
        continue;

      const channelFilter = r.channelFilter as GiftRuleChannelFilter | null;
      if (channelFilter?.channelIds?.length) {
        if (!channelFilter.channelIds.includes(order.channelId)) continue;
      }

      const payload = (r.conditionPayload ?? {}) as GiftRuleConditionPayload;

      let match = false;
      switch (r.conditionType) {
        case "all":
          match = true;
          break;
        case "amount": {
          if (r.conditionMinAmount == null) break;
          const min = Number(r.conditionMinAmount);
          const orderAmount = Number(order.total ?? 0);
          if (
            r.conditionCurrency &&
            order.currency &&
            r.conditionCurrency !== order.currency
          )
            break;
          match = orderAmount >= min;
          break;
        }
        case "qty":
          match = r.conditionMinQty != null && totalQty >= r.conditionMinQty;
          break;
        case "sku":
          if (!payload.skuIds?.length) break;
          match = itemSkuIds.some((id) => payload.skuIds!.includes(id));
          break;
        case "category":
          match = false;
          break;
      }

      if (!match) continue;

      applied.push({ ruleId: r.id, skuId: r.giftSkuId, qty: r.giftQty });

      await db
        .update(giftRules)
        .set({ appliedCount: sql`${giftRules.appliedCount} + 1` })
        .where(eq(giftRules.id, r.id));
    }
    return applied;
  }

  // ---------------------------------------------------------------------------
  // 적용 — 평가 결과를 모든 order_items.appliedGifts 에 누적 (중복 ruleId 회피)
  // ---------------------------------------------------------------------------
  async applyToOrder(
    orderId: string,
    gifts: AppliedGift[],
    txDb?: DbLike,
  ): Promise<void> {
    if (gifts.length === 0) return;
    const db = txDb ?? this.db;

    const items = await db
      .select({ id: orderItems.id, appliedGifts: orderItems.appliedGifts })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    for (const it of items) {
      const current = (
        Array.isArray(it.appliedGifts) ? it.appliedGifts : []
      ) as AppliedGift[];
      const existingIds = new Set(current.map((g) => g.ruleId));
      const merged = [
        ...current,
        ...gifts.filter((g) => !existingIds.has(g.ruleId)),
      ];
      if (merged.length === current.length) continue;
      await db
        .update(orderItems)
        .set({ appliedGifts: merged, updatedAt: new Date() })
        .where(eq(orderItems.id, it.id));
    }
  }

  // ---------------------------------------------------------------------------
  // 수동 분배 — 주문 N건에 대해 manual 룰을 일괄 평가/적용
  // ---------------------------------------------------------------------------
  async distributeManually(orderIds: string[]): Promise<{
    appliedOrders: number;
    totalGifts: number;
  }> {
    let appliedOrders = 0;
    let totalGifts = 0;
    for (const orderId of orderIds) {
      const gifts = await this.evaluateForOrder(orderId, "manual");
      if (gifts.length === 0) continue;
      await this.applyToOrder(orderId, gifts);
      appliedOrders++;
      totalGifts += gifts.length;
    }
    return { appliedOrders, totalGifts };
  }

  // ---------------------------------------------------------------------------
  // 소유권 검증
  // ---------------------------------------------------------------------------
  private async assertSkuOwned(skuId: string): Promise<void> {
    const rows = await this.db
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.id, skuId), eq(skus.userId, this.userId)))
      .limit(1);
    if (!rows[0]) throw new Error("해당 SKU 의 소유자가 아닙니다.");
  }

  private async assertChannelsOwned(channelIds: string[]): Promise<void> {
    const rows = await this.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(eq(channels.userId, this.userId), inArray(channels.id, channelIds)),
      );
    if (rows.length !== channelIds.length) {
      throw new Error("일부 채널의 소유자가 아닙니다.");
    }
  }
}
