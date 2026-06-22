"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { paymentsQueries } from "./paymentsQueries";

export interface ConfirmOrdersInput {
  orderIds: string[];
  estimatedShippingDate: string; // YYYY-MM-DD (JST), 오늘 이후
  delayType?: 1 | 2 | 3 | 4; // 기본 1 (상품준비중)
}

export interface ConfirmOrderResultItem {
  orderId: string;
  channelOrderId: string;
  ok: boolean;
  message?: string;
}

export interface ConfirmOrdersResult {
  totalRequested: number;
  totalConfirmed: number;
  totalFailed: number;
  skipped: number;
  results: ConfirmOrderResultItem[];
}

/** 결제완료(10) → 신규주문(20) 일괄 전환.
 *  Qoo10: SetSellerCheckYNBulk(15772) — 500건씩 청크.
 *  Shopify: API 호출 없이 즉시 rank 전환. */
export function useConfirmOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ConfirmOrdersInput,
    ): Promise<ConfirmOrdersResult> => {
      return await http.post<ConfirmOrdersResult>(
        "/api/payments/confirm",
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentsQueries.all() });
    },
  });
}
