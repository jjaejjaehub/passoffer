"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";
import { shopifyProductsQueryRoot } from "./shopifyProductQueries";
import { shopifyProductDetailQueries } from "./shopifyProductDetailQueries";

// ─── 상품 삭제 ────────────────────────────────────────────────

export function useShopifyDeleteProduct(channelIdOverride?: string) {
  const queryClient = useQueryClient();
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuidFromCache = useChannelUuid("shopify");
  const channelUuid = channelIdOverride ?? channelUuidFromCache;

  return useMutation({
    mutationFn: async (productId: string): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");
      await http.delete(
        `/api/products/${channelUuid}/${encodeURIComponent(productId)}`,
      );
    },
    onSuccess: () => {
      appToaster.create({ title: "상품이 삭제되었습니다", type: "success" });
      void queryClient.invalidateQueries({ queryKey: shopifyProductsQueryRoot });
    },
    onError: (error) => {
      let message = "상품 삭제에 실패했습니다.";
      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        message = data?.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      appToaster.create({ title: "삭제 실패", description: message, type: "error" });
    },
  });
}

// ─── 상품 상태 변경 (ACTIVE / DRAFT) ─────────────────────────

export function useShopifyUpdateProductStatus(channelIdOverride?: string) {
  const queryClient = useQueryClient();
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuidFromCache = useChannelUuid("shopify");
  const channelUuid = channelIdOverride ?? channelUuidFromCache;

  return useMutation({
    mutationFn: async ({
      productId,
      status,
    }: {
      productId: string;
      status: "ACTIVE" | "DRAFT";
    }): Promise<void> => {
      if (!channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");

      await http.patch(
        `/api/products/${channelUuid}/${encodeURIComponent(productId)}/status`,
        { status },
      );
    },
    onSuccess: (_, { status }) => {
      appToaster.create({
        title:
          status === "ACTIVE" ? "판매로 변경되었습니다" : "판매중지로 변경되었습니다",
        type: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: shopifyProductsQueryRoot,
      });
    },
    onError: (error) => {
      let message = "상태 변경에 실패했습니다.";
      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        message = data?.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      appToaster.create({
        title: "변경 실패",
        description: message,
        type: "error",
      });
    },
  });
}

// ─── 상품 수정 ─────────────────────────────────────────────────

export interface ShopifyUpdateProductInput {
  productId: string;
  title?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  seoTitle?: string;
  seoDescription?: string;
  variants?: Array<{
    id: string;
    price?: string;
    compareAtPrice?: string | null;
    sku?: string;
  }>;
  options?: Array<{
    id: string;
    name: string;
    values: Array<{ id?: string; name: string }>;
  }>;
  variantPriceUpdates?: Array<{
    combination: string;
    price: string;
    compareAtPrice?: string | null;
    sku?: string;
  }>;
}

interface UpdateProductResponse {
  product: {
    id: string;
    title: string;
    handle: string;
    status: string;
    vendor: string;
    productType: string;
    tags: string[];
  };
  variantErrors?: string[];
}

export function useShopifyUpdateProduct() {
  const queryClient = useQueryClient();
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  return useMutation({
    mutationFn: async (
      input: ShopifyUpdateProductInput,
    ): Promise<UpdateProductResponse> => {
      if (!hasKey || !channelUuid) throw new Error("Shopify 채널이 연결되지 않았습니다.");

      return http.put<UpdateProductResponse>(
        `/api/products/${channelUuid}/${encodeURIComponent(input.productId)}`,
        input,
      );
    },
    onSuccess: (data) => {
      const hasVariantErrors = data.variantErrors && data.variantErrors.length > 0;

      appToaster.create({
        title: "상품이 수정되었습니다",
        description: hasVariantErrors
          ? `옵션 일부 수정 실패: ${data.variantErrors?.join(", ")}`
          : undefined,
        type: hasVariantErrors ? "warning" : "success",
      });

      void queryClient.invalidateQueries({ queryKey: shopifyProductsQueryRoot });
      void queryClient.invalidateQueries({
        queryKey: shopifyProductDetailQueries.detail(data.product.id),
      });
    },
    onError: (error) => {
      let message = "상품 수정에 실패했습니다.";
      if (isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        message = data?.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      appToaster.create({
        title: "수정 실패",
        description: message,
        type: "error",
      });
    },
  });
}
