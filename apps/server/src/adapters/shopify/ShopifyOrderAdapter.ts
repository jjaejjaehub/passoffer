// ShopifyOrderAdapter — IOrderAdapter<ShopifyOrderNode> 구현체.
// Admin GraphQL 2025-04 기반. 결정론적 매핑 (LLM 호출 금지).
// pullOrders / pullClaims / pullOrderDetail / pushTracking / pushDispatchDelay.

import type {
  ClaimStatus,
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

const SHOPIFY_API_VERSION = '2025-04';
const PAGE_SIZE = 250;

// ── GraphQL 응답 타입 ─────────────────────────────────────────────────────

export interface ShopifyOrderNode {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  tags: string[];
  customer: { displayName: string; email: string | null; phone: string | null } | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalShippingPriceSet: { shopMoney: { amount: string; currencyCode: string } } | null;
  shippingAddress: {
    name: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    zip: string | null;
    countryCodeV2: string | null;
    phone: string | null;
  } | null;
  shippingLine: { title: string | null; carrierIdentifier: string | null } | null;
  fulfillments: Array<{
    id: string;
    status: string;
    createdAt: string;
    deliveredAt: string | null;
    trackingInfo: Array<{ company: string | null; number: string | null }>;
  }>;
  lineItems: {
    nodes: Array<{
      id: string;
      title: string;
      quantity: number;
      sku: string | null;
      originalUnitPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      originalTotalSet: { shopMoney: { amount: string; currencyCode: string } };
      variant: { id: string | null; sku: string | null } | null;
    }>;
  };
}

interface ShopifyReturnNode {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  order: { id: string; name: string; createdAt: string } | null;
  returnLineItems: {
    nodes: Array<{
      id: string;
      quantity: number;
      returnReason: string | null;
      returnReasonNote: string | null;
      customerNote: string | null;
      fulfillmentLineItem: { lineItem: { title: string; variant: { sku: string | null } | null } } | null;
    }>;
  };
  refunds: {
    nodes: Array<{
      totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
    }>;
  };
  reverseFulfillmentOrders: {
    nodes: Array<{
      reverseDeliveries: {
        nodes: Array<{
          deliverable: {
            tracking: { number: string | null; carrierName: string | null } | null;
          } | null;
        }>;
      };
    }>;
  };
}

interface OrdersGQLResponse {
  data?: {
    orders?: {
      nodes: ShopifyOrderNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    order?: ShopifyOrderNode | null;
  };
  errors?: Array<{ message: string }>;
}

interface ReturnsGQLResponse {
  data?: {
    returns?: {
      nodes: ShopifyReturnNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: Array<{ message: string }>;
}

interface FulfillmentOrdersGQLResponse {
  data?: {
    order?: {
      id: string;
      fulfillmentOrders: {
        nodes: Array<{
          id: string;
          status: string;
          requestStatus: string;
          lineItems: {
            nodes: Array<{ id: string; remainingQuantity: number }>;
          };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

interface FulfillmentCreateGQLResponse {
  data?: {
    fulfillmentCreate?: {
      fulfillment: { id: string; status: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

// ── GraphQL 쿼리 ────────────────────────────────────────────────────────

const ORDER_FIELDS = `
  id
  name
  createdAt
  updatedAt
  cancelledAt
  displayFinancialStatus
  displayFulfillmentStatus
  email
  phone
  note
  tags
  customer { displayName email phone }
  currentTotalPriceSet { shopMoney { amount currencyCode } }
  totalShippingPriceSet { shopMoney { amount currencyCode } }
  shippingAddress { name address1 address2 city zip countryCodeV2 phone }
  shippingLine { title carrierIdentifier }
  fulfillments(first: 10) {
    id
    status
    createdAt
    deliveredAt
    trackingInfo { company number }
  }
  lineItems(first: 100) {
    nodes {
      id
      title
      quantity
      sku
      originalUnitPriceSet { shopMoney { amount currencyCode } }
      originalTotalSet { shopMoney { amount currencyCode } }
      variant { id sku }
    }
  }
`;

const ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
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
        returnLineItems(first: 50) {
          nodes {
            id
            quantity
            returnReason
            returnReasonNote
            customerNote
            fulfillmentLineItem { lineItem { title variant { sku } } }
          }
        }
        refunds(first: 1) {
          nodes { totalRefundedSet { shopMoney { amount currencyCode } } }
        }
        reverseFulfillmentOrders(first: 5) {
          nodes {
            reverseDeliveries(first: 5) {
              nodes {
                deliverable {
                  ... on ReverseDeliveryShippingDeliverable {
                    tracking { number carrierName }
                  }
                }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
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

const FULFILLMENT_CREATE_MUTATION = `
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }
`;

// ── 헬퍼 ──────────────────────────────────────────────────────────────

function toIsoOrNull(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function trimOrNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function parseFloatOrNull(s: string | null | undefined): number | null {
  if (s == null) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function gidNumericTail(gid: string): string {
  const i = gid.lastIndexOf('/');
  return i >= 0 ? gid.slice(i + 1) : gid;
}

function ensureOrderGid(id: string): string {
  if (id.startsWith('gid://shopify/Order/')) return id;
  if (/^\d+$/.test(id)) return `gid://shopify/Order/${id}`;
  return id;
}

// Shopify Return.status → 13-value ClaimStatus.
// OPEN/REQUESTED → return_requested (회수 대기)
// CLOSED         → return_done       (완료)
// DECLINED/CANCELED → requires_recheck (운영자 확인 필요)
function mapReturnStatus(status: string): ClaimStatus {
  const s = status.toUpperCase();
  if (s === 'CLOSED') return 'return_done';
  if (s === 'DECLINED' || s === 'CANCELED' || s === 'CANCELLED') return 'requires_recheck';
  return 'return_requested';
}

// ── 어댑터 ────────────────────────────────────────────────────────────

export class ShopifyOrderAdapter implements IOrderAdapter<ShopifyOrderNode> {
  readonly channelKey = 'shopify' as const;

  constructor(
    private readonly channelId: string,
    private readonly shopDomain: string,
    private readonly accessToken: string,
  ) {}

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(
      `https://${this.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (!res.ok) {
      throw new Error(`Shopify GraphQL HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  // ── toStandard ────────────────────────────────────────────────────

  toStandard(node: ShopifyOrderNode): StandardOrder {
    const money = node.currentTotalPriceSet.shopMoney;
    const currency = money.currencyCode || 'JPY';
    const total = parseFloatOrNull(money.amount);
    const shippingPrice = parseFloatOrNull(node.totalShippingPriceSet?.shopMoney.amount ?? null);

    // 최신 fulfillment 1건 — 가장 최근 createdAt
    const fulfillment = [...(node.fulfillments ?? [])]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const trackingInfo = fulfillment?.trackingInfo?.[0];
    const trackingNo = trimOrNull(trackingInfo?.number ?? null);
    const trackingCarrier =
      trimOrNull(trackingInfo?.company ?? null) ??
      trimOrNull(node.shippingLine?.carrierIdentifier ?? null);
    const shippedAt = toIsoOrNull(fulfillment?.createdAt ?? null);
    const deliveredAt = toIsoOrNull(fulfillment?.deliveredAt ?? null);

    const fulfillmentStatus = StatusRuleEngine.shopify.toFulfillment({
      displayFinancialStatus: node.displayFinancialStatus,
      displayFulfillmentStatus: node.displayFulfillmentStatus,
      trackingNo,
      shippedAt,
      deliveredAt,
      cancelledAt: node.cancelledAt,
    });

    const lineItems: StandardOrderItem[] = node.lineItems.nodes.map((li, idx) => {
      const unit = parseFloatOrNull(li.originalUnitPriceSet?.shopMoney.amount ?? null);
      const lineTotal = parseFloatOrNull(li.originalTotalSet?.shopMoney.amount ?? null);
      return {
        lineNo: idx + 1,
        channelItemCode: li.variant?.id ? gidNumericTail(li.variant.id) : trimOrNull(li.id),
        channelItemTitle: trimOrNull(li.title),
        channelOption: trimOrNull(li.variant?.sku ?? li.sku ?? null),
        channelOptionCode: trimOrNull(li.variant?.sku ?? li.sku ?? null),
        orderQty: li.quantity,
        unitPrice: unit,
        totalPrice: lineTotal,
        skuId: null,
        skuCode: null,
        skuName: null,
        outputQty: li.quantity,
        appliedGifts: [],
        warehouseId: null,
      };
    });

    const buyerName =
      trimOrNull(node.customer?.displayName ?? null) ??
      trimOrNull(node.shippingAddress?.name ?? null);

    return {
      // Identity
      channelId: this.channelId,
      channelOrderId: gidNumericTail(node.id),
      channelPackNo: null,
      channelItemNo: trimOrNull(node.name),
      channelAccountId: null,
      relatedOrders: [],
      // Buyer
      buyerName,
      buyerKana: null,
      buyerTel: trimOrNull(node.phone ?? node.customer?.phone ?? null),
      buyerMobile: trimOrNull(node.customer?.phone ?? node.phone ?? null),
      buyerEmail: trimOrNull(node.email ?? node.customer?.email ?? null),
      buyerLanguage: null,
      // Receiver
      receiverName: trimOrNull(node.shippingAddress?.name ?? null),
      receiverKana: null,
      receiverTel: trimOrNull(node.shippingAddress?.phone ?? null),
      receiverMobile: trimOrNull(node.shippingAddress?.phone ?? null),
      receiverEmail: trimOrNull(node.email ?? null),
      zipCode: trimOrNull(node.shippingAddress?.zip ?? null),
      shippingAddress: trimOrNull(node.shippingAddress?.address1 ?? null),
      address1: trimOrNull(node.shippingAddress?.address1 ?? null),
      address2: trimOrNull(node.shippingAddress?.address2 ?? null),
      receiverCountry: trimOrNull(node.shippingAddress?.countryCodeV2 ?? null),
      desiredDeliveryDate: null,
      // Sender
      senderName: null,
      senderTel: null,
      senderNation: null,
      senderZipCode: null,
      senderAddress: null,
      // Payment
      orderedAt: node.createdAt,
      paidAt: node.displayFinancialStatus?.toUpperCase() === 'PAID' ? node.createdAt : null,
      paymentMethod: null,
      currency,
      orderPrice: total,
      discount: null,
      cartDiscountSeller: null,
      cartDiscountChannel: null,
      total,
      // Fulfillment
      shippingWay: trimOrNull(node.shippingLine?.title ?? null),
      shippingMessage: trimOrNull(node.note ?? null),
      shippingRate: shippingPrice,
      shippingRateType: null,
      shippingDueDate: null,
      shippedAt,
      deliveredAt,
      trackingCarrier,
      trackingNo,
      trackingConflict: false,
      trackingConflictPayload: null,
      // Status
      fulfillmentStatus,
      claimStatus: null,
      displayStatus: trimOrNull(node.displayFulfillmentStatus),
      isDispatchDelayed: false,
      dispatchHoldReason: null,
      // Claim summary
      claimType: null,
      claimReason: null,
      claimRequestedAt: null,
      claimResolvedAt: null,
      returnTrackingNo: null,
      // Bundle
      bundleNumber: null,
      bundleable: true,
      bundleRoleIsPrimary: false,
      // Audit
      autoMatched: false,
      matchedBy: null,
      rawData: node,
      lineItems,
    };
  }

  // ── pullOrders ────────────────────────────────────────────────────

  async pullOrders(params: PullOrdersParams): Promise<StandardOrder[]> {
    const since = params.sinceDate;
    const until = params.untilDate ?? new Date().toISOString();
    const queryStr = `updated_at:>='${since}' AND updated_at:<='${until}'`;

    const out: StandardOrder[] = [];
    let cursor: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const res: OrdersGQLResponse = await this.graphql<OrdersGQLResponse>(ORDERS_QUERY, {
        first: PAGE_SIZE,
        after: cursor,
        query: queryStr,
      });
      if (res.errors?.length) {
        throw new Error(
          `Shopify pullOrders GQL error: ${res.errors.map((e: { message: string }) => e.message).join('; ')}`,
        );
      }
      const page = res.data?.orders;
      if (!page) break;
      for (const node of page.nodes) out.push(this.toStandard(node));
      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor;
      if (!cursor) break;
    }
    return out;
  }

  // ── pullOrderDetail ───────────────────────────────────────────────

  async pullOrderDetail(channelOrderId: string): Promise<StandardOrder> {
    const id = ensureOrderGid(channelOrderId);
    const res = await this.graphql<OrdersGQLResponse>(ORDER_BY_ID_QUERY, { id });
    if (res.errors?.length) {
      throw new Error(
        `Shopify pullOrderDetail GQL error: ${res.errors.map((e: { message: string }) => e.message).join('; ')}`,
      );
    }
    const node = res.data?.order;
    if (!node) throw new Error(`Shopify order not found: ${channelOrderId}`);
    return this.toStandard(node);
  }

  // ── pullClaims ────────────────────────────────────────────────────

  async pullClaims(params: PullOrdersParams): Promise<StandardClaim[]> {
    const since = params.sinceDate;
    const until = params.untilDate ?? new Date().toISOString();
    const queryStr = `created_at:>='${since}' AND created_at:<='${until}'`;

    const out: StandardClaim[] = [];
    let cursor: string | null = null;
    let hasNext = true;

    type ReverseFulfillmentOrderNode = ShopifyReturnNode['reverseFulfillmentOrders']['nodes'][number];
    type ReverseDeliveryNode = ReverseFulfillmentOrderNode['reverseDeliveries']['nodes'][number];
    type ReverseTracking = NonNullable<ReverseDeliveryNode['deliverable']>['tracking'];

    while (hasNext) {
      const res: ReturnsGQLResponse = await this.graphql<ReturnsGQLResponse>(RETURNS_QUERY, {
        first: PAGE_SIZE,
        after: cursor,
        query: queryStr,
      });
      if (res.errors?.length) {
        throw new Error(
          `Shopify pullClaims GQL error: ${res.errors.map((e: { message: string }) => e.message).join('; ')}`,
        );
      }
      const page = res.data?.returns;
      if (!page) break;

      for (const node of page.nodes) {
        if (!node.order) continue;
        const firstLi = node.returnLineItems.nodes[0];
        const reason =
          trimOrNull(firstLi?.returnReasonNote ?? null) ??
          trimOrNull(firstLi?.returnReason ?? null) ??
          trimOrNull(firstLi?.customerNote ?? null);
        const reverseTracking: ReverseTracking = node.reverseFulfillmentOrders?.nodes
          ?.flatMap((rfo: ReverseFulfillmentOrderNode) => rfo.reverseDeliveries?.nodes ?? [])
          ?.map((rd: ReverseDeliveryNode) => rd.deliverable?.tracking ?? null)
          ?.find((t: ReverseTracking) => t != null && t.number != null) ?? null;

        out.push({
          channelOrderId: gidNumericTail(node.order.id),
          channelPackNo: null,
          claimType: 'return',
          claimStatus: mapReturnStatus(node.status),
          claimRequestedAt: toIsoOrNull(node.createdAt),
          claimResolvedAt: toIsoOrNull(node.closedAt),
          claimReason: reason,
          returnTrackingNo: trimOrNull(reverseTracking?.number ?? null),
          returnDeliveryCompany: trimOrNull(reverseTracking?.carrierName ?? null),
          incidentType: null,
          incidentSource: null,
          incidentSkipCollection: false,
          rawData: node,
        });
      }

      hasNext = page.pageInfo.hasNextPage;
      cursor = page.pageInfo.endCursor;
      if (!cursor) break;
    }
    return out;
  }

  // ── pushTracking ──────────────────────────────────────────────────

  // 우리 UI는 한글 택배사명(CARRIER_OPTIONS)을 shippingCorp로 보냄.
  // Shopify는 ShippingCompany를 영문/표준명으로 인식하므로 매핑이 필요하다.
  // 매핑 미정의는 원문 그대로 넘기고, Shopify가 free-text로 받게 둔다.
  private static readonly CARRIER_NAME_TO_SHOPIFY: Record<string, string> = {
    'CJ대한통운': 'CJ Logistics',
    '롯데택배': 'Lotte Global Logistics',
    '한진택배': 'Hanjin',
    '우체국택배': 'Korea Post',
    '기타': 'Other',
  };

  private resolveCarrierForShopify(raw: string): string {
    const trimmed = (raw ?? '').trim();
    return ShopifyOrderAdapter.CARRIER_NAME_TO_SHOPIFY[trimmed] ?? trimmed;
  }

  async pushTracking(payload: PushTrackingPayload): Promise<PushResult> {
    try {
      const orderGid = ensureOrderGid(payload.channelOrderId);
      const foRes = await this.graphql<FulfillmentOrdersGQLResponse>(
        ORDER_FULFILLMENT_ORDERS_QUERY,
        { id: orderGid },
      );
      if (foRes.errors?.length) {
        return {
          ok: false,
          channelOrderId: payload.channelOrderId,
          message: foRes.errors.map((e: { message: string }) => e.message).join('; '),
        };
      }
      const fulfillmentOrders = foRes.data?.order?.fulfillmentOrders?.nodes ?? [];
      const openFos = fulfillmentOrders.filter(
        (fo) => fo.status === 'OPEN' || fo.status === 'IN_PROGRESS',
      );
      if (openFos.length === 0) {
        return {
          ok: false,
          channelOrderId: payload.channelOrderId,
          message: 'no open fulfillment orders',
        };
      }

      const lineItemsByFulfillmentOrder = openFos
        .map((fo) => ({
          fulfillmentOrderId: fo.id,
          fulfillmentOrderLineItems: fo.lineItems.nodes
            .filter((li) => li.remainingQuantity > 0)
            .map((li) => ({ id: li.id, quantity: li.remainingQuantity })),
        }))
        .filter((fo) => fo.fulfillmentOrderLineItems.length > 0);

      if (lineItemsByFulfillmentOrder.length === 0) {
        return {
          ok: false,
          channelOrderId: payload.channelOrderId,
          message: 'no remaining line items to fulfill',
        };
      }

      const variables = {
        fulfillment: {
          lineItemsByFulfillmentOrder,
          notifyCustomer: false,
          trackingInfo: {
            company: this.resolveCarrierForShopify(payload.trackingCarrier),
            number: payload.trackingNo,
          },
        },
      };

      const res = await this.graphql<FulfillmentCreateGQLResponse>(
        FULFILLMENT_CREATE_MUTATION,
        variables,
      );
      const userErrors = res.data?.fulfillmentCreate?.userErrors ?? [];
      if (res.errors?.length || userErrors.length > 0) {
        return {
          ok: false,
          channelOrderId: payload.channelOrderId,
          message:
            res.errors?.map((e: { message: string }) => e.message).join('; ') ??
            userErrors.map((e: { message: string }) => e.message).join('; '),
          raw: res,
        };
      }
      return {
        ok: true,
        channelOrderId: payload.channelOrderId,
        message: res.data?.fulfillmentCreate?.fulfillment?.id ?? 'ok',
        raw: res,
      };
    } catch (e) {
      return {
        ok: false,
        channelOrderId: payload.channelOrderId,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ── pushDispatchDelay ─────────────────────────────────────────────
  // Shopify Admin API에 발송예정일 변경 primitive가 없음 — 채널 미지원.

  async pushDispatchDelay(payload: PushDispatchDelayPayload): Promise<PushResult[]> {
    return payload.channelOrderIds.map((id) => ({
      ok: false,
      channelOrderId: id,
      message: 'not_supported_by_channel',
    }));
  }
}
