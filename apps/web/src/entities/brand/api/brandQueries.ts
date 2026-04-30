import { queryOptions } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type { Qoo10BrandItem } from "@/shared/api/qoo10/productTypes";
import type { Qoo10ApiResponse } from "@/shared/api/qoo10/types";

export const brandQueries = {
  search: (keyword: string) =>
    queryOptions({
      queryKey: ["qoo10", "brands", keyword] as const,
      queryFn: async (): Promise<Qoo10ApiResponse<Qoo10BrandItem[]>> =>
        http.get<Qoo10ApiResponse<Qoo10BrandItem[]>>(
          `/api/qoo10/brands?keyword=${encodeURIComponent(keyword)}`,
        ),
      enabled: keyword.length >= 2,
      staleTime: 1000 * 60 * 5,
    }),
};
