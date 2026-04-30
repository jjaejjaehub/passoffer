"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  MasterProduct,
  MasterProductDetail,
  MasterProductsResponse,
  ListedProduct,
  ListedProductDetail,
  ListedProductsResponse,
} from "../model/types";

export const masterProductsQueryRoot = ["master-products"] as const;

export const masterProductQueries = {
  all: () => masterProductsQueryRoot,
  list: (params: { search?: string; page?: number; pageSize?: number }) =>
    [...masterProductsQueryRoot, "list", params] as const,
  detail: (id: string) => [...masterProductsQueryRoot, "detail", id] as const,
  listedProducts: (params: { channelId?: string; search?: string; page?: number; pageSize?: number }) =>
    [...masterProductsQueryRoot, "listed", params] as const,
  listedProductDetail: (id: string) => [...masterProductsQueryRoot, "listed-detail", id] as const,
};

export function useMasterProducts(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const { search, page = 1, pageSize = 20, enabled = true } = opts;

  return useQuery({
    queryKey: masterProductQueries.list({ search, page, pageSize }),
    queryFn: async (): Promise<MasterProductsResponse> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return http.get<MasterProductsResponse>(`/api/master-products?${params.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useMasterProduct(id: string | null) {
  return useQuery({
    queryKey: masterProductQueries.detail(id ?? ""),
    queryFn: async (): Promise<MasterProductDetail> => {
      return http.get<MasterProductDetail>(`/api/master-products/${id}`);
    },
    enabled: !!id,
  });
}

export function useListedProducts(opts: {
  channelId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const { channelId, search, page = 1, pageSize = 20, enabled = true } = opts;

  return useQuery({
    queryKey: masterProductQueries.listedProducts({ channelId, search, page, pageSize }),
    queryFn: async (): Promise<ListedProductsResponse> => {
      const params = new URLSearchParams();
      if (channelId) params.set("channelId", channelId);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return http.get<ListedProductsResponse>(`/api/listed-products?${params.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useListedProduct(id: string | null) {
  return useQuery({
    queryKey: masterProductQueries.listedProductDetail(id ?? ""),
    queryFn: async (): Promise<ListedProductDetail> => {
      return http.get<ListedProductDetail>(`/api/listed-products/${id}`);
    },
    enabled: !!id,
  });
}
