"use client";

import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

import {
  useOrders,
  type OrderListItem,
  type OrderListParams,
} from "@/entities/order";
import { OrderCounter } from "@/widgets/order-counter";
import { OrderFilterPanel } from "@/widgets/order-filter-panel";
import { OrderTableV2 } from "@/widgets/order-table-v2";
import { OrdersAuxPanel } from "@/widgets/orders-aux-panel";
import { OrderDetailModal } from "@/features/order-detail-modal";
import { PageHeader } from "@/shared/ui";
import { useLocalStoragePref } from "@/shared/lib/useLocalStoragePref";
import {
  DEFAULT_PAGE_SIZE,
  LS_KEYS,
  type PageSize,
} from "@/shared/config";

function buildInitialParams(pageSize: PageSize): OrderListParams {
  return {
    page: 1,
    pageSize,
    sortBy: "orderedAt",
    sortDir: "desc",
  };
}

export function OrdersPage(): React.JSX.Element {
  const [pageSize] = useLocalStoragePref<PageSize>(
    LS_KEYS.pageSize,
    DEFAULT_PAGE_SIZE,
  );

  const [params, setParams] = useState<OrderListParams>(() =>
    buildInitialParams(pageSize),
  );
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(
    null,
  );

  const { items, total, counts, isLoading } = useOrders(params);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title="주문 관리"
        description="주문을 조회하고 상태를 변경할 수 있습니다."
        mb={2}
      />

      <Flex gap={3} align="flex-start" flex={1} minH={0}>
        <OrdersAuxPanel />

        <Flex direction="column" gap={3} flex={1} minW={0}>
          <OrderCounter
            counts={counts}
            selectedRanks={params.status ?? []}
            onChange={(ranks) =>
              setParams({
                ...params,
                status: ranks.length ? ranks : undefined,
                page: 1,
              })
            }
          />

          <OrderFilterPanel
            value={params}
            search={searchInput}
            onChange={setParams}
            onSearchChange={setSearchInput}
          />

          <OrderTableV2
            items={items}
            total={total}
            params={params}
            onParamsChange={setParams}
            onRowClick={setSelectedOrder}
            isLoading={isLoading}
          />
        </Flex>
      </Flex>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </Box>
  );
}
