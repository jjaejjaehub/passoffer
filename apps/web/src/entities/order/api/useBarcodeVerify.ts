"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { dispatchQueries } from "./dispatchQueries";
import { shippingQueries } from "./shippingQueries";
import { ordersQueries } from "./ordersQueries";

export interface BarcodeVerifyInput {
  scannedCode: string;
  expectedOrderId?: string;
}

export type BarcodeVerifyReason =
  | "not_found"
  | "ineligible_status"
  | "expected_mismatch"
  | "multiple_matches";

export interface BarcodeVerifyOrderSummary {
  id: string;
  channelId: string;
  channelOrderId: string;
  fromFulfillment: number;
  toFulfillment: 50;
  trackingCarrier: string | null;
  trackingNo: string | null;
  buyerName: string | null;
  receiverName: string | null;
}

export interface BarcodeVerifyResult {
  matched: boolean;
  reason?: BarcodeVerifyReason;
  order?: BarcodeVerifyOrderSummary;
}

/** 바코드 스캔 → 주문 매칭 → fulfillmentStatus 50(출고완료) 전환.
 *  매칭 키: trackingNo 또는 channelOrderId. ELIGIBLE rank: 30/35/40. */
export function useBarcodeVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BarcodeVerifyInput,
    ): Promise<BarcodeVerifyResult> => {
      return await http.post<BarcodeVerifyResult>(
        "/api/barcode-dispatch/verify",
        input,
      );
    },
    onSuccess: (result) => {
      if (result.matched) {
        void queryClient.invalidateQueries({ queryKey: dispatchQueries.all() });
        void queryClient.invalidateQueries({ queryKey: shippingQueries.all() });
        void queryClient.invalidateQueries({ queryKey: ordersQueries.all() });
      }
    },
  });
}
