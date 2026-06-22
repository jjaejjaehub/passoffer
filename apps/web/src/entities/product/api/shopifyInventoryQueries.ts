"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";

// ─── API 응답 타입 ─────────────────────────────────────────────

export interface ShopifyInventoryVariant {
  variantId: string;
  variantTitle: string;
  sku: string | null;
  price: string;
  inventoryItemId: string;
  inventoryQuantity: number;
  tracked: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyInventoryProduct {
  productId: string;
  title: string;
  handle: string;
  status: string;
  imageUrl: string;
  variants: ShopifyInventoryVariant[];
}

interface ShopifyInventoryApiResponse {
  items: ShopifyInventoryProduct[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    endCursor?: string;
    startCursor?: string;
  };
}

// ─── 에러 타입 ─────────────────────────────────────────────────

export type ShopifyInventoryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ShopifyInventoryError {
  type: ShopifyInventoryErrorType;
  message: string;
}

// ─── 파라미터/결과 타입 ────────────────────────────────────────

export interface ShopifyInventoryQueryParams {
  pageSize?: number;
  after?: string;
  keyword?: string;
  status?: string;
  enabled?: boolean;
}

export interface ShopifyInventoryQueryResult {
  data: ShopifyInventoryProduct[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    endCursor?: string;
    startCursor?: string;
  };
  isLoading: boolean;
  error: ShopifyInventoryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

// ─── Query Keys ────────────────────────────────────────────────

export const shopifyInventoryQueryRoot = ["shopify", "inventory"] as const;

export const shopifyInventoryQueries = {
  all: () => shopifyInventoryQueryRoot,
  list: (
    params: Pick<
      ShopifyInventoryQueryParams,
      "pageSize" | "after" | "keyword" | "status"
    >,
  ) => [...shopifyInventoryQueryRoot, params] as const,
};

// ─── 에러 파싱 ─────────────────────────────────────────────────

function parseShopifyInventoryError(error: unknown): ShopifyInventoryError {
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

// ─── 재고 목록 훅 ──────────────────────────────────────────────

export function useShopifyInventory(
  params: ShopifyInventoryQueryParams = {},
): ShopifyInventoryQueryResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const { pageSize = 50, after, keyword, status, enabled = true } = params;

  const query = useQuery({
    queryKey: shopifyInventoryQueries.list({
      pageSize,
      after,
      keyword,
      status,
    }),
    queryFn: async (): Promise<ShopifyInventoryApiResponse> => {
      const searchParams = new URLSearchParams({
        channelId: channelUuid!,
        pageSize: String(pageSize),
      });
      if (after) searchParams.set("after", after);
      if (keyword) searchParams.set("keyword", keyword);
      if (status && status !== "all") searchParams.set("status", status);

      return http.get<ShopifyInventoryApiResponse>(
        `/api/inventory?${searchParams.toString()}`,
      );
    },
    enabled: hasKey && !!channelUuid && enabled,
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, error) => {
      const parsed = parseShopifyInventoryError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: query.data?.items ?? [],
    pageInfo: query.data?.pageInfo ?? {
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseShopifyInventoryError(query.error) : null,
    hasApiKey: hasKey,
    refetch: () => {
      void query.refetch();
    },
  };
}
