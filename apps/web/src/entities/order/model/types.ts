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
