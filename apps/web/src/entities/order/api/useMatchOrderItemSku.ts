"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { ordersQueries } from "./ordersQueries";
import { dispatchQueries } from "./dispatchQueries";

export interface MatchOrderItemSkuInput {
  orderId: string;
  itemId: string;
  skuId: string | null;
  outputQty?: number;
}

export interface MatchOrderItemSkuResult {
  ok: true;
  orderId: string;
  itemId: string;
  autoMatched: boolean;
}

export function useMatchOrderItemSku() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: MatchOrderItemSkuInput,
    ): Promise<MatchOrderItemSkuResult> => {
      const { orderId, itemId, skuId, outputQty } = input;
      return await http.patch<MatchOrderItemSkuResult>(
        `/api/orders/${orderId}/items/${itemId}/sku`,
        { skuId, outputQty },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueries.all() });
      void queryClient.invalidateQueries({ queryKey: dispatchQueries.all() });
    },
  });
}
