// StatusRuleEngine — 채널 응답 상태값을 OMS fulfillmentStatus(rank 10~90)로 매핑.
// 결정론적 룩업 + 단조증가 가드 + rank 90(판매완료) 불가침.
// docs/api/qoo10/orders/CONVERT_RULES.md §4 표를 그대로 옮긴 것.

import type { FulfillmentRank } from "@oms/types";

export type ChannelKey = "qoo10" | "shopify" | "shopee" | "rakuten";

export interface Qoo10ShippingFields {
  /** 채널이 직접 내려준 ShippingStatus 문자열. 없을 수 있음. */
  shippingStatus?: string | null;
  trackingNo?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  estimatedShippingDate?: string | null;
}

/**
 * Qoo10 → fulfillmentStatus rank 결정.
 * 명시적 enum이 없는 케이스가 많아 ShippingDate/DeliveredDate/TrackingNo/EstimatedShippingDate
 * 조합으로 파생한다.
 *
 * 우선순위(높은 rank 우선):
 *   deliveredAt 존재             → 70 배송완료
 *   shippedAt 존재               → 50 출고완료
 *   trackingNo 존재 + shippedAt 없음 → 40 운송장출력
 *   기타                         → 30 출고대기
 */
function qoo10ToFulfillment(f: Qoo10ShippingFields): FulfillmentRank {
  if (f.deliveredAt) return 70;
  if (f.shippedAt) return 50;
  if (f.trackingNo) return 40;

  // 직접 매핑 enum 가 있다면 우선 사용 (안전망)
  const s = (f.shippingStatus ?? "").trim();
  if (s) {
    if (/배송완료|delivered/i.test(s)) return 70;
    if (/배송중|in[_\s-]?transit|shipping/i.test(s)) return 60;
    if (/발송완료|shipped/i.test(s)) return 50;
    if (/송장|tracking[_\s-]?registered/i.test(s)) return 40;
  }
  return 30;
}

export interface ShopifyFulfillmentFields {
  /** Shopify Admin GraphQL OrderDisplayFinancialStatus */
  displayFinancialStatus?: string | null;
  /** Shopify Admin GraphQL OrderDisplayFulfillmentStatus */
  displayFulfillmentStatus?: string | null;
  trackingNo?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  /** order.cancelledAt (true 면 95 처리는 호출자 책임, 여기선 보류) */
  cancelledAt?: string | null;
}

/**
 * Shopify → fulfillmentStatus rank 결정.
 *
 * 우선순위(높은 rank 우선):
 *   deliveredAt 존재                                       → 70 배송완료
 *   displayFulfillmentStatus = DELIVERED                   → 70
 *   displayFulfillmentStatus = IN_TRANSIT|OUT_FOR_DELIVERY → 60 배송중
 *   shippedAt 존재 or status = FULFILLED|PARTIALLY_FULFILLED → 50 출고완료
 *   trackingNo 존재 (UNFULFILLED 상태에서 송장만 등록)      → 40 운송장출력
 *   financial = PAID|PARTIALLY_PAID and UNFULFILLED        → 30 출고대기
 *   financial = PENDING|AUTHORIZED                         → 10 결제완료(대기)
 *   기타                                                   → 20 신규주문
 */
function shopifyToFulfillment(f: ShopifyFulfillmentFields): FulfillmentRank {
  if (f.deliveredAt) return 70;
  const fs = (f.displayFulfillmentStatus ?? "").toUpperCase();
  const pay = (f.displayFinancialStatus ?? "").toUpperCase();

  if (fs === "DELIVERED") return 70;
  if (fs === "IN_TRANSIT" || fs === "OUT_FOR_DELIVERY") return 60;
  if (f.shippedAt) return 50;
  if (fs === "FULFILLED" || fs === "PARTIALLY_FULFILLED") return 50;
  if (f.trackingNo) return 40;
  if (
    (pay === "PAID" || pay === "PARTIALLY_PAID") &&
    (fs === "UNFULFILLED" || fs === "")
  ) {
    return 30;
  }
  if (pay === "PENDING" || pay === "AUTHORIZED") return 10;
  return 20;
}

const RANK_ORDER: FulfillmentRank[] = [
  10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90,
];

function isHigherOrEqual(
  next: FulfillmentRank,
  current: FulfillmentRank,
): boolean {
  return RANK_ORDER.indexOf(next) >= RANK_ORDER.indexOf(current);
}

export interface RankResolution {
  next: FulfillmentRank;
  /** 단조증가 위반 / 90 불가침 위반으로 입력 무시된 경우 true */
  ignored: boolean;
  reason?: "monotonic_violation" | "90_immutable" | "operator_override";
}

/**
 * 가드 적용 주체.
 *  - 'sync'    : 채널 폴링/웹훅 등 자동 경로. 단조증가 강제 + 90 불가침.
 *  - 'operator': OMS 운영자 수동 UI. 역행 허용(90 포함). 감사로그 + 권한 게이트는 호출자 책임.
 *
 * 운영자 역행은 PlayAuto 2.0 "판매금액 복구"처럼 의도된 별도 액션으로만 발생하는 정책.
 * 채널 push 페이로드에는 영향 없으며, OMS 내부 정책 레이어에서만 적용된다.
 */
export type RankGuardActor = "sync" | "operator";

/**
 * 단조증가 가드 적용.
 *
 * actor='sync' (기본):
 *   - current 가 90 이면 무조건 무시 (불가침).
 *   - candidate < current 면 무시 (역전 금지).
 *   - 동일 rank 는 통과 (멱등 갱신 허용).
 *
 * actor='operator':
 *   - 90 포함 모든 역행 허용. 항상 candidate 채택.
 *   - reason='operator_override' (감사로그용 표식)로 표기, ignored=false.
 */
export function applyRankGuard(
  current: FulfillmentRank,
  candidate: FulfillmentRank,
  actor: RankGuardActor = "sync",
): RankResolution {
  if (actor === "operator") {
    return { next: candidate, ignored: false, reason: "operator_override" };
  }
  if (current === 90) {
    return { next: 90, ignored: true, reason: "90_immutable" };
  }
  if (!isHigherOrEqual(candidate, current)) {
    return { next: current, ignored: true, reason: "monotonic_violation" };
  }
  return { next: candidate, ignored: false };
}

export const StatusRuleEngine = {
  qoo10: {
    toFulfillment: qoo10ToFulfillment,
  },
  shopify: {
    toFulfillment: shopifyToFulfillment,
  },
  applyRankGuard,
  RANK_ORDER,
} as const;

export type StatusRuleEngineT = typeof StatusRuleEngine;
