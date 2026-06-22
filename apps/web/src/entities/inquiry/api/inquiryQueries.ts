"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useChannelApiKey } from "@/entities/channel";
import { http } from "@/shared/api";
import type {
  InquiryFilter,
  InquiryItem,
  InquiryListResult,
} from "../model/types";

interface InquiryApiResponse {
  items: Array<{
    QnaNo: number;
    ItemCode: string;
    ItemTitle: string;
    Question: string;
    Answer: string;
    IsAnswered: string;
    QuestionDate: string;
    AnswerDate: string;
    BuyerNick: string;
  }>;
  totalCount: number;
}

function mapApiItem(raw: InquiryApiResponse["items"][number]): InquiryItem {
  return {
    qnaNo: raw.QnaNo,
    itemCode: raw.ItemCode,
    itemTitle: raw.ItemTitle,
    question: raw.Question,
    answer: raw.Answer,
    isAnswered: raw.IsAnswered === "Y",
    questionDate: raw.QuestionDate,
    answerDate: raw.AnswerDate,
    buyerNick: raw.BuyerNick,
  };
}

export interface InquiryQueryParams {
  page?: number;
  pageSize?: number;
  filter?: InquiryFilter;
}

export const inquiryQueries = {
  all: () => ["qoo10", "inquiry"] as const,
  list: (params: InquiryQueryParams) =>
    [...inquiryQueries.all(), params] as const,
};

export interface InquiryQueryResult {
  items: InquiryItem[];
  totalCount: number;
  isLoading: boolean;
  error: { message: string } | null;
}

export function useQoo10Inquiries(
  params: InquiryQueryParams = {},
): InquiryQueryResult {
  const { hasKey } = useChannelApiKey("qoo10");
  const { page = 1, pageSize = 20, filter = "ALL" } = params;

  const query = useQuery({
    queryKey: inquiryQueries.list({ page, pageSize, filter }),
    queryFn: async (): Promise<InquiryListResult> => {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filter !== "ALL") searchParams.set("answered", filter);

      const res = await http.get<InquiryApiResponse>(
        `/api/qoo10/inquiry?${searchParams.toString()}`,
      );

      return {
        items: res.items.map(mapApiItem),
        totalCount: res.totalCount,
      };
    },
    enabled: hasKey,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const error = query.error
    ? {
        message: isAxiosError<{ message?: string }>(query.error)
          ? (query.error.response?.data?.message ??
            "문의를 불러오는 중 오류가 발생했습니다.")
          : "문의를 불러오는 중 오류가 발생했습니다.",
      }
    : null;

  return {
    items: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    error,
  };
}
