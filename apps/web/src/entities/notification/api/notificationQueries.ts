"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type { NotificationEvent } from "../model/types";

export const notificationsQueryRoot = ["notifications"] as const;

export const notificationQueries = {
  all: () => notificationsQueryRoot,
  byOrder: (orderId: string) =>
    [...notificationsQueryRoot, "order", orderId] as const,
  byUser: (limit: number) =>
    [...notificationsQueryRoot, "user", limit] as const,
};

interface NotificationListResponse {
  items: NotificationEvent[];
}

export function useOrderNotifications(orderId: string | null) {
  return useQuery({
    queryKey: notificationQueries.byOrder(orderId ?? ""),
    queryFn: async (): Promise<NotificationListResponse> =>
      http.get<NotificationListResponse>(
        `/api/notifications?orderId=${orderId}`,
      ),
    enabled: !!orderId,
  });
}

export function useUserNotifications(limit = 100) {
  return useQuery({
    queryKey: notificationQueries.byUser(limit),
    queryFn: async (): Promise<NotificationListResponse> =>
      http.get<NotificationListResponse>(
        `/api/notifications?limit=${limit}`,
      ),
  });
}
