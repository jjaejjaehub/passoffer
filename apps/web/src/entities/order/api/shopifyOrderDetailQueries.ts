"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import type { Order } from "@oms/types";
import type { ShopifyOrderQueryError } from "./shopifyOrderQueries";
import { parseShopifyOrderError } from "./shopifyOrderQueries";

// ─── 타입 ─────────────────────────────────────────────────────

export type ShopifyOrderDetail = Order;

// ─── Query Keys ────────────────────────────────────────────────

export const shopifyOrderDetailQueryKey = (orderId: string) =>
  ["shopify", "orders", "detail", orderId] as const;

// ─── 훅 ───────────────────────────────────────────────────────

export interface ShopifyOrderDetailResult {
  order: ShopifyOrderDetail | null;
  isLoading: boolean;
  error: ShopifyOrderQueryError | null;
  refetch: () => void;
}

export function useShopifyOrderDetail(
  orderId: string | null,
): ShopifyOrderDetailResult {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const query = useQuery({
    queryKey: shopifyOrderDetailQueryKey(orderId ?? ""),
    queryFn: async (): Promise<Order> => {
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
      return http.get<Order>(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(orderId!)}`,
      );
    },
    enabled: !!orderId && hasKey && !!channelUuid,
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, error) => {
      if (!isAxiosError(error)) return failureCount < 2;
      const status = error.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 2;
    },
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading && !!orderId,
    error: query.error ? parseShopifyOrderError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
