"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { shippingQueries } from "./shippingQueries";
import { paymentsQueries } from "./paymentsQueries";

export interface DispatchDelayInput {
  orderIds: string[];
  estimatedShippingDate: string; // YYYY-MM-DD (JST), 오늘 이후
  delayType: 1 | 2 | 3 | 4;
}

export interface DispatchDelayResultItem {
  orderId: string;
  channelOrderId: string;
  ok: boolean;
  message?: string;
}

export interface DispatchDelayResult {
  totalRequested: number;
  totalUpdated: number;
  totalFailed: number;
  skipped: number;
  results: DispatchDelayResultItem[];
}

/** 발송예정일(EstShipDt) 변경 — 배송지연 액션.
 *  Qoo10: SetSellerCheckYNBulk(EstShipDt + DelayType) — rank 10 → 20 자동 전환.
 *  Shopify: DB shippingDueDate 만 갱신 (push API 없음). */
export function useDispatchDelay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: DispatchDelayInput,
    ): Promise<DispatchDelayResult> => {
      return await http.post<DispatchDelayResult>(
        "/api/shipping/dispatch-delay",
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shippingQueries.all() });
      void queryClient.invalidateQueries({ queryKey: paymentsQueries.all() });
    },
  });
}
