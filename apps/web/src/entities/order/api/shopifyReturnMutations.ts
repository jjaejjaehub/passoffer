"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { shopifyReturnsQueryRoot } from "./shopifyReturnQueries";

// ─── 반품 승인 ─────────────────────────────────────────────────

export function useShopifyApproveReturn() {
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (returnId: string): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.post(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(returnId)}/approve-return`,
        {},
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopifyReturnsQueryRoot });
    },
  });
}

// ─── 반품 거절 ─────────────────────────────────────────────────

export type ReturnDeclineReason =
  | "FINAL_SALE"
  | "NO_RETURN_IN_TIMEFRAME"
  | "OTHER";

export function useShopifyDeclineReturn() {
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      returnId: string;
      declineReason?: ReturnDeclineReason;
    }): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.post(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(params.returnId)}/decline-return`,
        { declineReason: params.declineReason },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopifyReturnsQueryRoot });
    },
  });
}

// ─── 반품 환불 ─────────────────────────────────────────────────

export interface ReturnRefundInput {
  lineItems?: Array<{ returnLineItemId: string; quantity: number }>;
  note?: string;
}

export function useShopifyRefundReturn() {
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: ReturnRefundInput & { returnId: string },
    ): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.post(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(params.returnId)}/refund-return`,
        { lineItems: params.lineItems, note: params.note },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopifyReturnsQueryRoot });
    },
  });
}
