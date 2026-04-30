import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import type { SimpleOptionData, SimpleOptionItem } from "../model/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSimpleOptionItem(value: unknown): value is SimpleOptionItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.Name === "string" &&
    typeof value.Value === "string" &&
    typeof value.Price === "number" &&
    typeof value.OptionCode === "string"
  );
}

interface SimpleResponse {
  type: "simple" | "none";
  items?: unknown[];
}

function isSimpleResponse(value: unknown): value is SimpleResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type !== "simple" && value.type !== "none") {
    return false;
  }
  if ("items" in value && value.items !== undefined && !Array.isArray(value.items)) {
    return false;
  }
  return true;
}

function parseErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (isRecord(data) && typeof data.message === "string") {
      return data.message;
    }
    return "추가 구성 옵션 정보를 불러오지 못했습니다.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export function useSimpleOptions(
  itemCode: string,
  channelId: "qoo10" | "rakuten",
): {
  data: SimpleOptionData;
  isLoading: boolean;
  error: Error | null;
} {
  // 옵션 조회/수정은 Qoo10 API만 지원하므로 qoo10 키만 사용
  const { hasKey: hasQoo10Key } = useChannelApiKey("qoo10");
  const trimmedCode = itemCode.trim();

  const query = useQuery({
    queryKey: ["products", "simple-options", channelId, trimmedCode],
    enabled:
      channelId === "qoo10" &&
      trimmedCode.length > 0 &&
      hasQoo10Key,
    queryFn: async (): Promise<SimpleOptionData> => {
      const raw = await http.post<unknown>(
        `/api/qoo10/items/${encodeURIComponent(trimmedCode)}/options`,
        {},
      );

      if (!isSimpleResponse(raw)) {
        throw new Error("단일형 옵션 응답 형식이 올바르지 않습니다.");
      }

      if (raw.type === "none") {
        return { type: "none" };
      }

      const items = (raw.items ?? []).filter(isSimpleOptionItem);
      if (items.length === 0) {
        return { type: "none" };
      }

      return { type: "simple", items };
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  return {
    data: query.data ?? { type: "none" },
    isLoading: query.isLoading,
    error: query.error ? new Error(parseErrorMessage(query.error)) : null,
  };
}
