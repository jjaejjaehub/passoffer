import { queryOptions } from "@tanstack/react-query";

import { http } from "@/shared/api";
import type { Qoo10ShippingTemplate } from "@/shared/api/qoo10/productTypes";
import type { Qoo10ApiResponse } from "@/shared/api/qoo10/types";

export const shippingTemplateQueries = {
  list: () =>
    queryOptions({
      queryKey: ["qoo10", "shipping-templates"] as const,
      queryFn: () =>
        http.get<Qoo10ApiResponse<Qoo10ShippingTemplate[]>>(
          "/api/qoo10/shipping-templates",
        ),
      staleTime: 1000 * 60 * 5,
    }),
};
