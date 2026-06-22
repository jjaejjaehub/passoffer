// TypeScript 룰: interface (객체 형태), type (유니온), enum 금지 → as const

// ─── 배송 상태 코드 ───────────────────────────────
// "0 또는 공백" → 1~3 상태 조회
// 1: 배송대기, 2: 배송요청, 3: 배송준비, 4: 배송중, 5: 배송완료
export type Qoo10ShippingStatusCode = "0" | "1" | "2" | "3" | "4" | "5" | "";

// ─── 클레임 상태 코드 ────────────────────────────
// 1:취소요청 2:취소중 3:취소완료 4:반품요청 5:반품중 6:반품완료
// 11:교환신청 12:교환승인 13:재배송중 14:미수취환불완료
// 15:미수취부분환불완료 16:미납주문취소
export type Qoo10ClaimStatusCode =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "";

// ─── 일자 구분 ───────────────────────────────────
// 1:주문일 2:결제일 3:발송일 4:배송완료일
export type Qoo10SearchCondition = "1" | "2" | "3" | "4" | "";

// ─── API 응답 단일 아이템 (실제 응답 필드명 그대로) ──
export interface Qoo10ShippingItem {
  // ─── 주문 기본 ──────────────────────────────
  ShippingStatus: string; // "Seller confirm(3)" 형식
  SellerID: string;
  PackNo: number;
  OrderDate: string;
  PaymentDate: string;
  EstimatedShippingDate: string;
  ShippingDate: string;
  DeliveredDate: string;

  // ─── 구매자 ──────────────────────────────────
  Buyer: string;
  BuyerKana: string; // 카타카나
  BuyerTel: string;
  BuyerMobile: string;
  BuyerEmail: string;

  // ─── 주문 상품 ────────────────────────────────
  OrderNo: number;
  ItemNo: string;
  SellerItemCode: string;
  ItemTitle: string;
  Option: string;
  OptionCode: string;
  OrderPrice: number;
  OrderQty: number;
  Discount: number;
  Total: number;
  SellerDiscount: number;
  SettlePrice: number;

  // ─── 수취인 / 배송지 ──────────────────────────
  Receiver: string;
  ReceiverKana: string;
  ZipCode: string;
  ShippingAddress: string; // 전체 주소
  Address1: string; // 시/구/군
  Address2: string; // 상세주소
  ReceiverTel: string;
  ReceiverMobile: string;
  DesiredDeliveryDate: string;

  // ─── 발신자 ──────────────────────────────────
  SenderName: string;
  SenderTel: string;
  SenderNation: string;
  SenderZipCode: string;
  SenderAddress: string;

  // ─── 배송 ────────────────────────────────────
  ShippingWay: string;
  ShippingMessage: string;
  ShippingRate: number;
  ShippingRateType: string;
  RelatedOrder: string;
  DeliveryCompany: string;
  TrackingNo: string;
  PackingNo: string;
  SellerDeliveryNo: string;
  AvailableSendType: string;
  AvailableShippingDate: string;

  // ─── 결제 ────────────────────────────────────
  PaymentMethod: string;
  Currency: string;
  CartDiscountSeller: number;
  CartDiscountQoo10: number;

  // ─── 기타 ────────────────────────────────────
  VoucherCode: string;
  Gift: string;
  BranchName: string;
  Material: string;

  // ─── 클레임/반품 (선택 필드) ──────────────────
  claimStatus?: string;
  cancelRefundDate?: string;
  reason?: string;
  requestDate?: string;
  deliveryCompanyReturn?: string;
  trackingNoReturn?: string;
}

// ─── API 공통 응답 래퍼 ──────────────────────────
export interface Qoo10ApiResponse<T> {
  ResultObject: T;
  ResultCode: number;
  ResultMsg: string;
}

export type Qoo10ShippingResponse = Qoo10ApiResponse<Qoo10ShippingItem[]>;

// ─── API 요청 파라미터 ───────────────────────────
export interface Qoo10ShippingParams {
  ShippingStatus?: Qoo10ShippingStatusCode;
  SearchStartDate: string; // 'YYYYMMDD' 또는 'YYYYMMDDHHmmss'
  SearchEndDate: string;
  SearchCondition?: Qoo10SearchCondition;
}

// ─── 클레임 조회 아이템 ──────────────────────────
export interface Qoo10ClaimItem {
  claimStatus: string;
  cancelRefundDate: string;
  reason: string;
  requestDate: string;
  orderDate: string;
  PaymentDate: string;
  shippingDate: string;
  DeliveredDate: string;
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
  // 반품 수거 정보 (optional — mock 데이터 미포함 가능)
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

export interface Qoo10ClaimParams {
  ClaimStat?: string;
  search_Sdate: string;
  search_Edate: string;
  search_condition?: string;
}

export type Qoo10ClaimResponse = Qoo10ApiResponse<Qoo10ClaimItem[]>;

export interface Qoo10ProductItem {
  ItemCode: string;
  SellerCode: string;
  ItemStatus: string;
}

export interface Qoo10ProductsResponse {
  TotalItems: number;
  TotalPages: number;
  PresentPage: number;
  Items: Qoo10ProductItem[];
  /** mergeAll 응답 시 상태별 총 건수 (statusTotalQueries 대체용) */
  statusTotals?: Record<string, number>;
}

// ─── Qoo10 에러 코드 상수 ────────────────────────
export const QOO10_ERROR_CODES = {
  SUCCESS: 0,
  INVALID_AUTH_KEY: -10000,
  INVALID_DATE: -10001,
  PERIOD_EXCEEDED: -10002, // 90일 초과
  INVALID_STATUS: -10003,
  STATUS_CONDITION_MISMATCH: -10004,
  TRADE_STATUS_RESTRICTED: -10009, // S1·S2 이외 상태 — 상세 조회 불가
  API_NOT_EXIST: -90001,
  NOT_AUTHORIZED: -90002,
  NOT_AUTHORIZED_2: -90003,
  KEY_EXPIRED: -90004,
  KEY_EXPIRED_2: -90005,
} as const;

export type Qoo10ErrorCode =
  (typeof QOO10_ERROR_CODES)[keyof typeof QOO10_ERROR_CODES];

// ─── GetShippingAndClaimInfoByOrderNo_V2 응답 타입 ──
export interface Qoo10OrderDetailItem {
  shippingStatus: string;
  sellerID: string;
  packNo: number;
  orderDate: string;
  PaymentDate: string;
  DeliveredDate: string;
  buyer: string;
  buyer_gata: string; // 구매자명(카타카나)
  buyerTel: string;
  buyerMobile: string;
  buyerEmail: string;
  OrderType: string;
  orderNo: number;
  itemCode: string;
  sellerItemCode: string;
  itemTitle: string;
  option: string;
  optionCode: string;
  orderPrice: number;
  orderQty: number;
  discount: number;
  total: number;
  receiver: string;
  receiver_gata: string; // 수취인명(카타카나)
  shippingCountry: string;
  zipCode: string;
  shippingAddr: string;
  receiverTel: string;
  receiverMobile: string;
  hopeDate: string;
  senderName: string;
  senderTel: string;
  senderNation: string;
  senderZipCode: string;
  senderAddr: string;
  ShippingWay: string;
  ShippingMsg: string;
  shippingRateType: string;
  PackingNo: string;
  SellerDeliveryNo: string;
  VoucherCode: string;
  paymentNation: string;
  PaymentMethod: string;
  Gift: string;
  cod_price: number;
  Cart_Discount_Seller: number;
  Cart_Discount_Qoo10: number;
  // 클레임/반품
  claimStatus: string;
  cancelRefundDate: string;
  reason: string;
  requestDate: string;
  shippingDate: string;
  currency: string;
  deliveryCompany: string;
  trackingNo: string;
  deliveryCompanyReturn: string;
  trackingNoReturn: string;
  pickupAddress: string;
  pickupzipCode: string;
  paymentReturnShipping: string;
  itemCondition: string;
  // COD 환불
  CODCancelPrice: number;
  CODQrefundPrice: number;
  CODCancelRelatedOrder: string;
  // 미수취 신고
  nrDutyTarget: string; // SC: 미수취, SL: 일부 미수취
  nrSolType: string; // ND: 재배송, NC: 환불
  nrPartRefundCnt: number;
  nrPartRefundBalance: number;
}

// ResultObject는 배열로 내려옴 (단건이지만 array wrapping)
export type Qoo10OrderDetailResponse = Qoo10ApiResponse<Qoo10OrderDetailItem[]>;

// ─── GetShippingAndClaimInfoByOrderNo_V2 에러 코드 ─
export const QOO10_ORDER_DETAIL_ERROR_CODES = {
  SUCCESS: 0,
  INVALID_AUTH_KEY: -10000,
  NOT_EXISTS_SELLER: -10001,
  ORDER_NO_FORMAT_ERROR: -10002,
  ORDER_NO_NOT_FOUND: -10003,
  API_NOT_EXIST: -90001,
  NOT_AUTHORIZED: -90002,
  NOT_AUTHORIZED_2: -90003,
  KEY_EXPIRED: -90004,
  KEY_EXPIRED_2: -90005,
} as const;

/** GetAllGoodsInfo — 상태별 조회·전체(병합) 시 사용하는 ItemStatus 값 */
export const QOO10_GET_ALL_GOODS_ITEM_STATUSES = [
  "S2",
  "S1",
  "S0",
  "S3",
  "S5",
  "S8",
] as const;
