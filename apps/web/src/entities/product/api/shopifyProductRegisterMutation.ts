"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";
import type { ShopifyRegisterFormValues } from "../model/shopifyRegisterSchema";

interface ShopifyRegisterProductResponse {
  productId: string;
  title: string;
}

export function useShopifyRegisterProductMutation() {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  return useMutation({
    mutationFn: async (
      values: ShopifyRegisterFormValues,
    ): Promise<ShopifyRegisterProductResponse> => {
      if (!hasKey || !channelUuid)
        throw new Error("Shopify 채널이 연결되지 않았습니다.");

      return http.post<ShopifyRegisterProductResponse>(
        `/api/products/${channelUuid}`,
        values,
      );
    },
    onSuccess: (data) => {
      appToaster.create({
        title: "상품 등록 완료",
        description: `쇼피파이 상품이 등록되었습니다. (${data.title})`,
        type: "success",
      });
      router.push("/products");
    },
    onError: (error) => {
      let message = "상품 등록에 실패했습니다.";
      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        message = data?.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      appToaster.create({
        title: "등록 실패",
        description: message,
        type: "error",
      });
    },
  });
}
