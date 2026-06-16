"use client";

import { useState } from "react";
import { Badge, Box, Flex, HStack, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import {
  useDispatch,
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

const DISPATCH_PRESET_RANKS = [25, 30, 35, 40];

function buildInitialParams(pageSize: PageSize): OrderListParams {
  return {
    page: 1,
    pageSize,
    sortBy: "paidAt",
    sortDir: "desc",
    status: DISPATCH_PRESET_RANKS,
  };
}

export function DispatchPage(): React.JSX.Element {
  const t = useTranslations("pages.dispatch");
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

  const { items, total, counts, dispatchSummary, isLoading } =
    useDispatch(params);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader title={t("title")} description={t("description")} mb={2} />

      <Flex gap={3} align="flex-start" flex={1} minH={0}>
        <OrdersAuxPanel />

        <Flex direction="column" gap={3} flex={1} minW={0}>
          <HStack
            gap={3}
            px={3}
            py={2}
            bg="blue.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="blue.200"
            wrap="wrap"
          >
            <Badge colorPalette="blue" variant="solid">
              {t("summary.ready", { count: dispatchSummary.readyCount })}
            </Badge>
            <Badge colorPalette="purple" variant="solid">
              {t("summary.labelPrinted", {
                count: dispatchSummary.labelPrintedCount,
              })}
            </Badge>
            <Badge colorPalette="orange" variant="subtle">
              {t("summary.holdOrder", {
                count: dispatchSummary.holdOrderCount,
              })}
            </Badge>
            <Badge colorPalette="red" variant="subtle">
              {t("summary.holdDispatch", {
                count: dispatchSummary.holdDispatchCount,
              })}
            </Badge>
            {dispatchSummary.byCarrier.length > 0 && (
              <>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {t("summary.byCarrierLabel")}
                </Text>
                {dispatchSummary.byCarrier.map((c) => (
                  <Badge
                    key={c.carrier}
                    colorPalette="gray"
                    variant="outline"
                  >
                    {c.carrier} {c.count}
                  </Badge>
                ))}
              </>
            )}
          </HStack>

          <OrderCounter
            counts={counts}
            selectedRanks={params.status ?? []}
            onChange={(ranks) =>
              setParams({
                ...params,
                status: ranks.length ? ranks : DISPATCH_PRESET_RANKS,
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
