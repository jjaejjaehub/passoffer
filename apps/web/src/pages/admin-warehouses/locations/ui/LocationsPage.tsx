"use client";

import { Box, Flex, Grid, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  useWarehouseCapabilities,
  useWarehouseInventory,
  useWarehouseLocations,
} from "@/entities/warehouse";
import { EmptyState, LoadingState } from "@/shared/ui";
import {
  LocationDetailPanel,
  LocationFlatList,
  LocationTree,
  WarehouseSelector,
  findLocation,
  useSelectedWarehouseId,
} from "@/widgets/admin-warehouses";

const EXTERNAL_REASON = "외부 시스템에서만 변경 가능합니다";
const NOT_IMPL_REASON = "서버 라우트 준비 중입니다";

export function LocationsPage(): ReactElement {
  const { warehouseId } = useSelectedWarehouseId();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const capabilitiesQuery = useWarehouseCapabilities(warehouseId ?? undefined);
  const locationsQuery = useWarehouseLocations(warehouseId ?? undefined);
  const inventoryQuery = useWarehouseInventory(warehouseId ?? undefined);

  useEffect(() => {
    setSelectedCode(null);
  }, [warehouseId]);

  const capabilities = capabilitiesQuery.data?.capabilities ?? null;
  const vendor = capabilitiesQuery.data?.vendor ?? null;
  const treeSupported = capabilities?.supportsLocationTree ?? false;
  const isExternal = capabilities ? !capabilities.supportsLocationTree : false;
  const mutationDisabledReason = isExternal ? EXTERNAL_REASON : NOT_IMPL_REASON;

  const locations = locationsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const selectedNode = findLocation(locations, selectedCode);

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">로케이션 관리</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title="창고를 선택해주세요"
          description="우측 상단에서 창고를 선택하면 로케이션 트리가 표시됩니다."
        />
      ) : capabilitiesQuery.isLoading || locationsQuery.isLoading ? (
        <LoadingState rows={8} />
      ) : capabilitiesQuery.isError ? (
        <EmptyState
          title="창고 정보를 불러오지 못했습니다"
          description="새로고침 후에도 동일하면 관리자에게 문의해 주세요."
        />
      ) : capabilities === null || vendor === null ? (
        <EmptyState title="capability 정보가 없습니다" />
      ) : locationsQuery.isError ? (
        <EmptyState
          title="로케이션을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      ) : !treeSupported ? (
        <Grid templateColumns={{ base: "1fr", md: "2fr 3fr" }} gap={6}>
          <Box>
            <LocationFlatList
              nodes={locations}
              inventory={inventory}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
            />
          </Box>
          <Box>
            <LocationDetailPanel
              node={selectedNode}
              inventory={inventory}
              vendor={vendor}
            />
          </Box>
        </Grid>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "2fr 3fr" }} gap={6}>
          <Box>
            <LocationTree
              nodes={locations}
              inventory={inventory}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              mutationDisabled
              mutationDisabledReason={mutationDisabledReason}
            />
          </Box>
          <Box>
            <LocationDetailPanel
              node={selectedNode}
              inventory={inventory}
              vendor={vendor}
            />
          </Box>
        </Grid>
      )}
    </Box>
  );
}
