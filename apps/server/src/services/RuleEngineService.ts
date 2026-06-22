// RuleEngineService — 결정론적 룩업 + 룰 적용 레이어.
// LLM 호출 금지. matchRules / giftRules / nameRules / channelCapabilities / statusRuleOverrides.
//
// 사용처:
//   QOO10OrderAdapter.toStandard() 이후 OrderIngestionService 에서
//     1) lineItem 별 resolveSkuMatch
//     2) applyGiftRules 로 appliedGifts 채움
//     3) normalizeName 로 채널 타이틀/옵션 정규화
//   StatusRuleEngine 기본 매핑 후 resolveStatusOverride 로 사용자 정의 override 적용.

import type { FastifyInstance } from "fastify";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { AppliedGift, ClaimStatus, FulfillmentRank } from "@oms/types";
import {
  channelCapabilities,
  giftRules,
  matchRules,
  nameRules,
  skus,
  statusRuleOverrides,
} from "../db/schema";

// ---------------------------------------------------------------------------
// 입출력 타입
// ---------------------------------------------------------------------------

export interface SkuMatchInput {
  channelId: string;
  channelItemCode: string;
  optionCode?: string | null;
  optionName?: string | null;
}

export interface SkuMatchResult {
  skuId: string;
  skuCode: string;
  skuName: string;
  matchedBy: "rule";
  ruleId: string;
}

export interface GiftLineInput {
  skuId: string | null;
  qty: number;
}

export interface NameNormalizeInput {
  userId: string;
  channelId: string;
  fieldType: "item_title" | "option_name";
  input: string;
}

export interface CapabilitiesResult {
  supportsTracking: boolean | null;
  supportsDispatchDelay: boolean | null;
  supportsBundleNumberInPush: boolean | null;
  supportsPartialShipment: boolean | null;
  supportsCancel: boolean | null;
  supportsReturn: boolean | null;
  supportsExchange: boolean | null;
  supportsSwap: boolean | null;
  metadata: Record<string, unknown> | null;
}

export interface StatusOverrideResult {
  fulfillmentRank: FulfillmentRank;
  claimStatus: ClaimStatus | null;
  ruleId: string;
}

// gift_rules.conditionPayload 의 conditionType 별 형식
type GiftConditionPayload =
  | { skuId: string }
  | { category: string }
  | { minAmount: number; currency?: string };

// ---------------------------------------------------------------------------
// 서비스
// ---------------------------------------------------------------------------

export class RuleEngineService {
  constructor(private readonly fastify: FastifyInstance) {}

  private get db() {
    return this.fastify.db;
  }

  // -------------------------------------------------------------------------
  // SKU 매칭 — (channelId, channelItemCode, optionCode) 우선,
  // 미스 시 (channelId, channelItemCode, optionName) fallback.
  // -------------------------------------------------------------------------
  async resolveSkuMatch(input: SkuMatchInput): Promise<SkuMatchResult | null> {
    const { channelId, channelItemCode, optionCode, optionName } = input;
    const now = new Date();

    // 활성 룰만, priority 오름차순 (작을수록 먼저)
    const activeFilter = and(
      eq(matchRules.isActive, true),
      eq(matchRules.channelId, channelId),
      eq(matchRules.channelItemCode, channelItemCode),
      or(
        isNull(matchRules.activeFrom),
        sql`${matchRules.activeFrom} <= ${now}`,
      ),
      or(isNull(matchRules.activeTo), sql`${matchRules.activeTo} >= ${now}`),
    );

    // Pass 1: optionCode 매칭
    if (optionCode) {
      const rows = await this.db
        .select({
          id: matchRules.id,
          skuId: matchRules.skuId,
          skuCode: skus.code,
          skuName: skus.name,
        })
        .from(matchRules)
        .innerJoin(skus, eq(skus.id, matchRules.skuId))
        .where(and(activeFilter, eq(matchRules.optionCode, optionCode)))
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) {
        return {
          skuId: rows[0].skuId,
          skuCode: rows[0].skuCode,
          skuName: rows[0].skuName ?? "",
          matchedBy: "rule",
          ruleId: rows[0].id,
        };
      }
    }

    // Pass 2: optionName 매칭
    if (optionName) {
      const rows = await this.db
        .select({
          id: matchRules.id,
          skuId: matchRules.skuId,
          skuCode: skus.code,
          skuName: skus.name,
        })
        .from(matchRules)
        .innerJoin(skus, eq(skus.id, matchRules.skuId))
        .where(and(activeFilter, eq(matchRules.optionName, optionName)))
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) {
        return {
          skuId: rows[0].skuId,
          skuCode: rows[0].skuCode,
          skuName: rows[0].skuName ?? "",
          matchedBy: "rule",
          ruleId: rows[0].id,
        };
      }
    }

    // Pass 3: option 미지정 — channelItemCode 만으로 단일 매칭
    if (!optionCode && !optionName) {
      const rows = await this.db
        .select({
          id: matchRules.id,
          skuId: matchRules.skuId,
          skuCode: skus.code,
          skuName: skus.name,
        })
        .from(matchRules)
        .innerJoin(skus, eq(skus.id, matchRules.skuId))
        .where(
          and(
            activeFilter,
            isNull(matchRules.optionCode),
            isNull(matchRules.optionName),
          ),
        )
        .orderBy(asc(matchRules.priority))
        .limit(1);
      if (rows[0]) {
        return {
          skuId: rows[0].skuId,
          skuCode: rows[0].skuCode,
          skuName: rows[0].skuName ?? "",
          matchedBy: "rule",
          ruleId: rows[0].id,
        };
      }
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // 사은품 룰 적용 — 활성 룰 전체를 조건별로 평가.
  // 라인별로 봉투를 만들어 각 라인 appliedGifts 에 append.
  // category 조건은 SKU 카테고리 메타가 별도 정의된 후 활성화 — 현재는 noop.
  // amount 는 totalAmount 단일 비교, sku 는 라인 매칭.
  // -------------------------------------------------------------------------
  async applyGiftRules(
    userId: string,
    lineItems: GiftLineInput[],
    totalAmount: number,
  ): Promise<AppliedGift[][]> {
    const now = new Date();
    const rules = await this.db
      .select()
      .from(giftRules)
      .where(
        and(
          eq(giftRules.userId, userId),
          eq(giftRules.isActive, true),
          or(
            isNull(giftRules.activeFrom),
            sql`${giftRules.activeFrom} <= ${now}`,
          ),
          or(isNull(giftRules.activeTo), sql`${giftRules.activeTo} >= ${now}`),
        ),
      )
      .orderBy(asc(giftRules.priority));

    const buckets: AppliedGift[][] = lineItems.map(() => []);
    if (rules.length === 0) return buckets;

    for (const rule of rules) {
      const payload = rule.conditionPayload as GiftConditionPayload;

      if (rule.conditionType === "amount") {
        const minAmount = (payload as { minAmount: number }).minAmount;
        if (
          typeof minAmount === "number" &&
          totalAmount >= minAmount &&
          buckets.length > 0
        ) {
          // 주문 전체 단위 사은품 — 1번 라인에 부착
          buckets[0].push({
            ruleId: rule.id,
            skuId: rule.giftSkuId,
            qty: rule.giftQty,
          });
        }
        continue;
      }

      if (rule.conditionType === "sku") {
        const targetSkuId = (payload as { skuId: string }).skuId;
        if (!targetSkuId) continue;
        lineItems.forEach((line, idx) => {
          if (line.skuId === targetSkuId && line.qty > 0) {
            buckets[idx].push({
              ruleId: rule.id,
              skuId: rule.giftSkuId,
              qty: rule.giftQty * line.qty,
            });
          }
        });
        continue;
      }

      // category — 미구현 (SKU 카테고리 메타 미정), noop
    }

    return buckets;
  }

  // -------------------------------------------------------------------------
  // 이름 정규화 — pattern → replacement.
  // isRegex 면 RegExp, 아니면 단순 치환 (전역).
  // userId + 채널(또는 null) 범위, scope 일치 룰만 적용.
  // 룰을 priority 순으로 전부 누적 적용.
  // -------------------------------------------------------------------------
  async normalizeName(input: NameNormalizeInput): Promise<string> {
    const { userId, channelId, fieldType, input: text } = input;
    const rules = await this.db
      .select()
      .from(nameRules)
      .where(
        and(
          eq(nameRules.userId, userId),
          eq(nameRules.isActive, true),
          or(isNull(nameRules.channelId), eq(nameRules.channelId, channelId)),
        ),
      )
      .orderBy(asc(nameRules.priority));

    let out = text;
    for (const rule of rules) {
      if (rule.scope !== fieldType && rule.scope !== "both") continue;
      if (rule.isRegex) {
        try {
          out = out.replace(new RegExp(rule.pattern, "g"), rule.replacement);
        } catch {
          // 잘못된 regex 는 무시 — UI 검증 책임
        }
      } else {
        out = out.split(rule.pattern).join(rule.replacement);
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // 채널 capability 조회. 미등록 시 모든 필드 null.
  // -------------------------------------------------------------------------
  async getCapabilities(channelId: string): Promise<CapabilitiesResult> {
    const row = await this.db
      .select()
      .from(channelCapabilities)
      .where(eq(channelCapabilities.channelId, channelId))
      .limit(1);

    if (!row[0]) {
      return {
        supportsTracking: null,
        supportsDispatchDelay: null,
        supportsBundleNumberInPush: null,
        supportsPartialShipment: null,
        supportsCancel: null,
        supportsReturn: null,
        supportsExchange: null,
        supportsSwap: null,
        metadata: null,
      };
    }
    const r = row[0];
    return {
      supportsTracking: r.supportsTracking,
      supportsDispatchDelay: r.supportsDispatchDelay,
      supportsBundleNumberInPush: r.supportsBundleNumberInPush,
      supportsPartialShipment: r.supportsPartialShipment,
      supportsCancel: r.supportsCancel,
      supportsReturn: r.supportsReturn,
      supportsExchange: r.supportsExchange,
      supportsSwap: r.supportsSwap,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    };
  }

  // -------------------------------------------------------------------------
  // 상태 매핑 override 조회. 미등록 시 null (StatusRuleEngine 기본값 사용).
  // -------------------------------------------------------------------------
  async resolveStatusOverride(
    userId: string,
    channelId: string,
    channelStatus: string,
  ): Promise<StatusOverrideResult | null> {
    const rows = await this.db
      .select()
      .from(statusRuleOverrides)
      .where(
        and(
          eq(statusRuleOverrides.userId, userId),
          eq(statusRuleOverrides.channelId, channelId),
          eq(statusRuleOverrides.channelStatus, channelStatus),
          eq(statusRuleOverrides.isActive, true),
        ),
      )
      .orderBy(asc(statusRuleOverrides.priority))
      .limit(1);

    const r = rows[0];
    if (!r) return null;
    return {
      ruleId: r.id,
      fulfillmentRank: r.fulfillmentRank as FulfillmentRank,
      claimStatus: r.claimStatus as ClaimStatus | null,
    };
  }
}
