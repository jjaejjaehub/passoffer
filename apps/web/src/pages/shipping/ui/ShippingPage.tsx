"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Box, Flex, HStack, Text } from "@chakra-ui/react";

import {
  useShipping,
  type OrderListItem,
  type OrderListParams,
} from "@/entities/order";
import { OrderCounter } from "@/widgets/order-counter";
import { OrderFilterPanel } from "@/widgets/order-filter-panel";
import { OrderTableV2 } from "@/widgets/order-table-v2";
import { OrdersAuxPanel } from "@/widgets/orders-aux-panel";
import { OrderDetailModal } from "@/features/order-detail-modal";
import { OrderSyncButtons } from "@/features/sync-orders";
import { PageHeader } from "@/shared/ui";
import { useLocalStoragePref } from "@/shared/lib/useLocalStoragePref";
import {
  DEFAULT_PAGE_SIZE,
  LS_KEYS,
  type PageSize,
} from "@/shared/config";

const SHIPPING_PRESET_RANKS = [50, 60, 70];

function buildInitialParams(pageSize: PageSize): OrderListParams {
  return {
    page: 1,
    pageSize,
    sortBy: "shippedAt",
    sortDir: "desc",
    status: SHIPPING_PRESET_RANKS,
  };
}

export function ShippingPage(): React.JSX.Element {
  const t = useTranslations("pages.shipping");
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

  const { items, total, counts, shippingSummary, isLoading } =
    useShipping(params);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={2}
        actions={<OrderSyncButtons />}
      />

      <Flex gap={3} align="flex-start" flex={1} minH={0}>
        <OrdersAuxPanel />

        <Flex direction="column" gap={3} flex={1} minW={0}>
          <HStack
            gap={3}
            px={3}
            py={2}
            bg="green.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="green.200"
            wrap="wrap"
          >
            <Badge colorPalette="cyan" variant="solid">
              {t("summary.shipped", { count: shippingSummary.shippedCount })}
            </Badge>
            <Badge colorPalette="teal" variant="solid">
              {t("summary.inTransit", {
                count: shippingSummary.inTransitCount,
              })}
            </Badge>
            <Badge colorPalette="green" variant="solid">
              {t("summary.delivered", {
                count: shippingSummary.deliveredCount,
              })}
            </Badge>
            <Badge colorPalette="green" variant="subtle">
              {t("summary.deliveredRate", {
                rate: shippingSummary.deliveredRate,
              })}
            </Badge>
            {shippingSummary.byCarrier.length > 0 && (
              <>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {t("summary.byCarrierLabel")}
                </Text>
                {shippingSummary.byCarrier.map((c) => (
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
                status: ranks.length ? ranks : SHIPPING_PRESET_RANKS,
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
