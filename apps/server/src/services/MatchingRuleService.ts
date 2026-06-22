// MatchingRuleService — PlayAuto 2.0 매칭규칙 CRUD + 평가/자동학습/일괄재적용.
//
// IF (조건부 핵심키): userId × channelId × channelItemCode × channelItemTitle × optionName (+ optionCode 보조)
// THEN (액션부): skuId, outputQty, warehouseId
//
// 동작 흐름 (PlayAuto 2.0 사양):
//   1) 규칙 적중 → 액션 적용 (matchedBy='rule')
//   2) 미적중 → SKU 직매칭 (OrderService.autoMatchSku) → 성공 시 자동학습으로 규칙 자동저장
//   3) 둘 다 실패 → 미매칭
//
// 자동학습 기본 동작:
//   autoLearn() 은 INSERT ON CONFLICT DO NOTHING — 동일 IF 키 충돌 시 조용히 무시.

import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, isNull, or, sql, count } from "drizzle-orm";
import { matchRules, skus, channels, warehouses } from "../db/schema";

type DbLike = FastifyInstance["db"];

export interface MatchRuleIfKey {
  channelId: string;
  channelItemCode: string;
  channelItemTitle?: string | null;
  optionCode?: string | null;
  optionName?: string | null;
}

export interface MatchRuleResolution {
  ruleId: string;
  skuId: string;
  skuCode: string;
  skuName: string | null;
  outputQty: number;
  warehouseId: string | null;
}

export interface ListFilters {
  channelId?: string;
  search?: string;
  isActive?: boolean;
  autoLearned?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateInput {
  channelId: string;
  channelItemCode: string;
  channelItemTitle?: string | null;
  optionCode?: string | null;
  optionName?: string | null;
  skuId: string;
  outputQty?: number;
  warehouseId?: string | null;
  priority?: number;
  isActive?: boolean;
  note?: string | null;
}

export interface UpdateInput {
  channelItemTitle?: string | null;
  optionCode?: string | null;
  optionName?: string | null;
  skuId?: string;
  outputQty?: number;
  warehouseId?: string | null;
  priority?: number;
  isActive?: boolean;
  note?: string | null;
}

export class MatchingRuleService {
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
      eq(matchRules.userId, this.userId),
      filters.channelId
        ? eq(matchRules.channelId, filters.channelId)
        : undefined,
      typeof filters.isActive === "boolean"
        ? eq(matchRules.isActive, filters.isActive)
        : undefined,
      typeof filters.autoLearned === "boolean"
        ? eq(matchRules.autoLearned, filters.autoLearned)
        : undefined,
      filters.search
        ? sql`(${matchRules.channelItemCode} ILIKE ${"%" + filters.search + "%"}
            OR ${matchRules.channelItemTitle} ILIKE ${"%" + filters.search + "%"}
            OR ${matchRules.optionName} ILIKE ${"%" + filters.search + "%"})`
        : undefined,
    );

    const rows = await this.db
      .select({
        id: matchRules.id,
        channelId: matchRules.channelId,
        channelName: channels.name,
        channelType: channels.channelType,
        channelItemCode: matchRules.channelItemCode,
        channelItemTitle: matchRules.channelItemTitle,
        optionCode: matchRules.optionCode,
        optionName: matchRules.optionName,
        skuId: matchRules.skuId,
        skuCode: skus.code,
        skuName: skus.name,
        outputQty: matchRules.outputQty,
        warehouseId: matchRules.warehouseId,
        warehouseName: warehouses.name,
        priority: matchRules.priority,
        isActive: matchRules.isActive,
        autoLearned: matchRules.autoLearned,
        lastMatchedAt: matchRules.lastMatchedAt,
        matchHitCount: matchRules.matchHitCount,
        note: matchRules.note,
        createdAt: matchRules.createdAt,
        updatedAt: matchRules.updatedAt,
      })
      .from(matchRules)
      .innerJoin(channels, eq(channels.id, matchRules.channelId))
      .innerJoin(skus, eq(skus.id, matchRules.skuId))
      .leftJoin(warehouses, eq(warehouses.id, matchRules.warehouseId))
      .where(where)
      .orderBy(desc(matchRules.updatedAt))
      .limit(pageSize)
      .offset(offset);

    const totalRows = await this.db
      .select({ n: count() })
      .from(matchRules)
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
      .from(matchRules)
      .where(and(eq(matchRules.id, id), eq(matchRules.userId, this.userId)))
      .limit(1);
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async create(input: CreateInput): Promise<{ id: string }> {
    const sku = await this.assertSkuOwned(input.skuId);
    if (!sku) throw new Error("해당 SKU 를 찾을 수 없습니다.");
    if (input.warehouseId) await this.assertWarehouseOwned(input.warehouseId);

    const [row] = await this.db
      .insert(matchRules)
      .values({
        userId: this.userId,
        channelId: input.channelId,
        channelItemCode: input.channelItemCode,
        channelItemTitle: input.channelItemTitle ?? "",
        optionCode: input.optionCode ?? null,
        optionName: input.optionName ?? null,
        skuId: input.skuId,
        outputQty: input.outputQty ?? 1,
        warehouseId: input.warehouseId ?? null,
        priority: input.priority ?? 100,
        isActive: input.isActive ?? true,
        note: input.note ?? null,
        autoLearned: false,
      })
      .returning({ id: matchRules.id });
    return { id: row!.id };
  }

  async update(id: string, patch: UpdateInput): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("규칙을 찾을 수 없습니다.");
    if (patch.skuId) await this.assertSkuOwned(patch.skuId);
    if (patch.warehouseId) await this.assertWarehouseOwned(patch.warehouseId);

    await this.db
      .update(matchRules)
      .set({
        ...(patch.channelItemTitle !== undefined && {
          channelItemTitle: patch.channelItemTitle ?? "",
        }),
        ...(patch.optionCode !== undefined && { optionCode: patch.optionCode }),
        ...(patch.optionName !== undefined && { optionName: patch.optionName }),
        ...(patch.skuId !== undefined && { skuId: patch.skuId }),
        ...(patch.outputQty !== undefined && { outputQty: patch.outputQty }),
        ...(patch.warehouseId !== undefined && {
          warehouseId: patch.warehouseId,
        }),
        ...(patch.priority !== undefined && { priority: patch.priority }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
        ...(patch.note !== undefined && { note: patch.note }),
        updatedAt: new Date(),
      })
      .where(and(eq(matchRules.id, id), eq(matchRules.userId, this.userId)));
  }

  async toggle(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(matchRules)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(matchRules.id, id), eq(matchRules.userId, this.userId)));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(matchRules)
      .where(and(eq(matchRules.id, id), eq(matchRules.userId, this.userId)));
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.db
      .delete(matchRules)
      .where(
        and(
          eq(matchRules.userId, this.userId),
          sql`${matchRules.id} = ANY(${ids})`,
        ),
      )
      .returning({ id: matchRules.id });
    return res.length;
  }

  // ---------------------------------------------------------------------------
  // 평가 — IF 키로 활성 규칙 1건 결정 (priority asc, optionCode 우선 → optionName 폴백)
  // ---------------------------------------------------------------------------
  async resolve(
    key: MatchRuleIfKey,
    txDb?: DbLike,
  ): Promise<MatchRuleResolution | null> {
    const db = txDb ?? this.db;
    const now = new Date();
    const baseFilter = and(
      eq(matchRules.userId, this.userId),
      eq(matchRules.channelId, key.channelId),
      eq(matchRules.channelItemCode, key.channelItemCode),
      eq(matchRules.isActive, true),
      or(
        isNull(matchRules.activeFrom),
        sql`${matchRules.activeFrom} <= ${now}`,
      ),
      or(isNull(matchRules.activeTo), sql`${matchRules.activeTo} >= ${now}`),
    );

    const select = db
      .select({
        id: matchRules.id,
        skuId: matchRules.skuId,
        skuCode: skus.code,
        skuName: skus.name,
        outputQty: matchRules.outputQty,
        warehouseId: matchRules.warehouseId,
        channelItemTitle: matchRules.channelItemTitle,
        optionCode: matchRules.optionCode,
        optionName: matchRules.optionName,
      })
      .from(matchRules)
      .innerJoin(skus, eq(skus.id, matchRules.skuId));

    const titleFilter = key.channelItemTitle
      ? or(
          eq(matchRules.channelItemTitle, key.channelItemTitle),
          eq(matchRules.channelItemTitle, ""),
        )
      : undefined;

    if (key.optionCode) {
      const rows = await select
        .where(
          and(
            baseFilter,
            titleFilter,
            eq(matchRules.optionCode, key.optionCode),
          ),
        )
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) return this.toResolution(rows[0]);
    }
    if (key.optionName) {
      const rows = await select
        .where(
          and(
            baseFilter,
            titleFilter,
            eq(matchRules.optionName, key.optionName),
          ),
        )
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) return this.toResolution(rows[0]);
    }
    if (!key.optionCode && !key.optionName) {
      const rows = await select
        .where(
          and(
            baseFilter,
            titleFilter,
            isNull(matchRules.optionCode),
            isNull(matchRules.optionName),
          ),
        )
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) return this.toResolution(rows[0]);
    }
    return null;
  }

  private toResolution(row: {
    id: string;
    skuId: string;
    skuCode: string;
    skuName: string | null;
    outputQty: number;
    warehouseId: string | null;
  }): MatchRuleResolution {
    return {
      ruleId: row.id,
      skuId: row.skuId,
      skuCode: row.skuCode,
      skuName: row.skuName,
      outputQty: row.outputQty,
      warehouseId: row.warehouseId,
    };
  }

  // ---------------------------------------------------------------------------
  // 자동학습 — SKU 직매칭 성공 시 규칙 자동저장 (IF 키 충돌 시 무시)
  // 환경설정 [SKU상품 자동매칭]="설정" 시 OrderService 가 호출.
  // ---------------------------------------------------------------------------
  async autoLearn(
    key: MatchRuleIfKey,
    skuId: string,
    opts: {
      outputQty?: number;
      warehouseId?: string | null;
      txDb?: DbLike;
    } = {},
  ): Promise<{ id: string | null; created: boolean }> {
    const db = opts.txDb ?? this.db;
    const inserted = await db
      .insert(matchRules)
      .values({
        userId: this.userId,
        channelId: key.channelId,
        channelItemCode: key.channelItemCode,
        channelItemTitle: key.channelItemTitle ?? "",
        optionCode: key.optionCode ?? null,
        optionName: key.optionName ?? null,
        skuId,
        outputQty: opts.outputQty ?? 1,
        warehouseId: opts.warehouseId ?? null,
        priority: 100,
        isActive: true,
        autoLearned: true,
      })
      .onConflictDoNothing({
        target: [
          matchRules.userId,
          matchRules.channelId,
          matchRules.channelItemCode,
          matchRules.channelItemTitle,
          matchRules.optionName,
        ],
      })
      .returning({ id: matchRules.id });
    return { id: inserted[0]?.id ?? null, created: inserted.length > 0 };
  }

  // ---------------------------------------------------------------------------
  // 적중 카운터 — 평가 후 호출 (non-critical, fire-and-forget 가능)
  // ---------------------------------------------------------------------------
  async recordHit(ruleId: string, txDb?: DbLike): Promise<void> {
    const db = txDb ?? this.db;
    await db
      .update(matchRules)
      .set({
        lastMatchedAt: new Date(),
        matchHitCount: sql`${matchRules.matchHitCount} + 1`,
      })
      .where(eq(matchRules.id, ruleId));
  }

  // ---------------------------------------------------------------------------
  // 일괄재적용 — 사용자가 규칙을 수정/추가했을 때 미매칭 주문에 다시 적용.
  // 실제 OrderService 의존성을 피하기 위해 후크 콜백 형태로 분리.
  // ---------------------------------------------------------------------------
  async reapplyAll(
    applyFn: (rule: typeof matchRules.$inferSelect) => Promise<void>,
  ): Promise<number> {
    const rules = await this.db
      .select()
      .from(matchRules)
      .where(
        and(eq(matchRules.userId, this.userId), eq(matchRules.isActive, true)),
      )
      .orderBy(asc(matchRules.priority));
    let n = 0;
    for (const r of rules) {
      await applyFn(r);
      n++;
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // 소유권 검증
  // ---------------------------------------------------------------------------
  private async assertSkuOwned(skuId: string): Promise<{ id: string } | null> {
    const rows = await this.db
      .select({ id: skus.id })
      .from(skus)
      .where(and(eq(skus.id, skuId), eq(skus.userId, this.userId)))
      .limit(1);
    if (!rows[0]) throw new Error("해당 SKU 의 소유자가 아닙니다.");
    return rows[0];
  }

  private async assertWarehouseOwned(warehouseId: string): Promise<void> {
    const rows = await this.db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(
        and(eq(warehouses.id, warehouseId), eq(warehouses.userId, this.userId)),
      )
      .limit(1);
    if (!rows[0]) throw new Error("해당 배송처의 소유자가 아닙니다.");
  }
}
