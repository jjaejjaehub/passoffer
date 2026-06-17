import type { ChannelId, OrderStatus } from "@/shared/config";

export type CarrierId = "cj" | "lotte" | "hanjin" | "epost" | "etc";

export interface OrderItem {
  id: string;
  productName: string;
  option?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  channelId: ChannelId;
  channelOrderId: string;
  // 원본 주문 번호 (예: Qoo10 PackNo)
  packNo?: number;
  // 채널 원본 배송 상태 문자열 (예: "Seller confirm(3)")
  shippingStatusLabel?: string;
  status: OrderStatus;
  buyerName: string;
  buyerKana?: string;
  buyerPhone: string;
  buyerTel?: string | null;
  buyerMobile?: string | null;
  buyerEmail?: string | null;
  shippingAddress: string;
  address1?: string;
  address2?: string;
  zipCode?: string;
  receiver?: string;
  receiverKana?: string;
  receiverTel?: string;
  receiverMobile?: string;
  desiredDeliveryDate?: string;
  shippingMessage?: string;
  items: OrderItem[];
  currency: "KRW" | "JPY" | "USD";
  // 결제/금액 상세 (원화/원통화 병행 보관)
  orderPrice?: number;
  discount?: number;
  originalAmount: number;
  krwAmount: number;
  totalAmount: number;
  settlePrice?: number;
  cartDiscountSeller?: number;
  cartDiscountQoo10?: number;
  exchangeRate?: number;
  paymentMethod: string;
  shippingRate?: number;
  shippingRateType?: string;
  orderedAt: string;
  paymentDate?: string;
  updatedAt: string;
  shipDate?: string | null;
  estimatedShippingDate?: string | null;
  carrierId?: CarrierId | null;
  trackingNumber?: string | null;
  // 발신자 정보
  senderName?: string;
  senderTel?: string;
  senderNation?: string;
  senderZipCode?: string;
  senderAddress?: string;
  // 배송 상세
  shippingWay?: string;
  packingNo?: string;
  sellerDeliveryNo?: string;
  relatedOrder?: string;
  availableSendType?: string;
  availableShippingDate?: string;
  // 클레임/반품
  claimStatus?: string;
  reason?: string;
  requestDate?: string;
  cancelRefundDate?: string;
  deliveryCompanyReturn?: string;
  trackingNoReturn?: string;
  // 기타
  voucherCode?: string;
  gift?: string;
  material?: string;
  branchName?: string;
  sellerItemCode?: string;
  optionCode?: string;
  sellerId?: string;
}

// ─── A안 GET /api/orders 응답 타입 ──────────────────────────────
// 서버 응답 그대로의 행(= DB orders 스키마 전 컬럼). 65필드 모달이 그대로 소비.
export interface OrderListItem {
  id: string;
  userId: string;
  channelId: string;
  channelOrderId: string;
  channelPackNo: number | null;
  channelItemNo: string | null;
  channelAccountId: string | null;
  relatedOrders: string | null;
  // Buyer
  buyerName: string | null;
  buyerKana: string | null;
  buyerTel: string | null;
  buyerMobile: string | null;
  buyerEmail: string | null;
  buyerLanguage: string | null;
  // Receiver
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
  desiredDeliveryDate: string | null;
  // Sender
  senderName: string | null;
  senderTel: string | null;
  senderNation: string | null;
  senderZipCode: string | null;
  senderAddress: string | null;
  // Payment
  orderedAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  currency: string | null;
  orderPrice: string | null;
  discount: string | null;
  cartDiscountSeller: string | null;
  cartDiscountChannel: string | null;
  total: string | null;
  // Fulfillment
  shippingWay: string | null;
  shippingMessage: string | null;
  shippingRate: string | null;
  shippingRateType: string | null;
  shippingDueDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingCarrier: string | null;
  trackingNo: string | null;
  trackingConflict: boolean | null;
  trackingConflictPayload: unknown;
  // Status
  fulfillmentStatus: number;
  claimStatus: string | null;
  displayStatus: string | null;
  isDispatchDelayed: boolean | null;
  dispatchHoldReason: string | null;
  syncLocked: boolean | null;
  holdStatus: string | null;
  heldFromStatus: number | null;
  // Claim
  claimType: string | null;
  claimReason: string | null;
  claimRequestedAt: string | null;
  claimResolvedAt: string | null;
  returnTrackingNo: string | null;
  // Bundle
  bundleNumber: string | null;
  bundleable: boolean | null;
  bundleRoleIsPrimary: boolean | null;
  // Audit
  autoMatched: boolean | null;
  matchedBy: string | null;
  rawData: unknown;
  createdAt: string;
  updatedAt: string;
}

// counts: rank 키("10","20",...,"90") + 의미 키 + all + claim_any 모두 포함.
export type OrderCounts = Record<string, number>;

export interface OrderListResponse {
  items: OrderListItem[];
  total: number;
  counts: OrderCounts;
}

export type OrderDateField = "orderedAt" | "paidAt" | "shippedAt";
export type OrderSortField =
  | "orderedAt"
  | "paidAt"
  | "shippedAt"
  | "fulfillmentStatus"
  | "total"
  | "channelOrderId"
  | "createdAt"
  | "updatedAt";

export interface OrderListParams {
  status?: number[];
  dateField?: OrderDateField;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
  channelId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: OrderSortField;
  sortDir?: "asc" | "desc";
}

// ─── 결제관리 페이지 전용 응답 ────────────────────────────────
export type PaymentOrderListItem = OrderListItem;

export interface PaymentSummary {
  sumTotal: string; // numeric → string
  byPaymentMethod: Record<string, number>;
  byCurrency: Array<{ currency: string; count: number; sumTotal: string }>;
}

export interface PaymentListResponse {
  items: PaymentOrderListItem[];
  total: number;
  counts: OrderCounts;
  paymentSummary: PaymentSummary;
}

// ─── 신규주문 페이지 전용 응답 ─────────────────────────────────
export type SlaUrgencyFlag = "overdue" | "due_soon" | "on_track";

export interface SlaInfo {
  elapsedHours: number;
  slaDeadline: string; // ISO
  urgencyFlag: SlaUrgencyFlag;
}

export interface NewOrderListItem extends OrderListItem {
  sla: SlaInfo;
}

export interface SlaSummary {
  slaHours: number;
  warnHours: number;
  overdueCount: number;
  dueSoonCount: number;
  now: string; // ISO
}

export interface NewOrderListResponse {
  items: NewOrderListItem[];
  total: number;
  counts: OrderCounts;
  slaSummary: SlaSummary;
}

// ─── 출고관리 페이지 전용 응답 ─────────────────────────────────
export interface DispatchSummary {
  readyCount: number;
  labelPrintedCount: number;
  holdOrderCount: number;
  holdDispatchCount: number;
  byCarrier: Array<{ carrier: string; count: number }>;
}

export interface DispatchListResponse {
  items: OrderListItem[];
  total: number;
  counts: OrderCounts;
  dispatchSummary: DispatchSummary;
}

// ─── 배송관리 페이지 전용 응답 ─────────────────────────────────
export interface ShippingSummary {
  shippedCount: number;
  inTransitCount: number;
  deliveredCount: number;
  deliveredRate: number;
  byCarrier: Array<{ carrier: string; count: number }>;
}

export interface ShippingListResponse {
  items: OrderListItem[];
  total: number;
  counts: OrderCounts;
  shippingSummary: ShippingSummary;
}

// ─── 전체조회 페이지 전용 응답 ─────────────────────────────────
export interface AllOrdersSummary {
  paymentStage: number;
  newOrderStage: number;
  dispatchStage: number;
  shippingStage: number;
  settledStage: number;
  claimStage: number;
}

export interface AllOrdersListResponse {
  items: OrderListItem[];
  total: number;
  counts: OrderCounts;
  allSummary: AllOrdersSummary;
}
