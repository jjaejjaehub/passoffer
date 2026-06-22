"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  Sku,
  SkuDetail,
  SkusResponse,
  ListedProductSkuMapping,
} from "../model/types";

export const skusQueryRoot = ["skus"] as const;

export const skuQueries = {
  all: () => skusQueryRoot,
  list: (params: { search?: string; page?: number; pageSize?: number }) =>
    [...skusQueryRoot, "list", params] as const,
  detail: (id: string) => [...skusQueryRoot, "detail", id] as const,
  listedMappings: (listedProductId: string) =>
    [...skusQueryRoot, "listed-mappings", listedProductId] as const,
};

export function useSkus(
  opts: {
    search?: string;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
  } = {},
) {
  const { search, page = 1, pageSize = 20, enabled = true } = opts;

  return useQuery({
    queryKey: skuQueries.list({ search, page, pageSize }),
    queryFn: async (): Promise<SkusResponse> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return http.get<SkusResponse>(`/api/skus?${params.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSku(id: string | null) {
  return useQuery({
    queryKey: skuQueries.detail(id ?? ""),
    queryFn: async (): Promise<SkuDetail> => {
      return http.get<SkuDetail>(`/api/skus/${id}`);
    },
    enabled: !!id,
  });
}

export function useListedProductSkuMappings(listedProductId: string | null) {
  return useQuery({
    queryKey: skuQueries.listedMappings(listedProductId ?? ""),
    queryFn: async (): Promise<ListedProductSkuMapping[]> => {
      return http.get<ListedProductSkuMapping[]>(
        `/api/listed-products/${listedProductId}/sku-mappings`,
      );
    },
    enabled: !!listedProductId,
  });
}
