"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";

export interface OrderSettings {
  lookbackDays: number;
  autoMatchSku: boolean;
  dispatchDelayThresholdDays: number;
  bundleKey: string[];
}

export const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  lookbackDays: 30,
  autoMatchSku: true,
  dispatchDelayThresholdDays: 3,
  bundleKey: ["receiverName", "receiverTel", "zipCode"],
};

const orderSettingsKey = ["user-settings", "orders"] as const;

export function useOrderSettings() {
  return useQuery({
    queryKey: orderSettingsKey,
    queryFn: () => http.get<OrderSettings>("/api/user-settings/orders"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrderSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<OrderSettings>,
    ): Promise<OrderSettings> => {
      return await http.put<OrderSettings>("/api/user-settings/orders", patch);
    },
    onSuccess: (next) => {
      qc.setQueryData(orderSettingsKey, next);
    },
  });
}
