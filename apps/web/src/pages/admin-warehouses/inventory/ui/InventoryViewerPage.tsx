"use client";

import { Box, Flex, HStack, Heading, Text } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pages.adminWarehousesInventory");
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
        <Heading size="lg">{t("title")}</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title={t("selectWarehouseTitle")}
          description={t("selectWarehouseDescription")}
        />
      ) : (
        <Box>
          <Text fontSize="sm" color="gray.600" mb={4}>
            {t("description")}
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
              title={t("errors.capabilitiesTitle")}
              description={t("errors.capabilitiesDescription")}
            />
          ) : capabilities === null ? (
            <EmptyState title={t("errors.noCapability")} />
          ) : inventoryQuery.isError ? (
            <EmptyState
              title={t("errors.inventoryTitle")}
              description={t("errors.inventoryDescription")}
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
  const t = useTranslations("pages.adminWarehousesInventory");
  if (rows.length === 0) {
    return (
      <Text fontSize="xs" color="gray.500">
        {t("freshness.empty")}
      </Text>
    );
  }
  const latest = rows.reduce(
    (acc, r) => (r.fetchedAt > acc ? r.fetchedAt : acc),
    rows[0].fetchedAt,
  );
  const allFresh = rows.every((r) => r.freshness === "fresh");
  return (
    <Text fontSize="xs" color={allFresh ? "green.700" : "yellow.800"}>
      {t("freshness.lastSync", { time: formatDateTime(latest) })}
      {allFresh ? t("freshness.realtime") : t("freshness.partialDelay")}
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
