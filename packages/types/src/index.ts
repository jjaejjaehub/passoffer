// ─── Channel 관련 ─────────────────────────────────────────────

export type ChannelType = 'QOO10_JP' | 'SHOPEE' | 'RAKUTEN' | 'SHOPIFY' | 'CUSTOM';
export type ChannelStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type CredentialType = 'API_KEY' | 'COOKIE' | 'OAUTH';

export interface Channel {
  id: string;
  channelType: ChannelType;
  name: string;
  status: ChannelStatus;
  adapterVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCredential {
  id: string;
  channelId: string;
  credentialType: CredentialType;
  encryptedValue: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Order 관련 ───────────────────────────────────────────────

/**
 * OMS 표준 주문 상태
 * apps/web 한국어 상태와 매핑:
 *   신규→PENDING, 처리중→PAID, 배송준비→PREPARING
 *   배송중→SHIPPED, 완료→DELIVERED, 취소→CANCELLED
 *   반품→RETURNED
 */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'CLAIMED'
  | 'RETURNED';

export type CarrierId =
  | 'yamato'
  | 'sagawa'
  | 'japanpost'
  | 'seino'
  | 'cj'
  | 'lotte'
  | 'hanjin'
  | 'epost'
  | 'etc';

export interface BuyerInfo {
  name: string;
  nameKana?: string;
  tel?: string | null;
  mobile?: string | null;
  email?: string | null;
}

export interface ShippingInfo {
  receiver: string;
  receiverKana?: string;
  address1?: string;
  address2?: string;
  shippingAddress: string;
  zipCode?: string;
  country?: string;
  receiverTel?: string;
  receiverMobile?: string;
  desiredDeliveryDate?: string;
  shippingMessage?: string;
}

export interface PaymentInfo {
  currency: 'KRW' | 'JPY' | 'USD';
  orderPrice?: number;
  discount?: number;
  totalAmount: number;
  settlePrice?: number;
  krwAmount: number;
  originalAmount: number;
  cartDiscountSeller?: number;
  cartDiscountQoo10?: number;
  exchangeRate?: number;
  paymentMethod: string;
  shippingRate?: number;
  shippingRateType?: string;
}

export interface ClaimInfo {
  status?: string;
  reason?: string;
  requestDate?: string;
  cancelRefundDate?: string;
  deliveryCompanyReturn?: string;
  trackingNoReturn?: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  option?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // 채널이 제공하는 판매자 SKU/관리번호 (재고 차감 시 master_product_variants.sku와 매칭)
  sku?: string;
  // 채널 고유 옵션/변형 ID (listed_product_variant_links.channelVariantId와 매칭)
  channelVariantId?: string;
}

export interface Order {
  id: string;
  channelId: string;
  channelOrderId: string;
  packNo?: number;
  shippingStatusLabel?: string;
  status: OrderStatus;
  buyer: BuyerInfo;
  shipping: ShippingInfo;
  payment: PaymentInfo;
  claim?: ClaimInfo;
  items: OrderItem[];
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
  // 기타
  voucherCode?: string;
  gift?: string;
  material?: string;
  branchName?: string;
  sellerItemCode?: string;
  optionCode?: string;
  sellerId?: string;
}

// ─── Product 관련 ─────────────────────────────────────────────

export type ProductStatus = 'active' | 'inactive';
export type AvailableDateType = 'same_day' | 'prep' | 'release' | 'normal';

export interface Product {
  id: string;
  channelId?: string;
  sellerCode: string;
  rawStatus?: string;
  title: string;
  promotionName: string;
  status: ProductStatus;
  price: number;
  settlePrice: number;
  retailPrice: number;
  qty: number;
  imageUrl: string;
  category: {
    main: { code: string; name: string };
    sub1: { code: string; name: string };
    sub2: { code: string; name: string };
  };
  origin: {
    type: '국내' | '해외' | '기타';
    place: string;
  };
  shippingNo: string;
  availableDate: {
    type: AvailableDateType;
    value: string;
  };
  desiredShippingDate: string;
  keyword: string[];
  isAdult: boolean;
  itemDetail: string;
  videoUrl: string;
  modelNm: string;
  manufacturerDate: string;
  brandNo: string;
  material: string;
  industrialCodeType: string;
  industrialCode: string;
  taxRate: string;
  listedDate: string;
  changedDate: string;
  expireDate: string;
  drugtype: string;
  optionShippingNo1: string;
  optionShippingNo2: string;
  contactInfo: string;
}

// ─── Claim 관련 ───────────────────────────────────────────────

/** OMS 표준 클레임 타입 (Qoo10ClaimItem 기반) */
export interface Claim {
  claimStatus: string;
  cancelRefundDate: string;
  reason: string;
  requestDate: string;
  orderDate: string;
  paymentDate: string;
  shippingDate: string;
  deliveredDate: string;
  orderNo: number;
  packNo: number;
  itemCode: string;
  sellerItemCode: string;
  itemTitle: string;
  orderQty: number;
  paymentNation: string;
  currency: string;
  paymentAmount: number;
  deliveryCompany: string;
  trackingNo: string;
  deliveryCompanyReturn: string;
  trackingNoReturn: string;
  receiver: string;
  receiverTel: string;
  receiverMobile: string;
  buyer: string;
  buyerTel: string;
  buyerMobile: string;
  channelId?: string;
  pickupAddress?: string;
  zipCode?: string;
  paymentReturnShipping?: string;
  itemCondition?: string;
  CODCancelPrice?: number;
  CODQrefundPrice?: number;
  CODCancelRelatedOrder?: string;
  nrDutyTarget?: string;
  nrSolType?: string;
  nrPartRefundCnt?: number;
  nrPartRefundBalance?: number;
}

// ─── IChannelAdapter 인터페이스 ──────────────────────────────

export interface GetOrdersParams {
  startDate: string;
  endDate: string;
  status?: string;
  searchCondition?: string;
}

export interface GetClaimsParams {
  startDate: string;
  endDate: string;
  claimStatus?: string;
}

export interface GetProductsParams {
  itemStatus?: string | string[];
  page?: string;
  mergeAll?: boolean;
  offset?: number;
  pageSize?: number;
}

export interface ProductListResult {
  items: Product[];
  totalItems: number;
  totalPages: number;
  /** mergeAll 모드에서 상태별 총 건수 */
  statusTotals?: Record<string, number>;
}

export interface UpdateShipmentData {
  orderNo: number | string;
  packNo?: number;
  carrierId: string;
  trackingNumber: string;
  shipDate?: string;
}

export interface UpdateProductData {
  title?: string;
  price?: number;
  qty?: number;
  status?: ProductStatus;
  [key: string]: unknown;
}

export interface CancelOrderData {
  orderNo: string | number;
  packNo?: number;
  /** 취소 사유 코드 또는 문자열 */
  reason?: string;
}

export interface ReturnItem {
  /** 채널별 클레임/반품 고유 ID */
  id: string;
  channelOrderId: string;
  status: string;
  reason?: string;
  requestDate?: string;
  itemName?: string;
  quantity?: number;
  refundAmount?: number;
  currency?: string;
}

export interface ApproveReturnData {
  orderNo: string | number;
  packNo?: number;
  claimId?: string;
}

export type ReturnDeclineReason = 'FINAL_SALE' | 'NO_RETURN_IN_TIMEFRAME' | 'OTHER';

export interface DeclineReturnData {
  returnId: string;
  declineReason?: ReturnDeclineReason;
}

export interface ReturnRefundLineItem {
  returnLineItemId: string;
  quantity: number;
}

export interface RefundReturnData {
  returnId: string;
  lineItems?: ReturnRefundLineItem[];
  note?: string;
}

export interface UpdateOrderNoteData {
  orderId: string;
  note: string;
}

export interface GetInventoryParams {
  pageSize?: number;
  after?: string;
  keyword?: string;
  status?: string;
}

export interface ShopifyInventoryVariant {
  variantId: string;
  variantTitle: string;
  sku: string | null;
  price: string;
  inventoryItemId: string;
  inventoryQuantity: number;
  tracked: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyInventoryProduct {
  productId: string;
  title: string;
  handle: string;
  status: string;
  imageUrl: string;
  variants: ShopifyInventoryVariant[];
}

export interface ShopifyInventoryApiResponse {
  items: ShopifyInventoryProduct[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    endCursor?: string;
    startCursor?: string;
  };
}

export interface AdjustInventoryData {
  inventoryItemId: string;
  newQuantity: number;
  currentQuantity: number;
}

export type ChannelVendor = 'QOO10_JP' | 'SHOPIFY' | 'SHOPEE' | 'RAKUTEN';
export type SyncMode = 'realtime' | 'polling_5m' | 'polling_1h' | 'daily_batch' | 'manual';
export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected' | 'pending';
export type Freshness = 'fresh' | 'stale' | 'unknown';

export interface ChannelCapabilities {
  supportsOrderFetch: boolean;
  supportsClaimFetch: boolean;
  supportsProductRegister: boolean;
  supportsProductUpdate: boolean;
  supportsInventoryRead: boolean;
  supportsInventoryWrite: boolean;
  supportsRealtimeStock: boolean;
  supportsBulkOperations: boolean;
}

export interface SyncMeta {
  sourceVendor: ChannelVendor;
  fetchedAt: string;
  freshness: Freshness;
  isAuthoritative: boolean;
}

export interface ConnectionHealth {
  status: ConnectionStatus;
  latencyMs?: number;
  checkedAt: string;
  message?: string;
}

// ─── WMS 타입 ────────────────────────────────────────────────────

export type WMSVendor = 'self' | 'cj_logistics' | 'hanjin' | 'sftp_batch' | 'custom';
export type WMSStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type InboundStatus = 'pending_dispatch' | 'instructed' | 'received' | 'canceled';
export type MovementType = 'inbound' | 'outbound' | 'transfer' | 'adjustment';
export type MovementStatus = 'applied' | 'pending_external' | 'failed';

export interface WMSCapabilities {
  supportsRealtimeStock: boolean;
  supportsLotTracking: boolean;
  supportsLocationTree: boolean;
  locationDepth: number;
  supportsBatchInbound: boolean;
  supportsRowLevelAdjustment: boolean;
  supportsCrossWarehouseTransfer: boolean;
  reasonCodeMapping: Record<string, string> | null;
}

export interface InventoryFilter {
  warehouseId?: string;
  masterProductId?: string;
  sku?: string;
  locationId?: string;
}

export interface InventoryRow {
  sku: string;
  vendorSku?: string;
  masterProductId?: string;
  locationCode?: string;
  lotCode?: string;
  quantity: number;
  reservedQuantity: number;
  fetchedAt: string;
  freshness: Freshness;
}

export interface LocationNode {
  code: string;
  name: string;
  level: number;
  fullPath: string;
  children?: LocationNode[];
}

export interface InboundItem {
  sku: string;
  quantity: number;
  lotCode?: string;
}

export interface InboundBatch {
  expectedAt: string;
  items: InboundItem[];
  note?: string;
}

export type AdjustmentReason = 'damage' | 'relocate' | 'audit' | 'return';

export const DEFAULT_ADJUSTMENT_REASONS: Record<AdjustmentReason, string> = {
  damage: '손상',
  relocate: '재배치',
  audit: '실사 조정',
  return: '반품',
};

export interface AdjustmentRequest {
  sku: string;
  delta: number;
  reasonCode: string;
  locationCode?: string;
  note?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface HistoryEvent {
  id: string;
  type: MovementType;
  sku: string;
  quantity: number;
  reasonCode?: string;
  vendorRef?: string;
  occurredAt: string;
  sourceVendor: WMSVendor;
}

export interface IWMSAdapter {
  readonly vendor: WMSVendor;
  readonly capabilities: WMSCapabilities;
  readonly syncMode: SyncMode;
  testConnection(): Promise<ConnectionHealth>;
  fetchInventory(filter?: InventoryFilter): Promise<InventoryRow[]>;
  fetchLocations(): Promise<LocationNode[]>;
  pushInboundInstruction(batch: InboundBatch): Promise<{ ack: boolean; vendorRef?: string }>;
  requestAdjustment(req: AdjustmentRequest): Promise<{ status: 'applied' | 'pending_external'; vendorRef?: string }>;
  fetchHistory(range: DateRange): Promise<HistoryEvent[]>;
}

// ─── 채널 상품 정규화 타입 (link-only 모델용) ──────────────────

export interface ChannelProductVariant {
  channelVariantId: string;
  optionCode?: string;
  optionName?: string;
  optionValue?: string;
  price?: string;
  stock?: number;
}

export interface ChannelProduct {
  channelItemId: string;
  sellerCode?: string;
  title: string;
  price?: string;
  images: string[];
  variants: ChannelProductVariant[];
  status?: string;
  raw?: unknown;
}

export interface ListChannelProductsParams {
  page?: string | number;
  pageSize?: number;
  status?: string | string[];
}

export interface ListChannelProductsResult {
  items: ChannelProduct[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface UpdateSellerCodeResult {
  channelVariantId: string;
  oldCode: string;
  newCode: string;
  status: 'OK' | 'FAILED';
  error?: string;
}

export interface IChannelAdapter {
  readonly vendor: ChannelVendor;
  readonly capabilities: ChannelCapabilities;
  readonly syncMode: SyncMode;
  validateCredential(): Promise<boolean>;
  testConnection(): Promise<ConnectionHealth>;
  getOrders?(params: GetOrdersParams): Promise<Order[]>;
  getOrderDetail?(orderId: string): Promise<Order>;
  getClaims?(params: GetClaimsParams): Promise<Claim[]>;
  getProducts?(params: GetProductsParams): Promise<unknown>;
  getProductDetail?(itemCode: string): Promise<unknown>;
  updateProduct?(itemCode: string, data: unknown): Promise<unknown>;
  updateShipment?(data: UpdateShipmentData): Promise<void>;
  cancelOrder?(data: CancelOrderData): Promise<void>;
  getReturns?(params: GetClaimsParams): Promise<ReturnItem[]>;
  approveReturn?(data: ApproveReturnData): Promise<void>;
  declineReturn?(data: DeclineReturnData): Promise<void>;
  refundReturn?(data: RefundReturnData): Promise<void>;
  updateOrderNote?(data: UpdateOrderNoteData): Promise<void>;
  registerProduct?(data: unknown): Promise<{ productId: string; title: string }>;
  updateProductStatus?(productId: string, status: string): Promise<void>;
  deleteProduct?(productId: string): Promise<{ deletedProductId: string | null }>;
  unlistProduct?(itemId: number, unlist: boolean): Promise<void>;
  getInventory?(params: GetInventoryParams): Promise<ShopifyInventoryApiResponse>;
  adjustInventory?(data: AdjustInventoryData): Promise<void>;
  // ─── link-only 모델용 정규화 메서드 ───────────────────────────
  listChannelProducts?(params: ListChannelProductsParams): Promise<ListChannelProductsResult>;
  getChannelProduct?(channelItemId: string): Promise<ChannelProduct>;
  updateSellerCode?(channelVariantId: string, newCode: string): Promise<UpdateSellerCodeResult>;
  pushVariantStock?(channelItemId: string, channelVariantId: string, newQty: number): Promise<void>;
}

// ─── Notification (SMS/카카오 알림톡) ───────────────────────────

export type NotificationChannel = 'sms' | 'kakao';
export type NotificationVendor = 'mock_sms' | 'mock_kakao';
export type NotificationResult = 'ok' | 'warn' | 'error';

export interface NotificationSendInput {
  recipient: string;
  template: string;
  variables?: Record<string, string | number>;
  body?: string;
}

export interface NotificationSendResult {
  ok: boolean;
  vendorMessageId?: string;
  result: NotificationResult;
  errorMessage?: string;
  renderedBody: string;
  vendorResponse?: unknown;
}

export interface INotificationAdapter {
  readonly vendor: NotificationVendor;
  readonly channel: NotificationChannel;
  send(input: NotificationSendInput): Promise<NotificationSendResult>;
}

// StandardOrder v2 (Canonical 주문 모델) — 별도 파일에 정의
export * from './standard-order';
