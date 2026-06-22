"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { giftRulesQueryRoot } from "./giftRuleQueries";
import type {
  GiftDistributeResult,
  GiftRule,
  GiftRuleCreateInput,
  GiftRuleUpdateInput,
} from "../model/types";

export function useCreateGiftRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GiftRuleCreateInput): Promise<GiftRule> =>
      http.post<GiftRule>("/api/gift-rules", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}

export function useUpdateGiftRule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GiftRuleUpdateInput): Promise<void> =>
      http.put<void>(`/api/gift-rules/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}

export function useToggleGiftRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }): Promise<void> =>
      http.patch<void>(`/api/gift-rules/${id}/toggle`, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}

export function useDeleteGiftRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      http.delete<void>(`/api/gift-rules/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}

export function useDeleteManyGiftRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]): Promise<{ deleted: number }> =>
      http.post<{ deleted: number }>("/api/gift-rules/delete-many", { ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}

export function useDistributeGiftsManually() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]): Promise<GiftDistributeResult> =>
      http.post<GiftDistributeResult>("/api/gift-rules/distribute", {
        orderIds,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: giftRulesQueryRoot });
    },
  });
}
