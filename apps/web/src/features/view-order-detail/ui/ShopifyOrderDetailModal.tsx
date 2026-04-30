"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertTriangle, CheckCircle, Package, X, XCircle } from "lucide-react";
import { isAxiosError } from "axios";

import {
  useShopifyOrderDetail,
  useShopifyFulfillOrder,
  useShopifyCancelOrder,
  type ShopifyOrderDetail,
  type FulfillOrderInput,
  type OrderCancelReason,
} from "@/entities/order";

// ─── 상수 ─────────────────────────────────────────────────────

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

const CANCEL_REASONS: { value: OrderCancelReason; label: string }[] = [
  { value: "CUSTOMER", label: "고객 요청" },
  { value: "FRAUD", label: "사기 의심" },
  { value: "INVENTORY", label: "재고 없음" },
  { value: "DECLINED", label: "결제 거절" },
  { value: "OTHER", label: "기타" },
];

// ─── 상태 뱃지 ─────────────────────────────────────────────────

function StatusChip({ label, color }: { label: string; color: string }): React.JSX.Element {
  return (
    <Box
      display="inline-block"
      px={2}
      py={0.5}
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      bg={`${color}.50`}
      color={`${color}.700`}
    >
      {label}
    </Box>
  );
}

// ─── 섹션 래퍼 ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
      <Box px={4} py={2.5} bg="gray.50" borderBottomWidth="1px" borderColor="gray.200">
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">{title}</Text>
      </Box>
      <Box px={4} py={3}>{children}</Box>
    </Box>
  );
}

// ─── 주문 상세 내용 ────────────────────────────────────────────

function OrderDetailContent({
  order,
  onClose,
}: {
  order: ShopifyOrderDetail;
  onClose: () => void;
}): React.JSX.Element {
  const [carrierId, setCarrierId] = useState(order.carrierId ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [cancelReason, setCancelReason] = useState<OrderCancelReason>("OTHER");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fulfill = useShopifyFulfillOrder(order.id);
  const cancel = useShopifyCancelOrder(order.id);

  const isCancelled = order.status === "CANCELLED";
  const isFulfilled = order.status === "SHIPPED" || order.status === "DELIVERED";

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
    const carrier = carrierId.trim();
    const tracking = trackingNumber.trim();
    if (!carrier || !tracking) {
      setErrorMsg("택배사 ID와 운송장 번호를 모두 입력해 주세요.");
      return;
    }
    const input: FulfillOrderInput = { carrierId: carrier, trackingNumber: tracking };
    try {
      await fulfill.mutateAsync(input);
      setSuccessMsg("배송 처리가 완료되었습니다.");
    } catch (e) {
      setErrorMsg(extractError(e));
    }
  }

  async function handleCancel(): Promise<void> {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await cancel.mutateAsync({ reason: cancelReason, packNo: order.packNo });
      setSuccessMsg("주문이 취소되었습니다.");
      setShowCancelConfirm(false);
    } catch (e) {
      setErrorMsg(extractError(e));
      setShowCancelConfirm(false);
    }
  }

  const statusColor = isCancelled
    ? "red"
    : isFulfilled
      ? "green"
      : order.status === "PAID"
        ? "blue"
        : "gray";

  return (
    <VStack gap={4} align="stretch">
      {/* 성공/에러 메시지 */}
      {successMsg && (
        <Flex align="center" gap={2} p={3} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
          <CheckCircle size={16} color="var(--chakra-colors-green-600)" />
          <Text fontSize="sm" color="green.700">{successMsg}</Text>
        </Flex>
      )}
      {errorMsg && (
        <Flex align="center" gap={2} p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <AlertTriangle size={16} color="var(--chakra-colors-red-600)" />
          <Text fontSize="sm" color="red.700">{errorMsg}</Text>
        </Flex>
      )}

      {/* 주문 요약 */}
      <Section title="주문 정보">
        <VStack gap={2} align="stretch">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">주문번호</Text>
            <Text fontSize="sm" fontWeight="semibold">{order.channelOrderId}</Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">주문일시</Text>
            <Text fontSize="sm">{new Date(order.orderedAt).toLocaleString("ko-KR")}</Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">결제 금액</Text>
            <Text fontSize="sm" fontWeight="medium">
              {order.payment.currency} {order.payment.totalAmount.toLocaleString()}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">주문 상태</Text>
            <StatusChip
              label={STATUS_LABEL[order.status] ?? order.status}
              color={statusColor}
            />
          </Flex>
          {order.trackingNumber && (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">운송장</Text>
              <Text fontSize="sm" fontFamily="mono">{order.trackingNumber}</Text>
            </Flex>
          )}
        </VStack>
      </Section>

      {/* 구매자 / 배송지 */}
      <Section title="구매자 및 배송지">
        <VStack gap={2} align="stretch">
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">구매자</Text>
            <Text fontSize="sm">{order.buyer.name || "-"}</Text>
          </Flex>
          {order.buyer.email && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">이메일</Text>
              <Text fontSize="sm">{order.buyer.email}</Text>
            </Flex>
          )}
          {order.buyer.tel && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">연락처</Text>
              <Text fontSize="sm">{order.buyer.tel}</Text>
            </Flex>
          )}
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">수령인</Text>
            <Text fontSize="sm">{order.shipping.receiver || "-"}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">배송지</Text>
            <Text fontSize="sm" textAlign="right" maxW="60%">
              {order.shipping.shippingAddress}
            </Text>
          </Flex>
          {order.shipping.shippingMessage && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">배송 메모</Text>
              <Text fontSize="sm" textAlign="right" maxW="60%">{order.shipping.shippingMessage}</Text>
            </Flex>
          )}
        </VStack>
      </Section>

      {/* 주문 상품 */}
      <Section title="주문 상품">
        <VStack gap={2} align="stretch">
          {order.items.map((item) => (
            <Flex key={item.id} justify="space-between" align="center" gap={2}>
              <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="medium" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {item.productName}
                </Text>
                {item.option && (
                  <Text fontSize="xs" color="gray.500">{item.option}</Text>
                )}
              </Box>
              <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">x{item.quantity}</Text>
              <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                {order.payment.currency} {item.unitPrice.toLocaleString()}
              </Text>
            </Flex>
          ))}
        </VStack>
      </Section>

      {/* 금액 요약 */}
      <Section title="금액">
        <VStack gap={1.5} align="stretch">
          {order.payment.orderPrice != null && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">소계</Text>
              <Text fontSize="sm">{order.payment.currency} {order.payment.orderPrice.toLocaleString()}</Text>
            </Flex>
          )}
          {order.payment.discount != null && order.payment.discount > 0 && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">할인</Text>
              <Text fontSize="sm" color="red.600">-{order.payment.currency} {order.payment.discount.toLocaleString()}</Text>
            </Flex>
          )}
          {order.payment.shippingRate != null && (
            <Flex justify="space-between">
              <Text fontSize="sm" color="gray.500">배송비</Text>
              <Text fontSize="sm">{order.payment.currency} {order.payment.shippingRate.toLocaleString()}</Text>
            </Flex>
          )}
          <Box borderTopWidth="1px" borderColor="gray.200" pt={1.5} mt={1}>
            <Flex justify="space-between">
              <Text fontSize="sm" fontWeight="semibold">합계</Text>
              <Text fontSize="sm" fontWeight="semibold">
                {order.payment.currency} {order.payment.totalAmount.toLocaleString()}
              </Text>
            </Flex>
          </Box>
        </VStack>
      </Section>

      {/* 배송 처리 */}
      {!isCancelled && !isFulfilled && (
        <Section title="배송 처리">
          <VStack gap={3} align="stretch">
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>택배사 ID (선택)</Text>
              <Input
                size="sm"
                placeholder="예: yamato, cj, japanpost"
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
              />
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>운송장 번호 (선택)</Text>
              <Input
                size="sm"
                placeholder="예: 1234567890"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </Box>
            <Button
              size="sm"
              colorScheme="blue"
              loading={fulfill.isPending}
              onClick={() => { void handleFulfill(); }}
            >
              <Package size={14} />
              배송 완료 처리
            </Button>
          </VStack>
        </Section>
      )}

      {/* 주문 취소 */}
      {!isCancelled && (
        <Section title="주문 취소">
          {showCancelConfirm ? (
            <VStack gap={3} align="stretch">
              <Text fontSize="sm" color="gray.700">정말 주문을 취소하시겠습니까?</Text>
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>취소 사유</Text>
                <select
                  style={{ fontSize: "14px", borderWidth: "1px", borderColor: "#e2e8f0", borderRadius: "6px", padding: "6px 8px", width: "100%" }}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value as OrderCancelReason)}
                >
                  {CANCEL_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Box>
              <HStack gap={2}>
                <Button
                  size="sm"
                  colorScheme="red"
                  loading={cancel.isPending}
                  onClick={() => { void handleCancel(); }}
                >
                  <XCircle size={14} />
                  취소 확인
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  돌아가기
                </Button>
              </HStack>
            </VStack>
          ) : (
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle size={14} />
              주문 취소
            </Button>
          )}
        </Section>
      )}
    </VStack>
  );
}

// ─── 모달 ─────────────────────────────────────────────────────

interface ShopifyOrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

export function ShopifyOrderDetailModal({
  orderId,
  onClose,
}: ShopifyOrderDetailModalProps): React.JSX.Element | null {
  const { order, isLoading, error } = useShopifyOrderDetail(orderId);

  if (!orderId) return null;

  return (
    <>
      {/* 백드롭 */}
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={onClose}
      />

      {/* 가운데 모달 */}
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "640px" }}
        maxH="90vh"
        bg="white"
        zIndex={1001}
        display="flex"
        flexDirection="column"
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
      >
        {/* 헤더 */}
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
          flexShrink={0}
        >
          <Text fontWeight="semibold" fontSize="md">주문 상세</Text>
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

        {/* 콘텐츠 */}
        <Box flex={1} overflowY="auto" px={5} py={4}>
          {isLoading ? (
            <Flex justify="center" py={12}>
              <Spinner color="gray.400" />
            </Flex>
          ) : error ? (
            <Flex align="flex-start" gap={3} p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
              <Box mt={0.5} color="red.500"><AlertTriangle size={16} /></Box>
              <Text fontSize="sm" color="red.700">{error.message}</Text>
            </Flex>
          ) : order ? (
            <OrderDetailContent order={order} onClose={onClose} />
          ) : null}
        </Box>
      </Box>
    </>
  );
}
