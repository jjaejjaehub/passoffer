"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { warehouseKeys } from "./warehouseQueries";
import type { WMSVendor, InboundBatch, AdjustmentRequest } from "@oms/types";

export interface CreateWarehouseInput {
  code: string;
  name: string;
  vendor: WMSVendor;
  syncMode?: string;
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWarehouseInput) =>
      http.post<{ id: string }>("/api/warehouses", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.list() });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ ok: boolean }>(`/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.list() });
    },
  });
}

export function useCreateInboundOrder(warehouseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batch: InboundBatch) =>
      http.post<{ id: string; ack: boolean; vendorRef?: string }>(
        `/api/warehouses/${warehouseId}/inbound`,
        batch,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.inbound(warehouseId) });
    },
  });
}

export function useRequestAdjustment(warehouseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: AdjustmentRequest) =>
      http.post<{ status: string; vendorRef?: string }>(
        `/api/warehouses/${warehouseId}/adjustments`,
        req,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseKeys.inventory(warehouseId) });
    },
  });
}
