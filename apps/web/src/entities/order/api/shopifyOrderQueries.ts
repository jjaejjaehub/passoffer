"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Order } from "@oms/types";

// ─── API 응답 타입 ────────────────────────────────────────────

export type ShopifyOrderItem = Order;

export interface ShopifyPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor?: string;
  startCursor?: string;
}

// ─── 에러 타입 ─────────────────────────────────────────────────

export type ShopifyOrderQueryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ShopifyOrderQueryError {
  type: ShopifyOrderQueryErrorType;
  message: string;
}

// ─── 파라미터/결과 타입 ────────────────────────────────────────

export interface ShopifyOrdersQueryParams {
  pageSize?: number;
  after?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export interface ShopifyOrdersQueryResult {
  data: ShopifyOrderItem[];
  pageInfo: ShopifyPageInfo;
  isLoading: boolean;
  error: ShopifyOrderQueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

export interface ShopifyOrderStatsResult {
  orderCount: number;
  totalRevenue: number;
  currencyCode: string;
  fulfillmentBreakdown: Record<string, number>;
  financialBreakdown: Record<string, number>;
  isLoading: boolean;
  error: ShopifyOrderQueryError | null;
  hasApiKey: boolean;
}

// ─── Query Keys ────────────────────────────────────────────────

export const shopifyOrdersQueryRoot = ["shopify", "orders"] as const;

export const shopifyOrderQueries = {
  all: () => shopifyOrdersQueryRoot,
  list: (
    params: Pick<
      ShopifyOrdersQueryParams,
      | "pageSize"
      | "after"
      | "financialStatus"
      | "fulfillmentStatus"
      | "keyword"
      | "dateFrom"
      | "dateTo"
    >,
  ) => [...shopifyOrdersQueryRoot, "list", params] as const,
  stats: (params: { dateFrom?: string; dateTo?: string }) =>
    [...shopifyOrdersQueryRoot, "stats", params] as const,
};

// ─── 에러 파싱 ─────────────────────────────────────────────────

export function parseShopifyOrderError(error: unknown): ShopifyOrderQueryError {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const code = data?.error ?? "";
    const message = data?.message ?? "알 수 없는 오류";

    if (code === "NO_API_KEY") return { type: "NO_API_KEY", message };
    if (code === "AUTH_ERROR" || error.response?.status === 401)
      return { type: "AUTH_ERROR", message };
    if (code === "GRAPHQL_ERROR") return { type: "GRAPHQL_ERROR", message };
    if (code === "NETWORK_ERROR") return { type: "NETWORK_ERROR", message };
    return { type: "UNKNOWN", message };
  }
  return { type: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다." };
}

// ─── 주문 목록 훅 ──────────────────────────────────────────────

export function useShopifyOrders(
  params: ShopifyOrdersQueryParams = {},
): ShopifyOrdersQueryResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const {
    pageSize = 50,
    after,
    financialStatus,
    fulfillmentStatus,
    keyword,
    dateFrom,
    dateTo,
    enabled = true,
  } = params;

  const query = useQuery({
    queryKey: shopifyOrderQueries.list({
      pageSize,
      after,
      financialStatus,
      fulfillmentStatus,
      keyword,
      dateFrom,
      dateTo,
    }),
    queryFn: async (): Promise<Order[]> => {
      if (!channelUuid) {
        throw Object.assign(new Error("NO_API_KEY"), {
          response: {
            data: {
              error: "NO_API_KEY",
              message:
                "Shopify 채널이 연결되지 않았습니다. 채널 설정에서 등록해 주세요.",
            },
          },
        });
      }

      const searchParams = new URLSearchParams({
        channelId: channelUuid,
      });
      if (dateFrom) searchParams.set("startDate", dateFrom.replace(/-/g, ""));
      if (dateTo) searchParams.set("endDate", dateTo.replace(/-/g, ""));
      if (financialStatus && financialStatus !== "all")
        searchParams.set("status", financialStatus);
      if (keyword) searchParams.set("searchCondition", keyword);

      return http.get<Order[]>(`/api/orders?${searchParams.toString()}`);
    },
    enabled: hasKey && !!channelUuid && enabled,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseShopifyOrderError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: Array.isArray(query.data) ? query.data : [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseShopifyOrderError(query.error) : null,
    hasApiKey: hasKey,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── 대시보드 통계 훅 ──────────────────────────────────────────

interface ShopifyOrderStatsApiResponse {
  orderCount: number;
  totalRevenue: number;
  currencyCode: string;
  fulfillmentBreakdown: Record<string, number>;
  financialBreakdown: Record<string, number>;
}

export function useShopifyOrderStats(params: {
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}): ShopifyOrderStatsResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");
  const { dateFrom, dateTo, enabled = true } = params;

  const query = useQuery({
    queryKey: shopifyOrderQueries.stats({ dateFrom, dateTo }),
    queryFn: async (): Promise<ShopifyOrderStatsApiResponse> => {
      if (!channelUuid) {
        throw Object.assign(new Error("NO_API_KEY"), {
          response: {
            data: {
              error: "NO_API_KEY",
              message: "Shopify 채널이 연결되지 않았습니다.",
            },
          },
        });
      }

      const searchParams = new URLSearchParams({ channelId: channelUuid });
      if (dateFrom) searchParams.set("startDate", dateFrom.replace(/-/g, ""));
      if (dateTo) searchParams.set("endDate", dateTo.replace(/-/g, ""));

      // 통계는 주문 목록을 가져와 집계
      const orders = await http.get<Order[]>(
        `/api/orders?${searchParams.toString()}`,
      );
      const orderCount = orders.length;
      const totalRevenue = orders.reduce(
        (sum, o) => sum + (o.payment?.totalAmount ?? 0),
        0,
      );
      const currencyCode = orders[0]?.payment?.currency ?? "USD";

      const fulfillmentBreakdown: Record<string, number> = {};
      const financialBreakdown: Record<string, number> = {};
      for (const o of orders) {
        fulfillmentBreakdown[o.status] =
          (fulfillmentBreakdown[o.status] ?? 0) + 1;
      }

      return {
        orderCount,
        totalRevenue,
        currencyCode,
        fulfillmentBreakdown,
        financialBreakdown,
      };
    },
    enabled: hasKey && !!channelUuid && enabled,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const parsed = parseShopifyOrderError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    orderCount: query.data?.orderCount ?? 0,
    totalRevenue: query.data?.totalRevenue ?? 0,
    currencyCode: query.data?.currencyCode ?? "USD",
    fulfillmentBreakdown: query.data?.fulfillmentBreakdown ?? {},
    financialBreakdown: query.data?.financialBreakdown ?? {},
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseShopifyOrderError(query.error) : null,
    hasApiKey: hasKey,
  };
}
