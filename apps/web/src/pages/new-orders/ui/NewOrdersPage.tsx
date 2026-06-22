"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import { ChevronDown, Clock, PackageCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useNewOrders,
  useDispatchOrders,
  useDispatchDelay,
  useCopyOrder,
  useDeleteOrders,
  type OrderListItem,
  type OrderListParams,
} from "@/entities/order";
import { OrderCounter } from "@/widgets/order-counter";
import { OrderFilterPanel } from "@/widgets/order-filter-panel";
import { OrderTableV2 } from "@/widgets/order-table-v2";
import { OrdersAuxPanel } from "@/widgets/orders-aux-panel";
import { OrderDetailModal } from "@/features/order-detail-modal";
import { OrderSyncButtons } from "@/features/sync-orders";
import {
  SplitOrderModal,
  BundleOrdersModal,
} from "@/features/new-orders-actions";
import { DispatchDelayModal } from "@/features/dispatch-delay";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";
import { useLocalStoragePref } from "@/shared/lib/useLocalStoragePref";
import { DEFAULT_PAGE_SIZE, LS_KEYS, type PageSize } from "@/shared/config";

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [splitOpen, setSplitOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [dispatchDelayOpen, setDispatchDelayOpen] = useState<boolean>(false);

  const { items, total, counts, slaSummary, isLoading } = useNewOrders(params);

  const selectedOrders = useMemo(
    () => items.filter((o) => selectedOrderIds.has(o.id)),
    [items, selectedOrderIds],
  );
  const selectedCount = selectedOrderIds.size;

  const dispatchMut = useDispatchOrders();
  const dispatchDelayMutation = useDispatchDelay();
  const copyMut = useCopyOrder();
  const deleteMut = useDeleteOrders();

  const handleDispatch = async () => {
    if (selectedCount === 0) return;
    try {
      const res = await dispatchMut.mutateAsync({
        orderIds: Array.from(selectedOrderIds),
      });
      appToaster.create({
        title: "출고지시 완료",
        description: `${res.totalDispatched}건 출고대기로 전환, ${res.skipped}건 스킵`,
        type: res.totalDispatched > 0 ? "success" : "warning",
      });
      setSelectedOrderIds(new Set());
    } catch (err) {
      appToaster.create({
        title: "출고지시 실패",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const handleCopy = async () => {
    if (selectedCount !== 1) {
      appToaster.create({
        title: "복사는 1건만 가능합니다",
        type: "warning",
      });
      return;
    }
    try {
      const id = Array.from(selectedOrderIds)[0];
      await copyMut.mutateAsync({ orderId: id });
      appToaster.create({ title: "주문 복사 완료", type: "success" });
      setSelectedOrderIds(new Set());
    } catch (err) {
      appToaster.create({
        title: "주문 복사 실패",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const openDispatchDelay = (): void => {
    if (selectedCount === 0) {
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
    const orderIds = Array.from(selectedOrderIds);
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
    setSelectedOrderIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedCount === 0) return;
    if (
      !window.confirm(
        `선택한 ${selectedCount}건의 주문을 삭제합니다. 채널에는 영향이 없으며 우리 DB에서만 제거됩니다. 계속하시겠습니까?`,
      )
    )
      return;
    try {
      const res = await deleteMut.mutateAsync({
        orderIds: Array.from(selectedOrderIds),
      });
      appToaster.create({
        title: "주문 삭제 완료",
        description: `${res.totalDeleted}건 삭제, ${res.skipped}건 스킵`,
        type: res.totalDeleted > 0 ? "success" : "warning",
      });
      setSelectedOrderIds(new Set());
    } catch (err) {
      appToaster.create({
        title: "주문 삭제 실패",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
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
              disabled={selectedCount === 0 || dispatchMut.isPending}
              onClick={handleDispatch}
            >
              <PackageCheck size={16} style={{ marginRight: 6 }} />
              출고지시 ({selectedCount})
            </Button>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedCount === 0}
                >
                  작업 <ChevronDown size={14} style={{ marginLeft: 4 }} />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="copy" onClick={handleCopy}>
                      복사 (1건만)
                    </Menu.Item>
                    <Menu.Item
                      value="split"
                      onClick={() => {
                        if (selectedCount !== 1) {
                          appToaster.create({
                            title: "분할은 1건만 가능합니다",
                            type: "warning",
                          });
                          return;
                        }
                        setSplitOpen(true);
                      }}
                    >
                      분할
                    </Menu.Item>
                    <Menu.Item
                      value="bundle"
                      onClick={() => {
                        if (selectedCount < 2) {
                          appToaster.create({
                            title: "합포장은 2건 이상 선택해야 합니다",
                            type: "warning",
                          });
                          return;
                        }
                        setBundleOpen(true);
                      }}
                    >
                      합포장
                    </Menu.Item>
                    <Menu.Item
                      value="dispatchDelay"
                      onClick={openDispatchDelay}
                    >
                      <Clock size={14} style={{ marginRight: 6 }} />
                      배송지연
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item
                      value="delete"
                      color="red.600"
                      onClick={handleDelete}
                    >
                      삭제
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
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

      <SplitOrderModal
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        orderId={selectedCount === 1 ? Array.from(selectedOrderIds)[0] : null}
        onCompleted={() => setSelectedOrderIds(new Set())}
      />

      <BundleOrdersModal
        open={bundleOpen}
        onClose={() => setBundleOpen(false)}
        orders={selectedOrders}
        onCompleted={() => setSelectedOrderIds(new Set())}
      />

      <DispatchDelayModal
        open={dispatchDelayOpen}
        onClose={() => setDispatchDelayOpen(false)}
        orderCount={selectedCount}
        onConfirm={handleDispatchDelay}
      />
    </Box>
  );
}
