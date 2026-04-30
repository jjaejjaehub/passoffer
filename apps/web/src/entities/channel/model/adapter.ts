import type { Order, CarrierId } from '@/entities/order/model/types';
import type { OrderStatus } from '@/shared/config';
import type { Qoo10ShippingItem } from '@/shared/api/qoo10/types';

const JPY_TO_KRW = 9.0;

// ─── 배송 상태 매핑 ──────────────────────────────
// 공식 상태 코드: 1:배송대기 2:배송요청 3:배송준비 4:배송중 5:배송완료
function mapQoo10Status(shippingStatus: string, claimStatus: string): OrderStatus {
  // 클레임 상태 우선 처리
  if (claimStatus) {
    const code = Number(claimStatus);
    if (code >= 1 && code <= 3) return '취소'; // 취소요청/취소중/취소완료
    if (code >= 4 && code <= 6) return '반품'; // 반품요청/반품중/반품완료
    if (code >= 11 && code <= 13) return '배송중'; // 교환신청/교환승인/재배송중
  }

  // 배송 상태 문자열에서 코드 파싱 (예: "Seller confirm(3)")
  const match = shippingStatus.match(/\((\d+)\)/);
  const code = match ? Number(match[1]) : 0;

  switch (code) {
    case 1:
      return '신규'; // 배송대기
    case 2:
      return '처리중'; // 배송요청
    case 3:
      return '배송준비'; // 배송준비
    case 4:
      return '배송중'; // 배송중
    case 5:
      return '완료'; // 배송완료
    default:
      return '신규';
  }
}

// ─── 배송사 매핑 ─────────────────────────────────
function mapQoo10Carrier(deliveryCompany: string): string | null {
  if (!deliveryCompany) return null;
  const name = deliveryCompany.toLowerCase();
  if (name.includes('yamato') || name.includes('クロネコ') || name.includes('ヤマト')) return 'yamato';
  if (name.includes('sagawa') || name.includes('佐川')) return 'sagawa';
  if (name.includes('japan post') || name.includes('郵便') || name.includes('yupack'))
    return 'japanpost';
  if (name.includes('seino') || name.includes('西濃')) return 'seino';
  if (name.includes('cj') || name.includes('대한통운')) return 'cj';
  if (name.includes('lotte') || name.includes('롯데')) return 'lotte';
  if (name.includes('hanjin') || name.includes('한진')) return 'hanjin';
  if (name.includes('epost') || name.includes('우체국')) return 'epost';
  return 'etc';
}

// ─── 단건 변환 ───────────────────────────────────
export function adaptQoo10Order(raw: Qoo10ShippingItem): Order {
  const isJpy = raw.Currency === 'JPY';
  const totalKrw = isJpy ? Math.round(raw.Total * JPY_TO_KRW) : raw.Total;
  const carrierId = raw.TrackingNo ? (mapQoo10Carrier(raw.DeliveryCompany) as CarrierId | null) : null;

  return {
    id: `qoo10_${raw.PackNo}`,
    channelId: 'qoo10',
    channelOrderId: String(raw.OrderNo),
    packNo: raw.PackNo,
    shippingStatusLabel: raw.ShippingStatus,
    status: mapQoo10Status(raw.ShippingStatus, raw.claimStatus ?? ''),
    buyerName: raw.Buyer,
    buyerKana: raw.BuyerKana,
    buyerPhone: raw.BuyerMobile || raw.BuyerTel,
    buyerTel: raw.BuyerTel || null,
    buyerMobile: raw.BuyerMobile || null,
    buyerEmail: raw.BuyerEmail || null,
    shippingAddress: raw.ShippingAddress,
    address1: raw.Address1,
    address2: raw.Address2,
    zipCode: raw.ZipCode,
    receiver: raw.Receiver,
    receiverKana: raw.ReceiverKana,
    receiverTel: raw.ReceiverTel,
    receiverMobile: raw.ReceiverMobile,
    desiredDeliveryDate: raw.DesiredDeliveryDate,
    shippingMessage: raw.ShippingMessage,
    items: [
      {
        id: `${raw.PackNo}_${raw.ItemNo}`,
        productName: raw.Option ? `${raw.ItemTitle} (${raw.Option})` : raw.ItemTitle,
        option: raw.Option || undefined,
        quantity: raw.OrderQty,
        unitPrice: isJpy ? Math.round(raw.OrderPrice * JPY_TO_KRW) : raw.OrderPrice,
        totalPrice: totalKrw,
      },
    ],
    currency: isJpy ? 'JPY' : 'KRW',
    orderPrice: raw.OrderPrice,
    discount: raw.Discount,
    originalAmount: raw.Total,
    krwAmount: totalKrw,
    totalAmount: totalKrw,
    settlePrice: raw.SettlePrice,
    cartDiscountSeller: raw.CartDiscountSeller,
    cartDiscountQoo10: raw.CartDiscountQoo10,
    exchangeRate: isJpy ? JPY_TO_KRW : undefined,
    paymentMethod: raw.PaymentMethod,
    shippingRate: raw.ShippingRate,
    shippingRateType: raw.ShippingRateType,
    orderedAt: raw.OrderDate,
    paymentDate: raw.PaymentDate,
    updatedAt: raw.ShippingDate || raw.OrderDate,
    // 발송 정보
    shipDate: raw.ShippingDate || null,
    estimatedShippingDate: raw.EstimatedShippingDate || null,
    carrierId,
    trackingNumber: raw.TrackingNo || null,
    // 발신자 정보
    senderName: raw.SenderName,
    senderTel: raw.SenderTel,
    senderNation: raw.SenderNation,
    senderZipCode: raw.SenderZipCode,
    senderAddress: raw.SenderAddress,
    // 배송 상세
    shippingWay: raw.ShippingWay,
    packingNo: raw.PackingNo,
    sellerDeliveryNo: raw.SellerDeliveryNo,
    relatedOrder: raw.RelatedOrder,
    availableSendType: raw.AvailableSendType,
    availableShippingDate: raw.AvailableShippingDate,
    // 클레임/반품
    claimStatus: raw.claimStatus,
    reason: raw.reason,
    requestDate: raw.requestDate,
    cancelRefundDate: raw.cancelRefundDate,
    deliveryCompanyReturn: raw.deliveryCompanyReturn,
    trackingNoReturn: raw.trackingNoReturn,
    // 기타
    voucherCode: raw.VoucherCode,
    gift: raw.Gift,
    material: raw.Material,
    branchName: raw.BranchName,
    sellerItemCode: raw.SellerItemCode,
    optionCode: raw.OptionCode,
    sellerId: raw.SellerID,
  };
}

// ─── 복수 변환 ───────────────────────────────────
export function adaptQoo10Orders(
  items: Qoo10ShippingItem[] | null | undefined,
): Order[] {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.map(adaptQoo10Order);
}


