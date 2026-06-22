"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { masterProductsQueryRoot } from "./masterProductQueries";
import type {
  MasterProduct,
  MasterProductOptionGroup,
  MasterProductVariant,
} from "../model/types";

export interface CreateMasterProductInput {
  code: string;
  title: string;
  brand?: string;
  hsCode?: string;
  countryOfOrigin?: string;
  material?: string;
  weightG?: number;
  retailPrice?: string;
  descriptionHtml?: string;
  images?: Array<{ url: string; altText?: string; order?: number }>;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

export interface UpdateMasterProductInput
  extends Partial<CreateMasterProductInput> {}

export interface VariantOptionValueInput {
  groupName: string;
  value: string;
}

export interface AddVariantInput {
  sku: string;
  optionValues?: VariantOptionValueInput[];
  price?: string;
  stock: number;
  extraAttributes?: Record<string, unknown>;
}

export interface UpdateVariantInput extends Partial<AddVariantInput> {}

export interface SetOptionGroupsInput {
  groups: Array<{ name: string; values: string[] }>;
}

export function useSetOptionGroups(masterProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input: SetOptionGroupsInput,
    ): Promise<MasterProductOptionGroup[]> =>
      http.put<MasterProductOptionGroup[]>(
        `/api/master-products/${masterProductId}/option-groups`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useCreateMasterProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMasterProductInput): Promise<MasterProduct> =>
      http.post<MasterProduct>("/api/master-products", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export interface UpdateMasterProductResult extends MasterProduct {
  linkedCount: number;
}

export function useUpdateMasterProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input: UpdateMasterProductInput,
    ): Promise<UpdateMasterProductResult> =>
      http.put<UpdateMasterProductResult>(`/api/master-products/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useSyncListedProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      listedProductId: string,
    ): Promise<{ syncStatus: string; lastSyncedAt: string }> =>
      http.post<{ syncStatus: string; lastSyncedAt: string }>(
        `/api/listed-products/${listedProductId}/sync-info`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export interface ChannelCheckDiff {
  field: string;
  channelValue: unknown;
  dbValue: unknown;
}

export interface ChannelCheckResult {
  status:
    | "IN_SYNC"
    | "OUT_OF_SYNC"
    | "CHANNEL_DELETED"
    | "NO_ITEM_CODE"
    | "UNSUPPORTED";
  message?: string;
  diffs?: ChannelCheckDiff[];
  channelProduct?: unknown;
}

export function useCheckListedProductFromChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listedProductId: string): Promise<ChannelCheckResult> =>
      http.post<ChannelCheckResult>(
        `/api/listed-products/${listedProductId}/check-channel`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export interface PullSalesDeduction {
  sku: string;
  soldQty: number;
  prevStock: number;
  newStock: number;
}

export interface PullSalesResult {
  status: "OK" | "NO_MASTER" | "NO_ITEM_CODE" | "NO_VARIANTS" | "UNSUPPORTED";
  message?: string;
  window?: { from: string; to: string };
  processedOrderCount?: number;
  deductions?: PullSalesDeduction[];
}

export function usePullSalesFromChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listedProductId: string): Promise<PullSalesResult> =>
      http.post<PullSalesResult>(
        `/api/listed-products/${listedProductId}/pull-sales`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function usePullSalesFromAllChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (masterProductId: string) =>
      http.post<{
        status: string;
        results: Array<{
          listedProductId: string;
          status: string;
          deductions?: unknown;
        }>;
      }>(`/api/master-products/${masterProductId}/pull-sales`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function usePushMasterStockToAllChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (masterProductId: string) =>
      http.post<{
        status: string;
        results: Array<{ listedProductId: string; status: string }>;
      }>(`/api/master-products/${masterProductId}/push-stock`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function usePushStockToChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listedProductId: string) =>
      http.post<{
        status: string;
        updates?: Array<{
          channelVariantId: string;
          stock: number;
          status: string;
        }>;
      }>(`/api/listed-products/${listedProductId}/push-stock`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useSyncProductInfoToChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listedProductId: string) =>
      http.post<{ status: string; channelItemId?: string }>(
        `/api/listed-products/${listedProductId}/sync-info`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useDeleteMasterProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      http.delete<void>(`/api/master-products/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useAddVariant(masterProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddVariantInput): Promise<MasterProductVariant> =>
      http.post<MasterProductVariant>(
        `/api/master-products/${masterProductId}/variants`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useUpdateVariant(masterProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      variantId,
      input,
    }: {
      variantId: string;
      input: UpdateVariantInput;
    }): Promise<MasterProductVariant> =>
      http.put<MasterProductVariant>(
        `/api/master-products/${masterProductId}/variants/${variantId}`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useDeleteVariant(masterProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variantId: string): Promise<void> =>
      http.delete<void>(
        `/api/master-products/${masterProductId}/variants/${variantId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}

export function useListToChannel(masterProductId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      channelId: string;
      overrides?: Record<string, unknown>;
    }): Promise<void> =>
      http.post<void>(`/api/master-products/${masterProductId}/list`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    },
  });
}
