"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { matchingRulesQueryRoot } from "./matchingRuleQueries";
import type { MatchRule } from "../model/types";

export interface CreateMatchingRuleInput {
  channelId: string;
  channelItemCode: string;
  channelItemTitle?: string | null;
  optionCode?: string | null;
  optionName?: string | null;
  skuId: string;
  outputQty?: number;
  warehouseId?: string | null;
  priority?: number;
  isActive?: boolean;
  note?: string | null;
}

export type UpdateMatchingRuleInput = Partial<
  Omit<CreateMatchingRuleInput, "channelId" | "channelItemCode">
>;

export function useCreateMatchingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMatchingRuleInput): Promise<MatchRule> =>
      http.post<MatchRule>("/api/matching-rules", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingRulesQueryRoot });
    },
  });
}

export function useUpdateMatchingRule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMatchingRuleInput): Promise<void> =>
      http.put<void>(`/api/matching-rules/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingRulesQueryRoot });
    },
  });
}

export function useToggleMatchingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }): Promise<void> =>
      http.patch<void>(`/api/matching-rules/${id}/toggle`, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingRulesQueryRoot });
    },
  });
}

export function useDeleteMatchingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      http.delete<void>(`/api/matching-rules/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingRulesQueryRoot });
    },
  });
}

export function useDeleteManyMatchingRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]): Promise<{ deleted: number }> =>
      http.post<{ deleted: number }>("/api/matching-rules/delete-many", {
        ids,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchingRulesQueryRoot });
    },
  });
}
