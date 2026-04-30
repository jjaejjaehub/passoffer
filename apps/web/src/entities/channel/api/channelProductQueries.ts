"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";

export interface ChannelProductVariant {
  channelVariantId: string;
  optionCode?: string;
  optionName?: string;
  optionValue?: string;
  price?: string;
  stock?: number;
}

export interface ChannelProductItem {
  channelItemId: string;
  sellerCode?: string;
  title: string;
  price?: string;
  images: string[];
  variants: ChannelProductVariant[];
  linkStatus: "linked" | "unlinked";
  listedProductId?: string;
  masterProductId?: string;
  status?: string;
}

export interface ChannelProductDetail extends ChannelProductItem {
  variantLinks: Array<{
    id: string;
    masterVariantId: string;
    channelVariantId: string;
    channelSellerCode?: string;
  }>;
}

export interface ChannelProductsResult {
  items: ChannelProductItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface LinkChannelProductInput {
  masterProductId: string;
  variantMappings: Array<{
    masterVariantId: string;
    channelVariantId: string;
    overrideSellerCode?: boolean;
  }>;
}

export interface LinkChannelProductResult {
  listedProductId: string;
  linkedVariantCount: number;
  sellerCodeUpdates: Array<{ channelVariantId: string; status: string; error?: string }>;
  stockPushStatus: string;
}

export const channelProductQueryKeys = {
  list: (channelId: string, params: object) => ["channel-products", channelId, "list", params] as const,
  detail: (channelId: string, itemId: string) => ["channel-products", channelId, "detail", itemId] as const,
};

export function useChannelProducts(
  channelId: string,
  opts: { page?: number; pageSize?: number; status?: string; enabled?: boolean } = {},
) {
  const { page = 1, pageSize = 20, status, enabled = true } = opts;

  return useQuery({
    queryKey: channelProductQueryKeys.list(channelId, { page, pageSize, status }),
    queryFn: async (): Promise<ChannelProductsResult> => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (status) params.set("status", status);
      return http.get<ChannelProductsResult>(`/api/channels/${channelId}/products?${params.toString()}`);
    },
    enabled: enabled && !!channelId,
    placeholderData: keepPreviousData,
  });
}

export function useChannelProduct(channelId: string, itemId: string, enabled = true) {
  return useQuery({
    queryKey: channelProductQueryKeys.detail(channelId, itemId),
    queryFn: () =>
      http.get<ChannelProductDetail>(`/api/channels/${channelId}/products/${encodeURIComponent(itemId)}`),
    enabled: enabled && !!channelId && !!itemId,
  });
}

export function useLinkChannelProduct(channelId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LinkChannelProductInput): Promise<LinkChannelProductResult> =>
      http.post<LinkChannelProductResult>(
        `/api/channels/${channelId}/products/${encodeURIComponent(itemId)}/link`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channel-products", channelId] });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}

export function useUnlinkChannelProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listedProductId: string): Promise<void> =>
      http.delete<void>(`/api/listed-products/${listedProductId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channel-products"] });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}
