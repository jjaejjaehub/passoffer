"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";

// ─── 타입 ─────────────────────────────────────────────────────

export interface ShopifyReturnLineItem {
  id: string;
  quantity: number;
  returnReason: string | null;
  returnReasonNote: string | null;
  customerNote: string | null;
  lineItemName: string;
  lineItemSku: string | null;
}

export interface ShopifyReturnItem {
  returnId: string;
  returnName: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  requestApprovedAt: string | null;
  orderId: string;
  orderName: string;
  orderCreatedAt: string;
  customerName: string | null;
  customerEmail: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
  lineItems: ShopifyReturnLineItem[];
  totalRefunded: string;
  currencyCode: string;
}

export type ShopifyReturnQueryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ShopifyReturnQueryError {
  type: ShopifyReturnQueryErrorType;
  message: string;
}

export interface ShopifyReturnsQueryParams {
  claimStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export interface ShopifyReturnsQueryResult {
  data: ShopifyReturnItem[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  isLoading: boolean;
  error: ShopifyReturnQueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

// ─── Query Keys ────────────────────────────────────────────────

export const shopifyReturnsQueryRoot = ["shopify", "returns"] as const;

export const shopifyReturnQueries = {
  all: () => shopifyReturnsQueryRoot,
  list: (
    params: Pick<
      ShopifyReturnsQueryParams,
      "claimStatus" | "dateFrom" | "dateTo"
    >,
  ) => [...shopifyReturnsQueryRoot, params] as const,
};

// ─── 에러 파싱 ─────────────────────────────────────────────────

function parseError(error: unknown): ShopifyReturnQueryError {
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

// ─── 반품 통계 타입 ────────────────────────────────────────────

export interface ShopifyReturnStats {
  openCount: number;
  closedCount: number;
  totalCount: number;
  totalRefundedAmount: number;
  currencyCode: string;
}

export interface ShopifyReturnStatsResult {
  stats: ShopifyReturnStats;
  isLoading: boolean;
  error: ShopifyReturnQueryError | null;
  hasApiKey: boolean;
}

// ─── 반품 통계 훅 (반품 목록에서 집계) ────────────────────────

export function useShopifyReturnStats(
  params: { dateFrom?: string; dateTo?: string } = {},
): ShopifyReturnStatsResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");
  const { dateFrom, dateTo } = params;

  const query = useQuery({
    queryKey: [
      ...shopifyReturnsQueryRoot,
      "stats",
      { dateFrom, dateTo },
    ] as const,
    queryFn: async (): Promise<ShopifyReturnStats> => {
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
      const searchParams = new URLSearchParams();
      if (dateFrom) searchParams.set("startDate", dateFrom.replace(/-/g, ""));
      if (dateTo) searchParams.set("endDate", dateTo.replace(/-/g, ""));

      const items = await http.get<ShopifyReturnItem[]>(
        `/api/orders/${encodeURIComponent(channelUuid)}/returns?${searchParams.toString()}`,
      );

      const openCount = items.filter((i) => i.status === "OPEN").length;
      const closedCount = items.filter((i) => i.status !== "OPEN").length;
      const totalRefundedAmount = items.reduce(
        (sum, i) => sum + parseFloat(i.totalRefunded || "0"),
        0,
      );
      const currencyCode = items[0]?.currencyCode ?? "USD";

      return {
        openCount,
        closedCount,
        totalCount: items.length,
        totalRefundedAmount,
        currencyCode,
      };
    },
    enabled: hasKey && !!channelUuid,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const parsed = parseError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  const defaultStats: ShopifyReturnStats = {
    openCount: 0,
    closedCount: 0,
    totalCount: 0,
    totalRefundedAmount: 0,
    currencyCode: "USD",
  };

  return {
    stats: query.data ?? defaultStats,
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseError(query.error) : null,
    hasApiKey: hasKey,
  };
}

// ─── 반품 목록 훅 ──────────────────────────────────────────────

export function useShopifyReturns(
  params: ShopifyReturnsQueryParams = {},
): ShopifyReturnsQueryResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const { claimStatus, dateFrom, dateTo, enabled = true } = params;

  const query = useQuery({
    queryKey: shopifyReturnQueries.list({ claimStatus, dateFrom, dateTo }),
    queryFn: async (): Promise<ShopifyReturnItem[]> => {
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

      const searchParams = new URLSearchParams();
      if (dateFrom) searchParams.set("startDate", dateFrom.replace(/-/g, ""));
      if (dateTo) searchParams.set("endDate", dateTo.replace(/-/g, ""));
      if (claimStatus && claimStatus !== "ALL")
        searchParams.set("claimStatus", claimStatus);

      return http.get<ShopifyReturnItem[]>(
        `/api/orders/${encodeURIComponent(channelUuid)}/returns?${searchParams.toString()}`,
      );
    },
    enabled: hasKey && !!channelUuid && enabled,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: Array.isArray(query.data) ? query.data : [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseError(query.error) : null,
    hasApiKey: hasKey,
    refetch: () => {
      void query.refetch();
    },
  };
}
