"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { AlertTriangle, KeyIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import type { Order } from "@/entities/order";
import { useActiveChannel, useChannelApiKey } from "@/entities/channel";
import { LIVE_CHANNELS } from "@/shared/config";
import {
  useQoo10Orders,
  useRakutenOrders,
  useShopeeOrders,
} from "@/entities/order";
import { useOrderFilter } from "@/features/filter-orders";
import { PageHeader, TableSkeleton, ErrorState } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  BulkActionBar,
  OrderFilterBar,
  OrderTable,
} from "@/widgets/order-table";
import { OrderQuickDrawer } from "@/widgets/order-detail-panel";
import { ShopifyOrdersSection } from "@/widgets/shopify-order-table";
import { ROUTES } from "@/shared/config";

// ─── Qoo10 주문 콘텐츠 ─────────────────────────────────────────

function Qoo10OrdersContent({
  orders,
  isLoading,
  error,
  hasApiKey,
  refetch,
}: {
  orders: Order[];
  isLoading: boolean;
  error: { type: string; message: string } | null;
  hasApiKey: boolean;
  refetch: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    channelId: effectiveChannelId,
    status: effectiveStatus,
    dateRange: effectiveDateRange,
    search: effectiveSearch,
    statusCounts,
    filteredOrders,
    setChannel: effectiveSetChannel,
    setStatus: effectiveSetStatus,
    setDateRange: effectiveSetDateRange,
    setSearch: effectiveSetSearch,
  } = useOrderFilter(orders);

  const showChannelColumn = effectiveChannelId === "all";

  if (!hasApiKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title="Qoo10 API 키가 없습니다"
        description="채널 설정에서 Qoo10 API 키를 등록하면 주문이 자동으로 수집됩니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push(ROUTES.settings.channels),
        }}
      />
    );
  }

  if (error?.type === "AUTH_ERROR") {
    return (
      <ErrorState
        title="API 키 인증 실패"
        description="API 키 인증에 실패했습니다. 채널 설정에서 키를 확인해 주세요."
        onRetry={() => router.push(ROUTES.settings.channels)}
        actionLabel="채널 설정으로 이동"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="주문 조회 중 오류 발생"
        description={error.message}
        onRetry={() => refetch()}
        actionLabel="다시 시도"
      />
    );
  }

  if (isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <>
      <OrderFilterBar
        channelId={effectiveChannelId}
        status={effectiveStatus}
        dateRange={effectiveDateRange}
        search={effectiveSearch}
        statusCounts={statusCounts}
        onChannelChange={effectiveSetChannel}
        onStatusChange={effectiveSetStatus}
        onDateChange={effectiveSetDateRange}
        onSearchChange={effectiveSetSearch}
      />

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="표시할 주문이 없습니다"
          description="선택한 기간과 필터 조건에 해당하는 주문이 없습니다."
        />
      ) : (
        <>
          <BulkActionBar
            selectedCount={selectedIds.length}
            totalCount={filteredOrders.length}
            isAllSelected={
              selectedIds.length > 0 &&
              selectedIds.length === filteredOrders.length
            }
            onSelectAll={(checked) => {
              if (checked) {
                setSelectedIds(filteredOrders.map((order) => order.id));
              } else {
                setSelectedIds([]);
              }
            }}
            onBulkShip={() => setSelectedIds([])}
            onBulkCancel={() => setSelectedIds([])}
            onClearSelection={() => setSelectedIds([])}
          />

          <Box flex="1" mt={2} minW={0} overflowX="auto" overflowY="auto">
            <OrderTable
              orders={filteredOrders}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              showChannelColumn={showChannelColumn}
              onOrderIdClick={(id) => setSelectedOrderId(id)}
            />
          </Box>
        </>
      )}

      <OrderQuickDrawer
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        order={orders.find((order) => order.id === selectedOrderId) ?? null}
        onStatusChange={() => {}}
      />
    </>
  );
}

// ─── Shopee 주문 섹션 ──────────────────────────────────────────

function ShopeeOrdersSection(): React.JSX.Element {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading, error, hasApiKey } = useShopeeOrders();

  const {
    channelId: effectiveChannelId,
    status: effectiveStatus,
    dateRange: effectiveDateRange,
    search: effectiveSearch,
    statusCounts,
    filteredOrders,
    setChannel: effectiveSetChannel,
    setStatus: effectiveSetStatus,
    setDateRange: effectiveSetDateRange,
    setSearch: effectiveSetSearch,
  } = useOrderFilter(orders);

  if (!hasApiKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title="Shopee API 키가 없습니다"
        description="채널 설정에서 Shopee API 키를 등록하면 주문이 자동으로 수집됩니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push(ROUTES.settings.channels),
        }}
      />
    );
  }

  if (error?.type === "AUTH_ERROR") {
    return (
      <ErrorState
        title="API 키 인증 실패"
        description="Shopee API 키 인증에 실패했습니다. 채널 설정에서 키를 확인해 주세요."
        onRetry={() => router.push(ROUTES.settings.channels)}
        actionLabel="채널 설정으로 이동"
      />
    );
  }

  if (error) {
    return (
      <ErrorState title="주문 조회 중 오류 발생" description={error.message} />
    );
  }

  if (isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <>
      <OrderFilterBar
        channelId={effectiveChannelId}
        status={effectiveStatus}
        dateRange={effectiveDateRange}
        search={effectiveSearch}
        statusCounts={statusCounts}
        onChannelChange={effectiveSetChannel}
        onStatusChange={effectiveSetStatus}
        onDateChange={effectiveSetDateRange}
        onSearchChange={effectiveSetSearch}
      />

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="표시할 주문이 없습니다"
          description="선택한 기간과 필터 조건에 해당하는 Shopee 주문이 없습니다."
        />
      ) : (
        <>
          <BulkActionBar
            selectedCount={selectedIds.length}
            totalCount={filteredOrders.length}
            isAllSelected={
              selectedIds.length > 0 &&
              selectedIds.length === filteredOrders.length
            }
            onSelectAll={(checked) => {
              setSelectedIds(checked ? filteredOrders.map((o) => o.id) : []);
            }}
            onBulkShip={() => setSelectedIds([])}
            onBulkCancel={() => setSelectedIds([])}
            onClearSelection={() => setSelectedIds([])}
          />

          <Box flex="1" mt={2} minW={0} overflowX="auto" overflowY="auto">
            <OrderTable
              orders={filteredOrders}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              showChannelColumn={effectiveChannelId === "all"}
              onOrderIdClick={(id) => setSelectedOrderId(id)}
            />
          </Box>
        </>
      )}

      <OrderQuickDrawer
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        order={orders.find((o) => o.id === selectedOrderId) ?? null}
        onStatusChange={() => {}}
      />
    </>
  );
}

// ─── 라쿠텐 주문 섹션 ─────────────────────────────────────────

function RakutenOrdersSection(): React.JSX.Element {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("rakuten");

  const { orders, isLoading, error, hasApiKey } = useRakutenOrders();

  if (!hasApiKey || !hasKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title="라쿠텐 API 키가 없습니다"
        description="채널 설정에서 라쿠텐 RMS API 키를 등록하면 주문이 자동으로 수집됩니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push(ROUTES.settings.channels),
        }}
      />
    );
  }

  if (error) {
    return (
      <ErrorState title="라쿠텐 주문 조회 오류" description={error.message} />
    );
  }

  if (isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="주문이 없습니다"
        description="현재 조건에 해당하는 라쿠텐 주문이 없습니다."
      />
    );
  }

  return (
    <Box flex="1" display="flex" flexDirection="column" minW={0}>
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        overflowX="auto"
        mt={2}
      >
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {["주문번호", "주문일", "구매자", "상품", "금액", "상태"].map(
                (h) => (
                  <Box
                    key={h}
                    as="th"
                    px={4}
                    py={3}
                    textAlign="left"
                    fontSize="xs"
                    color="gray.500"
                    whiteSpace="nowrap"
                  >
                    {h}
                  </Box>
                ),
              )}
            </Box>
          </Box>
          <Box as="tbody">
            {orders.map((order) => (
              <Box
                key={order.id}
                as="tr"
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Box
                  as="td"
                  px={4}
                  py={3}
                  fontFamily="mono"
                  fontSize="xs"
                  color="gray.700"
                >
                  {order.channelOrderId}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  whiteSpace="nowrap"
                  fontSize="xs"
                  color="gray.600"
                >
                  {order.orderedAt ? order.orderedAt.slice(0, 10) : "-"}
                </Box>
                <Box as="td" px={4} py={3} fontSize="sm">
                  {order.buyer.name || "-"}
                </Box>
                <Box as="td" px={4} py={3} fontSize="sm" color="gray.700">
                  {order.items[0]?.productName ?? "-"}
                  {order.items.length > 1 && (
                    <Text as="span" fontSize="xs" color="gray.400" ml={1}>
                      외 {order.items.length - 1}건
                    </Text>
                  )}
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  textAlign="right"
                  whiteSpace="nowrap"
                  fontWeight="medium"
                >
                  ¥{order.payment.totalAmount.toLocaleString()}
                </Box>
                <Box as="td" px={4} py={3}>
                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    px={2}
                    py={0.5}
                    fontSize="xs"
                    borderRadius="sm"
                    borderWidth="1px"
                    borderColor="gray.300"
                    color="gray.700"
                  >
                    {order.status}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── 메인 OrdersPage ───────────────────────────────────────────

function OrdersPageContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { activeChannel: globalChannel } = useActiveChannel();
  const activeChannel = searchParams?.get("channel") ?? globalChannel;
  const isShopify = activeChannel === "shopify";
  const isRakuten = activeChannel === "rakuten";
  const isShopee = activeChannel === "shopee";

  // URL→Context 동기화는 ChannelUrlSyncer가 담당하므로 여기서는 중복 제거

  const { apiDateParams, setChannel } = useOrderFilter([]);
  const {
    data: qoo10Orders,
    isLoading,
    error,
    hasApiKey,
    refetch,
  } = useQoo10Orders({
    ...apiDateParams,
    enabled: !isShopify && !isRakuten && !isShopee,
  });

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title="주문 관리"
        description="주문을 조회하고 상태를 변경할 수 있습니다."
        mb={2}
      />

      {isShopify ? (
        <>
          <ShopifyChannelTabBar
            activeChannel={activeChannel}
            onChannelChange={setChannel}
          />
          <ShopifyOrdersSection />
        </>
      ) : isRakuten ? (
        <>
          <ShopifyChannelTabBar
            activeChannel={activeChannel}
            onChannelChange={setChannel}
          />
          <RakutenOrdersSection />
        </>
      ) : isShopee ? (
        <>
          <ShopifyChannelTabBar
            activeChannel={activeChannel}
            onChannelChange={setChannel}
          />
          <ShopeeOrdersSection />
        </>
      ) : (
        <Qoo10OrdersContent
          orders={qoo10Orders}
          isLoading={isLoading}
          error={error}
          hasApiKey={hasApiKey}
          refetch={refetch}
        />
      )}
    </Box>
  );
}

/**
 * Shopify 선택 시 채널 탭만 독립 렌더링
 * (OrderFilterBar 전체를 쓰면 Qoo10 전용 날짜/상태 필터가 함께 노출되어 혼란스러움)
 */
function ShopifyChannelTabBar({
  activeChannel,
  onChannelChange,
}: {
  activeChannel: string;
  onChannelChange: (id: string) => void;
}): React.JSX.Element {
  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
    >
      <Flex px={4} pt={3} pb={2} align="center" gap={1}>
        {LIVE_CHANNELS.map((channel) => {
          const isSelected = activeChannel === channel.id;
          return (
            <Button
              key={channel.id}
              variant="ghost"
              size="sm"
              onClick={() => onChannelChange(channel.id)}
              fontWeight={isSelected ? "semibold" : "normal"}
              color={isSelected ? "gray.900" : "gray.500"}
              borderRadius={0}
              px={3}
              py={2}
              height="auto"
              border="none"
              outline="none"
              boxShadow={
                isSelected
                  ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                  : "none"
              }
              _hover={{
                bg: "transparent",
                color: "gray.900",
                boxShadow: "inset 0 -2px 0 0 var(--chakra-colors-gray-200)",
              }}
              _active={{ bg: "transparent" }}
            >
              <Text fontSize="sm">{channel.name}</Text>
            </Button>
          );
        })}
      </Flex>
    </Box>
  );
}

export function OrdersPage(): React.JSX.Element {
  return (
    <Suspense fallback={<TableSkeleton rows={8} cols={7} />}>
      <OrdersPageContent />
    </Suspense>
  );
}
