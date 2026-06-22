"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  KeyIcon,
  Package,
  Search,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";

import {
  useShopifyOrders,
  useShopifyBulkFulfillOrders,
  useShopifyFulfillOrder,
  type ShopifyOrderItem,
  type FulfillOrderInput,
} from "@/entities/order";
import { ShopifyOrderDetailModal } from "@/features/view-order-detail";
import { TableSkeleton } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/EmptyState";
import { appToaster } from "@/shared/ui/app-toaster";
import { ROUTES } from "@/shared/config";

// ─── 주문 상태 레이블 ──────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
  CLAIMED: "클레임",
  RETURNED: "반품",
};

const STATUS_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  PAID: { bg: "green.50", color: "green.700" },
  PENDING: { bg: "gray.100", color: "gray.600" },
  PREPARING: { bg: "blue.50", color: "blue.700" },
  SHIPPED: { bg: "blue.100", color: "blue.800" },
  DELIVERED: { bg: "green.100", color: "green.800" },
  CANCELLED: { bg: "red.50", color: "red.700" },
  CLAIMED: { bg: "orange.50", color: "orange.700" },
  RETURNED: { bg: "purple.50", color: "purple.700" },
};

const STATUS_TABS = [
  { id: "all", label: "전체" },
  { id: "paid", label: "결제완료" },
  { id: "pending", label: "결제대기" },
  { id: "shipped", label: "배송중" },
  { id: "cancelled", label: "취소" },
] as const;

type StatusTabId = (typeof STATUS_TABS)[number]["id"];

const FULFILLABLE_STATUSES = new Set(["PAID", "PREPARING"]);

// ─── CSV 내보내기 유틸 ─────────────────────────────────────────

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportOrdersCsv(orders: ShopifyOrderItem[]): void {
  const headers = [
    "주문번호",
    "주문일시",
    "구매자",
    "이메일",
    "배송지",
    "상품",
    "상태",
    "금액",
    "통화",
  ];
  const rows = orders.map((o) => [
    escapeCsv(o.channelOrderId),
    escapeCsv(new Date(o.orderedAt).toLocaleString("ko-KR")),
    escapeCsv(o.buyer.name),
    escapeCsv(o.buyer.email),
    escapeCsv(o.shipping.shippingAddress),
    escapeCsv(
      o.items.map((li) => `${li.productName} x${li.quantity}`).join(" | "),
    ),
    escapeCsv(o.status),
    escapeCsv(String(o.payment.totalAmount)),
    escapeCsv(o.payment.currency),
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shopify_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── 상태 뱃지 ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const label = STATUS_LABEL[status] ?? status;
  const style = STATUS_COLOR_MAP[status] ?? {
    bg: "gray.100",
    color: "gray.600",
  };
  return (
    <Box
      display="inline-block"
      px={2}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      bg={style.bg}
      color={style.color}
    >
      {label}
    </Box>
  );
}

// ─── 빠른 배송 처리 모달 ──────────────────────────────────────

function ShopifyQuickFulfillModal({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}): React.JSX.Element | null {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fulfill = useShopifyFulfillOrder(orderId ?? "");

  if (!orderId) return null;

  function extractError(error: unknown): string {
    if (isAxiosError(error)) {
      const data = error.response?.data as { message?: string } | undefined;
      return data?.message ?? "오류가 발생했습니다.";
    }
    return error instanceof Error ? error.message : "오류가 발생했습니다.";
  }

  async function handleFulfill(): Promise<void> {
    setErrorMsg(null);
    setSuccessMsg(null);
    const input: FulfillOrderInput = {};
    if (trackingNumber) input.trackingNumber = trackingNumber;
    if (carrierId) input.carrierId = carrierId;
    try {
      await fulfill.mutateAsync(input);
      setSuccessMsg("배송 처리가 완료되었습니다.");
      setTrackingNumber("");
      setCarrierId("");
    } catch (e) {
      setErrorMsg(extractError(e));
    }
  }

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={onClose}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "440px" }}
        bg="white"
        zIndex={1001}
        display="flex"
        flexDirection="column"
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Text fontWeight="semibold" fontSize="md">
            배송 처리
          </Text>
          <Box
            as="button"
            onClick={onClose}
            color="gray.500"
            _hover={{ color: "gray.800" }}
            display="flex"
            alignItems="center"
          >
            <X size={20} />
          </Box>
        </Flex>
        <VStack gap={4} align="stretch" px={5} py={4}>
          {successMsg && (
            <Flex
              align="center"
              gap={2}
              p={3}
              bg="green.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="green.200"
            >
              <CheckCircle size={16} color="var(--chakra-colors-green-600)" />
              <Text fontSize="sm" color="green.700">
                {successMsg}
              </Text>
            </Flex>
          )}
          {errorMsg && (
            <Flex
              align="center"
              gap={2}
              p={3}
              bg="red.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="red.200"
            >
              <AlertTriangle size={16} color="var(--chakra-colors-red-600)" />
              <Text fontSize="sm" color="red.700">
                {errorMsg}
              </Text>
            </Flex>
          )}
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              운송장 번호 (선택)
            </Text>
            <Input
              size="sm"
              placeholder="예: 1234567890"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              택배사 ID (선택)
            </Text>
            <Input
              size="sm"
              placeholder="예: cj, yamato"
              value={carrierId}
              onChange={(e) => setCarrierId(e.target.value)}
            />
          </Box>
          <HStack gap={2} justify="flex-end" pt={1}>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              disabled={fulfill.isPending}
            >
              닫기
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              loading={fulfill.isPending}
              onClick={() => {
                void handleFulfill();
              }}
            >
              <Package size={14} />
              배송 완료 처리
            </Button>
          </HStack>
        </VStack>
      </Box>
    </>
  );
}

// ─── Shopify 주문 테이블 ───────────────────────────────────────

export function ShopifyOrderTable({
  orders,
  selectedOrderIds = [],
  onSelectionChange,
  onRowClick,
  onFulfillClick,
}: {
  orders: ShopifyOrderItem[];
  selectedOrderIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (order: ShopifyOrderItem) => void;
  onFulfillClick?: (order: ShopifyOrderItem) => void;
}): React.JSX.Element {
  const allSelected =
    orders.length > 0 && selectedOrderIds.length === orders.length;
  const someSelected =
    selectedOrderIds.length > 0 && selectedOrderIds.length < orders.length;

  const toggleAll = (): void => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(orders.map((o) => o.id));
    }
  };

  const toggleOne = (id: string): void => {
    if (!onSelectionChange) return;
    if (selectedOrderIds.includes(id)) {
      onSelectionChange(selectedOrderIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedOrderIds, id]);
    }
  };

  const COLS = [
    { key: "check", label: "", width: "40px" },
    { key: "channelOrderId", label: "주문번호", width: "100px" },
    { key: "orderedAt", label: "주문일", width: "160px" },
    { key: "customer", label: "구매자", width: "140px" },
    { key: "items", label: "상품", width: "220px" },
    { key: "status", label: "상태", width: "110px" },
    { key: "total", label: "금액", width: "120px" },
    { key: "action", label: "", width: "110px" },
  ];

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      overflow="hidden"
    >
      <Box overflowX="auto">
        <Box
          as="table"
          w="max-content"
          minW="100%"
          fontSize="sm"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box
            as="thead"
            bg="white"
            position="sticky"
            top={0}
            zIndex={1}
            boxShadow="inset 0 -1px 0 var(--chakra-colors-gray-100)"
          >
            <Box as="tr">
              <Box as="th" px={3} py={3} w="40px" minW="40px">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  style={{ cursor: "pointer", width: "14px", height: "14px" }}
                />
              </Box>
              {COLS.slice(1).map((col) => (
                <Box
                  key={col.key}
                  as="th"
                  px={4}
                  py={3}
                  textAlign="left"
                  fontSize="xs"
                  color="gray.500"
                  whiteSpace="nowrap"
                  minW={col.width}
                  w={col.width}
                >
                  {col.label}
                </Box>
              ))}
            </Box>
          </Box>
          <Box as="tbody">
            {orders.map((order) => {
              const isSelected = selectedOrderIds.includes(order.id);
              return (
                <Box
                  as="tr"
                  key={order.id}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  bg={isSelected ? "blue.50" : undefined}
                  _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                  cursor={onRowClick ? "pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(order) : undefined}
                >
                  <Box
                    as="td"
                    px={3}
                    py={3}
                    w="40px"
                    minW="40px"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleOne(order.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        /* handled by onClick */
                      }}
                      style={{
                        cursor: "pointer",
                        width: "14px",
                        height: "14px",
                      }}
                    />
                  </Box>
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    whiteSpace="nowrap"
                    minW="100px"
                    fontWeight="medium"
                    color="gray.900"
                  >
                    {order.channelOrderId}
                  </Box>
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    whiteSpace="nowrap"
                    minW="160px"
                    color="gray.600"
                    fontSize="xs"
                  >
                    {new Date(order.orderedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Box>
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    whiteSpace="nowrap"
                    minW="140px"
                    color="gray.800"
                  >
                    {order.buyer.name || order.buyer.email || "-"}
                  </Box>
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    minW="220px"
                    maxW="220px"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    color="gray.700"
                  >
                    {order.items
                      .map((li) => `${li.productName} x${li.quantity}`)
                      .join(", ")}
                  </Box>
                  <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="110px">
                    <StatusBadge status={order.status} />
                  </Box>
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    whiteSpace="nowrap"
                    minW="120px"
                    fontWeight="medium"
                    color="gray.900"
                  >
                    {order.payment.currency}{" "}
                    {order.payment.totalAmount.toLocaleString()}
                  </Box>
                  <Box
                    as="td"
                    px={3}
                    py={3}
                    whiteSpace="nowrap"
                    minW="110px"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {FULFILLABLE_STATUSES.has(order.status) &&
                      onFulfillClick && (
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => onFulfillClick(order)}
                        >
                          <Package size={12} />
                          배송 처리
                        </Button>
                      )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Shopify 주문 섹션 (메인 위젯) ────────────────────────────

export function ShopifyOrdersSection(): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusTabId>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [fulfillTargetId, setFulfillTargetId] = useState<string | null>(null);

  const bulkFulfill = useShopifyBulkFulfillOrders();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const {
    data: orders,
    isLoading,
    error,
    hasApiKey,
    refetch,
  } = useShopifyOrders({
    pageSize: 50,
    financialStatus: statusFilter !== "all" ? statusFilter : undefined,
    keyword: debouncedSearch || undefined,
    dateFrom: toYmd(thirtyDaysAgo),
    dateTo: toYmd(now),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  if (!hasApiKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title="Shopify API 키가 없습니다"
        description="채널 설정에서 Shopify API 키를 등록하면 주문이 자동으로 수집됩니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push(ROUTES.settings.channels),
        }}
      />
    );
  }

  if (error?.type === "AUTH_ERROR") {
    return (
      <Box
        role="alert"
        display="flex"
        alignItems="flex-start"
        gap={3}
        p={3}
        borderWidth="1px"
        borderRadius="md"
        borderColor="red.200"
        bg="red.50"
      >
        <Box mt={1} color="red.500">
          <AlertTriangle size={18} />
        </Box>
        <Box flex="1">
          <Text fontWeight="semibold" mb={1}>
            API 키 인증 실패
          </Text>
          <Text fontSize="sm" color="gray.700">
            Shopify API 키 인증에 실패했습니다. 채널 설정에서 키를 확인해
            주세요.
          </Text>
        </Box>
        <Button
          ml={4}
          colorScheme="blue"
          onClick={() => router.push(ROUTES.settings.channels)}
          size="sm"
        >
          채널 설정으로 이동
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        role="alert"
        display="flex"
        alignItems="flex-start"
        gap={3}
        p={3}
        borderWidth="1px"
        borderRadius="md"
        borderColor="red.200"
        bg="red.50"
      >
        <Box mt={1} color="red.500">
          <AlertTriangle size={18} />
        </Box>
        <Box flex="1">
          <Text fontWeight="semibold" mb={1}>
            주문 조회 중 오류 발생
          </Text>
          <Text fontSize="sm" color="gray.700">
            {error.message}
          </Text>
        </Box>
        <Button ml={4} variant="outline" onClick={() => refetch()} size="sm">
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Flex
        gap={3}
        mb={3}
        wrap="wrap"
        align="center"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderColor="gray.100"
        bg="white"
        position="sticky"
        top={0}
        zIndex={9}
      >
        <HStack gap={1}>
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(tab.id)}
                fontWeight={isActive ? "semibold" : "normal"}
                color={isActive ? "gray.900" : "gray.500"}
                borderRadius="md"
                bg={isActive ? "gray.100" : "transparent"}
                _hover={{ bg: isActive ? "gray.100" : "gray.50" }}
              >
                {tab.label}
              </Button>
            );
          })}
        </HStack>

        <Box position="relative" minW="260px" maxW="360px" w="100%">
          <Input
            placeholder="주문번호 검색"
            size="sm"
            pl={8}
            pr={8}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            borderColor="gray.200"
          />
          <Box
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
            color="gray.400"
            pointerEvents="none"
          >
            <Search size={14} />
          </Box>
          {searchInput && (
            <Box
              as="button"
              position="absolute"
              right={2}
              top="50%"
              style={{ transform: "translateY(-50%)" }}
              color="gray.400"
              _hover={{ color: "gray.600" }}
              onClick={() => setSearchInput("")}
            >
              <X size={14} />
            </Box>
          )}
        </Box>

        {orders.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            borderColor="gray.300"
            onClick={() => exportOrdersCsv(orders)}
            ml="auto"
          >
            <Download size={14} />
            CSV 내보내기
          </Button>
        )}
      </Flex>

      <Box px={4} pt={3}>
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} showFilterBar={false} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="표시할 주문이 없습니다"
            description="선택한 조건에 해당하는 Shopify 주문이 없습니다."
          />
        ) : (
          <>
            {selectedOrderIds.length > 0 && (
              <Flex
                align="center"
                gap={3}
                px={4}
                py={2.5}
                mb={2}
                bg="blue.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                  {selectedOrderIds.length}건 선택됨
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  loading={bulkFulfill.isPending}
                  onClick={() => {
                    void (async () => {
                      const selectedOrders = orders
                        .filter((o) => selectedOrderIds.includes(o.id))
                        .map((o) => ({
                          orderId: o.id,
                          carrierId: o.carrierId ?? "",
                          trackingNumber: o.trackingNumber ?? "",
                        }));
                      const result =
                        await bulkFulfill.mutateAsync(selectedOrders);
                      setSelectedOrderIds([]);
                      appToaster.create({
                        title: `배송 처리 완료: 성공 ${result.succeeded}건 / 실패 ${result.failed}건`,
                        type: result.failed === 0 ? "success" : "warning",
                      });
                    })();
                  }}
                >
                  배송 완료 처리
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  color="blue.600"
                  onClick={() => setSelectedOrderIds([])}
                >
                  선택 해제
                </Button>
              </Flex>
            )}
            <ShopifyOrderTable
              orders={orders}
              selectedOrderIds={selectedOrderIds}
              onSelectionChange={setSelectedOrderIds}
              onRowClick={(order) => setSelectedOrderId(order.id)}
              onFulfillClick={(order) => setFulfillTargetId(order.id)}
            />
            <ShopifyOrderDetailModal
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
            />
            <ShopifyQuickFulfillModal
              orderId={fulfillTargetId}
              onClose={() => setFulfillTargetId(null)}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
