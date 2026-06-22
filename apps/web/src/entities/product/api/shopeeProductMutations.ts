"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";

export function getShopeeErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? "알 수 없는 오류";
  }
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

export function useShopeeUnlistItem() {
  const { hasKey } = useChannelApiKey("shopee");
  const channelUuid = useChannelUuid("shopee");

  return useMutation({
    mutationFn: async ({
      itemId,
      unlist,
    }: {
      itemId: number;
      unlist: boolean;
    }) => {
      if (!hasKey || !channelUuid)
        throw new Error("Shopee 채널이 연결되지 않았습니다.");
      return http.post<{ success: boolean }>(
        `/api/products/${channelUuid}/${encodeURIComponent(String(itemId))}/unlist`,
        { unlist },
      );
    },
  });
}

export function useShopeeDeleteItem() {
  const { hasKey } = useChannelApiKey("shopee");
  const channelUuid = useChannelUuid("shopee");

  return useMutation({
    mutationFn: async (itemId: number) => {
      if (!hasKey || !channelUuid)
        throw new Error("Shopee 채널이 연결되지 않았습니다.");
      return http.delete<{ deletedProductId: string | null }>(
        `/api/products/${channelUuid}/${encodeURIComponent(String(itemId))}`,
      );
    },
  });
}
