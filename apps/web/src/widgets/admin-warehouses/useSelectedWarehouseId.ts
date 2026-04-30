"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const QUERY_KEY = "warehouseId";

export function useSelectedWarehouseId(): {
  warehouseId: string | null;
  setWarehouseId: (id: string | null) => void;
} {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  const warehouseId = searchParams?.get(QUERY_KEY) ?? null;

  const setWarehouseId = useCallback(
    (id: string | null): void => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (id === null || id === "") {
        params.delete(QUERY_KEY);
      } else {
        params.set(QUERY_KEY, id);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return { warehouseId, setWarehouseId };
}
