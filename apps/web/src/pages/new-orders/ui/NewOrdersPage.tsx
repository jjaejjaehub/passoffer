"use client";

import { useState } from "react";
import { Badge, Box, Flex, HStack, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import {
  useNewOrders,
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

const NEW_ORDERS_PRESET_RANKS = [20];

function buildInitialParams(pageSize: PageSize): OrderListParams {
  return {
    page: 1,
    pageSize,
    sortBy: "orderedAt",
    sortDir: "desc",
    status: NEW_ORDERS_PRESET_RANKS,
  };
}

export function NewOrdersPage(): React.JSX.Element {
  const t = useTranslations("pages.newOrders");
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

  const { items, total, counts, slaSummary, isLoading } = useNewOrders(params);

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
            bg="orange.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
            wrap="wrap"
          >
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              {t("summary.slaLabel", {
                sla: slaSummary.slaHours,
                warn: slaSummary.warnHours,
              })}
            </Text>
            <Badge colorPalette="red" variant="solid">
              {t("summary.overdue", { count: slaSummary.overdueCount })}
            </Badge>
            <Badge colorPalette="orange" variant="solid">
              {t("summary.dueSoon", { count: slaSummary.dueSoonCount })}
            </Badge>
          </HStack>

          <OrderCounter
            counts={counts}
            selectedRanks={params.status ?? []}
            onChange={(ranks) =>
              setParams({
                ...params,
                status: ranks.length ? ranks : NEW_ORDERS_PRESET_RANKS,
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
