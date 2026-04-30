import type { Order, OrderItem, GetOrdersParams, UpdateShipmentData, ProductListResult, IChannelAdapter, ChannelVendor, ChannelCapabilities, SyncMode, ConnectionHealth, ChannelProduct, ListChannelProductsParams, ListChannelProductsResult, UpdateSellerCodeResult } from '@oms/types';

// Rakuten RMS Order API v2
// 인증: Basic base64(serviceSecret:licenseKey)

const RAKUTEN_API_BASE = 'https://api.rms.rakuten.co.jp/es/2.0';

// ─── Raw Rakuten API types ────────────────────────────────────

interface RakutenOrderItem {
  orderNumber: string;
  orderProgress: number; // 100=주문확인, 300=출고완료, 700=완료
  orderDatetime: string;
  goodsPrice: number;
  postagePrice: number;
  totalPrice: number;
  packageModel: { deliveryName: string } | null;
  orderModelList: Array<{
    itemName: string;
    manageNumber: string;
    units: number;
    selectPrice: number;
  }>;
  ordererModel: {
    ordererLastName: string;
    ordererFirstName: string;
    ordererMailAddress: string;
    ordererPhoneNumber1?: string;
  };
  senderModel: {
    senderLastName: string;
    senderFirstName: string;
    senderPhoneNumber1?: string;
    senderZipCode?: string;
    senderAddress?: string;
    senderCity?: string;
    senderPrefecture?: string;
  } | null;
}

interface RakutenSearchOrderResponse {
  orderNumberList: string[];
  PaginationResponseModel: {
    requestPage: number;
    resultPage: number;
    pageCount: number;
    totalRecordsFound: number;
  };
}

// orderProgress → OMS OrderStatus 매핑
const PROGRESS_TO_STATUS: Record<number, Order['status']> = {
  100: 'PAID',
  200: 'PAID',
  300: 'SHIPPED',
  400: 'DELIVERED',
  500: 'CANCELLED',
  600: 'CANCELLED',
  700: 'DELIVERED',
  800: 'RETURNED',
};

// ─── RakutenAdapter ───────────────────────────────────────────

export class RakutenAdapter implements IChannelAdapter {
  readonly vendor: ChannelVendor = 'RAKUTEN';
  readonly syncMode: SyncMode = 'polling_1h';
  readonly capabilities: ChannelCapabilities = {
    supportsOrderFetch: true,
    supportsClaimFetch: false,
    supportsProductRegister: true,
    supportsProductUpdate: false,
    supportsInventoryRead: false,
    supportsInventoryWrite: false,
    supportsRealtimeStock: false,
    supportsBulkOperations: false,
  };

  private readonly auth: string;

  constructor(opts: { serviceSecret: string; licenseKey: string }) {
    this.auth = `Basic ${Buffer.from(`${opts.serviceSecret}:${opts.licenseKey}`).toString('base64')}`;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${RAKUTEN_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: this.auth,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Rakuten API error [${res.status}]: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async validateCredential(): Promise<boolean> {
    try {
      await this.post<RakutenSearchOrderResponse>('/order/searchOrder', {
        PaginationRequestModel: { requestRecordsAmount: 1, requestPage: 1 },
      });
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

  private mapOrder(o: RakutenOrderItem): Order {
    const items: OrderItem[] = (o.orderModelList ?? []).map((item, idx) => ({
      id: item.manageNumber || String(idx),
      productName: item.itemName,
      quantity: item.units,
      unitPrice: item.selectPrice,
      totalPrice: item.selectPrice * item.units,
      sku: item.manageNumber || undefined,
    }));

    const buyerName =
      `${o.ordererModel.ordererLastName ?? ''} ${o.ordererModel.ordererFirstName ?? ''}`.trim();
    const receiverName = o.senderModel
      ? `${o.senderModel.senderLastName ?? ''} ${o.senderModel.senderFirstName ?? ''}`.trim()
      : buyerName;

    return {
      id: o.orderNumber,
      channelId: '',
      channelOrderId: o.orderNumber,
      status: PROGRESS_TO_STATUS[o.orderProgress] ?? 'PENDING',
      buyer: {
        name: buyerName,
        email: o.ordererModel.ordererMailAddress ?? null,
        tel: o.ordererModel.ordererPhoneNumber1 ?? null,
      },
      shipping: {
        receiver: receiverName,
        shippingAddress: [
          o.senderModel?.senderPrefecture,
          o.senderModel?.senderCity,
          o.senderModel?.senderAddress,
        ]
          .filter(Boolean)
          .join(' '),
        zipCode: o.senderModel?.senderZipCode ?? undefined,
        receiverTel: o.senderModel?.senderPhoneNumber1 ?? undefined,
      },
      payment: {
        currency: 'JPY',
        totalAmount: o.totalPrice,
        krwAmount: o.totalPrice,
        originalAmount: o.goodsPrice,
        paymentMethod: '',
        shippingRate: o.postagePrice,
      },
      items,
      orderedAt: o.orderDatetime,
      updatedAt: o.orderDatetime,
    };
  }

  async getOrders(params: GetOrdersParams): Promise<Order[]> {
    const toDatetime = (yyyymmdd: string) =>
      `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00+0900`;

    const searchBody: Record<string, unknown> = {
      PaginationRequestModel: { requestRecordsAmount: 100, requestPage: 1 },
      orderDateType: 1,
      startDatetime: toDatetime(params.startDate),
      endDatetime: `${params.endDate.slice(0, 4)}-${params.endDate.slice(4, 6)}-${params.endDate.slice(6, 8)}T23:59:59+0900`,
    };

    if (params.status) {
      searchBody.orderProgressList = [Number(params.status)];
    }

    const allOrderNumbers: string[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      (searchBody.PaginationRequestModel as Record<string, unknown>).requestPage = page;
      const searchData = await this.post<RakutenSearchOrderResponse>('/order/searchOrder', searchBody);
      allOrderNumbers.push(...(searchData.orderNumberList ?? []));
      totalPages = searchData.PaginationResponseModel?.pageCount ?? 1;
      page++;
    } while (page <= totalPages);

    if (allOrderNumbers.length === 0) return [];

    // Fetch details in batches of 100
    const orders: Order[] = [];
    for (let i = 0; i < allOrderNumbers.length; i += 100) {
      const batch = allOrderNumbers.slice(i, i + 100);
      const detailData = await this.post<{ OrderModelList?: RakutenOrderItem[] }>(
        '/order/getOrder',
        { orderNumberList: batch },
      );
      for (const o of detailData.OrderModelList ?? []) {
        orders.push(this.mapOrder(o));
      }
    }

    return orders;
  }

  async getOrderDetail(orderId: string): Promise<Order> {
    const detailData = await this.post<{ OrderModelList?: RakutenOrderItem[] }>(
      '/order/getOrder',
      { orderNumberList: [orderId] },
    );
    const o = detailData.OrderModelList?.[0];
    if (!o) throw new Error(`Order not found: ${orderId}`);
    return this.mapOrder(o);
  }

  async updateShipment(data: UpdateShipmentData): Promise<void> {
    // Rakuten RMS: updateOrderShipping
    await this.post('/order/updateOrderShipping', {
      orderUpdateInfoModelList: [
        {
          orderNumber: String(data.orderNo),
          deliveryCompany: data.carrierId,
          deliverySlipNumber: data.trackingNumber,
          shippingDatetime: data.shipDate
            ? `${data.shipDate}T00:00:00+0900`
            : new Date().toISOString(),
        },
      ],
    });
  }

  async getProducts(): Promise<ProductListResult> {
    return { items: [], totalItems: 0, totalPages: 0 };
  }

  async listChannelProducts(_params: ListChannelProductsParams): Promise<ListChannelProductsResult> {
    return { items: [], totalItems: 0, totalPages: 0, currentPage: 1 };
  }

  async getChannelProduct(channelItemId: string): Promise<ChannelProduct> {
    return { channelItemId, title: '', images: [], variants: [] };
  }

  async updateSellerCode(channelVariantId: string, newCode: string): Promise<UpdateSellerCodeResult> {
    return { channelVariantId, oldCode: '', newCode, status: 'FAILED', error: 'Rakuten updateSellerCode not implemented' };
  }

  async registerProduct(input: unknown): Promise<{ productId: string; title: string }> {
    const data = input as {
      title: string;
      descriptionHtml?: string;
      sku?: string;
      // Rakuten required override keys (from CHANNEL_REQUIRED_FIELDS)
      itemUrl: string;
      price?: string | number;
      stock?: string | number;
      inventoryQuantity?: string | number;
    };

    const itemUrl = data.itemUrl.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const stockValue = data.stock ?? data.inventoryQuantity ?? 0;

    const res = await this.post<{ ItemInsertResult?: { code: string; message: string } }>('/item/register', {
      item: {
        itemUrl,
        itemName: data.title,
        itemPrice: Number(data.price ?? 0),
        itemCaption: data.descriptionHtml ?? '',
        catalogId: '',
        itemNumber: data.sku ?? itemUrl,
        inventory: {
          inventoryType: 1,
          inventoryCount: Number(stockValue),
        },
      },
    });

    const code = res.ItemInsertResult?.code ?? '0';
    if (code !== '0' && code !== '') {
      throw new Error(`Rakuten item register error [${code}]: ${res.ItemInsertResult?.message ?? ''}`);
    }

    return { productId: itemUrl, title: data.title };
  }

  async pushVariantStock(_channelItemId: string, _channelVariantId: string, _newQty: number): Promise<void> {
    throw new Error('Rakuten pushVariantStock: not yet implemented');
  }
}
