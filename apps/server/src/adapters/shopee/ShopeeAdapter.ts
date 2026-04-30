import { createHmac } from 'node:crypto';
import type {
  Order,
  OrderItem,
  GetOrdersParams,
  GetProductsParams,
  ProductListResult,
  UpdateShipmentData,
  CancelOrderData,
  GetClaimsParams,
  ReturnItem,
  ApproveReturnData,
  IChannelAdapter,
  ChannelVendor,
  ChannelCapabilities,
  SyncMode,
  ConnectionHealth,
  ChannelProduct,
  ChannelProductVariant,
  ListChannelProductsParams,
  ListChannelProductsResult,
  UpdateSellerCodeResult,
} from '@oms/types';

const SHOPEE_BASE_URL = 'https://partner.shopeemobile.com';

// ─── Raw Shopee Order API types ──────────────────────────────────

interface ShopeeOrderSummary {
  order_sn: string;
  order_status: string;
  update_time: number;
  create_time?: number;
}

interface ShopeeOrderListResult {
  order_list: ShopeeOrderSummary[];
  more: boolean;
  next_cursor: string;
}

interface ShopeeOrderDetail {
  order_sn: string;
  order_status: string;
  create_time: number;
  update_time: number;
  currency: string;
  total_amount: number;
  actual_shipping_fee: number;
  buyer_user_id: number;
  buyer_username: string;
  recipient_address: {
    name: string;
    phone: string;
    full_address: string;
    zipcode: string;
    region: string;
  };
  item_list: Array<{
    item_id: number;
    item_name: string;
    model_name: string;
    model_quantity_purchased: number;
    model_original_price: number;
    model_discounted_price: number;
    item_sku: string;
  }>;
  payment_method: string;
  tracking_no?: string;
  ship_by_date?: number;
}

interface ShopeeOrderDetailResult {
  order_list: ShopeeOrderDetail[];
}

// ─── Raw Shopee API types ─────────────────────────────────────────

interface ShopeeApiEnvelope<T> {
  response?: T;
  error: string;
  message: string;
  request_id: string;
}

// get_item_list response
interface ShopeeItemListResult {
  item?: Array<{
    item_id: number;
    item_status: string;
    update_time: number;
  }>;
  total_count: number;
  has_next_page: boolean;
  next_offset: number;
}

// get_item_base_info response
interface ShopeeItemBaseInfoRaw {
  item_id: number;
  item_name: string;
  item_sku: string;
  item_status: string;
  create_time: number;
  update_time: number;
  price_info?: Array<{
    currency: string;
    original_price: number;
    current_price: number;
  }>;
  stock_info_v2?: {
    summary_info?: {
      total_available_stock: number;
      total_reserved_stock: number;
    };
    seller_stock?: Array<{ location_id: string; stock: number }>;
  };
  image?: { image_url_list?: string[] };
  has_model: boolean;
  category_id: number;
}

interface ShopeeItemBaseInfoResult {
  item_list?: ShopeeItemBaseInfoRaw[];
}

// ─── Normalized types (공개) ──────────────────────────────────────

export interface ShopeeProductItem {
  itemId: number;
  itemName: string;
  itemSku: string;
  itemStatus: string;
  categoryId: number;
  price: number;
  currency: string;
  stock: number;
  imageUrl: string;
  hasModel: boolean;
  updateTime: number;
}

export interface ShopeeProductListResult {
  totalCount: number;
  hasNextPage: boolean;
  nextOffset: number;
  items: ShopeeProductItem[];
}

// ─── 서명 유틸 ───────────────────────────────────────────────────

/**
 * 인증용 API (get_access_token 등) 서명
 * base: partner_id + api_path + timestamp
 */
export function signPublic(
  partnerId: number,
  apiPath: string,
  timestamp: number,
  partnerKey: string,
): string {
  const base = `${partnerId}${apiPath}${timestamp}`;
  return createHmac('sha256', partnerKey).update(base).digest('hex');
}

/**
 * 샵 레벨 API (get_item_list 등) 서명
 * base: partner_id + api_path + timestamp + access_token + shop_id
 */
export function signShop(
  partnerId: number,
  apiPath: string,
  timestamp: number,
  accessToken: string,
  shopId: number,
  partnerKey: string,
): string {
  const base = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return createHmac('sha256', partnerKey).update(base).digest('hex');
}

// ─── ShopeeAdapter ───────────────────────────────────────────────

export class ShopeeAdapter implements IChannelAdapter {
  readonly vendor: ChannelVendor = 'SHOPEE';
  readonly syncMode: SyncMode = 'realtime';
  readonly capabilities: ChannelCapabilities = {
    supportsOrderFetch: true,
    supportsClaimFetch: true,
    supportsProductRegister: true,
    supportsProductUpdate: true,
    supportsInventoryRead: true,
    supportsInventoryWrite: false,
    supportsRealtimeStock: false,
    supportsBulkOperations: false,
  };

  private readonly channelId: string;
  private readonly partnerId: number;
  private readonly partnerKey: string;
  private readonly shopId: number;
  private readonly accessToken: string;

  constructor(opts: {
    channelId?: string;
    partnerId: string;
    partnerKey: string;
    shopId: string;
    accessToken: string;
  }) {
    this.channelId = opts.channelId ?? '';
    this.partnerId = Number(opts.partnerId);
    this.partnerKey = opts.partnerKey;
    this.shopId = Number(opts.shopId);
    this.accessToken = opts.accessToken;
  }

  private buildShopUrl(
    apiPath: string,
    extraParams: Record<string, string | number | string[]>,
  ): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signShop(
      this.partnerId,
      apiPath,
      timestamp,
      this.accessToken,
      this.shopId,
      this.partnerKey,
    );

    const params = new URLSearchParams({
      partner_id: String(this.partnerId),
      timestamp: String(timestamp),
      access_token: this.accessToken,
      shop_id: String(this.shopId),
      sign,
    });

    for (const [k, v] of Object.entries(extraParams)) {
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, item);
      } else {
        params.set(k, String(v));
      }
    }

    return `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;
  }

  /**
   * product.get_item_list → item_id 목록 획득
   * → product.get_item_base_info → 상세 정보 병합 반환
   */
  async getItemList(params: {
    offset?: number;
    pageSize?: number;
    itemStatus?: string | string[];
  }): Promise<ShopeeProductListResult> {
    const apiPath = '/api/v2/product/get_item_list';

    // item_status는 배열로 전달 (반복 쿼리 파라미터)
    const statusList: string[] = Array.isArray(params.itemStatus)
      ? params.itemStatus
      : [params.itemStatus ?? 'NORMAL'];

    const url = this.buildShopUrl(apiPath, {
      offset: params.offset ?? 0,
      page_size: params.pageSize ?? 50,
      item_status: statusList,
    });

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

    const data = (await res.json()) as ShopeeApiEnvelope<ShopeeItemListResult>;
    if (data.error) {
      throw new Error(`Shopee API error [${data.error}]: ${data.message}`);
    }

    const result = data.response;
    const itemIds = (result?.item ?? []).map((i) => i.item_id);

    if (itemIds.length === 0) {
      return {
        totalCount: result?.total_count ?? 0,
        hasNextPage: result?.has_next_page ?? false,
        nextOffset: result?.next_offset ?? 0,
        items: [],
      };
    }

    const items = await this.getItemBaseInfo(itemIds);
    return {
      totalCount: result?.total_count ?? 0,
      hasNextPage: result?.has_next_page ?? false,
      nextOffset: result?.next_offset ?? 0,
      items,
    };
  }

  /**
   * product.get_item_base_info — 한 번에 최대 50개
   * item_id_list는 JSON 배열 형태로 전달
   */
  async getItemBaseInfo(itemIds: number[]): Promise<ShopeeProductItem[]> {
    const apiPath = '/api/v2/product/get_item_base_info';
    const url = this.buildShopUrl(apiPath, {
      item_id_list: JSON.stringify(itemIds),
    });

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

    const data =
      (await res.json()) as ShopeeApiEnvelope<ShopeeItemBaseInfoResult>;
    if (data.error) {
      throw new Error(`Shopee API error [${data.error}]: ${data.message}`);
    }

    return (data.response?.item_list ?? []).map(
      (item): ShopeeProductItem => ({
        itemId: item.item_id,
        itemName: item.item_name,
        itemSku: item.item_sku,
        itemStatus: item.item_status,
        categoryId: item.category_id,
        price: item.price_info?.[0]?.current_price ?? 0,
        currency: item.price_info?.[0]?.currency ?? '',
        stock:
          item.stock_info_v2?.summary_info?.total_available_stock ??
          item.stock_info_v2?.seller_stock?.[0]?.stock ??
          0,
        imageUrl: item.image?.image_url_list?.[0] ?? '',
        hasModel: item.has_model,
        updateTime: item.update_time,
      }),
    );
  }

  async validateCredential(): Promise<boolean> {
    try {
      await this.getItemList({ pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<ConnectionHealth> {
    const start = Date.now();
    const ok = await this.validateCredential();
    return {
      status: ok ? 'connected' : 'disconnected',
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }

  // ─── IChannelAdapter 주문 메서드 ─────────────────────────────

  private mapOrderStatus(shopeeStatus: string): Order['status'] {
    switch (shopeeStatus.toUpperCase()) {
      case 'UNPAID': return 'PENDING';
      case 'READY_TO_SHIP':
      case 'PROCESSED': return 'PAID';
      case 'SHIPPED':
      case 'IN_CANCEL':
      case 'TO_CONFIRM_RECEIVE': return 'SHIPPED';
      case 'COMPLETED': return 'DELIVERED';
      case 'CANCELLED': return 'CANCELLED';
      case 'TO_RETURN': return 'RETURNED';
      default: return 'PENDING';
    }
  }

  private mapOrderDetail(detail: ShopeeOrderDetail): Order {
    const items: OrderItem[] = detail.item_list.map((it, idx) => ({
      id: String(it.item_id ?? idx),
      productName: it.item_name,
      option: it.model_name || undefined,
      quantity: it.model_quantity_purchased,
      unitPrice: it.model_discounted_price ?? it.model_original_price,
      totalPrice: (it.model_discounted_price ?? it.model_original_price) * it.model_quantity_purchased,
      sku: it.item_sku || undefined,
    }));

    const currency = (detail.currency ?? 'USD') as 'KRW' | 'JPY' | 'USD';

    return {
      id: detail.order_sn,
      channelId: this.channelId,
      channelOrderId: detail.order_sn,
      status: this.mapOrderStatus(detail.order_status),
      buyer: {
        name: detail.buyer_username,
      },
      shipping: {
        receiver: detail.recipient_address?.name ?? '',
        shippingAddress: detail.recipient_address?.full_address ?? '',
        zipCode: detail.recipient_address?.zipcode ?? undefined,
        country: detail.recipient_address?.region ?? undefined,
        receiverTel: detail.recipient_address?.phone ?? undefined,
      },
      payment: {
        currency,
        totalAmount: detail.total_amount,
        krwAmount: detail.total_amount,
        originalAmount: detail.total_amount,
        paymentMethod: detail.payment_method ?? '',
        shippingRate: detail.actual_shipping_fee,
      },
      items,
      orderedAt: new Date(detail.create_time * 1000).toISOString(),
      updatedAt: new Date(detail.update_time * 1000).toISOString(),
      trackingNumber: detail.tracking_no ?? null,
    };
  }

  async getOrders(params: GetOrdersParams): Promise<Order[]> {
    const toUnix = (yyyymmdd: string) => {
      const s = yyyymmdd;
      return Math.floor(new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`).getTime() / 1000);
    };

    const apiPath = '/api/v2/order/get_order_list';
    const allSns: string[] = [];
    let cursor = '';

    do {
      const extra: Record<string, string | number> = {
        time_range_field: 'create_time',
        time_from: toUnix(params.startDate),
        time_to: toUnix(params.endDate) + 86399,
        page_size: 100,
      };
      if (cursor) extra.cursor = cursor;
      if (params.status) extra.order_status = params.status.toUpperCase();

      const url = this.buildShopUrl(apiPath, extra);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

      const data = (await res.json()) as ShopeeApiEnvelope<ShopeeOrderListResult>;
      if (data.error && data.error !== 'error_auth') {
        throw new Error(`Shopee order list error [${data.error}]: ${data.message}`);
      }

      const result = data.response;
      allSns.push(...(result?.order_list ?? []).map((o) => o.order_sn));

      if (result?.more && result.next_cursor) {
        cursor = result.next_cursor;
      } else {
        break;
      }
    } while (true);

    if (allSns.length === 0) return [];

    // Fetch details in batches of 50
    const orders: Order[] = [];
    for (let i = 0; i < allSns.length; i += 50) {
      const batch = allSns.slice(i, i + 50);
      const detailPath = '/api/v2/order/get_order_detail';
      const url = this.buildShopUrl(detailPath, {
        order_sn_list: batch.join(','),
        response_optional_fields: 'item_list,recipient_address,actual_shipping_fee,payment_method,tracking_no',
      });

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

      const data = (await res.json()) as ShopeeApiEnvelope<ShopeeOrderDetailResult>;
      if (data.error) throw new Error(`Shopee order detail error [${data.error}]: ${data.message}`);

      for (const detail of data.response?.order_list ?? []) {
        orders.push(this.mapOrderDetail(detail));
      }
    }

    return orders;
  }

  async getOrderDetail(orderId: string): Promise<Order> {
    const detailPath = '/api/v2/order/get_order_detail';
    const url = this.buildShopUrl(detailPath, {
      order_sn_list: orderId,
      response_optional_fields: 'item_list,recipient_address,actual_shipping_fee,payment_method,tracking_no',
    });

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

    const data = (await res.json()) as ShopeeApiEnvelope<ShopeeOrderDetailResult>;
    if (data.error) throw new Error(`Shopee order detail error [${data.error}]: ${data.message}`);

    const detail = data.response?.order_list?.[0];
    if (!detail) throw new Error(`Order not found: ${orderId}`);

    return this.mapOrderDetail(detail);
  }

  async cancelOrder(data: CancelOrderData): Promise<void> {
    const apiPath = '/api/v2/order/cancel_order';
    const url = this.buildShopUrl(apiPath, {});

    const body: Record<string, unknown> = {
      order_sn: String(data.orderNo),
      cancel_reason: 'CANCEL_BY_SELLER',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Shopee cancel_order HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<unknown>;
    if (result.error) {
      throw new Error(`Shopee cancel_order error [${result.error}]: ${result.message}`);
    }
  }

  async getReturns(params: GetClaimsParams): Promise<ReturnItem[]> {
    const toUnix = (yyyymmdd: string) => {
      const s = yyyymmdd;
      return Math.floor(new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`).getTime() / 1000);
    };

    interface ShopeeReturnItem {
      return_sn: string;
      order_sn: string;
      status: string;
      reason: string;
      create_time: number;
      item_list?: Array<{ item_name: string; item_count: number }>;
      refund_amount?: number;
      currency?: string;
    }
    interface ShopeeReturnListResult {
      return_list: ShopeeReturnItem[];
      more: boolean;
      next_cursor?: string;
    }

    const apiPath = '/api/v2/returns/get_return_list';
    const allReturns: ReturnItem[] = [];
    let cursor = '';

    do {
      const extra: Record<string, string | number> = {
        time_from: toUnix(params.startDate),
        time_to: toUnix(params.endDate) + 86399,
        page_size: 100,
      };
      if (cursor) extra.next_cursor = cursor;
      if (params.claimStatus) extra.return_status = params.claimStatus.toUpperCase();

      const url = this.buildShopUrl(apiPath, extra);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Shopee get_return_list HTTP error: ${res.status}`);

      const data = (await res.json()) as ShopeeApiEnvelope<ShopeeReturnListResult>;
      if (data.error) throw new Error(`Shopee get_return_list error [${data.error}]: ${data.message}`);

      const result = data.response;
      for (const r of result?.return_list ?? []) {
        allReturns.push({
          id: r.return_sn,
          channelOrderId: r.order_sn,
          status: r.status,
          reason: r.reason,
          requestDate: new Date(r.create_time * 1000).toISOString(),
          itemName: r.item_list?.[0]?.item_name,
          quantity: r.item_list?.[0]?.item_count,
          refundAmount: r.refund_amount,
          currency: r.currency,
        });
      }

      if (result?.more && result.next_cursor) {
        cursor = result.next_cursor;
      } else {
        break;
      }
    } while (true);

    return allReturns;
  }

  async approveReturn(data: ApproveReturnData): Promise<void> {
    const apiPath = '/api/v2/returns/confirm_return';
    const url = this.buildShopUrl(apiPath, {});

    const body: Record<string, unknown> = {
      return_sn: data.claimId ?? String(data.orderNo),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Shopee confirm_return HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<unknown>;
    if (result.error) {
      throw new Error(`Shopee confirm_return error [${result.error}]: ${result.message}`);
    }
  }

  // ─── 상품 메서드 ─────────────────────────────────────────────

  async getProducts(params: GetProductsParams): Promise<ProductListResult> {
    const raw = await this.getItemList({
      offset: params.offset ?? 0,
      pageSize: params.pageSize ?? 50,
      itemStatus: params.itemStatus ?? 'NORMAL',
    });
    return {
      items: raw.items.map((item) => ({
        id: String(item.itemId),
        sellerCode: item.itemSku,
        rawStatus: item.itemStatus,
        title: item.itemName,
        promotionName: '',
        status: item.itemStatus === 'NORMAL' ? 'active' : 'inactive',
        price: item.price,
        settlePrice: item.price,
        retailPrice: item.price,
        qty: item.stock,
        imageUrl: item.imageUrl,
        category: {
          main: { code: String(item.categoryId), name: '' },
          sub1: { code: '', name: '' },
          sub2: { code: '', name: '' },
        },
        origin: { type: '기타', place: '' },
        shippingNo: '',
        availableDate: { type: 'normal', value: '' },
        desiredShippingDate: '',
        keyword: [],
        isAdult: false,
        itemDetail: '',
        videoUrl: '',
        modelNm: '',
        manufacturerDate: '',
        brandNo: '',
        material: '',
        industrialCodeType: '',
        industrialCode: '',
        taxRate: '',
        listedDate: new Date(item.updateTime * 1000).toISOString(),
        changedDate: new Date(item.updateTime * 1000).toISOString(),
        expireDate: '',
        drugtype: '',
        optionShippingNo1: '',
        optionShippingNo2: '',
        contactInfo: '',
      })),
      totalItems: raw.totalCount,
      totalPages: 1,
    };
  }

  async getProductDetail(itemId: string): Promise<unknown> {
    const itemIdNum = Number(itemId);
    const infoPath = '/api/v2/product/get_item_base_info';
    const infoUrl = this.buildShopUrl(infoPath, {
      item_id_list: JSON.stringify([itemIdNum]),
    });

    const res = await fetch(infoUrl);
    if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`);

    const data = (await res.json()) as ShopeeApiEnvelope<{
      item_list?: Array<{
        item_id: number;
        item_name: string;
        description?: string;
        item_sku: string;
        item_status: string;
        category_id: number;
        has_model: boolean;
        create_time: number;
        update_time: number;
        condition?: string;
        weight?: string;
        dimension?: { package_length: number; package_width: number; package_height: number };
        pre_order?: { is_pre_order: boolean; days_to_ship: number };
        brand?: { brand_id: number; original_brand_name: string };
        price_info?: Array<{ currency: string; current_price: number }>;
        stock_info_v2?: { summary_info?: { total_available_stock: number } };
        image?: { image_url_list?: string[] };
        logistic_info?: Array<{
          logistic_id: number;
          logistic_name: string;
          enabled: boolean;
          is_free: boolean;
          estimated_shipping_fee?: number;
        }>;
        attribute_list?: Array<{
          attribute_id: number;
          original_attribute_name: string;
          is_mandatory: boolean;
          attribute_value_list?: Array<{ value_id: number; original_value_name: string; value_unit?: string }>;
        }>;
        wholesales?: Array<{ min_count: number; max_count: number; unit_price: number }>;
        video_info?: Array<{ video_url: string; thumbnail_url: string; duration: number }>;
      }>;
    }>;

    if (data.error) throw new Error(`Shopee API error [${data.error}]: ${data.message}`);
    const raw = data.response?.item_list?.[0];
    if (!raw) throw new Error('error_item_not_found');

    let tierVariations: Array<{ name: string; options: Array<{ option: string; imageUrl: string }> }> = [];
    let models: Array<{ modelId: number; modelSku: string; modelStatus: string; tierIndex: number[]; price: number; currency: string; stock: number }> = [];

    if (raw.has_model) {
      const modelPath = '/api/v2/product/get_model_list';
      const modelUrl = this.buildShopUrl(modelPath, { item_id: String(itemIdNum) });
      try {
        const modelRes = await fetch(modelUrl);
        if (modelRes.ok) {
          const modelData = (await modelRes.json()) as ShopeeApiEnvelope<{
            tier_variation?: Array<{ name: string; option_list: Array<{ option: string; image?: { image_url: string } }> }>;
            model?: Array<{
              model_id: number;
              model_sku: string;
              model_status: string;
              tier_index: number[];
              price_info?: Array<{ currency: string; current_price: number }>;
              stock_info_v2?: { summary_info?: { total_available_stock: number } };
            }>;
          }>;
          if (!modelData.error && modelData.response) {
            tierVariations = (modelData.response.tier_variation ?? []).map((tv) => ({
              name: tv.name,
              options: tv.option_list.map((o) => ({ option: o.option, imageUrl: o.image?.image_url ?? '' })),
            }));
            models = (modelData.response.model ?? []).map((m) => ({
              modelId: m.model_id,
              modelSku: m.model_sku,
              modelStatus: m.model_status,
              tierIndex: m.tier_index ?? [],
              price: m.price_info?.[0]?.current_price ?? 0,
              currency: m.price_info?.[0]?.currency ?? '',
              stock: m.stock_info_v2?.summary_info?.total_available_stock ?? 0,
            }));
          }
        }
      } catch { /* model 조회 실패 시 기본 정보만 반환 */ }
    }

    return {
      item: {
        itemId: raw.item_id,
        itemName: raw.item_name,
        description: raw.description ?? '',
        itemSku: raw.item_sku ?? '',
        itemStatus: raw.item_status,
        categoryId: raw.category_id,
        hasModel: raw.has_model,
        createTime: raw.create_time,
        updateTime: raw.update_time,
        condition: raw.condition ?? '',
        weight: raw.weight ?? '',
        dimension: raw.dimension
          ? { length: raw.dimension.package_length, width: raw.dimension.package_width, height: raw.dimension.package_height }
          : null,
        preOrder: raw.pre_order
          ? { isPreOrder: raw.pre_order.is_pre_order, daysToShip: raw.pre_order.days_to_ship }
          : null,
        brand: raw.brand
          ? { brandId: raw.brand.brand_id, brandName: raw.brand.original_brand_name }
          : null,
        price: raw.price_info?.[0]?.current_price ?? 0,
        currency: raw.price_info?.[0]?.currency ?? '',
        stock: raw.stock_info_v2?.summary_info?.total_available_stock ?? 0,
        images: raw.image?.image_url_list ?? [],
        logistics: (raw.logistic_info ?? []).filter((l) => l.enabled).map((l) => ({
          logisticId: l.logistic_id,
          logisticName: l.logistic_name,
          enabled: l.enabled,
          isFree: l.is_free,
          estimatedShippingFee: l.estimated_shipping_fee ?? 0,
        })),
        attributes: (raw.attribute_list ?? []).map((a) => ({
          attributeId: a.attribute_id,
          attributeName: a.original_attribute_name,
          isMandatory: a.is_mandatory,
          values: (a.attribute_value_list ?? []).map((v) => ({
            valueId: v.value_id,
            valueName: v.original_value_name,
            valueUnit: v.value_unit ?? '',
          })),
        })),
        wholesales: (raw.wholesales ?? []).map((w) => ({ minCount: w.min_count, maxCount: w.max_count, unitPrice: w.unit_price })),
        videos: (raw.video_info ?? []).map((v) => ({ videoUrl: v.video_url, thumbnailUrl: v.thumbnail_url, duration: v.duration })),
        tierVariations,
        models,
      },
    };
  }

  async listChannelProducts(params: ListChannelProductsParams): Promise<ListChannelProductsResult> {
    const statusParam = Array.isArray(params.status) ? params.status[0] : (params.status ?? 'NORMAL');
    const pageSize = params.pageSize ?? 50;
    const page = Number(params.page ?? 1);
    const result = await this.getProducts({ itemStatus: statusParam, offset: (page - 1) * pageSize, pageSize });
    const items: ChannelProduct[] = result.items.map((p) => ({
      channelItemId: p.id,
      sellerCode: p.sellerCode || undefined,
      title: p.title,
      price: String(p.price) || undefined,
      images: p.imageUrl ? [p.imageUrl] : [],
      variants: [],
    }));
    return { items, totalItems: result.totalItems, totalPages: Math.ceil(result.totalItems / pageSize) || 1, currentPage: page };
  }

  async getChannelProduct(channelItemId: string): Promise<ChannelProduct> {
    const raw = await this.getProductDetail(channelItemId) as {
      item?: {
        itemId: number;
        itemName: string;
        itemSku: string;
        price: number;
        currency: string;
        images: string[];
        models: Array<{ modelId: number; modelSku: string; tierIndex: number[]; price: number; stock: number }>;
        tierVariations: Array<{ name: string; options: Array<{ option: string }> }>;
      };
    };
    const item = raw?.item;
    if (!item) throw new Error(`Shopee product not found: ${channelItemId}`);

    const variants: ChannelProductVariant[] = item.models.map((m) => {
      const optParts = m.tierIndex.map((idx, axisIdx) => {
        const axis = item.tierVariations[axisIdx];
        return axis?.options[idx]?.option ?? '';
      }).filter(Boolean);
      return {
        channelVariantId: String(m.modelId),
        optionCode: m.modelSku || undefined,
        optionName: item.tierVariations.map((tv) => tv.name).join('/') || undefined,
        optionValue: optParts.join('/') || undefined,
        price: String(m.price) || undefined,
        stock: m.stock,
      };
    });

    return {
      channelItemId: String(item.itemId),
      sellerCode: item.itemSku || undefined,
      title: item.itemName,
      price: String(item.price) || undefined,
      images: item.images,
      variants,
      raw,
    };
  }

  async updateSellerCode(channelVariantId: string, newCode: string): Promise<UpdateSellerCodeResult> {
    // Shopee model SKU update via update_model API
    // We need itemId to call the API, but channelVariantId is modelId alone.
    // Return unsupported for now — requires itemId context.
    return { channelVariantId, oldCode: '', newCode, status: 'FAILED', error: 'updateSellerCode requires itemId context (not available via modelId alone)' };
  }

  async registerProduct(data: {
    item_name: string;
    description: string;
    original_price: number;
    weight: number;
    category_id: number;
    item_status: string;
    condition: string;
    image_id_list: string;
    logistic_id: number;
    logistic_is_free: boolean;
    logistic_shipping_fee?: number;
    no_brand?: boolean;
    brand_name?: string;
    stock: number;
    item_sku?: string;
    package_height?: number;
    package_length?: number;
    package_width?: number;
    is_pre_order?: boolean;
    days_to_ship?: number;
  }): Promise<{ productId: string; title: string }> {
    const apiPath = '/api/v2/product/add_item';
    const url = this.buildShopUrl(apiPath, {});

    const imageIds = data.image_id_list.split(',').map((id) => id.trim()).filter(Boolean);

    const payload: Record<string, unknown> = {
      item_name: data.item_name,
      description: data.description,
      original_price: data.original_price,
      weight: data.weight,
      category_id: data.category_id,
      item_status: data.item_status,
      condition: data.condition,
      image: { image_id_list: imageIds },
      logistic_info: [{
        logistic_id: data.logistic_id,
        enabled: true,
        is_free: data.logistic_is_free,
        ...(data.logistic_shipping_fee !== undefined && { shipping_fee: data.logistic_shipping_fee }),
      }],
      brand: {
        brand_id: 0,
        original_brand_name: data.no_brand ? 'No Brand' : (data.brand_name?.trim() ?? 'No Brand'),
      },
      seller_stock: [{ stock: data.stock }],
    };

    if (data.item_sku) payload.item_sku = data.item_sku;
    if (data.package_height !== undefined || data.package_length !== undefined || data.package_width !== undefined) {
      payload.dimension = {
        package_height: data.package_height ?? 1,
        package_length: data.package_length ?? 1,
        package_width: data.package_width ?? 1,
      };
    }
    if (data.is_pre_order && data.days_to_ship) {
      payload.pre_order = { is_pre_order: true, days_to_ship: data.days_to_ship };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Shopee add_item HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<{ item_id: number }>;
    if (result.error) throw new Error(`Shopee add_item error [${result.error}]: ${result.message}`);

    const itemId = result.response?.item_id ?? 0;
    return { productId: String(itemId), title: data.item_name };
  }

  async deleteProduct(itemId: string): Promise<{ deletedProductId: string | null }> {
    const apiPath = '/api/v2/product/delete_item';
    const url = this.buildShopUrl(apiPath, {});

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: Number(itemId) }),
    });

    if (!res.ok) throw new Error(`Shopee delete_item HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<unknown>;
    if (result.error) throw new Error(`Shopee delete_item error [${result.error}]: ${result.message}`);

    return { deletedProductId: itemId };
  }

  async unlistProduct(itemId: number, unlist: boolean): Promise<void> {
    const apiPath = '/api/v2/product/unlist_item';
    const url = this.buildShopUrl(apiPath, {});

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_list: [{ item_id: itemId, unlist }] }),
    });

    if (!res.ok) throw new Error(`Shopee unlist_item HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<{
      failure_list?: Array<{ item_id: number; failed_reason: string }>;
    }>;
    if (result.error) throw new Error(`Shopee unlist_item error [${result.error}]: ${result.message}`);

    const failures = result.response?.failure_list ?? [];
    if (failures.length > 0) throw new Error(failures[0].failed_reason);
  }

  async updateShipment(data: UpdateShipmentData): Promise<void> {
    // Step 1: ship_order to mark as ready
    const shipPath = '/api/v2/logistics/ship_order';
    const url = this.buildShopUrl(shipPath, {});

    const body = {
      order_sn: String(data.orderNo),
      package_number: data.trackingNumber,
      pickup: {},
      dropoff: { branch_id: 0, sender_real_name: '' },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Shopee ship_order HTTP error: ${res.status}`);

    const result = (await res.json()) as ShopeeApiEnvelope<unknown>;
    if (result.error) {
      throw new Error(`Shopee ship_order error [${result.error}]: ${result.message}`);
    }
  }

  async pushVariantStock(_channelItemId: string, _channelVariantId: string, _newQty: number): Promise<void> {
    throw new Error('Shopee pushVariantStock: not yet implemented');
  }
}
