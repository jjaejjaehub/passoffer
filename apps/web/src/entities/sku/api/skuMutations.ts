"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { skusQueryRoot } from "./skuQueries";
import type {
  Sku,
  ListedProductSkuMapping,
  SkuPlayautoFields,
} from "../model/types";

export interface CreateSkuInput extends SkuPlayautoFields {
  code: string;
  name?: string | null;
  stock?: number;
  barcode?: string | null;
  attributes?: Record<string, unknown>;
}

export type UpdateSkuInput = Partial<Omit<CreateSkuInput, "stock">>;

export interface BulkCreateSkuInput {
  items: CreateSkuInput[];
}

export interface BulkCreateSkuResponse {
  items: Sku[];
}

export function useCreateSku() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSkuInput): Promise<Sku> =>
      http.post<Sku>("/api/skus", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useBulkCreateSkus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkCreateSkuInput): Promise<BulkCreateSkuResponse> =>
      http.post<BulkCreateSkuResponse>("/api/skus/bulk", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useUpdateSku(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSkuInput): Promise<Sku> =>
      http.put<Sku>(`/api/skus/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useDeleteSku() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => http.delete<void>(`/api/skus/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useAdjustSkuStock(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { qtyDelta: number; note?: string }) =>
      http.post<{ id: string; prev: number; next: number }>(
        `/api/skus/${id}/adjust-stock`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useAttachSkuToVariant(skuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { masterVariantId: string; qty?: number; position?: number }) =>
      http.post<void>(`/api/skus/${skuId}/master-variants`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

export function useDetachSkuFromVariant(skuId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (masterVariantId: string) =>
      http.delete<void>(`/api/skus/${skuId}/master-variants/${masterVariantId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
    },
  });
}

// ─── 판매상품 ↔ SKU 매핑 (listed_product_skus) ─────────────

export interface ListedProductSkuRow {
  channelVariantId: string;
  channelSellerCode?: string | null;
  skuId: string;
  qty?: number;
}

export function useReplaceListedProductSkus(listedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: ListedProductSkuRow[]) =>
      http.put<ListedProductSkuMapping[]>(
        `/api/listed-products/${listedProductId}/sku-mappings`,
        { rows },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}

export function useAddListedProductSku(listedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ListedProductSkuRow) =>
      http.post<ListedProductSkuMapping>(
        `/api/listed-products/${listedProductId}/sku-mappings`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}

export function useUpdateListedProductSku(listedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mappingId,
      input,
    }: {
      mappingId: string;
      input: { channelSellerCode?: string | null; qty?: number };
    }) =>
      http.put<ListedProductSkuMapping>(
        `/api/listed-products/${listedProductId}/sku-mappings/${mappingId}`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}

export function useRemoveListedProductSku(listedProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mappingId: string) =>
      http.delete<void>(
        `/api/listed-products/${listedProductId}/sku-mappings/${mappingId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: skusQueryRoot });
      void queryClient.invalidateQueries({ queryKey: ["master-products"] });
    },
  });
}
