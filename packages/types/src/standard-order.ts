// StandardOrder v2 — schema.ts orders/orderItems 73컬럼/16컬럼 미러.
// 채널 응답은 결정론적 룩업표를 거쳐 본 인터페이스로 정규화된다.
// docs/api/qoo10/orders/CONVERT_RULES.md §2.

export type ClaimType = "cancel" | "return" | "exchange" | "swap";

export type ClaimStatus =
  | "cancel_requested"
  | "cancel_done"
  | "return_requested"
  | "return_in_progress"
  | "return_collected"
  | "return_done"
  | "exchange_requested"
  | "exchange_in_progress"
  | "exchange_collected"
  | "exchange_done"
  | "swap_requested"
  | "swap_done"
  | "requires_recheck";

export type OrderMatchedBy = "auto" | "manual" | "rule";

// fulfillment rank: 10 결제완료 / 20 신규주문 / 25 주문보류 / 30 출고대기 / 35 출고보류 /
// 40 운송장출력 / 50 출고완료 / 60 배송중 / 70 배송완료 / 80 구매결정 / 90 판매완료(불가침)
export type FulfillmentRank =
  | 10
  | 20
  | 25
  | 30
  | 35
  | 40
  | 50
  | 60
  | 70
  | 80
  | 90;

export interface StandardOrderItem {
  // 라인 식별
  lineNo: number;
  // 채널 인입
  channelItemCode: string | null;
  channelItemTitle: string | null;
  channelOption: string | null;
  channelOptionCode: string | null;
  orderQty: number;
  unitPrice: number | null;
  totalPrice: number | null;
  // SKU 매칭 (RuleEngine 적용 후 채워짐, 어댑터 toStandard 시점엔 null)
  skuId: string | null;
  skuCode: string | null;
  skuName: string | null;
  outputQty: number;
  // 사은품 / 창고
  appliedGifts: AppliedGift[];
  warehouseId: string | null;
}

export interface AppliedGift {
  ruleId: string;
  skuId: string;
  qty: number;
}

export interface StandardOrder {
  // ── Identity (7) ─────────────────────────────────────────────
  channelId: string;
  channelOrderId: string;
  channelPackNo: string | null;
  channelItemNo: string | null;
  channelAccountId: string | null;
  relatedOrders: string[];
  // ── Buyer (6) ────────────────────────────────────────────────
  buyerName: string | null;
  buyerKana: string | null;
  buyerTel: string | null;
  buyerMobile: string | null;
  buyerEmail: string | null;
  buyerLanguage: string | null;
  // ── Receiver (11) ────────────────────────────────────────────
  receiverName: string | null;
  receiverKana: string | null;
  receiverTel: string | null;
  receiverMobile: string | null;
  receiverEmail: string | null;
  zipCode: string | null;
  shippingAddress: string | null;
  address1: string | null;
  address2: string | null;
  receiverCountry: string | null;
  desiredDeliveryDate: string | null; // ISO UTC
  // ── Sender (5) ───────────────────────────────────────────────
  senderName: string | null;
  senderTel: string | null;
  senderNation: string | null;
  senderZipCode: string | null;
  senderAddress: string | null;
  // ── Payment (9) ──────────────────────────────────────────────
  orderedAt: string; // ISO UTC, required
  paidAt: string | null;
  paymentMethod: string | null;
  currency: string; // default JPY
  orderPrice: number | null;
  discount: number | null;
  cartDiscountSeller: number | null;
  cartDiscountChannel: number | null;
  total: number | null;
  // ── Fulfillment (11) ─────────────────────────────────────────
  shippingWay: string | null;
  shippingMessage: string | null;
  shippingRate: number | null;
  shippingRateType: string | null; // Free | Charge | Free on condition
  shippingDueDate: string | null; // EstimatedShippingDate
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingCarrier: string | null;
  trackingNo: string | null;
  trackingConflict: boolean;
  trackingConflictPayload: unknown | null;
  // ── Status (5) ───────────────────────────────────────────────
  fulfillmentStatus: FulfillmentRank;
  claimStatus: ClaimStatus | null;
  displayStatus: string | null;
  isDispatchDelayed: boolean;
  dispatchHoldReason: string | null;
  // ── Claim summary (5) ────────────────────────────────────────
  claimType: ClaimType | null;
  claimReason: string | null;
  claimRequestedAt: string | null;
  claimResolvedAt: string | null;
  returnTrackingNo: string | null;
  // ── Bundle (3) ───────────────────────────────────────────────
  bundleNumber: string | null;
  bundleable: boolean;
  bundleRoleIsPrimary: boolean;
  // ── Audit (3) ────────────────────────────────────────────────
  autoMatched: boolean;
  matchedBy: OrderMatchedBy | null;
  rawData: unknown;
  // ── 라인 ─────────────────────────────────────────────────────
  lineItems: StandardOrderItem[];
}

// ─── StandardClaim (GetClaimList → claims 테이블) ──────────────
// 2축 모델: claimType(처리흐름) ⊥ incident(원인, 선택적).
//   Qoo10 claimStatus 14/15 (미수취 환불/부분환불) → claimType='return' + incidentType='undelivered'.
//   Qoo10 claimStatus 16 (미납주문 취소) → claimType='cancel' + incidentType=null + requires_recheck.
export type IncidentType = "undelivered" | "damaged" | "lost" | "misdelivered";
export type IncidentSource = "buyer_report" | "channel_flag" | "operator";

export interface StandardClaim {
  channelOrderId: string;
  channelPackNo: string | null;
  claimType: ClaimType;
  claimStatus: ClaimStatus;
  claimRequestedAt: string | null;
  claimResolvedAt: string | null;
  claimReason: string | null;
  returnTrackingNo: string | null;
  returnDeliveryCompany: string | null;
  // 배송사고 축 — 처리흐름과 독립. undelivered 일 때만 skipCollection 의미 있음.
  incidentType: IncidentType | null;
  incidentSource: IncidentSource | null;
  incidentSkipCollection: boolean;
  rawData: unknown;
}

// ─── IOrderAdapter — Canonical 어댑터 인터페이스 ───────────────
// CONVERT_RULES.md §1 인입 매트릭스 기반.

export interface PullOrdersParams {
  /** JST 기준 ISO 문자열 (어댑터가 채널 포맷으로 변환) */
  sinceDate: string;
  untilDate?: string;
}

export interface PushTrackingPayload {
  channelOrderId: string;
  channelPackNo?: string | null;
  trackingCarrier: string;
  trackingNo: string;
  shippedAt?: string | null;
}

export interface PushTrackingBulkItem {
  channelOrderId: string;
  trackingCarrier: string;
  trackingNo: string;
  shippedAt?: string | null;
}

export interface PushTrackingBulkPayload {
  items: PushTrackingBulkItem[];
}

export interface PushDispatchDelayPayload {
  channelOrderIds: string[];
  /** 1~4 — Qoo10 DelayType, 채널별 의미는 어댑터가 해석 */
  delayType: 1 | 2 | 3 | 4;
  /** YYYY-MM-DD (JST) */
  estimatedShippingDate: string;
}

export interface ConfirmOrdersPayload {
  channelOrderIds: string[];
  /** YYYY-MM-DD (JST). Qoo10 -10018 회피용 — 오늘 이후만 허용 */
  estimatedShippingDate: string;
  /** Qoo10 DelayType (1=상품준비중, 2=주문제작, 3=고객요청, 4=기타). 기본 1 */
  delayType?: 1 | 2 | 3 | 4;
}

export interface PushResult {
  ok: boolean;
  channelOrderId: string;
  message?: string;
  raw?: unknown;
}

export interface IOrderAdapter<TRaw = unknown> {
  /** 채널 식별자 (DB channels.id 가 아닌 어댑터 키) */
  readonly channelKey: "qoo10" | "shopify" | "shopee" | "rakuten";
  /** 채널 응답 1건을 StandardOrder 로 결정론적 변환 (LLM 호출 금지) */
  toStandard(payload: TRaw): StandardOrder | StandardOrder[];
  /** 분 단위 폴링 — sinceDate 이후 갱신/신규 주문 */
  pullOrders(params: PullOrdersParams): Promise<StandardOrder[]>;
  /** on-demand — 단일 주문 상세 보강 */
  pullOrderDetail?(channelOrderId: string): Promise<StandardOrder>;
  /** 분 단위 폴링 — sinceDate 이후 클레임 */
  pullClaims(params: PullOrdersParams): Promise<StandardClaim[]>;
  /** 운송장 push — 채널별 fulfillment_status 갱신 트리거 */
  pushTracking(payload: PushTrackingPayload): Promise<PushResult>;
  /** 운송장 일괄 push — Qoo10 SetSendingInfoBulk(15773), 최대 500건/호출 */
  pushTrackingBulk?(payload: PushTrackingBulkPayload): Promise<PushResult[]>;
  /** 발송예정일 push — Qoo10 SetSellerCheckYNBulk 등 */
  pushDispatchDelay(payload: PushDispatchDelayPayload): Promise<PushResult[]>;
  /** 주문확인(발주확인) — Qoo10 SetSellerCheckYNBulk(15772), Shopify 면제 */
  confirmOrders?(payload: ConfirmOrdersPayload): Promise<PushResult[]>;
}

// ─── AdapterCapabilities — schema channel_capabilities 미러 ────
// 기존 ChannelCapabilities (index.ts) 는 어댑터 동작 모드 8 플래그라 충돌 회피용으로 별도 명명.

export interface AdapterCapabilities {
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
