"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Box, Flex, HStack } from "@chakra-ui/react";

import { useAllOrders } from "@/entities/all-orders";
import type {
  OrderListItem,
  OrderListParams,
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

export function AllOrdersPage(): React.JSX.Element {
  const t = useTranslations("pages.allOrders");
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

  const { items, total, counts, allSummary, isLoading } = useAllOrders(params);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={2}
      />

      <Flex gap={3} align="flex-start" flex={1} minH={0}>
        <OrdersAuxPanel />

        <Flex direction="column" gap={3} flex={1} minW={0}>
          <HStack
            gap={3}
            px={3}
            py={2}
            bg="gray.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="gray.200"
            wrap="wrap"
          >
            <Badge colorPalette="blue" variant="solid">
              {t("summary.paymentStage", { count: allSummary.paymentStage })}
            </Badge>
            <Badge colorPalette="purple" variant="solid">
              {t("summary.newOrderStage", { count: allSummary.newOrderStage })}
            </Badge>
            <Badge colorPalette="orange" variant="solid">
              {t("summary.dispatchStage", { count: allSummary.dispatchStage })}
            </Badge>
            <Badge colorPalette="green" variant="solid">
              {t("summary.shippingStage", { count: allSummary.shippingStage })}
            </Badge>
            <Badge colorPalette="gray" variant="solid">
              {t("summary.settledStage", { count: allSummary.settledStage })}
            </Badge>
            <Badge colorPalette="red" variant="solid">
              {t("summary.claimStage", { count: allSummary.claimStage })}
            </Badge>
          </HStack>

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
