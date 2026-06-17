// QOO10OrderAdapter — IOrderAdapter<Qoo10ShippingItem> 구현체.
// docs/api/qoo10/orders/CONVERT_RULES.md §2 결정론적 매핑. LLM 호출 금지.
// pullOrders / pullClaims / pullOrderDetail / pushTracking / pushDispatchDelay.

import type {
  ClaimStatus,
  ClaimType,
  IncidentType,
  IOrderAdapter,
  PullOrdersParams,
  PushDispatchDelayPayload,
  PushResult,
  PushTrackingPayload,
  StandardClaim,
  StandardOrder,
  StandardOrderItem,
} from '@oms/types';
import { StatusRuleEngine } from '../../services/StatusRuleEngine';
import {
  QOO10_BULK_MAX,
  QOO10_CLAIM_STATUS_RANGES,
  QOO10_MAX_DISPATCH_DELAY_DAYS_DEFAULT,
} from './constants';

// ── Qoo10 호스트 (api.qoo10.jp 고정, www는 404) ────────────────────────────
const BASE_URL = 'https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ebayjapan.qapi';
const CLAIM_URL =
  'https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ShippingBasic.qapi/GetClaimInfo_V3';
const DETAIL_URL = `${BASE_URL}/ShippingBasic.GetShippingAndClaimInfoByOrderNo_V2`;

interface Qoo10ApiResponse<T> {
  ResultObject: T;
  ResultCode: number;
  ResultMsg: string;
}

// ── Raw 응답 인터페이스 (Qoo10Adapter.ts 와 동일 구조) ─────────────────────
export interface Qoo10ShippingItem {
  ShippingStatus: string;
  SellerID: string;
  PackNo: number;
  OrderDate: string;
  PaymentDate: string;
  EstimatedShippingDate: string;
  ShippingDate: string;
  DeliveredDate: string;
  Buyer: string;
  BuyerKana: string;
  BuyerTel: string;
  BuyerMobile: string;
  BuyerEmail: string;
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
  Receiver: string;
  ReceiverKana: string;
  ZipCode: string;
  ShippingAddress: string;
  Address1: string;
  Address2: string;
  ReceiverTel: string;
  ReceiverMobile: string;
  DesiredDeliveryDate: string;
  SenderName: string;
  SenderTel: string;
  SenderNation: string;
  SenderZipCode: string;
  SenderAddress: string;
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
  PaymentMethod: string;
  Currency: string;
  CartDiscountSeller: number;
  CartDiscountQoo10: number;
  VoucherCode: string;
  Gift: string;
  BranchName: string;
  Material: string;
  // 클레임 머지 필드 (orderDetail 에서 채워짐)
  claimStatus?: string;
  cancelRefundDate?: string;
  reason?: string;
  requestDate?: string;
  deliveryCompanyReturn?: string;
  trackingNoReturn?: string;
}

// GetClaimInfo_V3 ResultObject 항목. claimStatus 는 정수 코드의 **문자열**("14"/"15"/"16").
// nr* 필드는 claimStatus 14/15(미수취) 일 때만 의미. 16(미납취소) 및 그 외에는 빈 문자열/0 기대.
interface Qoo10ClaimItem {
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
  paymentReturnShipping?: string;
  itemCondition?: string;
  receiver: string;
  receiverTel: string;
  receiverMobile: string;
  buyer: string;
  buyerTel: string;
  buyerMobile: string;
  pickupAddress?: string;
  zipCode?: string;
  // COD 관련 (택1 운영). 일반 결제 케이스에서는 0/"".
  CODCancelPrice?: number;
  CODQrefundPrice?: number;
  CODCancelRelatedOrder?: string;
  // 미수취(non-receipt) 분기 — 14/15 전용.
  // nrDutyTarget: "SC"=Seller Charge(전체) / "SL"=Seller Loss(일부).
  // nrSolType:    "ND"=재배송 / "NC"=환불.
  nrDutyTarget?: string;
  nrSolType?: string;
  nrPartRefundCnt?: number;
  nrPartRefundBalance?: number;
}

// ── 정규화 헬퍼 ────────────────────────────────────────────────────────────

const digitsOnly = (s: string | null | undefined): string | null => {
  if (s == null) return null;
  const t = s.replace(/[^0-9]/g, '');
  return t.length > 0 ? t : null;
};

const trimOrNull = (s: string | null | undefined): string | null => {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
};

// 사용자 입력은 빈 문자열 유지 (CONVERT_RULES §7).
const trimKeepEmpty = (s: string | null | undefined): string | null => {
  if (s == null) return null;
  return s.trim();
};

const upperOrNull = (s: string | null | undefined): string | null => {
  const t = trimOrNull(s);
  return t ? t.toUpperCase() : null;
};

const lowerOrNull = (s: string | null | undefined): string | null => {
  const t = trimOrNull(s);
  return t ? t.toLowerCase() : null;
};

// JST 'YYYY-MM-DD HH:mm:ss' 또는 'YYYY-MM-DD' → ISO UTC with +09:00 오프셋 표기.
// 파싱 실패 → null.
function parseQoo10Date(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (t.length === 0) return null;
  // 형식: 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss'
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh = '00', mm = '00', ss = '00'] = m;
  // ISO with explicit JST offset
  return `${y}-${mo}-${d}T${hh}:${mm}:${ss}+09:00`;
}

// ShippingRateType enum 정규화 (Free / Charge / Free on condition).
function normalizeShippingRateType(s: string | null | undefined): string | null {
  const t = trimOrNull(s);
  if (!t) return null;
  const low = t.toLowerCase();
  if (low.includes('condition')) return 'Free on condition';
  if (low.includes('free')) return 'Free';
  if (low.includes('charge') || low.includes('paid')) return 'Charge';
  return t;
}

// Qoo10 DeliveryCompany 문자열 → 어댑터 내부 carrier 키 (단순 키워드 매칭).
function mapQoo10Carrier(deliveryCompany: string | null | undefined): string | null {
  if (!deliveryCompany) return null;
  const name = deliveryCompany.toLowerCase();
  if (name.includes('yamato') || name.includes('ヤマト')) return 'yamato';
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

// Qoo10 claimStatus 문자열 → 정수 코드. "14" → 14. 불명/빈값 → null.
// QAPI 응답은 String 타입(스키마 확정). 정수 14 형태로 오는 경우는 없음.
function parseClaimStatusCode(s: string | null | undefined): number | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Qoo10 claimStatus 코드 → OMS ClaimType. constants.QOO10_CLAIM_STATUS_RANGES 기준.
// 14/15 는 'return' (미수취 환불), 16 은 'cancel' (미납 취소).
function mapQoo10ClaimType(s: string | null | undefined): ClaimType | null {
  const code = parseClaimStatusCode(s);
  if (code == null) return null;
  if ((QOO10_CLAIM_STATUS_RANGES.cancel as readonly number[]).includes(code)) return 'cancel';
  if ((QOO10_CLAIM_STATUS_RANGES.return as readonly number[]).includes(code)) return 'return';
  if ((QOO10_CLAIM_STATUS_RANGES.exchange as readonly number[]).includes(code)) return 'exchange';
  return null;
}

// Qoo10 claimStatus 코드 → OMS ClaimStatus (단계 enum).
//   1 cancel_requested / 2,3 cancel_done
//   4 return_requested / 5 return_collected / 6 return_done
//   11 exchange_requested / 12 exchange_collected / 13 exchange_done
//   14,15 return_done (미수취 환불완료/부분환불완료) — 회수 단계 없이 종결
//   16 requires_recheck (미납 취소 — 별도 운영판단)
//   그 외 → requires_recheck
function mapQoo10ClaimStatus(s: string | null | undefined): ClaimStatus {
  const code = parseClaimStatusCode(s);
  if (code == null) return 'requires_recheck';
  switch (code) {
    case 1:
      return 'cancel_requested';
    case 2:
    case 3:
      return 'cancel_done';
    case 4:
      return 'return_requested';
    case 5:
      return 'return_collected';
    case 6:
      return 'return_done';
    case 11:
      return 'exchange_requested';
    case 12:
      return 'exchange_collected';
    case 13:
      return 'exchange_done';
    case 14:
    case 15:
      return 'return_done';
    case 16:
      return 'requires_recheck';
    default:
      return 'requires_recheck';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QOO10OrderAdapter
// ─────────────────────────────────────────────────────────────────────────────

export class QOO10OrderAdapter implements IOrderAdapter<Qoo10ShippingItem> {
  readonly channelKey = 'qoo10' as const;

  constructor(
    private readonly channelId: string,
    private readonly certKey: string,
  ) {}

  // ── 공통 HTTP — 일반 엔드포인트 (ebayjapan.qapi) ─────────────────────────
  private async callQoo10<T>(method: string, params: Record<string, string>): Promise<T> {
    const form = new URLSearchParams({ ...params, returnType: 'json' });
    const url = `${BASE_URL}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        GiosisCertificationKey: this.certKey,
        QAPIVersion: '1.0',
        Accept: 'application/json',
      },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);
    const data = (await res.json()) as Qoo10ApiResponse<T>;
    if (data.ResultCode !== 0) {
      throw new Error(`Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`);
    }
    return data.ResultObject;
  }

  // ── 결정론적 변환 — Qoo10ShippingItem → StandardOrder ───────────────────
  toStandard(payload: Qoo10ShippingItem): StandardOrder {
    const orderedAt =
      parseQoo10Date(payload.OrderDate) ?? new Date(0).toISOString();
    const paidAt = parseQoo10Date(payload.PaymentDate);
    const shippedAt = parseQoo10Date(payload.ShippingDate);
    const deliveredAt = parseQoo10Date(payload.DeliveredDate);
    const shippingDueDate = parseQoo10Date(payload.EstimatedShippingDate);
    const desiredDeliveryDate = parseQoo10Date(payload.DesiredDeliveryDate);

    const trackingNo = trimOrNull(payload.TrackingNo);
    const trackingCarrier = mapQoo10Carrier(payload.DeliveryCompany);

    // CONVERT_RULES §4 — StatusRuleEngine 위임.
    const fulfillmentStatus = StatusRuleEngine.qoo10.toFulfillment({
      shippingStatus: payload.ShippingStatus,
      trackingNo,
      shippedAt,
      deliveredAt,
      estimatedShippingDate: shippingDueDate,
    });

    // RelatedOrder "" → []
    const relatedOrders = (payload.RelatedOrder ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // 라인 1건 고정 (CONVERT_RULES §2 주석).
    const line: StandardOrderItem = {
      lineNo: 1,
      channelItemCode: trimOrNull(payload.SellerItemCode),
      channelItemTitle: trimOrNull(payload.ItemTitle),
      channelOption: trimOrNull(payload.Option),
      channelOptionCode: trimOrNull(payload.OptionCode),
      orderQty: Number(payload.OrderQty ?? 0),
      unitPrice: payload.OrderPrice == null ? null : Number(payload.OrderPrice),
      totalPrice: payload.Total == null ? null : Number(payload.Total),
      // SKU 매칭은 IngestionService 가 RuleEngine 으로 별도 수행.
      skuId: null,
      skuCode: null,
      skuName: null,
      outputQty: Number(payload.OrderQty ?? 0),
      appliedGifts: [],
      warehouseId: null,
    };

    return {
      // Identity
      channelId: this.channelId,
      channelOrderId: String(payload.OrderNo),
      channelPackNo: payload.PackNo != null ? String(payload.PackNo) : null,
      channelItemNo: trimOrNull(payload.ItemNo),
      channelAccountId: trimOrNull(payload.SellerID),
      relatedOrders,
      // Buyer
      buyerName: trimOrNull(payload.Buyer),
      buyerKana: trimOrNull(payload.BuyerKana),
      buyerTel: digitsOnly(payload.BuyerTel),
      buyerMobile: digitsOnly(payload.BuyerMobile),
      buyerEmail: lowerOrNull(payload.BuyerEmail),
      buyerLanguage: null,
      // Receiver
      receiverName: trimOrNull(payload.Receiver),
      receiverKana: trimOrNull(payload.ReceiverKana),
      receiverTel: digitsOnly(payload.ReceiverTel),
      receiverMobile: digitsOnly(payload.ReceiverMobile),
      receiverEmail: null,
      zipCode: trimOrNull(payload.ZipCode),
      shippingAddress: trimOrNull(payload.ShippingAddress),
      address1: trimOrNull(payload.Address1),
      address2: trimKeepEmpty(payload.Address2),
      receiverCountry: null,
      desiredDeliveryDate,
      // Sender
      senderName: trimOrNull(payload.SenderName),
      senderTel: digitsOnly(payload.SenderTel),
      senderNation: upperOrNull(payload.SenderNation),
      senderZipCode: trimOrNull(payload.SenderZipCode),
      senderAddress: trimOrNull(payload.SenderAddress),
      // Payment
      orderedAt,
      paidAt,
      paymentMethod: trimOrNull(payload.PaymentMethod),
      currency: upperOrNull(payload.Currency) ?? 'JPY',
      orderPrice: payload.OrderPrice == null ? null : Number(payload.OrderPrice),
      discount: payload.Discount == null ? null : Number(payload.Discount),
      cartDiscountSeller:
        payload.CartDiscountSeller == null ? null : Number(payload.CartDiscountSeller),
      cartDiscountChannel:
        payload.CartDiscountQoo10 == null ? null : Number(payload.CartDiscountQoo10),
      total: payload.Total == null ? null : Number(payload.Total),
      // Fulfillment
      shippingWay: trimOrNull(payload.ShippingWay),
      shippingMessage: trimKeepEmpty(payload.ShippingMessage),
      shippingRate: payload.ShippingRate == null ? null : Number(payload.ShippingRate),
      shippingRateType: normalizeShippingRateType(payload.ShippingRateType),
      shippingDueDate,
      shippedAt,
      deliveredAt,
      trackingCarrier,
      trackingNo,
      trackingConflict: false,
      trackingConflictPayload: null,
      // Status
      fulfillmentStatus,
      claimStatus: payload.claimStatus ? mapQoo10ClaimStatus(payload.claimStatus) : null,
      displayStatus: trimOrNull(payload.ShippingStatus),
      isDispatchDelayed: false,
      dispatchHoldReason: null,
      // Claim summary (orderDetail 머지 시 채워질 수 있음)
      claimType: null,
      claimReason: trimOrNull(payload.reason),
      claimRequestedAt: parseQoo10Date(payload.requestDate),
      claimResolvedAt: parseQoo10Date(payload.cancelRefundDate),
      returnTrackingNo: trimOrNull(payload.trackingNoReturn),
      // Bundle (후처리: RelatedOrder 존재 시 IngestionService 가 채움)
      bundleNumber: null,
      bundleable: relatedOrders.length > 0,
      bundleRoleIsPrimary: false,
      // Audit
      autoMatched: false,
      matchedBy: null,
      rawData: payload,
      lineItems: [line],
    };
  }

  // ── pullOrders — ShippingBasic.GetShippingInfo_v3 ───────────────────────
  // ShippingStatus '5' 는 전체 — Qoo10 공통 규약([[conventions]]).
  // SearchCondition '1' 주문일자 기준.
  async pullOrders(params: PullOrdersParams): Promise<StandardOrder[]> {
    const since = toYYYYMMDD(params.sinceDate);
    const until = toYYYYMMDD(params.untilDate ?? new Date().toISOString());
    const items = await this.callQoo10<Qoo10ShippingItem[]>(
      'ShippingBasic.GetShippingInfo_v3',
      {
        ShippingStatus: '5',
        SearchStartDate: since,
        SearchEndDate: until,
        SearchCondition: '1',
      },
    );
    return (items ?? []).map((it) => this.toStandard(it));
  }

  // ── pullOrderDetail — 단건 보강 ─────────────────────────────────────────
  // ShippingBasic.GetShippingAndClaimInfoByOrderNo_V2 응답은 ResultObject 배열.
  async pullOrderDetail(channelOrderId: string): Promise<StandardOrder> {
    const form = new URLSearchParams({
      OrderNo: channelOrderId,
      returnType: 'json',
    });
    const res = await fetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        GiosisCertificationKey: this.certKey,
        QAPIVersion: '1.0',
        Accept: 'application/json',
      },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);
    const data = (await res.json()) as Qoo10ApiResponse<Qoo10ShippingItem[]>;
    if (data.ResultCode !== 0) {
      throw new Error(`Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`);
    }
    const first = (data.ResultObject ?? [])[0];
    if (!first) {
      throw new Error(`Qoo10 order detail not found: ${channelOrderId}`);
    }
    return this.toStandard(first);
  }

  // ── pullClaims — GetClaimInfo_V3 (raw fetch, lowercase 헤더 quirk) ──────
  async pullClaims(params: PullOrdersParams): Promise<StandardClaim[]> {
    const since = toYYYYMMDD(params.sinceDate);
    const until = toYYYYMMDD(params.untilDate ?? new Date().toISOString());
    const form = new URLSearchParams({
      ClaimStat: 'A', // 전체 단계
      search_Sdate: since,
      search_Edate: until,
      search_condition: '2', // 결제일자 기준
      returnType: 'json',
    });
    const res = await fetch(CLAIM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        // claim 엔드포인트는 lowercase 헤더 명시 필요.
        giosiscertificationkey: this.certKey,
        QAPIVersion: '1.0',
        Accept: 'application/json',
      },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);
    const data = (await res.json()) as Qoo10ApiResponse<Qoo10ClaimItem[]>;
    if (data.ResultCode !== 0) {
      throw new Error(`Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`);
    }
    const items = data.ResultObject ?? [];
    return items.map((c) => this.claimToStandard(c));
  }

  private claimToStandard(raw: Qoo10ClaimItem): StandardClaim {
    const code = parseClaimStatusCode(raw.claimStatus);
    const claimType = mapQoo10ClaimType(raw.claimStatus) ?? 'cancel';
    const claimStatus = mapQoo10ClaimStatus(raw.claimStatus);

    // incident 축 — claimType 과 독립. 14/15 미수취 환불에만 채워짐.
    // nrDutyTarget: SC=Seller Charge(전체 미수취) / SL=Seller Loss(일부 미수취).
    // 16(미납취소)은 nr* 빈값이며 incident 사고 아님 — null 유지.
    let incidentType: IncidentType | null = null;
    let incidentSource: StandardClaim['incidentSource'] = null;
    let incidentSkipCollection = false;
    if (code === 14 || code === 15) {
      incidentType = 'undelivered';
      incidentSource = 'channel_flag';
      // 미수취는 회수 자체가 성립 안 함 (배송 도달 X).
      incidentSkipCollection = true;
    }

    return {
      channelOrderId: String(raw.orderNo),
      channelPackNo: raw.packNo != null ? String(raw.packNo) : null,
      claimType,
      claimStatus,
      claimRequestedAt: parseQoo10Date(raw.requestDate),
      claimResolvedAt: parseQoo10Date(raw.cancelRefundDate),
      claimReason: trimOrNull(raw.reason),
      returnTrackingNo: trimOrNull(raw.trackingNoReturn),
      returnDeliveryCompany: trimOrNull(raw.deliveryCompanyReturn),
      incidentType,
      incidentSource,
      incidentSkipCollection,
      rawData: raw,
    };
  }

  // ── pushTracking — ShippingBasic.SetSendingInfo (per-item) ─────────────
  // 스펙: docs/api/qoo10/orders/SetSendingInfo.md
  //   Input  : OrderNo(int as String) / ShippingCorp(Max 200) / TrackingNo(Max 50)
  //   Output : ResultObject 없음. top-level ResultCode/ResultMsg 만.
  //   성공   : HTTP 200 AND ResultCode === 0
  // PushResult 계약상 실패는 throw 대신 { ok:false, message } 반환.
  async pushTracking(payload: PushTrackingPayload): Promise<PushResult> {
    const channelOrderId = payload.channelOrderId;
    const shippingCorp = payload.trackingCarrier.slice(0, 200);
    const trackingNo = payload.trackingNo.slice(0, 50);

    if (!channelOrderId || !shippingCorp || !trackingNo) {
      return {
        ok: false,
        channelOrderId,
        message: 'Qoo10 SetSendingInfo: OrderNo/ShippingCorp/TrackingNo required',
      };
    }

    const form = new URLSearchParams({
      OrderNo: channelOrderId,
      ShippingCorp: shippingCorp,
      TrackingNo: trackingNo,
      returnType: 'json',
    });
    const url = `${BASE_URL}/ShippingBasic.SetSendingInfo`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          GiosisCertificationKey: this.certKey,
          QAPIVersion: '1.0',
          Accept: 'application/json',
        },
        body: form.toString(),
      });
      if (!res.ok) {
        return {
          ok: false,
          channelOrderId,
          message: `Qoo10 HTTP error: ${res.status}`,
        };
      }
      const data = (await res.json()) as Qoo10ApiResponse<unknown>;
      return {
        ok: data.ResultCode === 0,
        channelOrderId,
        message: data.ResultMsg,
        raw: data,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, channelOrderId, message: msg };
    }
  }

  // ── pushDispatchDelay — ShippingBasic.SetSellerCheckYNBulk ─────────────
  // 스펙: docs/api/qoo10/orders/SetSellerCheckYNBulk.md
  //   Input  : SendPlanDtInfoJson = JSON.stringify(Array<{OrderNo, EstShipDt(YYYYMMDD), DelayType, DelayMemo}>)
  //   Output : ResultObject = Array<{cont_no, result_cd, ResultCode, ResultMsg}> — 개별 결과
  //   제약   : 1회 최대 500건, EstShipDt 오늘 이후, 채널 허용 최대 일자(기본 30일) 이내, DelayType 1~4.
  async pushDispatchDelay(payload: PushDispatchDelayPayload): Promise<PushResult[]> {
    if (payload.channelOrderIds.length === 0) return [];
    if (payload.channelOrderIds.length > QOO10_BULK_MAX) {
      throw new Error(
        `Qoo10 SetSellerCheckYNBulk: max ${QOO10_BULK_MAX} orders per call, got ${payload.channelOrderIds.length}`,
      );
    }
    if (![1, 2, 3, 4].includes(payload.delayType)) {
      throw new Error(`Qoo10 DelayType must be 1~4, got ${payload.delayType}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.estimatedShippingDate)) {
      throw new Error(
        `Qoo10 estimatedShippingDate must be YYYY-MM-DD, got ${payload.estimatedShippingDate}`,
      );
    }

    // JST 기준 today+1 ~ today+QOO10_MAX_DISPATCH_DELAY_DAYS_DEFAULT 검증.
    // (channelCapabilities.metadata.maxDispatchDelayDays override 는 호출자가 사전 적용 — 어댑터는 기본값만)
    const estYmd = payload.estimatedShippingDate.replace(/-/g, '');
    const todayJstYmd = todayYYYYMMDDJst();
    if (estYmd <= todayJstYmd) {
      throw new Error(
        `Qoo10 estimatedShippingDate must be after today (JST), got ${payload.estimatedShippingDate}`,
      );
    }
    const maxYmd = ymdPlusDays(todayJstYmd, QOO10_MAX_DISPATCH_DELAY_DAYS_DEFAULT);
    if (estYmd > maxYmd) {
      throw new Error(
        `Qoo10 estimatedShippingDate exceeds max ${QOO10_MAX_DISPATCH_DELAY_DAYS_DEFAULT} days (max=${maxYmd}), got ${payload.estimatedShippingDate}`,
      );
    }

    const planInfo = payload.channelOrderIds.map((orderNo) => ({
      OrderNo: orderNo,
      EstShipDt: estYmd,
      DelayType: String(payload.delayType),
      DelayMemo: '',
    }));

    const form = new URLSearchParams({
      SendPlanDtInfoJson: JSON.stringify(planInfo),
      returnType: 'json',
    });
    const url = `${BASE_URL}/ShippingBasic.SetSellerCheckYNBulk`;

    type BulkRow = {
      cont_no?: number;
      result_cd?: number;
      ResultCode?: number;
      ResultMsg?: string;
    };

    let rows: BulkRow[] = [];
    let topMsg = '';
    let topCode = 0;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          GiosisCertificationKey: this.certKey,
          QAPIVersion: '1.0',
          Accept: 'application/json',
        },
        body: form.toString(),
      });
      if (!res.ok) {
        const msg = `Qoo10 HTTP error: ${res.status}`;
        return payload.channelOrderIds.map((id) => ({
          ok: false,
          channelOrderId: id,
          message: msg,
        }));
      }
      const data = (await res.json()) as Qoo10ApiResponse<BulkRow[]>;
      topCode = data.ResultCode;
      topMsg = data.ResultMsg;
      rows = Array.isArray(data.ResultObject) ? data.ResultObject : [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return payload.channelOrderIds.map((id) => ({
        ok: false,
        channelOrderId: id,
        message: msg,
      }));
    }

    // 전체 호출 실패: 모든 주문에 동일 실패 전파.
    if (topCode !== 0) {
      return payload.channelOrderIds.map((id) => ({
        ok: false,
        channelOrderId: id,
        message: `Qoo10 [${topCode}] ${topMsg}`,
      }));
    }

    // 개별 매핑은 cont_no(1-base) 또는 입력 순서로 매칭.
    return payload.channelOrderIds.map((id, idx) => {
      const row =
        rows.find((r) => Number(r.cont_no) === idx + 1) ?? rows[idx] ?? {};
      const ok = Number(row.result_cd) === 0;
      return {
        ok,
        channelOrderId: id,
        message: row.ResultMsg ?? (ok ? topMsg : 'unknown'),
        raw: row,
      };
    });
  }
}

// ISO/Date 문자열 → YYYYMMDD (Qoo10 search 파라미터 포맷).
function toYYYYMMDD(input: string): string {
  const t = input.trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  // fallback: 숫자만 추출 후 첫 8자
  const digits = t.replace(/[^0-9]/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  throw new Error(`Invalid date string for Qoo10 search: ${input}`);
}

// JST(UTC+9) 기준 오늘 YYYYMMDD. Qoo10 발송예정일 검증은 JST 기준.
function todayYYYYMMDDJst(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// YYYYMMDD + N일 → YYYYMMDD. UTC 산술이라 DST 영향 없음.
function ymdPlusDays(ymd: string, days: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}
