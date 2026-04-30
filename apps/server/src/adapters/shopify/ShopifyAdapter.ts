import type {
  IChannelAdapter,
  Order,
  OrderItem,
  GetOrdersParams,
  UpdateShipmentData,
  GetInventoryParams,
  ShopifyInventoryApiResponse,
  AdjustInventoryData,
  CancelOrderData,
  ApproveReturnData,
  DeclineReturnData,
  RefundReturnData,
  UpdateOrderNoteData,
  GetClaimsParams,
  ReturnItem,
  ProductListResult,
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

const SHOPIFY_OAUTH_PATH = '/admin/oauth/access_token';
const SHOPIFY_API_VERSION = '2025-04';

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  '대한민국': 'KR',
  '한국': 'KR',
  'KOREA': 'KR',
  'KOREA, REPUBLIC OF': 'KR',
  'REPUBLIC OF KOREA': 'KR',
  'SOUTH KOREA': 'KR',
  '일본': 'JP',
  'JAPAN': 'JP',
  '중국': 'CN',
  'CHINA': 'CN',
  '미국': 'US',
  'USA': 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
};

function normalizeCountryCode(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_ISO2[trimmed.toUpperCase()] ?? null;
}

// ─── GraphQL 응답 타입 ──────────────────────────────────────────

interface ShopifyOrderNode {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  customer: { displayName: string; email: string | null; phone: string | null } | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  shippingAddress: {
    name: string;
    address1: string | null;
    address2: string | null;
    city: string | null;
    zip: string | null;
    countryCodeV2: string;
    phone: string | null;
  } | null;
  lineItems: {
    nodes: Array<{ id: string; title: string; quantity: number; originalUnitPrice: string; variant: { sku: string | null } | null }>;
  };
}

interface ShopifyOrdersGQLResponse {
  data?: {
    orders?: {
      nodes: ShopifyOrderNode[];
      pageInfo: { hasNextPage: boolean; endCursor?: string };
    };
    order?: ShopifyOrderNode | null;
  };
  errors?: Array<{ message: string }> | string;
}

const ORDER_FIELDS = `
  id
  name
  createdAt
  updatedAt
  displayFinancialStatus
  displayFulfillmentStatus
  email
  phone
  tags
  customer { displayName email phone }
  currentTotalPriceSet { shopMoney { amount currencyCode } }
  shippingAddress { name address1 address2 city zip countryCodeV2 phone }
  lineItems(first: 50) {
    nodes { id title quantity originalUnitPrice variant { sku } }
  }
`;

const ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      nodes { ${ORDER_FIELDS} }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ORDER_BY_ID_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) { ${ORDER_FIELDS} }
  }
`;

// ─── Product / Inventory GraphQL ────────────────────────────

const PRODUCT_DETAIL_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id title handle status vendor productType tags descriptionHtml totalInventory createdAt updatedAt
      seo { title description }
      featuredImage { url altText }
      options { id name optionValues { id name } }
      media(first: 20) { nodes { id alt mediaContentType preview { image { url } } } }
      variants(first: 100) {
        nodes {
          id title sku price compareAtPrice inventoryQuantity inventoryPolicy
          selectedOptions { name value }
          inventoryItem { id tracked }
        }
      }
    }
  }
`;

const PRODUCT_DELETE_MUTATION = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_STATUS_MUTATION = `
  mutation productUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id status }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id title handle status vendor productType tags }
      userErrors { field message }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `
  mutation productCreate($input: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $input, media: $media) {
      product {
        id title handle status
        media(first: 20) {
          nodes {
            id alt mediaContentType status
            ... on MediaImage { mediaErrors { code details message } }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

const OPTIONS_CREATE_MUTATION = `
  mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
    productOptionsCreate(productId: $productId, options: $options) {
      product { options { id name optionValues { id name } } }
      userErrors { field message code }
    }
  }
`;

const VARIANTS_BULK_UPDATE_MUTATION = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price sku }
      userErrors { field message }
    }
  }
`;

const VARIANTS_BULK_CREATE_MUTATION = `
  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
    productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
      productVariants { id title inventoryItem { id } }
      userErrors { field message }
    }
  }
`;

const OPTION_UPDATE_MUTATION = `
  mutation productOptionUpdate($productId: ID!, $option: OptionUpdateInput!, $variantStrategy: ProductOptionUpdateVariantStrategy) {
    productOptionUpdate(productId: $productId, option: $option, variantStrategy: $variantStrategy) {
      product { variants(first: 100) { nodes { id selectedOptions { name value } } } }
      userErrors { field message code }
    }
  }
`;

const INVENTORY_SET_MUTATION = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { changes { name delta quantityAfterChange } }
      userErrors { code field message }
    }
  }
`;

const INVENTORY_QUERY = `
  query getInventory($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      nodes {
        id title handle status
        featuredImage { url }
        variants(first: 100) {
          nodes {
            id title sku price inventoryQuantity
            inventoryItem { id tracked }
            selectedOptions { name value }
          }
        }
      }
      pageInfo { hasNextPage hasPreviousPage endCursor startCursor }
    }
  }
`;

// Shopify: location(id: ID) without an id returns the shop's primary location.
const PRIMARY_LOCATION_QUERY = `
  query getPrimaryLocation {
    location { id name isActive }
  }
`;

const ADJUST_MUTATION = `
  mutation setInventory($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { reason changes { name delta quantityAfterChange } }
      userErrors { field message code }
    }
  }
`;

const DEFAULT_VARIANT_QUERY = `
  query getDefaultVariant($id: ID!) {
    product(id: $id) {
      variants(first: 1) { edges { node { id } } }
    }
  }
`;

const FULFILLMENT_CREATE_MUTATION = `
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }
`;

const ORDER_FULFILLMENT_ORDERS_QUERY = `
  query getOrderFulfillmentOrders($id: ID!) {
    order(id: $id) {
      id
      fulfillmentOrders(first: 50) {
        nodes {
          id
          status
          requestStatus
          lineItems(first: 250) {
            nodes { id remainingQuantity }
          }
        }
      }
    }
  }
`;

const ORDER_CANCEL_MUTATION = `
  mutation orderCancel($orderId: ID!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!) {
    orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock) {
      job { id }
      userErrors { field message }
    }
  }
`;

const ORDER_CANCEL_STATUS_QUERY = `
  query getOrderCancelStatus($id: ID!) {
    order(id: $id) { id cancelledAt }
  }
`;

const RETURNS_QUERY = `
  query getReturns($first: Int!, $after: String, $query: String) {
    returns(first: $first, after: $after, query: $query) {
      nodes {
        id
        name
        status
        createdAt
        closedAt
        order { id name createdAt }
        returnLineItems(first: 10) {
          nodes {
            id
            quantity
            returnReason
            returnReasonNote
            customerNote
            fulfillmentLineItem {
              lineItem { title variant { sku } }
            }
          }
        }
        refunds(first: 1) {
          nodes {
            totalRefundedSet { shopMoney { amount currencyCode } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const RETURN_APPROVE_MUTATION = `
  mutation returnApproveRequest($input: ReturnApproveRequestInput!) {
    returnApproveRequest(input: $input) {
      return { id status }
      userErrors { field message }
    }
  }
`;

const RETURN_DECLINE_MUTATION = `
  mutation returnDecline($input: ReturnDeclineInput!) {
    returnDecline(input: $input) {
      return { id status }
      userErrors { field message }
    }
  }
`;

const RETURN_REFUND_MUTATION = `
  mutation returnRefund($returnRefundInput: ReturnRefundInput!) {
    returnRefund(returnRefundInput: $returnRefundInput) {
      refund { id }
      userErrors { field message }
    }
  }
`;

const ORDER_NOTE_UPDATE_MUTATION = `
  mutation orderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order { id note }
      userErrors { field message }
    }
  }
`;

const PUBLICATIONS_QUERY = `
  query getPublications {
    publications(first: 25) {
      nodes { id name }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable { ... on Product { id } }
      userErrors { field message }
    }
  }
`;

// ─── Shopify OAuth 응답 타입 ─────────────────────────────────
interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface ShopifyTokenErrorResponse {
  error: string;
  error_description?: string;
}

// ─── 토큰 발급 ───────────────────────────────────────────────

/**
 * Client Credentials flow로 Access Token 발급
 * POST https://{shopDomain}/admin/oauth/access_token
 */
export async function fetchShopifyAccessToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const url = `https://${shopDomain}${SHOPIFY_OAUTH_PATH}`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ShopifyTokenErrorResponse;
    throw new Error(
      `Shopify token fetch failed [${res.status}]: ${err.error ?? 'unknown'} ${err.error_description ?? ''}`.trim(),
    );
  }

  const data = (await res.json()) as ShopifyTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh Token으로 Access Token 갱신
 * POST https://{shopDomain}/admin/oauth/access_token
 */
export async function refreshShopifyAccessToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const url = `https://${shopDomain}${SHOPIFY_OAUTH_PATH}`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ShopifyTokenErrorResponse;
    throw new Error(
      `Shopify token refresh failed [${res.status}]: ${err.error ?? 'unknown'} ${err.error_description ?? ''}`.trim(),
    );
  }

  const data = (await res.json()) as ShopifyTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresIn: data.expires_in,
  };
}

// ─── ShopifyAdapter ──────────────────────────────────────────

export class ShopifyAdapter implements IChannelAdapter {
  readonly vendor: ChannelVendor = 'SHOPIFY';
  readonly syncMode: SyncMode = 'realtime';
  readonly capabilities: ChannelCapabilities = {
    supportsOrderFetch: true,
    supportsClaimFetch: true,
    supportsProductRegister: true,
    supportsProductUpdate: true,
    supportsInventoryRead: true,
    supportsInventoryWrite: true,
    supportsRealtimeStock: true,
    supportsBulkOperations: true,
  };

  private readonly shopDomain: string;
  private readonly accessToken: string;

  constructor(opts: { shopDomain: string; accessToken: string }) {
    this.shopDomain = opts.shopDomain;
    this.accessToken = opts.accessToken;
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://${this.shopDomain}/admin/api/2025-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Shopify GraphQL HTTP error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async validateCredential(): Promise<boolean> {
    try {
      const data = await this.graphql<{ data?: { shop?: { name?: string } } }>(
        '{ shop { name } }',
      );
      return typeof data.data?.shop?.name === 'string';
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

  private mapNode(node: ShopifyOrderNode): Order {
    const money = node.currentTotalPriceSet.shopMoney;
    const currency = money.currencyCode as 'JPY' | 'KRW' | 'USD';
    const totalAmount = Number.parseFloat(money.amount);

    const items: OrderItem[] = node.lineItems.nodes.map((li, idx) => ({
      id: li.id ?? String(idx),
      productName: li.title,
      option: li.variant?.sku ?? undefined,
      quantity: li.quantity,
      unitPrice: Number.parseFloat(li.originalUnitPrice),
      totalPrice: Number.parseFloat(li.originalUnitPrice) * li.quantity,
      sku: li.variant?.sku ?? undefined,
    }));

    return {
      id: node.id,
      channelId: '',
      channelOrderId: node.name,
      status: (() => {
        const fin = node.displayFinancialStatus.toLowerCase();
        const ful = node.displayFulfillmentStatus.toLowerCase();
        if (fin === 'refunded' || fin === 'partially_refunded') return 'RETURNED';
        if (ful === 'fulfilled') return 'DELIVERED';
        if (ful === 'in_progress' || ful === 'partial') return 'SHIPPED';
        if (fin === 'paid') return 'PAID';
        if (fin === 'pending') return 'PENDING';
        return 'PENDING';
      })(),
      buyer: {
        name: node.customer?.displayName ?? node.shippingAddress?.name ?? '',
        email: node.customer?.email ?? node.email ?? null,
        tel: node.customer?.phone ?? node.phone ?? null,
      },
      shipping: {
        receiver: node.shippingAddress?.name ?? '',
        shippingAddress: [
          node.shippingAddress?.address1,
          node.shippingAddress?.address2,
          node.shippingAddress?.city,
        ]
          .filter(Boolean)
          .join(' '),
        zipCode: node.shippingAddress?.zip ?? undefined,
        country: node.shippingAddress?.countryCodeV2 ?? undefined,
        receiverTel: node.shippingAddress?.phone ?? undefined,
      },
      payment: {
        currency,
        totalAmount,
        krwAmount: totalAmount,
        originalAmount: totalAmount,
        paymentMethod: node.displayFinancialStatus,
      },
      items,
      orderedAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  async getOrders(params: GetOrdersParams): Promise<Order[]> {
    const queryParts: string[] = [];

    // YYYYMMDD → ISO date
    const toISO = (d: string) =>
      `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

    queryParts.push(`created_at:>=${toISO(params.startDate)}`);
    queryParts.push(`created_at:<=${toISO(params.endDate)}`);

    if (params.status) {
      // status can be "financial:paid" or "fulfillment:fulfilled" etc.
      const [type, val] = params.status.split(':');
      if (val) {
        queryParts.push(`${type}_status:${val.toLowerCase()}`);
      }
    }
    if (params.searchCondition) {
      queryParts.push(`name:*${params.searchCondition}*`);
    }

    const queryString = queryParts.join(' AND ');
    const allNodes: ShopifyOrderNode[] = [];
    let after: string | undefined;

    // Paginate through all results
    do {
      const res = await this.graphql<ShopifyOrdersGQLResponse>(ORDERS_QUERY, {
        first: 250,
        after,
        query: queryString,
      });

      if (res.errors) {
        const msg =
          typeof res.errors === 'string' ? res.errors : (res.errors[0]?.message ?? 'GraphQL error');
        throw new Error(`Shopify getOrders error: ${msg}`);
      }

      const ordersData = res.data?.orders;
      if (!ordersData) break;

      allNodes.push(...ordersData.nodes);

      if (ordersData.pageInfo.hasNextPage && ordersData.pageInfo.endCursor) {
        after = ordersData.pageInfo.endCursor;
      } else {
        break;
      }
    } while (true);

    return allNodes.map((n) => this.mapNode(n));
  }

  async getOrderDetail(orderId: string): Promise<Order> {
    // orderId can be a name like #1001 or a GID like gid://shopify/Order/123
    const id = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`;
    const res = await this.graphql<ShopifyOrdersGQLResponse>(ORDER_BY_ID_QUERY, { id });

    if (res.errors) {
      const msg =
        typeof res.errors === 'string' ? res.errors : (res.errors[0]?.message ?? 'GraphQL error');
      throw new Error(`Shopify getOrderDetail error: ${msg}`);
    }

    const node = res.data?.order;
    if (!node) throw new Error(`Order not found: ${orderId}`);

    return this.mapNode(node);
  }

  async updateShipment(data: UpdateShipmentData): Promise<void> {
    const carrierMapping: Record<string, string> = {
      yamato: 'yamato',
      sagawa: 'sagawa',
      japanpost: 'japan-post',
      seino: 'seino',
    };

    const orderId = String(data.orderNo).startsWith('gid://')
      ? String(data.orderNo)
      : `gid://shopify/Order/${data.orderNo}`;

    const foRes = await this.graphql<{
      data?: {
        order?: {
          id: string;
          fulfillmentOrders?: {
            nodes: Array<{
              id: string;
              status: string;
              requestStatus: string;
              lineItems: { nodes: Array<{ id: string; remainingQuantity: number }> };
            }>;
          };
        } | null;
      };
      errors?: unknown;
    }>(ORDER_FULFILLMENT_ORDERS_QUERY, { id: orderId });

    const order = foRes.data?.order;
    if (!order) throw new Error(`Order not found for shipment update: ${data.orderNo}`);

    const fulfillmentOrders = order.fulfillmentOrders?.nodes ?? [];
    const openFulfillmentOrders = fulfillmentOrders.filter(
      (fo) => fo.status === 'OPEN' || fo.status === 'IN_PROGRESS',
    );
    if (openFulfillmentOrders.length === 0) {
      throw new Error(`No open fulfillment orders for order: ${data.orderNo}`);
    }

    const lineItemsByFulfillmentOrder = openFulfillmentOrders
      .map((fo) => ({
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: fo.lineItems.nodes
          .filter((li) => li.remainingQuantity > 0)
          .map((li) => ({ id: li.id, quantity: li.remainingQuantity })),
      }))
      .filter((entry) => entry.fulfillmentOrderLineItems.length > 0);

    if (lineItemsByFulfillmentOrder.length === 0) {
      throw new Error(`No remaining line items to fulfill for order: ${data.orderNo}`);
    }

    const trackingCompany = carrierMapping[data.carrierId] ?? data.carrierId;

    const res = await this.graphql<{
      data?: { fulfillmentCreate?: { userErrors: Array<{ field?: string[]; message: string }> } };
    }>(FULFILLMENT_CREATE_MUTATION, {
      fulfillment: {
        lineItemsByFulfillmentOrder,
        trackingInfo: {
          company: trackingCompany,
          number: data.trackingNumber,
        },
        notifyCustomer: false,
      },
    });

    const userErrors = res.data?.fulfillmentCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(`Shopify fulfillmentCreate errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async getProductDetail(itemCode: string): Promise<unknown> {
    const id = itemCode.startsWith('gid://') ? itemCode : `gid://shopify/Product/${itemCode}`;
    const res = await this.graphql<{ data?: { product?: unknown }; errors?: unknown }>(
      PRODUCT_DETAIL_QUERY,
      { id },
    );
    if (res.errors) throw new Error(`Shopify getProductDetail error: ${JSON.stringify(res.errors)}`);
    return res.data?.product ?? null;
  }

  async deleteProduct(productId: string): Promise<{ deletedProductId: string | null }> {
    const id = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    const res = await this.graphql<{
      data?: { productDelete?: { deletedProductId: string | null; userErrors: Array<{ message: string }> } };
    }>(PRODUCT_DELETE_MUTATION, { input: { id } });

    const result = res.data?.productDelete;
    if (result?.userErrors?.length) {
      throw new Error(`Shopify deleteProduct errors: ${result.userErrors.map((e) => e.message).join(', ')}`);
    }
    if (!result?.deletedProductId) {
      throw new Error(`Shopify 상품 삭제 실패: 응답에 deletedProductId가 없습니다. (id: ${id})`);
    }
    return { deletedProductId: result.deletedProductId };
  }

  async updateProductStatus(productId: string, status: string): Promise<void> {
    const id = productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`;
    const res = await this.graphql<{
      data?: { productUpdate?: { userErrors: Array<{ message: string }> } };
    }>(PRODUCT_UPDATE_STATUS_MUTATION, { product: { id, status: status.toUpperCase() } });

    const userErrors = res.data?.productUpdate?.userErrors ?? [];
    if (userErrors.length) {
      throw new Error(`Shopify updateProductStatus errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async getProducts(params: { itemStatus?: string | string[]; page?: string; mergeAll?: boolean; offset?: number; pageSize?: number }): Promise<ProductListResult> {
    const { pageSize = 50, itemStatus, page } = params;

    const queryParts: string[] = [];
    if (itemStatus) {
      const status = Array.isArray(itemStatus) ? itemStatus[0] : itemStatus;
      if (status && status !== 'all') queryParts.push(`status:${status}`);
    }
    const query = queryParts.join(' AND ') || undefined;

    const allItems: ProductListResult['items'] = [];
    let after: string | undefined = page;

    const res = await this.graphql<{
      data?: {
        products?: {
          nodes: Array<{
            id: string;
            title: string;
            handle: string;
            status: string;
            featuredImage: { url: string } | null;
            variants: {
              nodes: Array<{
                id: string;
                sku: string | null;
                price: string;
                inventoryQuantity: number;
              }>;
            };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor?: string };
        };
      };
      errors?: unknown;
    }>(`
      query getProductsList($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          nodes {
            id title handle status
            featuredImage { url }
            variants(first: 1) {
              nodes { id sku price inventoryQuantity }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `, { first: pageSize, after: after ?? null, query: query ?? null });

    if (res.errors) throw new Error(`Shopify getProducts error: ${JSON.stringify(res.errors)}`);

    const products = res.data?.products;
    if (!products) return { items: [], totalItems: 0, totalPages: 1 };

    for (const p of products.nodes) {
      const variant = p.variants.nodes[0];
      allItems.push({
        id: p.id,
        channelId: '',
        sellerCode: p.handle,
        title: p.title,
        promotionName: p.title,
        status: p.status === 'ACTIVE' ? 'active' : 'inactive',
        price: variant ? parseFloat(variant.price) : 0,
        settlePrice: variant ? parseFloat(variant.price) : 0,
        retailPrice: variant ? parseFloat(variant.price) : 0,
        qty: variant?.inventoryQuantity ?? 0,
        imageUrl: p.featuredImage?.url ?? '',
        category: { main: { code: '', name: '' }, sub1: { code: '', name: '' }, sub2: { code: '', name: '' } },
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
        listedDate: '',
        changedDate: '',
        expireDate: '',
        drugtype: '',
        optionShippingNo1: '',
        optionShippingNo2: '',
        contactInfo: '',
      });
    }

    return { items: allItems, totalItems: allItems.length, totalPages: 1 };
  }

  async getInventory(params: GetInventoryParams): Promise<ShopifyInventoryApiResponse> {
    const { pageSize = 20, after, keyword, status } = params;

    const queryParts: string[] = [];
    if (keyword) queryParts.push(`title:*${keyword}*`);
    if (status) queryParts.push(`status:${status}`);
    const query = queryParts.join(' AND ') || undefined;

    const res = await this.graphql<{
      data?: {
        products?: {
          nodes: Array<{
            id: string;
            title: string;
            handle: string;
            status: string;
            featuredImage: { url: string } | null;
            variants: {
              nodes: Array<{
                id: string;
                title: string;
                sku: string | null;
                price: string;
                inventoryQuantity: number;
                inventoryItem: { id: string; tracked: boolean };
                selectedOptions: Array<{ name: string; value: string }>;
              }>;
            };
          }>;
          pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; endCursor?: string; startCursor?: string };
        };
      };
      errors?: unknown;
    }>(INVENTORY_QUERY, { first: pageSize, after: after ?? null, query: query ?? null });

    if (res.errors) throw new Error(`Shopify getInventory error: ${JSON.stringify(res.errors)}`);

    const products = res.data?.products;
    if (!products) return { items: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };

    return {
      items: products.nodes.map((p) => ({
        productId: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        imageUrl: p.featuredImage?.url ?? '',
        variants: p.variants.nodes.map((v) => ({
          variantId: v.id,
          variantTitle: v.title,
          sku: v.sku,
          price: v.price,
          inventoryItemId: v.inventoryItem.id,
          inventoryQuantity: v.inventoryQuantity,
          tracked: v.inventoryItem.tracked,
          selectedOptions: v.selectedOptions,
        })),
      })),
      pageInfo: products.pageInfo,
    };
  }

  private async getPrimaryLocationId(): Promise<string | undefined> {
    const res = await this.graphql<{
      data?: { location?: { id: string; name: string; isActive: boolean } };
    }>(PRIMARY_LOCATION_QUERY);
    return res.data?.location?.id;
  }

  async adjustInventory(data: AdjustInventoryData): Promise<void> {
    const locationId = await this.getPrimaryLocationId();
    if (!locationId) throw new Error('Shopify: no primary location found');

    const res = await this.graphql<{
      data?: { inventorySetQuantities?: { userErrors: Array<{ message: string }> } };
    }>(ADJUST_MUTATION, {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [
          {
            inventoryItemId: data.inventoryItemId,
            locationId,
            quantity: data.newQuantity,
          },
        ],
      },
    });

    const userErrors = res.data?.inventorySetQuantities?.userErrors ?? [];
    if (userErrors.length) {
      throw new Error(`Shopify adjustInventory errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async registerProduct(input: unknown): Promise<{ productId: string; title: string }> {
    // input = 공통 payload + platformAttrs(shopify.*) + overrides
    const d = input as Record<string, unknown>;

    // Shopify 전용 필드 우선, 없으면 공통 필드 fallback
    const title = (d.title as string | undefined) ?? '';
    const status = ((d.status as string | undefined) ?? 'DRAFT').toUpperCase();
    const vendor = (d.vendor as string | undefined) ?? undefined;
    const productType = (d.productType as string | undefined) ?? undefined;
    // handle은 영소문자/숫자/하이픈만 — URL이나 공백/특수문자가 들어오면 무시
    const rawHandle = (d.handle as string | undefined) ?? undefined;
    const handle = rawHandle && /^[a-z0-9-]+$/.test(rawHandle) ? rawHandle : undefined;
    const tags = Array.isArray(d.tags) ? (d.tags as string[]) : [];
    const images = Array.isArray(d.images) ? (d.images as Array<{ url: string; altText?: string }>) : [];
    const options = Array.isArray(d.options) ? (d.options as Array<{ name: string; values: string[] }>) : [];
    const variantsList = Array.isArray(d.variants)
      ? (d.variants as Array<{ options: string[]; price: string; sku?: string; inventoryQuantity?: number; compareAtPrice?: string; barcode?: string }>)
      : [];

    // seo: 플랫폼 저장값 또는 인라인 전달값
    const seoRaw = d['seo.title'] || d['seo.description']
      ? { title: d['seo.title'] as string | undefined, description: d['seo.description'] as string | undefined }
      : (d.seo as { title?: string; description?: string } | undefined);

    // variantDefaults: 플랫폼 저장값 (variantDefaults.compareAtPrice 등 flat key로 올 수 있음)
    const varDefaults = (d.variantDefaults as Record<string, unknown> | undefined) ?? {};
    const compareAtPrice = (varDefaults.compareAtPrice as string | undefined) ?? (d['variantDefaults.compareAtPrice'] as string | undefined);
    const barcode = (varDefaults.barcode as string | undefined) ?? (d['variantDefaults.barcode'] as string | undefined);
    const inventoryPolicy = (varDefaults.inventoryPolicy as string | undefined) ?? (d['variantDefaults.inventoryPolicy'] as string | undefined);
    const weightUnit = (varDefaults.weightUnit as string | undefined) ?? (d['variantDefaults.weightUnit'] as string | undefined);

    // 단일 변형 기본값
    const price = (d.price as string | undefined) ?? undefined;
    const sku = (d.sku as string | undefined) ?? undefined;
    const inventoryQuantity = d.inventoryQuantity != null ? Number(d.inventoryQuantity) : undefined;

    // Step 1: productCreate
    const productInput: Record<string, unknown> = { title, status };
    if (d.descriptionHtml) productInput.descriptionHtml = d.descriptionHtml;
    if (vendor) productInput.vendor = vendor;
    if (productType) productInput.productType = productType;
    if (handle) productInput.handle = handle;
    if (tags.length) productInput.tags = tags;
    if (seoRaw && (seoRaw.title || seoRaw.description)) productInput.seo = seoRaw;

    // data 호환 객체 (이하 코드에서 data.xxx 패턴 재사용)
    const data = {
      title,
      images,
      options: options.length > 0 ? options : undefined,
      variants: variantsList.length > 0 ? variantsList : undefined,
      price,
      sku,
      inventoryQuantity,
      compareAtPrice,
      barcode,
      inventoryPolicy,
      weightUnit,
    };

    const media = (data.images ?? [])
      .filter((img) => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .map((img) => ({
        mediaContentType: 'IMAGE',
        originalSource: img.url,
        alt: img.altText ?? '',
      }));

    console.log('[ShopifyAdapter.registerProduct] images count =', data.images?.length ?? 0, 'media count =', media.length);
    if (media.length > 0) {
      console.log('[ShopifyAdapter.registerProduct] first media =', media[0]);
    }
    console.log('[ShopifyAdapter.registerProduct] price/sku/qty (single):', {
      price: data.price,
      sku: data.sku,
      inventoryQuantity: data.inventoryQuantity,
    });
    console.log('[ShopifyAdapter.registerProduct] options:', JSON.stringify(data.options));
    console.log(
      '[ShopifyAdapter.registerProduct] variants:',
      JSON.stringify(data.variants?.map((v) => ({ options: v.options, price: v.price, sku: v.sku, qty: v.inventoryQuantity }))),
    );

    const createRes = await this.graphql<{
      data?: {
        productCreate?: {
          product: {
            id: string;
            title: string;
            media?: { nodes: Array<{ id: string; status: string; mediaErrors?: Array<{ code: string; details?: string; message: string }> }> };
          } | null;
          userErrors: Array<{ message: string }>;
        };
      };
    }>(PRODUCT_CREATE_MUTATION, { input: productInput, media });

    const createErrors = createRes.data?.productCreate?.userErrors ?? [];
    if (createErrors.length) {
      throw new Error(`Shopify productCreate errors: ${createErrors.map((e) => e.message).join(', ')}`);
    }
    const product = createRes.data?.productCreate?.product;
    if (!product) throw new Error('Shopify productCreate: no product returned');

    const mediaNodes = product.media?.nodes ?? [];
    const failedMedia = mediaNodes.filter((m) => m.status === 'FAILED' || (m.mediaErrors && m.mediaErrors.length > 0));
    if (failedMedia.length > 0) {
      console.error(
        '[ShopifyAdapter.registerProduct] media failed:',
        JSON.stringify(failedMedia.map((m) => ({ id: m.id, status: m.status, errors: m.mediaErrors })), null, 2),
      );
    } else if (media.length > 0) {
      console.log('[ShopifyAdapter.registerProduct] media accepted, nodes =', mediaNodes.length);
    }

    const productId = product.id;
    const hasOptions = data.options && data.options.length > 0;

    // Inventory goes to the shop's primary location (Shopify's canonical default).
    const locationId = await this.getPrimaryLocationId();

    if (!hasOptions) {
      // No options: update default variant price/sku + set inventory
      const varRes = await this.graphql<{
        data?: { product?: { variants: { edges: Array<{ node: { id: string } }> } } };
      }>(DEFAULT_VARIANT_QUERY, { id: productId });
      const defaultVariantId = varRes.data?.product?.variants?.edges[0]?.node?.id;

      if (defaultVariantId) {
        const variantInput: Record<string, unknown> = { id: defaultVariantId };
        if (data.price) variantInput.price = data.price;
        if (data.sku) variantInput.sku = data.sku;
        if (data.compareAtPrice) variantInput.compareAtPrice = data.compareAtPrice;
        if (data.barcode) variantInput.barcode = data.barcode;
        if (data.inventoryPolicy) variantInput.inventoryPolicy = data.inventoryPolicy;
        const inventoryItem: Record<string, unknown> = { tracked: true };
        if (data.weightUnit) inventoryItem.measurement = { weight: { unit: data.weightUnit } };
        variantInput.inventoryItem = inventoryItem;

        await this.graphql(VARIANTS_BULK_UPDATE_MUTATION, {
          productId,
          variants: [variantInput],
        });

        if (locationId && data.inventoryQuantity != null) {
          // Get inventoryItemId from updated variant
          const detailRes = await this.graphql<{
            data?: { product?: { variants: { nodes: Array<{ id: string; inventoryItem: { id: string } }> } } };
          }>(`query { product(id: "${productId}") { variants(first: 1) { nodes { id inventoryItem { id } } } } }`);
          const inventoryItemId = detailRes.data?.product?.variants?.nodes[0]?.inventoryItem?.id;

          if (inventoryItemId) {
            const invRes = await this.graphql<{
              data?: { inventorySetQuantities?: { userErrors: Array<{ code?: string; field?: string[]; message: string }> } };
            }>(INVENTORY_SET_MUTATION, {
              input: {
                name: 'available',
                reason: 'correction',
                ignoreCompareQuantity: true,
                quantities: [{ inventoryItemId, locationId, quantity: data.inventoryQuantity }],
              },
            });
            const invErrors = invRes.data?.inventorySetQuantities?.userErrors ?? [];
            if (invErrors.length) {
              console.error(
                '[ShopifyAdapter.registerProduct] inventorySetQuantities errors:',
                invErrors.map((e) => `${e.code ?? ''} ${e.message}`).join(' | '),
              );
            }
          }
        }
      }
    } else {
      // With options: create options then bulk create variants
      const options = data.options!;

      await this.graphql(OPTIONS_CREATE_MUTATION, {
        productId,
        options: options.map((opt) => ({
          name: opt.name,
          values: opt.values.map((v) => ({ name: v })),
        })),
      });

      if (data.variants?.length) {
        const variantInputs = data.variants.map((v) => ({
          optionValues: v.options.map((val, idx) => ({ optionName: options[idx]?.name ?? '', name: val })),
          price: v.price,
          sku: v.sku ?? undefined,
          compareAtPrice: v.compareAtPrice ?? data.compareAtPrice ?? undefined,
          barcode: v.barcode ?? data.barcode ?? undefined,
          inventoryPolicy: data.inventoryPolicy ?? undefined,
          inventoryItem: { tracked: true },
          inventoryQuantities: locationId && v.inventoryQuantity != null
            ? [{ locationId, availableQuantity: v.inventoryQuantity }]
            : undefined,
        }));

        await this.graphql(VARIANTS_BULK_CREATE_MUTATION, {
          productId,
          variants: variantInputs,
          strategy: 'REMOVE_STANDALONE_VARIANT',
        });
      }
    }

    // Publish to all sales channels (Online Store 등) — ACTIVE 상태일 때만
    if (status === 'ACTIVE') {
      try {
        const pubRes = await this.graphql<{
          data?: { publications?: { nodes: Array<{ id: string; name: string }> } };
        }>(PUBLICATIONS_QUERY);
        const publications = pubRes.data?.publications?.nodes ?? [];
        if (publications.length > 0) {
          const publishRes = await this.graphql<{
            data?: { publishablePublish?: { userErrors: Array<{ message: string }> } };
          }>(PUBLISHABLE_PUBLISH_MUTATION, {
            id: productId,
            input: publications.map((p) => ({ publicationId: p.id })),
          });
          const publishErrors = publishRes.data?.publishablePublish?.userErrors ?? [];
          if (publishErrors.length) {
            console.error(
              '[ShopifyAdapter.registerProduct] publishablePublish errors:',
              publishErrors.map((e) => e.message).join(', '),
            );
          } else {
            console.log(
              '[ShopifyAdapter.registerProduct] published to',
              publications.map((p) => p.name).join(', '),
            );
          }
        }
      } catch (err) {
        console.error('[ShopifyAdapter.registerProduct] publish failed:', err);
      }
    }

    return { productId, title: product.title };
  }

  async updateProduct(itemCode: string, data: unknown): Promise<unknown> {
    const productId = (itemCode as string).startsWith('gid://')
      ? itemCode
      : `gid://shopify/Product/${itemCode}`;

    const input = data as {
      title?: string;
      descriptionHtml?: string;
      vendor?: string;
      productType?: string;
      status?: string;
      tags?: string[];
      seo?: { title?: string; description?: string };
      options?: Array<{ id: string; name: string; values: Array<{ id?: string; name: string }> }>;
      variants?: Array<{ id?: string; price?: string; sku?: string; inventoryQuantity?: number }>;
      variantPriceUpdates?: Array<{ combination: string[]; price: string }>;
      price?: string | number;
      sku?: string;
      inventoryQuantity?: number | string;
      weightG?: number | null;
      hsCode?: string;
      countryOfOrigin?: string;
    };

    // Step 1: basic product fields update
    const productInput: Record<string, unknown> = { id: productId };
    if (input.title !== undefined) productInput.title = input.title;
    if (input.descriptionHtml !== undefined) productInput.descriptionHtml = input.descriptionHtml;
    if (input.vendor !== undefined) productInput.vendor = input.vendor;
    if (input.productType !== undefined) productInput.productType = input.productType;
    if (input.status !== undefined) productInput.status = input.status.toUpperCase();
    if (input.tags !== undefined) productInput.tags = input.tags;
    if (input.seo !== undefined) productInput.seo = input.seo;

    const updateRes = await this.graphql<{
      data?: { productUpdate?: { product: unknown; userErrors: Array<{ message: string }> } };
    }>(PRODUCT_UPDATE_MUTATION, { product: productInput });

    const updateErrors = updateRes.data?.productUpdate?.userErrors ?? [];
    if (updateErrors.length) {
      throw new Error(`Shopify productUpdate errors: ${updateErrors.map((e) => e.message).join(', ')}`);
    }

    let variantErrors: Array<{ field?: string[]; message: string }> = [];

    console.log('[ShopifyAdapter.updateProduct] branch keys:', {
      hasOptions: !!input.options?.length,
      hasVariants: !!input.variants?.length,
      hasPrice: input.price !== undefined,
      hasSku: input.sku !== undefined,
      hasInventoryQuantity: input.inventoryQuantity !== undefined,
      inventoryQuantity: input.inventoryQuantity,
    });

    if (input.options?.length) {
      // Step 2: update options + variants by combination
      for (const opt of input.options) {
        await this.graphql(OPTION_UPDATE_MUTATION, {
          productId,
          option: {
            id: opt.id,
            name: opt.name,
            values: opt.values.map((v) => ({ id: v.id, name: v.name })),
          },
          variantStrategy: 'MANAGE',
        });
      }

      if (input.variantPriceUpdates?.length) {
        // Get current variants to match by selectedOptions
        const detailRes = await this.graphql<{
          data?: { product?: { variants: { nodes: Array<{ id: string; selectedOptions: Array<{ name: string; value: string }> }> } } };
        }>(PRODUCT_DETAIL_QUERY, { id: productId });

        const currentVariants = detailRes.data?.product?.variants?.nodes ?? [];

        const bulkVariants = input.variantPriceUpdates.map((update) => {
          const matched = currentVariants.find((v) =>
            update.combination.every((val) => v.selectedOptions.some((o) => o.value === val)),
          );
          return matched ? { id: matched.id, price: update.price } : null;
        }).filter(Boolean);

        if (bulkVariants.length) {
          const bulkRes = await this.graphql<{
            data?: { productVariantsBulkUpdate?: { userErrors: Array<{ message: string }> } };
          }>(VARIANTS_BULK_UPDATE_MUTATION, { productId, variants: bulkVariants });
          variantErrors = bulkRes.data?.productVariantsBulkUpdate?.userErrors ?? [];
        }
      }
    } else if (input.variants?.length) {
      // Step 3: direct variant update (no options)
      const bulkRes = await this.graphql<{
        data?: { productVariantsBulkUpdate?: { userErrors: Array<{ message: string }> } };
      }>(VARIANTS_BULK_UPDATE_MUTATION, { productId, variants: input.variants });
      variantErrors = bulkRes.data?.productVariantsBulkUpdate?.userErrors ?? [];
    } else if (input.price !== undefined || input.sku !== undefined || input.inventoryQuantity !== undefined) {
      // Step 4: single-variant case (no options, no explicit variants array) — update price/sku/stock for default variant
      const detailRes = await this.graphql<{
        data?: { product?: { variants: { nodes: Array<{ id: string; inventoryItem: { id: string } }> } } };
      }>(`query { product(id: "${productId}") { variants(first: 1) { nodes { id inventoryItem { id } } } } }`);
      const defaultVariant = detailRes.data?.product?.variants?.nodes[0];

      if (defaultVariant) {
        const inventoryItemInput: Record<string, unknown> = { tracked: true };
        if (input.sku !== undefined) inventoryItemInput.sku = input.sku;
        if (input.hsCode && /^\d{6,13}$/.test(input.hsCode.trim())) {
          inventoryItemInput.harmonizedSystemCode = input.hsCode.trim();
        }
        const countryCode = normalizeCountryCode(input.countryOfOrigin);
        if (countryCode) inventoryItemInput.countryCodeOfOrigin = countryCode;
        if (typeof input.weightG === 'number' && input.weightG > 0) {
          inventoryItemInput.measurement = {
            weight: { value: input.weightG, unit: 'GRAMS' },
          };
        }
        const variantInput: Record<string, unknown> = {
          id: defaultVariant.id,
          inventoryItem: inventoryItemInput,
        };
        if (input.price !== undefined) variantInput.price = String(input.price);

        const bulkRes = await this.graphql<{
          data?: { productVariantsBulkUpdate?: { userErrors: Array<{ field?: string[]; message: string }> } };
        }>(VARIANTS_BULK_UPDATE_MUTATION, { productId, variants: [variantInput] });
        variantErrors = bulkRes.data?.productVariantsBulkUpdate?.userErrors ?? [];
        console.log('[ShopifyAdapter.updateProduct] variantsBulkUpdate input:', JSON.stringify(variantInput));
        if (variantErrors.length) {
          console.error('[ShopifyAdapter.updateProduct] variantsBulkUpdate userErrors:', JSON.stringify(variantErrors));
          throw new Error(
            `Shopify variantsBulkUpdate failed: ${variantErrors.map((e) => `${(e.field ?? []).join('.')}: ${e.message}`).join(' | ')}`,
          );
        }

        if (input.inventoryQuantity !== undefined && defaultVariant.inventoryItem?.id) {
          const locationId = await this.getPrimaryLocationId();

          if (locationId) {
            const invRes = await this.graphql<{
              data?: { inventorySetQuantities?: { userErrors: Array<{ code?: string; field?: string[]; message: string }> } };
            }>(INVENTORY_SET_MUTATION, {
              input: {
                name: 'available',
                reason: 'correction',
                ignoreCompareQuantity: true,
                quantities: [
                  {
                    inventoryItemId: defaultVariant.inventoryItem.id,
                    locationId,
                    quantity: Number(input.inventoryQuantity),
                  },
                ],
              },
            });
            const invErrors = invRes.data?.inventorySetQuantities?.userErrors ?? [];
            if (invErrors.length) {
              console.error(
                '[ShopifyAdapter.updateProduct] inventorySetQuantities errors:',
                invErrors.map((e) => `${e.code ?? ''} ${e.message}`).join(' | '),
              );
            }
          }
        }
      }
    }

    return {
      product: updateRes.data?.productUpdate?.product,
      ...(variantErrors.length ? { variantErrors } : {}),
    };
  }

  async cancelOrder(data: CancelOrderData): Promise<void> {
    const orderId = String(data.orderNo).startsWith('gid://')
      ? String(data.orderNo)
      : `gid://shopify/Order/${data.orderNo}`;

    const statusRes = await this.graphql<{
      data?: { order?: { id: string; cancelledAt: string | null } | null };
    }>(ORDER_CANCEL_STATUS_QUERY, { id: orderId });
    if (statusRes.data?.order?.cancelledAt) return;

    const reason = (data.reason ?? 'OTHER').toUpperCase();
    const validReasons = ['CUSTOMER', 'FRAUD', 'INVENTORY', 'DECLINED', 'OTHER'];
    const cancelReason = validReasons.includes(reason) ? reason : 'OTHER';

    const res = await this.graphql<{
      data?: { orderCancel?: { userErrors: Array<{ message: string }> } };
    }>(ORDER_CANCEL_MUTATION, {
      orderId,
      reason: cancelReason,
      refund: true,
      restock: true,
    });

    const userErrors = res.data?.orderCancel?.userErrors ?? [];
    if (userErrors.length > 0) {
      const alreadyCancelled = userErrors.some((e) =>
        /already been canceled|already cancelled/i.test(e.message),
      );
      if (alreadyCancelled) return;
      throw new Error(`Shopify orderCancel errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async getReturns(params: GetClaimsParams): Promise<ReturnItem[]> {
    const toISO = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const queryParts = [
      `created_at:>=${toISO(params.startDate)}`,
      `created_at:<=${toISO(params.endDate)}`,
    ];
    if (params.claimStatus && params.claimStatus !== 'ALL') {
      queryParts.push(`status:${params.claimStatus}`);
    }
    const queryString = queryParts.join(' AND ');

    interface ReturnNode {
      id: string;
      name: string;
      status: string;
      createdAt: string;
      order: { id: string; name: string } | null;
      returnLineItems: {
        nodes: Array<{
          id: string;
          quantity: number;
          returnReason: string | null;
          fulfillmentLineItem: { lineItem: { title: string; variant: { sku: string | null } | null } } | null;
        }>;
      };
      refunds: {
        nodes: Array<{ totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } } }>;
      };
    }

    interface ReturnsGQLResponse {
      data?: { returns?: { nodes: ReturnNode[]; pageInfo: { hasNextPage: boolean; endCursor?: string } } };
      errors?: Array<{ message: string }> | string;
    }

    const allNodes: ReturnNode[] = [];
    let after: string | undefined;

    do {
      const res = await this.graphql<ReturnsGQLResponse>(RETURNS_QUERY, {
        first: 250,
        after,
        query: queryString,
      });

      if (res.errors) {
        const msg = typeof res.errors === 'string' ? res.errors : (res.errors[0]?.message ?? 'GraphQL error');
        throw new Error(`Shopify getReturns error: ${msg}`);
      }

      const returnsData = res.data?.returns;
      if (!returnsData) break;

      allNodes.push(...returnsData.nodes);
      if (returnsData.pageInfo.hasNextPage && returnsData.pageInfo.endCursor) {
        after = returnsData.pageInfo.endCursor;
      } else {
        break;
      }
    } while (true);

    return allNodes.map((node): ReturnItem => {
      const firstLineItem = node.returnLineItems.nodes[0];
      const refundNode = node.refunds.nodes[0];
      return {
        id: node.id,
        channelOrderId: node.order?.id ?? '',
        status: node.status,
        reason: firstLineItem?.returnReason ?? undefined,
        requestDate: node.createdAt,
        itemName: firstLineItem?.fulfillmentLineItem?.lineItem.title ?? undefined,
        quantity: firstLineItem?.quantity ?? undefined,
        refundAmount: refundNode
          ? parseFloat(refundNode.totalRefundedSet.shopMoney.amount)
          : undefined,
        currency: refundNode?.totalRefundedSet.shopMoney.currencyCode ?? undefined,
      };
    });
  }

  async approveReturn(data: ApproveReturnData): Promise<void> {
    const returnId = String(data.orderNo).startsWith('gid://')
      ? String(data.orderNo)
      : `gid://shopify/Return/${data.orderNo}`;

    const res = await this.graphql<{
      data?: { returnApproveRequest?: { userErrors: Array<{ message: string }> } };
    }>(RETURN_APPROVE_MUTATION, { input: { id: returnId } });

    const userErrors = res.data?.returnApproveRequest?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(`Shopify returnApproveRequest errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async declineReturn(data: DeclineReturnData): Promise<void> {
    const returnId = data.returnId.startsWith('gid://')
      ? data.returnId
      : `gid://shopify/Return/${data.returnId}`;

    const res = await this.graphql<{
      data?: { returnDecline?: { userErrors: Array<{ message: string }> } };
    }>(RETURN_DECLINE_MUTATION, {
      input: {
        id: returnId,
        ...(data.declineReason ? { declineReason: data.declineReason } : {}),
      },
    });

    const userErrors = res.data?.returnDecline?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(`Shopify returnDecline errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async refundReturn(data: RefundReturnData): Promise<void> {
    const returnId = data.returnId.startsWith('gid://')
      ? data.returnId
      : `gid://shopify/Return/${data.returnId}`;

    const input: Record<string, unknown> = { returnId };
    if (data.lineItems && data.lineItems.length > 0) {
      input.returnLineItems = data.lineItems.map((li) => ({
        returnLineItemId: li.returnLineItemId.startsWith('gid://')
          ? li.returnLineItemId
          : `gid://shopify/ReturnLineItem/${li.returnLineItemId}`,
        quantity: li.quantity,
      }));
    }
    if (data.note) input.note = data.note;

    const res = await this.graphql<{
      data?: { returnRefund?: { userErrors: Array<{ message: string }> } };
    }>(RETURN_REFUND_MUTATION, { returnRefundInput: input });

    const userErrors = res.data?.returnRefund?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(`Shopify returnRefund errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async listChannelProducts(params: ListChannelProductsParams): Promise<ListChannelProductsResult> {
    // status 미지정 시 모든 판매상태(active/draft/archived) 통합 조회
    const statusParam = params.status === undefined
      ? 'all'
      : (Array.isArray(params.status) ? params.status[0] : params.status);
    const pageSize = params.pageSize ?? 50;
    const page = String(params.page ?? 1);

    const queryParts: string[] = [];
    if (statusParam && statusParam !== 'all') queryParts.push(`status:${statusParam}`);
    const query = queryParts.join(' AND ') || undefined;

    const res = await this.graphql<{
      data?: {
        products?: {
          nodes: Array<{
            id: string;
            title: string;
            handle: string;
            status: string;
            featuredImage: { url: string } | null;
            variants: {
              nodes: Array<{ id: string; sku: string | null; price: string; inventoryQuantity: number }>;
            };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor?: string };
        };
      };
      errors?: unknown;
    }>(`
      query listChannelProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          nodes {
            id title handle status
            featuredImage { url }
            variants(first: 1) {
              nodes { id sku price inventoryQuantity }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `, { first: pageSize, after: page === '1' ? null : page, query: query ?? null });

    if (res.errors) throw new Error(`Shopify listChannelProducts error: ${JSON.stringify(res.errors)}`);
    const products = res.data?.products?.nodes ?? [];

    const items: ChannelProduct[] = products.map((p) => {
      const variant = p.variants.nodes[0];
      return {
        channelItemId: p.id,
        sellerCode: p.handle || undefined,
        title: p.title,
        price: variant?.price ? String(variant.price) : undefined,
        images: p.featuredImage?.url ? [p.featuredImage.url] : [],
        variants: [],
        status: p.status,
      };
    });

    return { items, totalItems: items.length, totalPages: 1, currentPage: Number(page) };
  }

  async getChannelProduct(channelItemId: string): Promise<ChannelProduct> {
    const raw = await this.getProductDetail(channelItemId) as {
      id?: string;
      title?: string;
      handle?: string;
      featuredImage?: { url: string } | null;
      media?: { nodes: Array<{ preview?: { image?: { url: string } } }> };
      variants?: {
        nodes: Array<{
          id: string;
          sku: string | null;
          price: string;
          inventoryQuantity: number;
          selectedOptions?: Array<{ name: string; value: string }>;
        }>;
      };
    } | null;
    if (!raw) throw new Error(`Shopify product not found: ${channelItemId}`);

    const variants: ChannelProductVariant[] = (raw.variants?.nodes ?? []).map((v) => {
      const numericId = v.id.replace('gid://shopify/ProductVariant/', '');
      const optParts = v.selectedOptions ?? [];
      return {
        channelVariantId: numericId,
        optionCode: v.sku || undefined,
        optionName: optParts.map((o) => o.name).join('/') || undefined,
        optionValue: optParts.map((o) => o.value).join('/') || undefined,
        price: v.price || undefined,
        stock: v.inventoryQuantity,
      };
    });

    const imageUrl = raw.featuredImage?.url ?? raw.media?.nodes?.[0]?.preview?.image?.url;
    return {
      channelItemId: raw.id ?? channelItemId,
      sellerCode: raw.handle || undefined,
      title: raw.title ?? '',
      images: imageUrl ? [imageUrl] : [],
      variants,
      raw,
    };
  }

  async updateSellerCode(channelVariantId: string, newCode: string): Promise<UpdateSellerCodeResult> {
    const gid = channelVariantId.startsWith('gid://') ? channelVariantId : `gid://shopify/ProductVariant/${channelVariantId}`;
    try {
      const res = await this.graphql<{
        data?: { productVariantUpdate?: { productVariant?: { sku: string | null }; userErrors: Array<{ message: string }> } };
        errors?: unknown;
      }>(`
        mutation updateVariantSku($input: ProductVariantInput!) {
          productVariantUpdate(input: $input) {
            productVariant { sku }
            userErrors { field message }
          }
        }
      `, { input: { id: gid, sku: newCode } });

      if (res.errors) {
        return { channelVariantId, oldCode: '', newCode, status: 'FAILED', error: JSON.stringify(res.errors) };
      }
      const userErrors = res.data?.productVariantUpdate?.userErrors ?? [];
      if (userErrors.length > 0) {
        return { channelVariantId, oldCode: '', newCode, status: 'FAILED', error: userErrors.map((e) => e.message).join(', ') };
      }
      return { channelVariantId, oldCode: '', newCode, status: 'OK' };
    } catch (err) {
      return { channelVariantId, oldCode: '', newCode, status: 'FAILED', error: err instanceof Error ? err.message : 'unknown error' };
    }
  }

  async updateOrderNote(data: UpdateOrderNoteData): Promise<void> {
    const orderId = data.orderId.startsWith('gid://')
      ? data.orderId
      : `gid://shopify/Order/${data.orderId}`;

    const res = await this.graphql<{
      data?: { orderUpdate?: { userErrors: Array<{ message: string }> } };
    }>(ORDER_NOTE_UPDATE_MUTATION, { input: { id: orderId, note: data.note } });

    const userErrors = res.data?.orderUpdate?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(`Shopify orderUpdate errors: ${userErrors.map((e) => e.message).join(', ')}`);
    }
  }

  async pushVariantStock(_channelItemId: string, channelVariantId: string, newQty: number): Promise<void> {
    // 1) variant GID → inventoryItemId + stocked locations 조회
    const variantGid = channelVariantId.startsWith('gid://')
      ? channelVariantId
      : `gid://shopify/ProductVariant/${channelVariantId}`;
    const variantRes = await this.graphql<{
      data?: {
        productVariant?: {
          inventoryItem: {
            id: string;
            inventoryLevels: { nodes: Array<{ location: { id: string } }> };
          };
        };
      };
    }>(`query {
      productVariant(id: "${variantGid}") {
        inventoryItem {
          id
          inventoryLevels(first: 20) {
            nodes { location { id } }
          }
        }
      }
    }`);
    const inventoryItem = variantRes.data?.productVariant?.inventoryItem;
    if (!inventoryItem?.id) throw new Error(`Shopify pushVariantStock: inventoryItemId not found for variant ${channelVariantId}`);
    const inventoryItemId = inventoryItem.id;

    // 2) 해당 inventoryItem이 stocked된 모든 location에 재고 설정
    const locationIds = inventoryItem.inventoryLevels.nodes.map((n) => n.location.id);
    if (locationIds.length === 0) throw new Error('Shopify pushVariantStock: no inventory levels found');
    console.log('[pushVariantStock] inventoryItemId:', inventoryItemId, 'locationIds:', locationIds, 'qty:', newQty);

    const res = await this.graphql<{
      data?: { inventorySetQuantities?: { userErrors: Array<{ message: string }>; inventoryAdjustmentGroup?: unknown } };
    }>(INVENTORY_SET_MUTATION, {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: locationIds.map((locationId) => ({ inventoryItemId, locationId, quantity: newQty })),
      },
    });
    console.log('[pushVariantStock] result:', JSON.stringify(res.data?.inventorySetQuantities));
    const userErrors = res.data?.inventorySetQuantities?.userErrors ?? [];
    if (userErrors.length) throw new Error(`Shopify pushVariantStock errors: ${userErrors.map((e) => e.message).join(', ')}`);
  }
}
