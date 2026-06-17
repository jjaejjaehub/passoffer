"use client";

import { useState } from "react";
import { Box, Flex, HStack, Text, Badge } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import {
  usePayments,
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

const PAYMENTS_PRESET_RANKS = [10];

function buildInitialParams(pageSize: PageSize): OrderListParams {
  return {
    page: 1,
    pageSize,
    sortBy: "paidAt",
    sortDir: "desc",
    status: PAYMENTS_PRESET_RANKS,
  };
}

export function PaymentsPage(): React.JSX.Element {
  const t = useTranslations("pages.payments");
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

  const { items, total, counts, paymentSummary, isLoading } = usePayments(params);

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={2}
        actions={<OrderSyncButtons showCollect />}
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
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              {t("summary.totalAmount")}
            </Text>
            <Text fontSize="sm" fontWeight="bold" color="gray.900">
              {paymentSummary.sumTotal}
            </Text>
            {paymentSummary.byCurrency.map((c) => (
              <Badge key={c.currency} colorPalette="blue" variant="subtle">
                {c.currency} · {c.count}건 · {c.sumTotal}
              </Badge>
            ))}
            {Object.entries(paymentSummary.byPaymentMethod).map(
              ([method, count]) => (
                <Badge key={method} colorPalette="gray" variant="outline">
                  {method}: {count}
                </Badge>
              ),
            )}
          </HStack>

          <OrderCounter
            counts={counts}
            selectedRanks={params.status ?? []}
            onChange={(ranks) =>
              setParams({
                ...params,
                status: ranks.length ? ranks : PAYMENTS_PRESET_RANKS,
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
