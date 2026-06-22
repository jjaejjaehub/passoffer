"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type {
  WMSVendor,
  WMSCapabilities,
  SyncMode,
  ConnectionHealth,
  InventoryRow,
  LocationNode,
  HistoryEvent,
} from "@oms/types";

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  vendor: WMSVendor;
  syncMode: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  capabilitiesJson: WMSCapabilities;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboundOrderRecord {
  id: string;
  warehouseId: string;
  status: "pending_dispatch" | "instructed" | "received" | "canceled";
  vendorRef: string | null;
  expectedAt: string | null;
  itemsJson: unknown[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseCapabilities {
  vendor: WMSVendor;
  syncMode: SyncMode;
  capabilities: WMSCapabilities;
}

export const warehouseKeys = {
  all: ["warehouses"] as const,
  list: () => [...warehouseKeys.all, "list"] as const,
  detail: (id: string) => [...warehouseKeys.all, id] as const,
  health: (id: string) => [...warehouseKeys.all, id, "health"] as const,
  capabilities: (id: string) =>
    [...warehouseKeys.all, id, "capabilities"] as const,
  inventory: (id: string, filter?: Record<string, string>) =>
    [...warehouseKeys.all, id, "inventory", filter] as const,
  locations: (id: string) => [...warehouseKeys.all, id, "locations"] as const,
  inbound: (id: string) => [...warehouseKeys.all, id, "inbound"] as const,
  history: (id: string, range: { startDate: string; endDate: string }) =>
    [...warehouseKeys.all, id, "history", range] as const,
};

export function useWarehouses() {
  return useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: () => http.get<WarehouseRecord[]>("/api/warehouses"),
  });
}

export function useWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.detail(id!),
    queryFn: () => http.get<WarehouseRecord>(`/api/warehouses/${id}`),
    enabled: !!id,
  });
}

export function useWarehouseHealth(id: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.health(id!),
    queryFn: () => http.get<ConnectionHealth>(`/api/warehouses/${id}/health`),
    enabled: !!id,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useWarehouseCapabilities(id: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.capabilities(id!),
    queryFn: () =>
      http.get<WarehouseCapabilities>(`/api/warehouses/${id}/capabilities`),
    enabled: !!id,
  });
}

export function useWarehouseInventory(
  id: string | undefined,
  filter?: { sku?: string; locationId?: string; masterProductId?: string },
) {
  return useQuery({
    queryKey: warehouseKeys.inventory(id!, filter),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter?.sku) params.set("sku", filter.sku);
      if (filter?.locationId) params.set("locationId", filter.locationId);
      if (filter?.masterProductId)
        params.set("masterProductId", filter.masterProductId);
      const qs = params.toString();
      return http.get<InventoryRow[]>(
        `/api/warehouses/${id}/inventory${qs ? `?${qs}` : ""}`,
      );
    },
    enabled: !!id,
  });
}

export function useWarehouseLocations(id: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.locations(id!),
    queryFn: () => http.get<LocationNode[]>(`/api/warehouses/${id}/locations`),
    enabled: !!id,
  });
}

export function useInboundOrders(warehouseId: string | undefined) {
  return useQuery({
    queryKey: warehouseKeys.inbound(warehouseId!),
    queryFn: () =>
      http.get<InboundOrderRecord[]>(`/api/warehouses/${warehouseId}/inbound`),
    enabled: !!warehouseId,
  });
}

export function useWarehouseHistory(
  id: string | undefined,
  range: { startDate: string; endDate: string } | undefined,
) {
  return useQuery({
    queryKey: warehouseKeys.history(id!, range!),
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: range!.startDate,
        endDate: range!.endDate,
      });
      return http.get<HistoryEvent[]>(
        `/api/warehouses/${id}/history?${params}`,
      );
    },
    enabled: !!id && !!range,
  });
}
