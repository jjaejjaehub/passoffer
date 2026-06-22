"use client";

import { useMemo, useState } from "react";
import { Badge, Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { Clock, FileSpreadsheet, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useDispatch,
  useDispatchDelay,
  type OrderListItem,
  type OrderListParams,
} from "@/entities/order";
import { OrderCounter } from "@/widgets/order-counter";
import { OrderFilterPanel } from "@/widgets/order-filter-panel";
import { OrderTableV2 } from "@/widgets/order-table-v2";
import { OrdersAuxPanel } from "@/widgets/orders-aux-panel";
import { OrderDetailModal } from "@/features/order-detail-modal";
import {
  BulkTrackingGridModal,
  ExcelUploadTrackingModal,
} from "@/features/register-tracking";
import { OrderSyncButtons } from "@/features/sync-orders";
import { DispatchDelayModal } from "@/features/dispatch-delay";
import { appToaster } from "@/shared/ui/app-toaster";
import { PageHeader } from "@/shared/ui";
import { useLocalStoragePref } from "@/shared/lib/useLocalStoragePref";
import { DEFAULT_PAGE_SIZE, LS_KEYS, type PageSize } from "@/shared/config";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [gridOpen, setGridOpen] = useState<boolean>(false);
  const [excelOpen, setExcelOpen] = useState<boolean>(false);
  const [dispatchDelayOpen, setDispatchDelayOpen] = useState<boolean>(false);

  const dispatchDelayMutation = useDispatchDelay();

  const { items, total, counts, dispatchSummary, isLoading } =
    useDispatch(params);

  const selectedOrders = useMemo<OrderListItem[]>(
    () => items.filter((o) => selectedIds.has(o.id)),
    [items, selectedIds],
  );

  const openGrid = (): void => {
    if (selectedOrders.length === 0) {
      appToaster.create({
        title: "선택된 주문이 없습니다",
        description: "운송장을 입력할 주문을 먼저 선택하세요",
        type: "warning",
      });
      return;
    }
    setGridOpen(true);
  };

  const openDispatchDelay = (): void => {
    if (selectedOrders.length === 0) {
      appToaster.create({
        title: "선택된 주문이 없습니다",
        description: "발송예정일을 변경할 주문을 먼저 선택하세요",
        type: "warning",
      });
      return;
    }
    setDispatchDelayOpen(true);
  };

  const handleDispatchDelay = async (input: {
    estimatedShippingDate: string;
    delayType: 1 | 2 | 3 | 4;
  }): Promise<void> => {
    const orderIds = selectedOrders.map((o) => o.id);
    const result = await dispatchDelayMutation.mutateAsync({
      orderIds,
      estimatedShippingDate: input.estimatedShippingDate,
      delayType: input.delayType,
    });

    const parts: string[] = [];
    if (result.totalUpdated > 0) parts.push(`성공 ${result.totalUpdated}건`);
    if (result.totalFailed > 0) parts.push(`실패 ${result.totalFailed}건`);
    if (result.skipped > 0) parts.push(`스킵 ${result.skipped}건`);

    appToaster.create({
      title: "발송예정일 변경 완료",
      description: parts.join(" · ") || `${result.totalRequested}건 처리`,
      type: result.totalFailed > 0 ? "warning" : "success",
    });
    setDispatchDelayOpen(false);
    setSelectedIds(new Set());
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
              variant="outline"
              colorScheme="blue"
              onClick={openGrid}
            >
              <Table2 size={14} style={{ marginRight: 6 }} />
              운송장 직접 입력
              {selectedOrders.length > 0 ? ` (${selectedOrders.length})` : ""}
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              onClick={() => setExcelOpen(true)}
            >
              <FileSpreadsheet size={14} style={{ marginRight: 6 }} />
              엑셀 업로드
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorScheme="orange"
              onClick={openDispatchDelay}
            >
              <Clock size={14} style={{ marginRight: 6 }} />
              배송지연
              {selectedOrders.length > 0 ? ` (${selectedOrders.length})` : ""}
            </Button>
            <OrderSyncButtons />
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
                  <Badge key={c.carrier} colorPalette="gray" variant="outline">
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
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </Flex>
      </Flex>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      <BulkTrackingGridModal
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        orders={selectedOrders}
        onCompleted={() => setSelectedIds(new Set())}
      />

      <ExcelUploadTrackingModal
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        candidateOrders={items}
        onCompleted={() => setSelectedIds(new Set())}
      />

      <DispatchDelayModal
        open={dispatchDelayOpen}
        onClose={() => setDispatchDelayOpen(false)}
        orderCount={selectedOrders.length}
        onConfirm={handleDispatchDelay}
      />
    </Box>
  );
}
