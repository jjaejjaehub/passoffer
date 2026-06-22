"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import type { NotificationEvent, SendNotificationInput } from "../model/types";
import { notificationsQueryRoot } from "./notificationQueries";

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendNotificationInput): Promise<NotificationEvent> =>
      http.post<NotificationEvent>("/api/notifications/send", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryRoot });
    },
  });
}
