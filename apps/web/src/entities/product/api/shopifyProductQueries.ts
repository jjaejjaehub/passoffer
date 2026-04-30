"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Product } from "@oms/types";

// ─── 타입 ──────────────────────────────────────────────────────

export type ShopifyProductItem = Product;

export interface ShopifyPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor?: string;
  startCursor?: string;
}

export type ShopifyQueryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "GRAPHQL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ShopifyQueryError {
  type: ShopifyQueryErrorType;
  message: string;
}

export interface ShopifyProductsQueryParams {
  status?: string;
  page?: string;
  mergeAll?: boolean;
  enabled?: boolean;
}

export interface ShopifyProductsQueryResult {
  data: ShopifyProductItem[];
  pageInfo: ShopifyPageInfo;
  isLoading: boolean;
  error: ShopifyQueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
}

// ─── Query Keys ────────────────────────────────────────────────

export const shopifyProductsQueryRoot = ["shopify", "products"] as const;

export const shopifyProductQueries = {
  all: () => shopifyProductsQueryRoot,
  list: (params: Pick<ShopifyProductsQueryParams, "status" | "page" | "mergeAll">) =>
    [...shopifyProductsQueryRoot, params] as const,
};

// ─── 에러 파싱 ─────────────────────────────────────────────────

export function parseShopifyProductError(error: unknown): ShopifyQueryError {
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

// ─── 훅 ───────────────────────────────────────────────────────

export function useShopifyProducts(
  params: ShopifyProductsQueryParams = {},
): ShopifyProductsQueryResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const { status, page, mergeAll, enabled = true } = params;

  const query = useQuery({
    queryKey: shopifyProductQueries.list({ status, page, mergeAll }),
    queryFn: async (): Promise<Product[]> => {
      if (!channelUuid) {
        throw Object.assign(new Error("NO_API_KEY"), {
          response: {
            data: {
              error: "NO_API_KEY",
              message: "Shopify 채널이 연결되지 않았습니다. 채널 설정에서 등록해 주세요.",
            },
          },
        });
      }

      const searchParams = new URLSearchParams({ channelId: channelUuid });
      if (status && status !== "all") searchParams.set("itemStatus", status);
      if (page) searchParams.set("page", page);
      if (mergeAll) searchParams.set("mergeAll", "true");

      const result = await http.get<
        { items: Product[]; totalItems: number; totalPages: number } | Product[]
      >(`/api/products?${searchParams.toString()}`);

      if (Array.isArray(result)) return result;
      return result.items ?? [];
    },
    enabled: hasKey && !!channelUuid && enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const parsed = parseShopifyProductError(error);
      if (parsed.type === "NO_API_KEY" || parsed.type === "AUTH_ERROR")
        return false;
      return failureCount < 2;
    },
  });

  return {
    data: query.data ?? [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    isLoading: query.isLoading && hasKey,
    error: query.error ? parseShopifyProductError(query.error) : null,
    hasApiKey: hasKey,
    refetch: () => { void query.refetch(); },
  };
}
