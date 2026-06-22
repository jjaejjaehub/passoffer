"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";

import type { EditGoodsImageRequest, EditGoodsResponse } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseErrorMessage(error: unknown): string {
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

async function editGoodsImage(
  params: EditGoodsImageRequest,
): Promise<EditGoodsResponse> {
  const response = await http.post<EditGoodsResponse>(
    "/api/qoo10/items/edit-image",
    {
      ItemCode: params.itemCode,
      SellerCode: params.sellerCode,
      StandardImage: params.standardImage,
      VideoURL: params.videoURL,
    },
  );

  if (response.ResultCode !== 0) {
    throw new Error(
      response.ResultMsg.trim().length > 0
        ? response.ResultMsg
        : "대표 이미지 수정에 실패했습니다.",
    );
  }

  return response;
}

export function useEditGoodsImage(): {
  mutateAsync: (params: EditGoodsImageRequest) => Promise<EditGoodsResponse>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    EditGoodsResponse,
    unknown,
    EditGoodsImageRequest
  >({
    mutationFn: async (
      params: EditGoodsImageRequest,
    ): Promise<EditGoodsResponse> => {
      return editGoodsImage(params);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [
          "products",
          "detail",
          variables.itemCode,
          variables.sellerCode ?? "",
        ],
      });
    },
    onError: (error: unknown) => {
      appToaster.create({
        title: "대표 이미지 저장 실패",
        description: parseErrorMessage(error),
        type: "error",
      });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
