import { queryOptions } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type { Qoo10CategoryItem } from "@/shared/api/qoo10/productTypes";
import type { Qoo10ApiResponse } from "@/shared/api/qoo10/types";

export const categoryQueries = {
  all: () =>
    queryOptions({
      queryKey: ["qoo10", "categories"] as const,
      queryFn: async (): Promise<Qoo10ApiResponse<Qoo10CategoryItem[]>> =>
        http.get<Qoo10ApiResponse<Qoo10CategoryItem[]>>(
          "/api/qoo10/categories",
        ),
      staleTime: 1000 * 60 * 60,
    }),
};
