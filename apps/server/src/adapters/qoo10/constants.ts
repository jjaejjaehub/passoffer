// Qoo10 어댑터 상수 — QAPI 스펙(docs/api/qoo10) 기반.
// 변경 시 반드시 해당 엔드포인트 .md 의 "작업 시 주의사항" 갱신.

/**
 * Qoo10 SetSellerCheckYN_V2 / Bulk 의 DelayType 코드.
 * 출처: docs/api/qoo10/orders/SetSellerCheckYN.md
 *
 * 1=상품준비중, 2=주문제작, 3=고객요청, 4=기타
 *
 * 주의: 과거 메모에 "1=재고소진/2=배송업체사정/3=구매자요청/4=기타"로 적힌
 * 곳이 있다면 모두 본 표가 정답. EstShipDt(yyyyMMdd) 와 DelayMemo 동반 필수.
 */
export const QOO10_DELAY_TYPE = {
  PREPARING: 1,
  MADE_TO_ORDER: 2,
  BUYER_REQUEST: 3,
  OTHER: 4,
} as const;

export type Qoo10DelayType =
  (typeof QOO10_DELAY_TYPE)[keyof typeof QOO10_DELAY_TYPE];

/**
 * QAPI Bulk 엔드포인트 1회 호출 최대 건수.
 * SetSellerCheckYN_V2Bulk / SetSendingInfoBulk 공통 500.
 * Push 시 청크 분할 단위로 사용.
 */
export const QOO10_BULK_MAX = 500;

/**
 * 발송예정일 push 시 기본 허용 연기 일수(JST 기준 현재일 + N일).
 * 채널 정책상 30일 초과 연기는 거절될 수 있으므로 OMS 사전 검증.
 * channelCapabilities.metadata.maxDispatchDelayDays 로 override 가능.
 */
export const QOO10_MAX_DISPATCH_DELAY_DAYS_DEFAULT = 30;

/**
 * Qoo10 ClaimStatus 코드 → OMS claim 매핑 표.
 * 출처: docs/api/qoo10/claims/GetClaimList.md 부록.
 *
 *   1~3   취소 (cancel)
 *   4~6   반품 (return)
 *   11~13 교환 (exchange)
 *   14    미수취 환불완료     → return + incident:undelivered (회수 의미 없음, skipCollection=true)
 *   15    미수취 부분환불완료 → return + incident:undelivered (skipCollection=true)
 *   16    미납주문 취소       → cancel (incident 없음, raw 보존 + requires_recheck)
 *
 * 14·15·16 처리는 QOO10OrderAdapter.pullClaims 에서 별도 분기.
 */
export const QOO10_CLAIM_STATUS_RANGES = {
  cancel: [1, 2, 3, 16],
  return: [4, 5, 6, 14, 15],
  exchange: [11, 12, 13],
  undelivered: [14, 15],
} as const;
