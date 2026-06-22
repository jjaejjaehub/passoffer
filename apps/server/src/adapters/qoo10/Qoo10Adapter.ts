import type {
  IChannelAdapter,
  Order,
  OrderStatus,
  CarrierId,
  Claim,
  Product,
  ProductListResult,
  ProductStatus,
  AvailableDateType,
  GetOrdersParams,
  GetClaimsParams,
  GetProductsParams,
  UpdateProductData,
  UpdateShipmentData,
  ChannelVendor,
  ChannelCapabilities,
  SyncMode,
  ConnectionHealth,
  ChannelProduct,
  ChannelProductVariant,
  ListChannelProductsParams,
  ListChannelProductsResult,
  UpdateSellerCodeResult,
} from "@oms/types";

const BASE_URL =
  "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ebayjapan.qapi";

const PRODUCTS_URL =
  "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ItemsLookup.qapi/GetAllGoodsInfo";

const CLAIM_URL =
  "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ShippingBasic.qapi/GetClaimInfo_V3";

const ALL_GOODS_STATUSES = ["S2", "S1", "S0", "S3", "S5", "S8"] as const;

const JPY_TO_KRW_DEFAULT = 9.5;

// ─── Raw Qoo10 타입 ──────────────────────────────────────────────

interface Qoo10ShippingItem {
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
  claimStatus?: string;
  cancelRefundDate?: string;
  reason?: string;
  requestDate?: string;
  deliveryCompanyReturn?: string;
  trackingNoReturn?: string;
}

interface Qoo10OrderDetailItem {
  shippingStatus: string;
  sellerID: string;
  packNo: number;
  orderDate: string;
  PaymentDate: string;
  DeliveredDate: string;
  buyer: string;
  buyer_gata: string;
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
  receiver_gata: string;
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
  Cart_Discount_Seller: number;
  Cart_Discount_Qoo10: number;
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
}

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
  receiver: string;
  receiverTel: string;
  receiverMobile: string;
  buyer: string;
  buyerTel: string;
  buyerMobile: string;
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

interface Qoo10ItemDetailRaw {
  ItemCode: string;
  ItemStatus: string;
  ItemTitle: string;
  PromotionName: string;
  MainCatCd: string;
  MainCatNm: string;
  FirstSubCatCd: string;
  FirstSubCatNm: string;
  SecondSubCatCd: string;
  SecondSubCatNm: string;
  Drugtype: string;
  SellerCode: string;
  ProductionPlaceType: string;
  ProductionPlace: string;
  IndustrialCodeType: string;
  IndustrialCode: string;
  RetailPrice: string;
  ItemPrice: string;
  TaxRate: string;
  SettlePrice: string;
  ItemQty: string;
  ExpireDate: string;
  ModelNM: string;
  ManufacturerDate: string;
  BrandNo: string;
  Material: string;
  AdultYN: string;
  DesiredShippingDate: string;
  AvailableDateType: string;
  AvailableDateValue: string;
  ShippingNo: string;
  ContactInfo: string;
  ItemDetail: string;
  ImageUrl: string;
  VideoURL: string;
  Keyword: string;
  ListedDate: string;
  ChangedDate: string;
  OptionShippingNo1: string;
  OptionShippingNo2: string;
}

interface Qoo10OptionItem {
  ItemCode: string;
  OptionCode: string;
  SellerCode: string;
  Flag: string; // 'ADD' | 'DEL' | ''
  ItemQty: string;
  ItemPrice: string;
  OptType1: string;
  OptValue1: string;
  OptType2: string;
  OptValue2: string;
  OptType3: string;
  OptValue3: string;
}

interface Qoo10ApiResponse<T> {
  ResultObject: T;
  ResultCode: number;
  ResultMsg: string;
}

interface Qoo10ProductItem {
  ItemCode: string;
  SellerCode: string;
  ItemStatus: string;
}

interface Qoo10ProductsResponse {
  TotalItems: number;
  TotalPages: number;
  PresentPage: number;
  Items: Qoo10ProductItem[];
}

// ─── 매핑 헬퍼 ──────────────────────────────────────────────────

function mapQoo10Status(
  shippingStatus: string,
  claimStatus: string,
): OrderStatus {
  if (claimStatus) {
    const code = Number(claimStatus);
    if (code >= 1 && code <= 3) return "CANCELLED";
    if (code >= 4 && code <= 6) return "RETURNED";
    if (code >= 11 && code <= 13) return "SHIPPED";
  }
  const match = shippingStatus.match(/\((\d+)\)/);
  const code = match ? Number(match[1]) : 0;
  switch (code) {
    case 1:
      return "PENDING";
    case 2:
      return "PAID";
    case 3:
      return "PREPARING";
    case 4:
      return "SHIPPED";
    case 5:
      return "DELIVERED";
    default:
      return "PENDING";
  }
}

// Qoo10 ShippingCenterId 코드 (ShippingBasic.SetSendingInfo 용)
const CARRIER_TO_QOO10_SHIPPING_CENTER: Record<string, string> = {
  yamato: "008", // ヤマト運輸
  sagawa: "006", // 佐川急便
  japanpost: "007", // 日本郵便
  seino: "009", // 西濃運輸
  cj: "082", // CJ대한통운
  lotte: "081", // 롯데택배
  hanjin: "083", // 한진택배
  epost: "084", // 우체국택배
  etc: "061", // その他
};

function mapCarrierToQoo10ShippingCenter(carrierId: string): string {
  return CARRIER_TO_QOO10_SHIPPING_CENTER[carrierId] ?? "061";
}

function mapQoo10Carrier(deliveryCompany: string): CarrierId | null {
  if (!deliveryCompany) return null;
  const name = deliveryCompany.toLowerCase();
  if (name.includes("yamato") || name.includes("ヤマト")) return "yamato";
  if (name.includes("sagawa") || name.includes("佐川")) return "sagawa";
  if (
    name.includes("japan post") ||
    name.includes("郵便") ||
    name.includes("yupack")
  )
    return "japanpost";
  if (name.includes("seino") || name.includes("西濃")) return "seino";
  if (name.includes("cj") || name.includes("대한통운")) return "cj";
  if (name.includes("lotte") || name.includes("롯데")) return "lotte";
  if (name.includes("hanjin") || name.includes("한진")) return "hanjin";
  if (name.includes("epost") || name.includes("우체국")) return "epost";
  return "etc";
}

function adaptShippingItem(
  raw: Qoo10ShippingItem,
  channelId: string,
  exchangeRate: number,
): Order {
  const isJpy = raw.Currency === "JPY";
  const rate = isJpy ? exchangeRate : 1;
  const krwAmount = isJpy ? Math.round(raw.Total * rate) : raw.Total;
  const carrierId = raw.TrackingNo
    ? mapQoo10Carrier(raw.DeliveryCompany)
    : null;

  return {
    id: `qoo10_${raw.PackNo}`,
    channelId,
    channelOrderId: String(raw.OrderNo),
    packNo: raw.PackNo,
    shippingStatusLabel: raw.ShippingStatus,
    status: mapQoo10Status(raw.ShippingStatus, raw.claimStatus ?? ""),
    buyer: {
      name: raw.Buyer,
      nameKana: raw.BuyerKana,
      tel: raw.BuyerTel || null,
      mobile: raw.BuyerMobile || null,
      email: raw.BuyerEmail || null,
    },
    shipping: {
      receiver: raw.Receiver,
      receiverKana: raw.ReceiverKana,
      address1: raw.Address1,
      address2: raw.Address2,
      shippingAddress: raw.ShippingAddress,
      zipCode: raw.ZipCode,
      receiverTel: raw.ReceiverTel,
      receiverMobile: raw.ReceiverMobile,
      desiredDeliveryDate: raw.DesiredDeliveryDate,
      shippingMessage: raw.ShippingMessage,
    },
    payment: {
      currency: isJpy ? "JPY" : "KRW",
      orderPrice: raw.OrderPrice,
      discount: raw.Discount,
      totalAmount: krwAmount,
      settlePrice: raw.SettlePrice,
      krwAmount,
      originalAmount: raw.Total,
      cartDiscountSeller: raw.CartDiscountSeller,
      cartDiscountQoo10: raw.CartDiscountQoo10,
      exchangeRate: isJpy ? rate : undefined,
      paymentMethod: raw.PaymentMethod,
      shippingRate: raw.ShippingRate,
      shippingRateType: raw.ShippingRateType,
    },
    claim: raw.claimStatus
      ? {
          status: raw.claimStatus,
          reason: raw.reason,
          requestDate: raw.requestDate,
          cancelRefundDate: raw.cancelRefundDate,
          deliveryCompanyReturn: raw.deliveryCompanyReturn,
          trackingNoReturn: raw.trackingNoReturn,
        }
      : undefined,
    items: [
      {
        id: `${raw.PackNo}_${raw.ItemNo}`,
        productName: raw.Option
          ? `${raw.ItemTitle} (${raw.Option})`
          : raw.ItemTitle,
        option: raw.Option || undefined,
        quantity: raw.OrderQty,
        unitPrice: isJpy ? Math.round(raw.OrderPrice * rate) : raw.OrderPrice,
        totalPrice: krwAmount,
        sku: raw.OptionCode || raw.SellerItemCode || undefined,
      },
    ],
    orderedAt: raw.OrderDate,
    paymentDate: raw.PaymentDate,
    updatedAt: raw.ShippingDate || raw.OrderDate,
    shipDate: raw.ShippingDate || null,
    estimatedShippingDate: raw.EstimatedShippingDate || null,
    carrierId,
    trackingNumber: raw.TrackingNo || null,
    senderName: raw.SenderName,
    senderTel: raw.SenderTel,
    senderNation: raw.SenderNation,
    senderZipCode: raw.SenderZipCode,
    senderAddress: raw.SenderAddress,
    shippingWay: raw.ShippingWay,
    packingNo: raw.PackingNo,
    sellerDeliveryNo: raw.SellerDeliveryNo,
    relatedOrder: raw.RelatedOrder,
    availableSendType: raw.AvailableSendType,
    availableShippingDate: raw.AvailableShippingDate,
    voucherCode: raw.VoucherCode,
    gift: raw.Gift,
    material: raw.Material,
    branchName: raw.BranchName,
    sellerItemCode: raw.SellerItemCode,
    optionCode: raw.OptionCode,
    sellerId: raw.SellerID,
  };
}

function adaptOrderDetail(
  raw: Qoo10OrderDetailItem,
  channelId: string,
  exchangeRate: number,
): Order {
  const isJpy = raw.currency === "JPY";
  const rate = isJpy ? exchangeRate : 1;
  const krwAmount = isJpy ? Math.round(raw.total * rate) : raw.total;
  const carrierId = raw.trackingNo
    ? mapQoo10Carrier(raw.deliveryCompany)
    : null;

  return {
    id: `qoo10_${raw.packNo}`,
    channelId,
    channelOrderId: String(raw.orderNo),
    packNo: raw.packNo,
    status: mapQoo10Status(raw.shippingStatus, raw.claimStatus ?? ""),
    buyer: {
      name: raw.buyer,
      nameKana: raw.buyer_gata,
      tel: raw.buyerTel || null,
      mobile: raw.buyerMobile || null,
      email: raw.buyerEmail || null,
    },
    shipping: {
      receiver: raw.receiver,
      receiverKana: raw.receiver_gata,
      shippingAddress: raw.shippingAddr,
      zipCode: raw.zipCode,
      country: raw.shippingCountry,
      receiverTel: raw.receiverTel,
      receiverMobile: raw.receiverMobile,
      desiredDeliveryDate: raw.hopeDate,
      shippingMessage: raw.ShippingMsg,
    },
    payment: {
      currency: isJpy ? "JPY" : "KRW",
      orderPrice: raw.orderPrice,
      discount: raw.discount,
      totalAmount: krwAmount,
      krwAmount,
      originalAmount: raw.total,
      cartDiscountSeller: raw.Cart_Discount_Seller,
      cartDiscountQoo10: raw.Cart_Discount_Qoo10,
      exchangeRate: isJpy ? rate : undefined,
      paymentMethod: raw.PaymentMethod,
    },
    claim: raw.claimStatus
      ? {
          status: raw.claimStatus,
          reason: raw.reason,
          requestDate: raw.requestDate,
          cancelRefundDate: raw.cancelRefundDate,
          deliveryCompanyReturn: raw.deliveryCompanyReturn,
          trackingNoReturn: raw.trackingNoReturn,
        }
      : undefined,
    items: [
      {
        id: `${raw.packNo}_${raw.itemCode}`,
        productName: raw.option
          ? `${raw.itemTitle} (${raw.option})`
          : raw.itemTitle,
        option: raw.option || undefined,
        quantity: raw.orderQty,
        unitPrice: isJpy ? Math.round(raw.orderPrice * rate) : raw.orderPrice,
        totalPrice: krwAmount,
        sku: raw.itemCode || undefined,
      },
    ],
    orderedAt: raw.orderDate,
    paymentDate: raw.PaymentDate,
    updatedAt: raw.shippingDate || raw.orderDate,
    shipDate: raw.shippingDate || null,
    carrierId,
    trackingNumber: raw.trackingNo || null,
    senderName: raw.senderName,
    senderTel: raw.senderTel,
    senderNation: raw.senderNation,
    senderZipCode: raw.senderZipCode,
    senderAddress: raw.senderAddr,
    shippingWay: raw.ShippingWay,
    packingNo: raw.PackingNo,
    sellerDeliveryNo: raw.SellerDeliveryNo,
    voucherCode: raw.VoucherCode,
    gift: raw.Gift,
    sellerItemCode: raw.sellerItemCode,
    optionCode: raw.optionCode,
    sellerId: raw.sellerID,
  };
}

function parseNumericString(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapProductStatus(itemStatus: string): ProductStatus {
  return itemStatus === "S2" ? "active" : "inactive";
}

function mapProductionPlaceType(raw: string): "국내" | "해외" | "기타" {
  if (raw === "1") return "국내";
  if (raw === "2") return "해외";
  return "기타";
}

function mapAvailableDateType(raw: string): AvailableDateType {
  if (raw === "0") return "normal";
  if (raw === "1") return "prep";
  if (raw === "2") return "release";
  if (raw === "3") return "same_day";
  return "normal";
}

function adaptItemDetail(raw: Qoo10ItemDetailRaw, channelId: string): Product {
  return {
    id: raw.ItemCode,
    channelId,
    sellerCode: raw.SellerCode,
    title: raw.ItemTitle,
    promotionName: raw.PromotionName,
    status: mapProductStatus(raw.ItemStatus),
    price: parseNumericString(raw.ItemPrice),
    settlePrice: parseNumericString(raw.SettlePrice),
    retailPrice: parseNumericString(raw.RetailPrice),
    qty: parseNumericString(raw.ItemQty),
    imageUrl: raw.ImageUrl,
    category: {
      main: { code: raw.MainCatCd, name: raw.MainCatNm },
      sub1: { code: raw.FirstSubCatCd, name: raw.FirstSubCatNm },
      sub2: { code: raw.SecondSubCatCd, name: raw.SecondSubCatNm },
    },
    origin: {
      type: mapProductionPlaceType(raw.ProductionPlaceType),
      place: raw.ProductionPlace,
    },
    shippingNo: raw.ShippingNo,
    availableDate: {
      type: mapAvailableDateType(raw.AvailableDateType),
      value: raw.AvailableDateValue,
    },
    desiredShippingDate: raw.DesiredShippingDate,
    keyword: raw.Keyword.split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0),
    isAdult: raw.AdultYN.trim().toUpperCase() === "Y",
    itemDetail: raw.ItemDetail,
    videoUrl: raw.VideoURL,
    modelNm: raw.ModelNM,
    manufacturerDate: raw.ManufacturerDate,
    brandNo: raw.BrandNo,
    material: raw.Material,
    industrialCodeType: raw.IndustrialCodeType,
    industrialCode: raw.IndustrialCode,
    taxRate: raw.TaxRate,
    listedDate: raw.ListedDate,
    changedDate: raw.ChangedDate,
    expireDate: raw.ExpireDate,
    drugtype: raw.Drugtype,
    optionShippingNo1: raw.OptionShippingNo1,
    optionShippingNo2: raw.OptionShippingNo2,
    contactInfo: raw.ContactInfo,
  };
}

// ─── Qoo10Adapter ────────────────────────────────────────────────

export class Qoo10Adapter implements IChannelAdapter {
  readonly vendor: ChannelVendor = "QOO10_JP";
  readonly syncMode: SyncMode = "realtime";
  readonly capabilities: ChannelCapabilities = {
    supportsOrderFetch: true,
    supportsClaimFetch: true,
    supportsProductRegister: true,
    supportsProductUpdate: true,
    supportsInventoryRead: true,
    supportsInventoryWrite: true,
    supportsRealtimeStock: true,
    supportsBulkOperations: false,
  };

  constructor(
    private readonly channelId: string,
    private readonly certKey: string,
    private readonly exchangeRate: number = JPY_TO_KRW_DEFAULT,
  ) {}

  private async callQoo10<T>(
    method: string,
    params: Record<string, string>,
  ): Promise<T> {
    const form = new URLSearchParams({ ...params, returnType: "json" });
    const url = `${BASE_URL}/${method}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    if (!res.ok) {
      throw new Error(`Qoo10 HTTP error: ${res.status}`);
    }

    const data = (await res.json()) as Qoo10ApiResponse<T>;

    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }

    return data.ResultObject;
  }

  async validateCredential(): Promise<boolean> {
    try {
      const today = new Date();
      const end = today.toISOString().slice(0, 10).replace(/-/g, "");
      const start = new Date(today.setDate(today.getDate() - 1))
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      await this.callQoo10<Qoo10ShippingItem[]>(
        "ShippingBasic.GetShippingInfo_v3",
        {
          ShippingStatus: "1",
          SearchStartDate: start,
          SearchEndDate: end,
          SearchCondition: "1",
        },
      );
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<ConnectionHealth> {
    const start = Date.now();
    const ok = await this.validateCredential();
    return {
      status: ok ? "connected" : "disconnected",
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }

  async getOrders(params: GetOrdersParams): Promise<Order[]> {
    const items = await this.callQoo10<Qoo10ShippingItem[]>(
      "ShippingBasic.GetShippingInfo_v3",
      {
        ShippingStatus: params.status ?? "",
        SearchStartDate: params.startDate,
        SearchEndDate: params.endDate,
        SearchCondition: params.searchCondition ?? "1",
      },
    );
    return (Array.isArray(items) ? items : []).map((item) =>
      adaptShippingItem(item, this.channelId, this.exchangeRate),
    );
  }

  async getOrderDetail(orderId: string): Promise<Order> {
    const url = `${BASE_URL}/ShippingBasic.GetShippingAndClaimInfoByOrderNo_V2`;
    const form = new URLSearchParams({ OrderNo: orderId, returnType: "json" });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);

    const data = (await res.json()) as Qoo10ApiResponse<Qoo10OrderDetailItem[]>;
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }

    const item = data.ResultObject[0];
    if (!item) throw new Error(`Order not found: ${orderId}`);

    return adaptOrderDetail(item, this.channelId, this.exchangeRate);
  }

  async getClaims(params: GetClaimsParams): Promise<Claim[]> {
    const form = new URLSearchParams({
      ClaimStat: params.claimStatus ?? "",
      search_Sdate: params.startDate,
      search_Edate: params.endDate,
      search_condition: "2",
      returnType: "application%2Fjson",
    });

    const res = await fetch(CLAIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        giosiscertificationkey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      } as Record<string, string>,
      body: form.toString(),
    });

    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);

    const data = (await res.json()) as Qoo10ApiResponse<Qoo10ClaimItem[]>;
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }

    return (Array.isArray(data.ResultObject) ? data.ResultObject : []).map(
      (item): Claim => ({
        ...item,
        paymentDate: item.PaymentDate,
        deliveredDate: item.DeliveredDate,
        channelId: this.channelId,
      }),
    );
  }

  async getProducts(params: GetProductsParams): Promise<ProductListResult> {
    const page = params.page ?? "1";

    if (params.mergeAll) {
      const statusTotals: Record<string, number> = {};
      const merged: Product[] = [];
      for (const status of ALL_GOODS_STATUSES) {
        try {
          const result = await this.fetchProductList(status, page);
          merged.push(...result.items);
          statusTotals[status] = result.totalItems;
        } catch {
          // 상태별 실패는 skip
        }
      }
      return {
        items: merged,
        totalItems: merged.length,
        totalPages: 1,
        statusTotals,
      };
    }

    const status = Array.isArray(params.itemStatus)
      ? params.itemStatus[0]
      : (params.itemStatus ?? "S2");
    return this.fetchProductList(status, page);
  }

  private async fetchProductList(
    itemStatus: string,
    page: string,
  ): Promise<ProductListResult> {
    const body =
      `ItemStatus=${encodeURIComponent(itemStatus)}` +
      `&Page=${encodeURIComponent(page)}` +
      "&returnType=application%2Fjson";

    const res = await fetch(PRODUCTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        giosiscertificationkey: this.certKey,
      } as Record<string, string>,
      body,
    });

    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);

    const data = (await res.json()) as Qoo10ApiResponse<Qoo10ProductsResponse>;
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }

    const totalItems = data.ResultObject?.TotalItems ?? 0;
    const totalPages = data.ResultObject?.TotalPages ?? 1;
    // ProductsResponse의 Items는 itemCode만 포함 → 상품 목록으로 반환
    const items = data.ResultObject?.Items ?? [];
    const products = items.map(
      (item): Product => ({
        id: item.ItemCode,
        channelId: this.channelId,
        sellerCode: item.SellerCode,
        rawStatus: item.ItemStatus,
        title: "",
        promotionName: "",
        status: mapProductStatus(item.ItemStatus),
        price: 0,
        settlePrice: 0,
        retailPrice: 0,
        qty: 0,
        imageUrl: "",
        category: {
          main: { code: "", name: "" },
          sub1: { code: "", name: "" },
          sub2: { code: "", name: "" },
        },
        origin: { type: "기타", place: "" },
        shippingNo: "",
        availableDate: { type: "normal", value: "" },
        desiredShippingDate: "",
        keyword: [],
        isAdult: false,
        itemDetail: "",
        videoUrl: "",
        modelNm: "",
        manufacturerDate: "",
        brandNo: "",
        material: "",
        industrialCodeType: "",
        industrialCode: "",
        taxRate: "",
        listedDate: "",
        changedDate: "",
        expireDate: "",
        drugtype: "",
        optionShippingNo1: "",
        optionShippingNo2: "",
        contactInfo: "",
      }),
    );
    return { items: products, totalItems, totalPages };
  }

  async getProductDetail(itemCode: string): Promise<Product> {
    const url =
      "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ItemsLookup.qapi/GetItemDetailInfo";
    const form = new URLSearchParams({
      ItemCode: itemCode,
      returnType: "json",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.2",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);

    const text = await res.text();
    let data: Qoo10ApiResponse<Qoo10ItemDetailRaw[]>;
    try {
      data = JSON.parse(text) as Qoo10ApiResponse<Qoo10ItemDetailRaw[]>;
    } catch {
      throw new Error(
        `Qoo10 상품 조회 실패 (ItemCode: ${itemCode}): ${text.slice(0, 80)}`,
      );
    }
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }

    const raw = data.ResultObject[0];
    if (!raw) throw new Error(`Product not found: ${itemCode}`);
    return adaptItemDetail(raw, this.channelId);
  }

  async updateProduct(
    itemCode: string,
    data: UpdateProductData,
  ): Promise<void> {
    // 1) 현재 상품 상세 조회 (UpdateGoods는 모든 필드를 넘겨야 함)
    const url =
      "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ItemsLookup.qapi/GetItemDetailInfo";
    const form = new URLSearchParams({
      ItemCode: itemCode,
      returnType: "json",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);

    const detailData = (await res.json()) as Qoo10ApiResponse<
      Qoo10ItemDetailRaw[]
    >;
    if (detailData.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${detailData.ResultCode}]: ${detailData.ResultMsg}`,
      );
    }

    const raw = detailData.ResultObject[0];
    if (!raw) throw new Error(`Product not found: ${itemCode}`);

    console.log(
      "[UpdateGoods] raw.AvailableDateType:",
      JSON.stringify(raw.AvailableDateType),
      "raw.AvailableDateValue:",
      JSON.stringify(raw.AvailableDateValue),
    );

    const d = data as Record<string, unknown>;
    const pick = (key: string): string | undefined => {
      const v = d[key];
      return v === undefined || v === null || v === "" ? undefined : String(v);
    };

    // qoo10.* 우선 → 공통 필드 폴백 (registerProduct와 동일 패턴)
    const images = Array.isArray(d.images)
      ? (d.images as Array<{ url: string }>)
      : [];
    const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];
    const weightKg = d.Weight
      ? pick("Weight")
      : d.weightG
        ? String(Math.round((Number(d.weightG) / 1000) * 100) / 100)
        : undefined;

    const overrides: Record<string, string | undefined> = {
      ItemTitle: pick("ItemTitle") ?? pick("title"),
      ItemDescription: pick("ItemDescription") ?? pick("descriptionHtml"),
      StandardImage: pick("StandardImage") ?? images[0]?.url,
      SellerCode: pick("SellerCode") ?? pick("sku"),
      ItemPrice: pick("ItemPrice") ?? pick("price"),
      RetailPrice: pick("RetailPrice") ?? pick("ItemPrice") ?? pick("price"),
      ItemQty:
        pick("ItemQty") ??
        (data.qty !== undefined ? String(data.qty) : pick("inventoryQuantity")),
      Weight: weightKg,
      Keyword:
        pick("Keyword") ??
        (tags.length > 0 ? tags.slice(0, 10).join(",") : undefined),
      Material: pick("Material") ?? pick("material"),
      ProductionPlace: pick("ProductionPlace") ?? pick("countryOfOrigin"),
      ModelNm: pick("ModelNM") ?? pick("ModelNm") ?? pick("vendor"),
      BrandNo: pick("BrandNo"),
      ShippingNo: pick("ShippingNo"),
      TaxRate: pick("TaxRate"),
      ExpireDate: pick("ExpireDate"),
      VideoURL: pick("VideoURL"),
      AvailableDateType: pick("AvailableDateType"),
      AvailableDateValue: pick("AvailableDateValue"),
      ProductionPlaceType: pick("ProductionPlaceType"),
      AdultYN: pick("AdultYN"),
      PromotionName: pick("PromotionName"),
      ContactInfo: pick("ContactInfo"),
      DesiredShippingDate: pick("DesiredShippingDate"),
      ManufactureDate: pick("ManufactureDate") ?? pick("ManufacturerDate"),
      IndustrialCodeType: pick("IndustrialCodeType"),
      IndustrialCode: pick("IndustrialCode"),
      OptionShippingNo1: pick("OptionShippingNo1"),
      OptionShippingNo2: pick("OptionShippingNo2"),
    };

    // 2) UpdateGoods 호출 (현재 값 기반 + 변경분 덮어쓰기)
    const updateForm = new URLSearchParams({ returnType: "json" });
    updateForm.set("ItemCode", itemCode);
    updateForm.set("SecondSubCat", raw.SecondSubCatCd);
    updateForm.set("ItemTitle", overrides.ItemTitle ?? raw.ItemTitle);
    updateForm.set(
      "ProductionPlaceType",
      overrides.ProductionPlaceType ?? raw.ProductionPlaceType,
    );
    updateForm.set("AdultYN", overrides.AdultYN ?? raw.AdultYN);
    updateForm.set(
      "AvailableDateType",
      overrides.AvailableDateType ?? raw.AvailableDateType ?? "0",
    );
    updateForm.set(
      "AvailableDateValue",
      overrides.AvailableDateValue ?? raw.AvailableDateValue ?? "1",
    );
    if (overrides.ItemQty !== undefined)
      updateForm.set("ItemQty", overrides.ItemQty);
    if (overrides.ItemPrice !== undefined)
      updateForm.set("ItemPrice", overrides.ItemPrice);
    if (overrides.SellerCode ?? raw.SellerCode)
      updateForm.set("SellerCode", overrides.SellerCode ?? raw.SellerCode);
    if (overrides.StandardImage)
      updateForm.set("StandardImage", overrides.StandardImage);
    if (overrides.ItemDescription)
      updateForm.set("ItemDescription", overrides.ItemDescription);
    if (overrides.RetailPrice ?? raw.RetailPrice)
      updateForm.set("RetailPrice", overrides.RetailPrice ?? raw.RetailPrice);
    if (overrides.ShippingNo ?? raw.ShippingNo)
      updateForm.set("ShippingNo", overrides.ShippingNo ?? raw.ShippingNo);
    if (overrides.Keyword ?? raw.Keyword)
      updateForm.set("Keyword", overrides.Keyword ?? raw.Keyword);
    if (overrides.ModelNm ?? raw.ModelNM)
      updateForm.set("ModelNm", overrides.ModelNm ?? raw.ModelNM);
    if (overrides.Material ?? raw.Material)
      updateForm.set("Material", overrides.Material ?? raw.Material);
    if (overrides.ProductionPlace ?? raw.ProductionPlace)
      updateForm.set(
        "ProductionPlace",
        overrides.ProductionPlace ?? raw.ProductionPlace,
      );
    if (overrides.Weight) updateForm.set("Weight", overrides.Weight);
    if (overrides.DesiredShippingDate ?? raw.DesiredShippingDate)
      updateForm.set(
        "DesiredShippingDate",
        overrides.DesiredShippingDate ?? raw.DesiredShippingDate,
      );
    if (overrides.BrandNo ?? raw.BrandNo)
      updateForm.set("BrandNo", overrides.BrandNo ?? raw.BrandNo);
    if (overrides.ManufactureDate ?? raw.ManufacturerDate)
      updateForm.set(
        "ManufactureDate",
        overrides.ManufactureDate ?? raw.ManufacturerDate,
      );
    if (overrides.IndustrialCodeType ?? raw.IndustrialCodeType)
      updateForm.set(
        "IndustrialCodeType",
        overrides.IndustrialCodeType ?? raw.IndustrialCodeType,
      );
    if (overrides.IndustrialCode ?? raw.IndustrialCode)
      updateForm.set(
        "IndustrialCode",
        overrides.IndustrialCode ?? raw.IndustrialCode,
      );
    if (overrides.ContactInfo ?? raw.ContactInfo)
      updateForm.set("ContactInfo", overrides.ContactInfo ?? raw.ContactInfo);
    if (overrides.TaxRate) updateForm.set("TaxRate", overrides.TaxRate);
    if (overrides.ExpireDate)
      updateForm.set("ExpireDate", overrides.ExpireDate);
    if (overrides.VideoURL) updateForm.set("VideoURL", overrides.VideoURL);
    if (overrides.PromotionName)
      updateForm.set("PromotionName", overrides.PromotionName);
    if (raw.OptionShippingNo1)
      updateForm.set(
        "OptionShippingNo1",
        overrides.OptionShippingNo1 ?? raw.OptionShippingNo1,
      );
    if (raw.OptionShippingNo2)
      updateForm.set(
        "OptionShippingNo2",
        overrides.OptionShippingNo2 ?? raw.OptionShippingNo2,
      );

    const updateRes = await fetch(`${BASE_URL}/ItemsBasic.UpdateGoods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.1",
        Accept: "application/json",
      },
      body: updateForm.toString(),
    });

    if (!updateRes.ok) throw new Error(`Qoo10 HTTP error: ${updateRes.status}`);

    const updateData = (await updateRes.json()) as {
      ResultCode: number;
      ResultMsg: string;
    };
    if (updateData.ResultCode !== 0) {
      throw new Error(
        `Qoo10 UpdateGoods error [${updateData.ResultCode}]: ${updateData.ResultMsg}`,
      );
    }
  }

  async updateShipment(data: UpdateShipmentData): Promise<void> {
    const shippingCenterId = mapCarrierToQoo10ShippingCenter(data.carrierId);
    const today = new Date();
    const shipDate =
      data.shipDate ??
      `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    await this.callQoo10<string>("ShippingBasic.SetSendingInfo", {
      PackNo: String(data.packNo ?? data.orderNo),
      ShippingCenterId: shippingCenterId,
      TrackingNo: data.trackingNumber,
      ShippingDate: shipDate,
    });
  }

  async registerProduct(
    input: unknown,
  ): Promise<{ productId: string; title: string }> {
    // input = basePayload(공통) + platformAttrs(qoo10.*) + overrides(모달 입력)
    const d = input as Record<string, unknown>;

    const str = (key: string, fallback = "") => String(d[key] ?? fallback);

    // Qoo10 등록 필수값 검증
    const itemDescription = str("ItemDescription") || str("descriptionHtml");
    if (!itemDescription.trim())
      throw new Error("상품 상세 설명(ItemDescription)은 필수입니다.");

    // originType(domestic/overseas/other) → ProductionPlaceType(1/2/3) 공통 필드 폴백
    const originTypeMap: Record<string, string> = {
      domestic: "1",
      overseas: "2",
      other: "3",
    };
    const productionPlaceType =
      str("ProductionPlaceType") || originTypeMap[str("originType")] || "";
    if (!productionPlaceType.trim())
      throw new Error(
        "원산지 타입(ProductionPlaceType)은 필수입니다. (1=국내, 2=해외, 3=기타)",
      );

    // countryOfOrigin(공통) → ProductionPlace 폴백
    const productionPlace = str("ProductionPlace") || str("countryOfOrigin");
    if (!productionPlace.trim())
      throw new Error("원산지 지역(ProductionPlace)은 필수입니다.");
    const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];

    // 상품명: Qoo10 전용 > 공통 title
    const itemTitle = str("ItemTitle") || str("title");

    // 표준 이미지: Qoo10 전용 > 공통 images[0].url
    const images = Array.isArray(d.images)
      ? (d.images as Array<{ url: string }>)
      : [];
    const standardImage = str("StandardImage") || images[0]?.url || "";

    // 무게: Qoo10 전용(kg) > 공통 weightG(g→kg 변환)
    const weightKg = d.Weight
      ? str("Weight")
      : d.weightG
        ? String(Math.round((Number(d.weightG) / 1000) * 100) / 100)
        : "";

    // 키워드: Qoo10 전용 > 공통 tags
    const keyword = str("Keyword") || tags.slice(0, 10).join(",");

    // 소재: Qoo10 전용 > 공통 material
    const material = str("Material") || str("material");

    const params: Record<string, string> = {
      SecondSubCat: str("SecondSubCat"),
      ItemTitle: itemTitle,
      ItemDescription: itemDescription,
      SellerCode: str("SellerCode") || str("sku"),
      StandardImage: standardImage,
      ShippingNo: str("ShippingNo", "0"),
      ItemQty: str("ItemQty") || str("inventoryQuantity", "0"),
      ItemPrice: str("ItemPrice") || str("price", "0"),
      RetailPrice: str("RetailPrice") || str("ItemPrice") || str("price", "0"),
      TaxRate: str("TaxRate"),
      ExpireDate: str("ExpireDate"),
      VideoURL: str("VideoURL"),
      AvailableDateType: str("AvailableDateType", "0"),
      AvailableDateValue: str("AvailableDateValue"),
      ProductionPlaceType: productionPlaceType,
      ProductionPlace: productionPlace,
      AdultYN: str("AdultYN", "N"),
      PromotionName: str("PromotionName"),
      ModelNM: str("ModelNM") || str("vendor"),
      ManufactureDate: str("ManufactureDate"),
      Material: material,
      Weight: weightKg,
      ContactInfo: str("ContactInfo"),
      IndustrialCodeType: str("IndustrialCodeType", "NONE"),
      IndustrialCode: str("IndustrialCode"),
      OuterSecondSubCat: str("OuterSecondSubCat"),
      Keyword: keyword,
      Condition: "NEW",
      BrandNo: str("BrandNo") || "0",
      ItemType: str("ItemType"),
    };

    // AvailableDateType=0(즉시발송)이면 AvailableDateValue는 1~3 정수여야 함
    if (params.AvailableDateType === "0" && !params.AvailableDateValue) {
      params.AvailableDateValue = "1";
    }

    // 빈 문자열 파라미터 제거 (API가 빈 값을 오류로 처리하는 경우 방지)
    for (const key of Object.keys(params)) {
      if (params[key] === "") delete params[key];
    }

    // 멀티축 상품(ItemType 설정): ItemQty=0, ItemPrice는 기본가(ItemType의 옵션가는 차액)
    if (params.ItemType) {
      params.ItemQty = "0";
    }

    const setNewGoodsRes = await fetch(`${BASE_URL}/ItemsBasic.SetNewGoods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: new URLSearchParams({ ...params, returnType: "json" }).toString(),
    });
    const setNewGoodsData =
      (await setNewGoodsRes.json()) as Qoo10ApiResponse<unknown>;

    let itemCode: string;
    if (setNewGoodsData.ResultCode === 0) {
      const raw = setNewGoodsData.ResultObject;
      if (raw !== null && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        // SetNewGoods 응답: { GdNo, BIContentsNo, ... } 또는 { ItemCode }
        itemCode = String(
          r.GdNo ?? r.ItemCode ?? r.itemCode ?? JSON.stringify(raw),
        );
      } else {
        itemCode = String(raw);
      }
    } else if (
      typeof setNewGoodsData.ResultMsg === "string" &&
      setNewGoodsData.ResultMsg.includes("-112")
    ) {
      // 이미 Qoo10에 등록된 상품 — ResultObject에 기존 ItemCode가 있을 수 있음
      console.log(
        "[SetNewGoods -112] ResultObject:",
        JSON.stringify(setNewGoodsData.ResultObject),
        "ResultMsg:",
        setNewGoodsData.ResultMsg,
      );
      const raw = setNewGoodsData.ResultObject;
      const existingItemCode =
        raw !== null && typeof raw === "object"
          ? String(
              (raw as Record<string, unknown>).ItemCode ??
                (raw as Record<string, unknown>).itemCode ??
                "",
            )
          : String(raw ?? "");
      if (
        !existingItemCode ||
        existingItemCode === "null" ||
        existingItemCode === ""
      ) {
        throw new Error(
          `Qoo10 API error [${setNewGoodsData.ResultCode}]: ${setNewGoodsData.ResultMsg}`,
        );
      }
      itemCode = existingItemCode;
    } else {
      throw new Error(
        `Qoo10 API error [${setNewGoodsData.ResultCode}]: ${setNewGoodsData.ResultMsg}`,
      );
    }

    // 다축 옵션 — 각 SKU 조합을 SetGoodsOptionInfo 로 등록
    // 입력: qoo10Variants = [{ optionPath: "그룹||*값$$그룹||*값", sku, price, qty }]
    const qoo10Variants = Array.isArray(d.qoo10Variants)
      ? (d.qoo10Variants as Array<{
          optionPath: string;
          sku: string;
          price: string;
          qty: number;
        }>)
      : [];
    if (qoo10Variants.length > 0) {
      try {
        await this.setItemOptions(itemCode, qoo10Variants);
      } catch (err) {
        console.error("[SetGoodsOptionInfo] failed:", err);
      }
    }

    return { productId: itemCode, title: itemTitle };
  }

  // 다축 변형들을 Qoo10 옵션으로 등록한다.
  // optionPath 포맷: "그룹1||*값1$$그룹2||*값2"
  // SetGoodsOptionInfo: ItemCode, OptionData(다중 라인 텍스트), Flag='ADD'
  private async setItemOptions(
    itemCode: string,
    variants: Array<{
      optionPath: string;
      sku: string;
      price: string;
      qty: number;
    }>,
  ): Promise<void> {
    // OptionData 라인 포맷: 그룹1||*값1$$그룹2||*값2$$$판매가차이$$$수량$$$판매자SKU
    // (Qoo10 docs 기반 추정 — 실제 자격증명 환경에서 검증 필요)
    const optionDataLines = variants.map((v) => {
      const priceDiff = "0";
      return [v.optionPath, priceDiff, String(v.qty), v.sku].join("$$$");
    });
    const optionData = optionDataLines.join("\n");

    const res = await fetch(`${BASE_URL}/ItemsBasic.SetGoodsOptionInfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        ItemCode: itemCode,
        OptionData: optionData,
        Flag: "ADD",
        returnType: "json",
      }).toString(),
    });
    const data = (await res.json()) as Qoo10ApiResponse<unknown>;
    console.log("[SetGoodsOptionInfo]", {
      itemCode,
      lineCount: variants.length,
      ResultCode: data.ResultCode,
      ResultMsg: data.ResultMsg,
    });
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 SetGoodsOptionInfo error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }
  }

  // ─── link-only 모델용 정규화 메서드 ───────────────────────────

  private async fetchItemOptions(
    itemCode: string,
  ): Promise<ChannelProductVariant[]> {
    const res = await fetch(`${BASE_URL}/ItemsLookup.GetGoodsOptionInfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.0",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        ItemCode: itemCode,
        returnType: "json",
      }).toString(),
    });

    if (!res.ok) return [];

    const text = await res.text();
    let data: Qoo10ApiResponse<Qoo10OptionItem[]>;
    try {
      data = JSON.parse(text) as Qoo10ApiResponse<Qoo10OptionItem[]>;
    } catch {
      return [];
    }
    if (data.ResultCode !== 0 || !Array.isArray(data.ResultObject)) return [];
    if (data.ResultObject.length === 0) return [];

    return data.ResultObject.filter((o) => o.Flag !== "DEL").map(
      (o): ChannelProductVariant => {
        const nameParts = [o.OptType1, o.OptType2, o.OptType3].filter(Boolean);
        const valueParts = [o.OptValue1, o.OptValue2, o.OptValue3].filter(
          Boolean,
        );
        return {
          channelVariantId: o.OptionCode,
          optionCode: o.SellerCode || undefined,
          optionName: nameParts.join("/") || undefined,
          optionValue: valueParts.join("/") || undefined,
          price: o.ItemPrice || undefined,
          stock: o.ItemQty ? Number(o.ItemQty) : undefined,
        };
      },
    );
  }

  async listChannelProducts(
    params: ListChannelProductsParams,
  ): Promise<ListChannelProductsResult> {
    const page = String(params.page ?? 1);
    const toChannelProduct = (p: {
      id: string;
      sellerCode?: string;
      title?: string;
      price?: number;
      imageUrl?: string;
      rawStatus?: string;
    }): ChannelProduct => ({
      channelItemId: p.id,
      sellerCode: p.sellerCode || undefined,
      title: p.title || p.id,
      price: p.price ? String(p.price) : undefined,
      images: p.imageUrl ? [p.imageUrl] : [],
      variants: [],
      status: p.rawStatus,
    });

    // status 미지정 시 모든 판매상태(S0~S8) 통합 조회
    if (params.status === undefined) {
      const merged: ChannelProduct[] = [];
      let totalItems = 0;
      for (const status of ALL_GOODS_STATUSES) {
        try {
          const result = await this.fetchProductList(status, page);
          merged.push(
            ...result.items.map((item) =>
              toChannelProduct({
                ...item,
                rawStatus: item.rawStatus ?? status,
              }),
            ),
          );
          totalItems += result.totalItems;
        } catch {
          // 상태별 실패는 skip
        }
      }
      return {
        items: merged,
        totalItems,
        totalPages: 1,
        currentPage: Number(page),
      };
    }

    const statusParam = Array.isArray(params.status)
      ? params.status[0]
      : params.status;
    const result = await this.fetchProductList(statusParam, page);
    return {
      items: result.items.map((item) =>
        toChannelProduct({ ...item, rawStatus: item.rawStatus ?? statusParam }),
      ),
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: Number(page),
    };
  }

  async getChannelProduct(channelItemId: string): Promise<ChannelProduct> {
    const url =
      "https://api.qoo10.jp/GMKT.INC.Front.QAPIService/ItemsLookup.qapi/GetItemDetailInfo";
    const form = new URLSearchParams({
      ItemCode: channelItemId,
      returnType: "json",
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        GiosisCertificationKey: this.certKey,
        QAPIVersion: "1.2",
        Accept: "application/json",
      },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`Qoo10 HTTP error: ${res.status}`);
    const data = (await res.json()) as Qoo10ApiResponse<Qoo10ItemDetailRaw[]>;
    if (data.ResultCode !== 0) {
      throw new Error(
        `Qoo10 API error [${data.ResultCode}]: ${data.ResultMsg}`,
      );
    }
    const rawDetail = data.ResultObject[0];
    if (!rawDetail) throw new Error(`Product not found: ${channelItemId}`);
    const detail = adaptItemDetail(rawDetail, this.channelId);

    let variants = await this.fetchItemOptions(channelItemId);
    if (variants.length === 0) {
      variants = [
        {
          channelVariantId: channelItemId,
          optionCode: detail.sellerCode || undefined,
        },
      ];
    }
    return {
      channelItemId: detail.id,
      sellerCode: detail.sellerCode || undefined,
      title: detail.title,
      price: String(detail.price) || undefined,
      images: detail.imageUrl ? [detail.imageUrl] : [],
      variants,
      raw: rawDetail,
    };
  }

  async updateSellerCode(
    channelVariantId: string,
    newCode: string,
  ): Promise<UpdateSellerCodeResult> {
    try {
      const res = await fetch(`${BASE_URL}/ItemsBasic.SetSellerCodeToOption`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          GiosisCertificationKey: this.certKey,
          QAPIVersion: "1.0",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          OptionCode: channelVariantId,
          SellerCode: newCode,
          returnType: "json",
        }).toString(),
      });

      if (!res.ok) {
        return {
          channelVariantId,
          oldCode: "",
          newCode,
          status: "FAILED",
          error: `HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as Qoo10ApiResponse<string>;
      if (data.ResultCode !== 0) {
        return {
          channelVariantId,
          oldCode: "",
          newCode,
          status: "FAILED",
          error: data.ResultMsg,
        };
      }

      return { channelVariantId, oldCode: "", newCode, status: "OK" };
    } catch (err) {
      return {
        channelVariantId,
        oldCode: "",
        newCode,
        status: "FAILED",
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  }

  async pushVariantStock(
    channelItemId: string,
    channelVariantId: string,
    newQty: number,
  ): Promise<void> {
    // channelVariantId is the OptionCode for Qoo10
    const res = await fetch(
      `${BASE_URL}/ItemsOptions.UpdateInventoryDataUnit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          GiosisCertificationKey: this.certKey,
          QAPIVersion: "1.0",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          ItemCode: channelItemId,
          OptionCode: channelVariantId,
          Qty: String(newQty),
          returnType: "json",
        }).toString(),
      },
    );

    if (!res.ok) throw new Error(`Qoo10 pushVariantStock HTTP ${res.status}`);
    const data = (await res.json()) as Qoo10ApiResponse<string>;
    if (data.ResultCode !== 0)
      throw new Error(`Qoo10 pushVariantStock: ${data.ResultMsg}`);
  }
}
