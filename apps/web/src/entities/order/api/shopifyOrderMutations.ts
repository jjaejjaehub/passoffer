"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { shopifyOrderDetailQueryKey } from "./shopifyOrderDetailQueries";
import { shopifyOrdersQueryRoot } from "./shopifyOrderQueries";

// ─── 배송 처리 ─────────────────────────────────────────────────

export interface FulfillOrderInput {
  carrierId?: string;
  trackingNumber?: string;
  shipDate?: string;
}

export interface FulfillOrderResult {
  ok: boolean;
}

export function useShopifyFulfillOrder(orderId: string) {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: FulfillOrderInput,
    ): Promise<FulfillOrderResult> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      return http.patch<FulfillOrderResult>(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(orderId)}/shipment`,
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyOrderDetailQueryKey(orderId),
      });
      void queryClient.invalidateQueries({ queryKey: shopifyOrdersQueryRoot });
    },
  });
}

// ─── 일괄 배송 처리 ────────────────────────────────────────────

export interface BulkFulfillResult {
  succeeded: number;
  failed: number;
}

export function useShopifyBulkFulfillOrders() {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      orders: Array<{
        orderId: string;
        carrierId: string;
        trackingNumber: string;
      }>,
    ): Promise<BulkFulfillResult> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      const results = await Promise.allSettled(
        orders.map(({ orderId, carrierId, trackingNumber }) =>
          http.patch(
            `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(orderId)}/shipment`,
            { carrierId, trackingNumber },
          ),
        ),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopifyOrdersQueryRoot });
    },
  });
}

// ─── 주문 취소 ─────────────────────────────────────────────────

export type OrderCancelReason =
  | "CUSTOMER"
  | "FRAUD"
  | "INVENTORY"
  | "DECLINED"
  | "OTHER";

export interface CancelOrderInput {
  reason?: OrderCancelReason;
  packNo?: number;
}

export function useShopifyCancelOrder(orderId: string) {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CancelOrderInput = {}): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.post(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(orderId)}/cancel`,
        input,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyOrderDetailQueryKey(orderId),
      });
      void queryClient.invalidateQueries({ queryKey: shopifyOrdersQueryRoot });
    },
  });
}

// ─── 주문 메모 수정 ────────────────────────────────────────────

export function useShopifyUpdateOrderNote(orderId: string) {
  const channelUuid = useChannelUuid("shopify");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: string): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.patch(
        `/api/orders/${encodeURIComponent(channelUuid)}/${encodeURIComponent(orderId)}/note`,
        { note },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyOrderDetailQueryKey(orderId),
      });
      void queryClient.invalidateQueries({ queryKey: shopifyOrdersQueryRoot });
    },
  });
}
