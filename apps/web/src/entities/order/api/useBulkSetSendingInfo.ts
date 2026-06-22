"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { shippingQueries } from "./shippingQueries";
import { dispatchQueries } from "./dispatchQueries";

export interface BulkSetSendingInfoItem {
  orderId: string;
  shippingCorp: string;
  trackingNo: string;
}

export interface BulkSetSendingInfoInput {
  items: BulkSetSendingInfoItem[];
}

export interface BulkSetSendingInfoResultItem {
  orderId: string;
  channelOrderId: string;
  ok: boolean;
  message?: string;
}

export interface BulkSetSendingInfoResult {
  totalRequested: number;
  totalSent: number;
  totalFailed: number;
  skipped: number;
  results: BulkSetSendingInfoResultItem[];
}

export function useBulkSetSendingInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BulkSetSendingInfoInput,
    ): Promise<BulkSetSendingInfoResult> => {
      return await http.post<BulkSetSendingInfoResult>(
        "/api/shipping/send-bulk",
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shippingQueries.all() });
      void queryClient.invalidateQueries({ queryKey: dispatchQueries.all() });
    },
  });
}
