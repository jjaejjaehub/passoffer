"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Text, Badge } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  usePayments,
  useConfirmOrders,
  type OrderListItem,
  type OrderListParams,
} from "@/entities/order";
import { OrderCounter } from "@/widgets/order-counter";
import { OrderFilterPanel } from "@/widgets/order-filter-panel";
import { OrderTableV2 } from "@/widgets/order-table-v2";
import { OrdersAuxPanel } from "@/widgets/orders-aux-panel";
import { OrderDetailModal } from "@/features/order-detail-modal";
import { OrderSyncButtons } from "@/features/sync-orders";
import { ConfirmOrdersModal } from "@/features/confirm-orders";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";
import { useLocalStoragePref } from "@/shared/lib/useLocalStoragePref";
import { DEFAULT_PAGE_SIZE, LS_KEYS, type PageSize } from "@/shared/config";

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { items, total, counts, paymentSummary, isLoading } =
    usePayments(params);
  const confirmMutation = useConfirmOrders();

  const handleConfirm = async (input: {
    estimatedShippingDate: string;
    delayType: 1 | 2 | 3 | 4;
  }): Promise<void> => {
    const orderIds = Array.from(selectedOrderIds);
    if (orderIds.length === 0) return;
    const result = await confirmMutation.mutateAsync({
      orderIds,
      estimatedShippingDate: input.estimatedShippingDate,
      delayType: input.delayType,
    });
    const parts: string[] = [
      `${result.totalConfirmed.toLocaleString()}건 확인`,
    ];
    if (result.totalFailed > 0)
      parts.push(`${result.totalFailed.toLocaleString()}건 실패`);
    if (result.skipped > 0)
      parts.push(`${result.skipped.toLocaleString()}건 스킵`);
    appToaster.create({
      title: parts.join(" / "),
      type: result.totalFailed > 0 ? "warning" : "success",
    });
    setSelectedOrderIds(new Set());
    setConfirmOpen(false);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={2}
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              colorScheme="blue"
              disabled={
                selectedOrderIds.size === 0 || confirmMutation.isPending
              }
              onClick={() => setConfirmOpen(true)}
            >
              <Flex align="center" gap={1.5}>
                <CheckCircle2 size={14} />
                주문확인 ({selectedOrderIds.size.toLocaleString()})
              </Flex>
            </Button>
            <OrderSyncButtons showCollect />
          </HStack>
        }
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
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
          />
        </Flex>
      </Flex>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      <ConfirmOrdersModal
        open={confirmOpen}
        onClose={() => {
          if (!confirmMutation.isPending) setConfirmOpen(false);
        }}
        orderCount={selectedOrderIds.size}
        onConfirm={handleConfirm}
      />
    </Box>
  );
}
