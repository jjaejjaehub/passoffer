"use client";

import type { UseMutateFunction } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";

import { serializeInventoryOptions } from "@/shared/lib/qoo10OptionSerializer";

import type { InventoryOptionItem } from "../model/types";

type SaveInventoryOptionsResponse = { success: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeChannelId(channelId: string): "qoo10" | "rakuten" {
  if (channelId === "qoo10") return "qoo10";
  if (channelId === "rakuten") return "rakuten";
  return "qoo10";
}

function parseSaveErrorMessage(error: unknown): string {
  if (isAxiosError<unknown>(error)) {
    const data = error.response?.data;
    if (isRecord(data)) {
      const msg =
        typeof data.message === "string"
          ? data.message
          : typeof data.error === "string"
            ? data.error
            : null;
      if (msg && msg.trim().length > 0) return msg;
    }
    return "조합형 옵션 저장에 실패했습니다.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "조합형 옵션 저장에 실패했습니다.";
}

export function useSaveInventoryOptions(
  itemCode: string,
  channelId: string,
): {
  mutate: UseMutateFunction<
    SaveInventoryOptionsResponse,
    unknown,
    InventoryOptionItem[],
    unknown
  >;
  isPending: boolean;
  isError: boolean;
} {
  const queryClient = useQueryClient();
  const trimmedCode = itemCode.trim();
  const normalizedChannelId = normalizeChannelId(channelId);

  const { hasKey: hasQoo10Key } = useChannelApiKey("qoo10");

  const mutation = useMutation<
    SaveInventoryOptionsResponse,
    unknown,
    InventoryOptionItem[]
  >({
    mutationFn: async (
      items: InventoryOptionItem[],
    ): Promise<SaveInventoryOptionsResponse> => {
      if (normalizedChannelId !== "qoo10") {
        throw new Error("지원하지 않는 채널입니다.");
      }
      if (!hasQoo10Key) {
        throw new Error("NO_API_KEY");
      }

      const InventoryInfo = serializeInventoryOptions(items);

      type ApiResponse = SaveInventoryOptionsResponse | { error: string };
      const res = await http.put<ApiResponse>(
        `/api/qoo10/items/${encodeURIComponent(trimmedCode)}/inventory`,
        { channelId: normalizedChannelId, InventoryInfo },
      );
      if (isRecord(res) && "error" in res && typeof res.error === "string") {
        throw new Error(res.error);
      }

      if (isRecord(res) && "success" in res) {
        return res;
      }

      throw new Error("저장 응답 형식이 올바르지 않습니다.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "products",
          "inventory-options",
          normalizedChannelId,
          trimmedCode,
        ],
      });
    },
    onError: (error: unknown) => {
      appToaster.create({
        title: "저장 실패",
        description: parseSaveErrorMessage(error),
        type: "error",
      });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
