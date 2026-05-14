"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  OrderPickContext,
  PickOrderItemsRequest,
  PickOrderItemsResult,
} from "../model/types";

export const orderPickKeys = {
  all: ["order-pick"] as const,
  byChannelOrder: (channelOrderId: string) =>
    [...orderPickKeys.all, "by-channel-order", channelOrderId] as const,
};

export function useOrderPickContext(channelOrderId: string | null) {
  return useQuery({
    queryKey: orderPickKeys.byChannelOrder(channelOrderId ?? ""),
    queryFn: () =>
      http.get<OrderPickContext>(
        `/api/orders/by-channel-order/${encodeURIComponent(channelOrderId!)}/items`,
      ),
    enabled: !!channelOrderId,
    staleTime: 0,
  });
}

export function usePickOrderItems(
  orderId: string | null,
  channelOrderId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PickOrderItemsRequest) =>
      http.post<PickOrderItemsResult>(`/api/orders/${orderId}/pick`, body),
    onSuccess: () => {
      if (channelOrderId) {
        void queryClient.invalidateQueries({
          queryKey: orderPickKeys.byChannelOrder(channelOrderId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["qoo10-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["shopify-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["rakuten-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["shopee-orders"] });
    },
  });
}
