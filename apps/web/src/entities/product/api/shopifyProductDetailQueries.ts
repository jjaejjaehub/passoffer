"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey, useChannelUuid } from "@/entities/channel";
import { http } from "@/shared/api";
import { parseShopifyProductError, shopifyProductsQueryRoot } from "./shopifyProductQueries";
import type { ShopifyQueryError } from "./shopifyProductQueries";

// ─── 타입 ─────────────────────────────────────────────────────

export interface ShopifyProductDetail {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string[];
  descriptionHtml: string;
  totalInventory: number;
  imageUrl?: string;
  seo: { title: string | null; description: string | null };
  featuredImage: { url: string; altText: string | null } | null;
  media: {
    nodes: Array<{
      id: string;
      alt: string | null;
      mediaContentType: string;
      preview: { image: { url: string } | null } | null;
    }>;
  };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      sku: string | null;
      price: string;
      compareAtPrice: string | null;
      inventoryQuantity: number;
      inventoryPolicy: string;
      inventoryItem: { id: string; tracked: boolean };
      selectedOptions: Array<{ name: string; value: string }>;
    }>;
  };
  options: Array<{
    id: string;
    name: string;
    optionValues: Array<{ id: string; name: string }>;
  }>;
}

// ─── Query Key ─────────────────────────────────────────────────

export const shopifyProductDetailQueries = {
  detail: (productId: string) =>
    [...shopifyProductsQueryRoot, "detail", productId] as const,
};

// ─── 훅 ───────────────────────────────────────────────────────

export function useShopifyProductDetail(
  productId: string | null | undefined,
): {
  data: ShopifyProductDetail | null;
  isLoading: boolean;
  error: ShopifyQueryError | null;
  refetch: () => void;
} {
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const query = useQuery({
    queryKey: shopifyProductDetailQueries.detail(productId ?? ""),
    queryFn: async (): Promise<ShopifyProductDetail> => {
      const result = await http.get<{ product: ShopifyProductDetail }>(
        `/api/products/${channelUuid}/${encodeURIComponent(productId ?? "")}`,
      );
      return result.product;
    },
    enabled: hasKey && !!channelUuid && !!productId,
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, error) => {
      if (!isAxiosError(error)) return failureCount < 2;
      const status = error.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 2;
    },
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading && hasKey && !!productId,
    error: query.error ? parseShopifyProductError(query.error) : null,
    refetch: () => { void query.refetch(); },
  };
}
