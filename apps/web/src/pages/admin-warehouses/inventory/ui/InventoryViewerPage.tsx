"use client";

import { Box, Flex, HStack, Heading, Text } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  useWarehouseCapabilities,
  useWarehouseInventory,
  warehouseKeys,
} from "@/entities/warehouse";
import {
  type GroupByMode,
  InventoryToolbar,
} from "@/features/warehouse-inventory-toolbar";
import { useDebouncedValue } from "@/shared/lib";
import { EmptyState, LoadingState } from "@/shared/ui";
import {
  InventoryTable,
  WarehouseSelector,
  useSelectedWarehouseId,
} from "@/widgets/admin-warehouses";

export function InventoryViewerPage(): ReactElement {
  const { warehouseId } = useSelectedWarehouseId();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByMode>("lot");
  const debouncedSearch = useDebouncedValue(search, 300);

  const capabilitiesQuery = useWarehouseCapabilities(warehouseId ?? undefined);
  const inventoryQuery = useWarehouseInventory(warehouseId ?? undefined);

  const filteredRows = useMemo(() => {
    const rows = inventoryQuery.data ?? [];
    const term = debouncedSearch.trim().toLowerCase();
    if (term === "") return rows;
    return rows.filter((r) => {
      return (
        r.sku.toLowerCase().includes(term) ||
        (r.vendorSku?.toLowerCase().includes(term) ?? false) ||
        (r.lotCode?.toLowerCase().includes(term) ?? false) ||
        (r.locationCode?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [inventoryQuery.data, debouncedSearch]);

  const handleRefresh = (): void => {
    if (warehouseId !== null) {
      queryClient.invalidateQueries({
        queryKey: warehouseKeys.inventory(warehouseId),
      });
    }
  };

  const capabilities = capabilitiesQuery.data?.capabilities ?? null;
  const lotSupported = capabilities?.supportsLotTracking ?? false;
  const effectiveGroupBy: GroupByMode = lotSupported ? groupBy : "sku";

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">재고 조회</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title="창고를 선택해주세요"
          description="우측 상단에서 창고를 선택하면 재고 목록이 표시됩니다."
        />
      ) : (
        <Box>
          <Text fontSize="sm" color="gray.600" mb={4}>
            창고별로 LOT 단위 재고와 SKU 단위 합계를 조회합니다.
          </Text>

          <InventoryToolbar
            search={search}
            onSearchChange={setSearch}
            groupBy={effectiveGroupBy}
            onGroupByChange={setGroupBy}
            onRefresh={handleRefresh}
            isRefreshing={inventoryQuery.isFetching}
            lotSupported={lotSupported}
          />

          {capabilitiesQuery.isLoading || inventoryQuery.isLoading ? (
            <LoadingState rows={8} />
          ) : capabilitiesQuery.isError ? (
            <EmptyState
              title="창고 정보를 불러오지 못했습니다"
              description="새로고침 후에도 동일하면 관리자에게 문의해 주세요."
            />
          ) : capabilities === null ? (
            <EmptyState title="capability 정보가 없습니다" />
          ) : inventoryQuery.isError ? (
            <EmptyState
              title="재고 데이터를 불러오지 못했습니다"
              description="잠시 후 다시 시도해 주세요."
            />
          ) : (
            <Box>
              <HStack justify="flex-end" mb={2} gap={3}>
                <FreshnessLabel rows={inventoryQuery.data ?? []} />
              </HStack>
              <InventoryTable
                rows={filteredRows}
                capabilities={capabilities}
                groupBy={effectiveGroupBy}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function FreshnessLabel({
  rows,
}: {
  rows: ReadonlyArray<{ fetchedAt: string; freshness: string }>;
}): ReactElement {
  if (rows.length === 0) {
    return (
      <Text fontSize="xs" color="gray.500">
        데이터 없음
      </Text>
    );
  }
  const latest = rows.reduce((acc, r) => (r.fetchedAt > acc ? r.fetchedAt : acc), rows[0].fetchedAt);
  const allFresh = rows.every((r) => r.freshness === "fresh");
  return (
    <Text fontSize="xs" color={allFresh ? "green.700" : "yellow.800"}>
      마지막 동기화: {formatDateTime(latest)}
      {allFresh ? " · 실시간" : " · 일부 지연"}
    </Text>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
