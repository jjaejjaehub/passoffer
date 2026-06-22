"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { ordersQueries } from "./ordersQueries";
import { dispatchQueries } from "./dispatchQueries";

export interface BulkMatchOrderItemSkuItem {
  orderId: string;
  itemId: string;
  skuId: string | null;
  outputQty?: number;
}

export interface BulkMatchOrderItemSkuInput {
  items: BulkMatchOrderItemSkuItem[];
}

export interface BulkMatchOrderItemSkuResult {
  ok: number;
  failed: Array<{ itemId: string; reason: string }>;
  totalRequested: number;
}

export function useBulkMatchOrderItemSku() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BulkMatchOrderItemSkuInput,
    ): Promise<BulkMatchOrderItemSkuResult> => {
      return await http.post<BulkMatchOrderItemSkuResult>(
        "/api/orders/items/bulk-sku",
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueries.all() });
      void queryClient.invalidateQueries({ queryKey: dispatchQueries.all() });
    },
  });
}
