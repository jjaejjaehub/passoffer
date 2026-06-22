"use client";

import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";
import type { ShopeeRegisterFormValues } from "../model/shopeeRegisterSchema";

interface ShopeeRegisterProductResponse {
  productId: string;
  title: string;
}

export function useShopeeRegisterProductMutation() {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopee");
  const channelUuid = useChannelUuid("shopee");

  return useMutation({
    mutationFn: async (
      values: ShopeeRegisterFormValues,
    ): Promise<ShopeeRegisterProductResponse> => {
      if (!hasKey || !channelUuid)
        throw new Error("Shopee 채널이 연결되지 않았습니다.");

      return http.post<ShopeeRegisterProductResponse>(
        `/api/products/${channelUuid}`,
        values,
      );
    },
    onSuccess: (data) => {
      appToaster.create({
        title: "상품 등록 완료",
        description: `쇼피 상품이 등록되었습니다. (ID: ${data.productId})`,
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
