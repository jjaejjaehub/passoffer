"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api";
import { qoo10ClaimQueries } from "./qoo10DashboardQueries";

function useQoo10ClaimMutation(endpoint: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packNo: number): Promise<void> => {
      await http.post(endpoint, { packNo });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qoo10ClaimQueries.all() });
    },
  });
}

/** 취소 승인 (claimStatus "1" → SetCancelProcess) */
export function useQoo10CancelProcess() {
  return useQoo10ClaimMutation("/api/qoo10/claim/cancel");
}

/** 반품 승인 (claimStatus "4" → SetClaimAccept) */
export function useQoo10ClaimAccept() {
  return useQoo10ClaimMutation("/api/qoo10/claim/accept");
}

/** 재배송 처리 (claimStatus "11" → SetClaimRedelivery) */
export function useQoo10ClaimRedelivery() {
  return useQoo10ClaimMutation("/api/qoo10/claim/redelivery");
}
