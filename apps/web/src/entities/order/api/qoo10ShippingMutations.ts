"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { qoo10OrderQueries } from "./qoo10OrderQueries";

// ─── SetSendingInfo ──────────────────────────────────────────────

interface SetSendingInfoInput {
  orderNo: string;
  shippingCorp: string;
  trackingNo: string;
}

/** 발송 처리 — ShippingBasic.SetSendingInfo */
export function useQoo10SetSendingInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetSendingInfoInput): Promise<void> => {
      await http.post("/api/qoo10/shipping/send", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qoo10OrderQueries.all() });
    },
  });
}

// ─── SetSellerCheckYN_V2 ─────────────────────────────────────────

interface SetSellerCheckInput {
  orderNo: string;
  estShipDt?: string; // 발송예정일 yyyyMMdd
  delayType?: "1" | "2" | "3" | "4"; // 1:상품준비중 2:주문제작 3:고객요청 4:기타
  delayMemo?: string;
}

/** 발송예정일 입력 / 배송준비 상태 변경 — ShippingBasic.SetSellerCheckYN_V2 */
export function useQoo10SetSellerCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetSellerCheckInput): Promise<void> => {
      await http.post("/api/qoo10/shipping/seller-check", input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qoo10OrderQueries.all() });
    },
  });
}
