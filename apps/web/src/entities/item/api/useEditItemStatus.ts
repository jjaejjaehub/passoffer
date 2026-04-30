"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import type { Qoo10EditGoodsStatusResponse } from "@/shared/api/qoo10/itemTypes";
import { qoo10ProductsQueryRoot } from "@/shared/config";
import { appToaster } from "@/shared/ui/app-toaster";

import { executeEditItemStatus } from "./editItemStatusRequest";
import type { EditItemStatusVariables } from "./editItemStatusTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEditItemStatusErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (isRecord(data)) {
      const message = data.message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
    return "요청에 실패했습니다.";
  }
  if (error instanceof Error && error.message === "NO_API_KEY") {
    return "Qoo10 API 키가 없습니다.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export type { EditItemStatusVariables } from "./editItemStatusTypes";

export function useEditItemStatus(): {
  mutate: (variables: EditItemStatusVariables) => void;
  mutateAsync: (
    variables: EditItemStatusVariables,
  ) => Promise<Qoo10EditGoodsStatusResponse>;
  isPending: boolean;
  isError: boolean;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Qoo10EditGoodsStatusResponse,
    unknown,
    EditItemStatusVariables
  >({
    mutationFn: async (
      variables: EditItemStatusVariables,
    ): Promise<Qoo10EditGoodsStatusResponse> => {
      return executeEditItemStatus(variables);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qoo10ProductsQueryRoot,
      });
    },
    onError: (error: unknown) => {
      appToaster.create({
        title: "거래상태 변경 실패",
        description: parseEditItemStatusErrorMessage(error),
        type: "error",
      });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
