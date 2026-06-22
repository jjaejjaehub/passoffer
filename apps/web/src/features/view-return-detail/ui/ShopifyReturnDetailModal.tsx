"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import {
  AlertTriangle,
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";

import {
  useShopifyApproveReturn,
  useShopifyDeclineReturn,
  useShopifyRefundReturn,
  type ShopifyReturnItem,
  type ReturnDeclineReason,
} from "@/entities/order";

// ─── 상수 ─────────────────────────────────────────────────────

const RETURN_STATUS_LABEL: Record<string, string> = {
  OPEN: "반품 진행중",
  REQUESTED: "반품 요청됨",
  DECLINED: "반품 거절됨",
  CLOSED: "반품 완료",
  CANCELLED: "반품 취소됨",
};

const RETURN_STATUS_COLOR: Record<string, string> = {
  OPEN: "blue",
  REQUESTED: "orange",
  DECLINED: "red",
  CLOSED: "green",
  CANCELLED: "gray",
};

const RETURN_REASON_LABEL: Record<string, string> = {
  UNKNOWN: "기타",
  SIZE_TOO_SMALL: "사이즈 작음",
  SIZE_TOO_LARGE: "사이즈 큼",
  WRONG_ITEM: "잘못된 상품",
  NOT_AS_DESCRIBED: "상품 설명 불일치",
  DEFECTIVE: "불량/파손",
  STYLE: "스타일 불만족",
  COLOR: "색상 불만족",
  MISSING_ITEM: "상품 누락",
  OTHER: "기타",
};

const DECLINE_REASONS: { value: ReturnDeclineReason; label: string }[] = [
  { value: "FINAL_SALE", label: "최종 판매 상품" },
  { value: "NO_RETURN_IN_TIMEFRAME", label: "반품 기한 초과" },
  { value: "OTHER", label: "기타" },
];

// ─── 섹션 래퍼 ─────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
    >
      <Box
        px={4}
        py={2.5}
        bg="gray.50"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
          {title}
        </Text>
      </Box>
      <Box px={4} py={3}>
        {children}
      </Box>
    </Box>
  );
}

function StatusChip({
  label,
  color,
}: {
  label: string;
  color: string;
}): React.JSX.Element {
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

// ─── 반품 상세 내용 ────────────────────────────────────────────

function ReturnDetailContent({
  item,
  onClose,
}: {
  item: ShopifyReturnItem;
  onClose: () => void;
}): React.JSX.Element {
  const [declineReason, setDeclineReason] =
    useState<ReturnDeclineReason>("OTHER");
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const approve = useShopifyApproveReturn();
  const decline = useShopifyDeclineReturn();
  const refund = useShopifyRefundReturn();

  function extractError(error: unknown): string {
    if (isAxiosError(error)) {
      const data = error.response?.data as { message?: string } | undefined;
      return data?.message ?? "오류가 발생했습니다.";
    }
    return error instanceof Error ? error.message : "오류가 발생했습니다.";
  }

  async function handleApprove(): Promise<void> {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await approve.mutateAsync(item.returnId);
      setSuccessMsg("반품 요청이 승인되었습니다.");
    } catch (e) {
      setErrorMsg(extractError(e));
    }
  }

  async function handleDecline(): Promise<void> {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await decline.mutateAsync({ returnId: item.returnId, declineReason });
      setSuccessMsg("반품 요청이 거절되었습니다.");
      setShowDeclineConfirm(false);
    } catch (e) {
      setErrorMsg(extractError(e));
      setShowDeclineConfirm(false);
    }
  }

  async function handleRefund(): Promise<void> {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await refund.mutateAsync({ returnId: item.returnId });
      setSuccessMsg("환불이 처리되었습니다.");
      setShowRefundConfirm(false);
    } catch (e) {
      setErrorMsg(extractError(e));
      setShowRefundConfirm(false);
    }
  }

  const isRequested = item.status === "REQUESTED";
  const isOpen = item.status === "OPEN";
  const isClosed =
    item.status === "CLOSED" ||
    item.status === "DECLINED" ||
    item.status === "CANCELLED";
  const canApprove = isRequested;
  const canDecline = isRequested;
  const canRefund = isOpen;

  const color = RETURN_STATUS_COLOR[item.status] ?? "gray";

  return (
    <VStack gap={4} align="stretch">
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

      {/* 반품 정보 */}
      <Section title="반품 정보">
        <VStack gap={2} align="stretch">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">
              반품번호
            </Text>
            <Text fontSize="sm" fontWeight="semibold" fontFamily="mono">
              {item.returnName}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">
              연결 주문
            </Text>
            <Text fontSize="sm" fontFamily="mono">
              {item.orderName}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">
              상태
            </Text>
            <StatusChip
              label={RETURN_STATUS_LABEL[item.status] ?? item.status}
              color={color}
            />
          </Flex>
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="gray.500">
              요청일
            </Text>
            <Text fontSize="sm">{item.createdAt.slice(0, 10)}</Text>
          </Flex>
          {item.closedAt && (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                완료일
              </Text>
              <Text fontSize="sm">{item.closedAt.slice(0, 10)}</Text>
            </Flex>
          )}
          {item.customerName && (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                구매자
              </Text>
              <Text fontSize="sm">{item.customerName}</Text>
            </Flex>
          )}
        </VStack>
      </Section>

      {/* 반품 상품 */}
      <Section title="반품 상품">
        <VStack gap={3} align="stretch">
          {item.lineItems.map((li) => (
            <Box key={li.id}>
              <Flex justify="space-between" align="flex-start" gap={2}>
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {li.lineItemName}
                  </Text>
                  {li.lineItemSku && (
                    <Text fontSize="xs" color="gray.400">
                      SKU: {li.lineItemSku}
                    </Text>
                  )}
                </Box>
                <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
                  x{li.quantity}
                </Text>
              </Flex>
              {li.returnReason && (
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  사유:{" "}
                  {RETURN_REASON_LABEL[li.returnReason] ?? li.returnReason}
                  {li.returnReasonNote && ` — ${li.returnReasonNote}`}
                </Text>
              )}
              {li.customerNote && !li.returnReasonNote && (
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  메모: {li.customerNote}
                </Text>
              )}
            </Box>
          ))}
        </VStack>
      </Section>

      {/* 환불 금액 */}
      {parseFloat(item.totalRefunded) > 0 && (
        <Section title="환불 금액">
          <Flex justify="space-between">
            <Text fontSize="sm" color="gray.500">
              환불 완료액
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="green.700">
              {parseFloat(item.totalRefunded).toLocaleString()}{" "}
              {item.currencyCode}
            </Text>
          </Flex>
        </Section>
      )}

      {/* 액션 */}
      {!isClosed && (
        <Section title="처리">
          <VStack gap={3} align="stretch">
            {/* 승인 */}
            {canApprove && (
              <Button
                size="sm"
                colorScheme="blue"
                loading={approve.isPending}
                onClick={() => {
                  void handleApprove();
                }}
              >
                <ThumbsUp size={14} />
                반품 요청 승인
              </Button>
            )}

            {/* 거절 */}
            {canDecline && (
              <>
                {showDeclineConfirm ? (
                  <VStack
                    gap={2}
                    align="stretch"
                    p={3}
                    bg="red.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="red.200"
                  >
                    <Text fontSize="sm" color="red.700" fontWeight="medium">
                      반품 요청을 거절하시겠습니까?
                    </Text>
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        거절 사유
                      </Text>
                      <select
                        style={{
                          fontSize: "13px",
                          borderWidth: "1px",
                          borderColor: "#e2e8f0",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          width: "100%",
                        }}
                        value={declineReason}
                        onChange={(e) =>
                          setDeclineReason(
                            e.target.value as ReturnDeclineReason,
                          )
                        }
                      >
                        {DECLINE_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </Box>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorScheme="red"
                        loading={decline.isPending}
                        onClick={() => {
                          void handleDecline();
                        }}
                      >
                        거절 확인
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeclineConfirm(false)}
                      >
                        취소
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    onClick={() => setShowDeclineConfirm(true)}
                  >
                    <ThumbsDown size={14} />
                    반품 요청 거절
                  </Button>
                )}
              </>
            )}

            {/* 환불 */}
            {canRefund && (
              <>
                {showRefundConfirm ? (
                  <VStack
                    gap={2}
                    align="stretch"
                    p={3}
                    bg="orange.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="orange.200"
                  >
                    <Text fontSize="sm" color="orange.800">
                      반품 상품 전체를 환불 처리하시겠습니까?
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorScheme="orange"
                        loading={refund.isPending}
                        onClick={() => {
                          void handleRefund();
                        }}
                      >
                        환불 확인
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRefundConfirm(false)}
                      >
                        취소
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Button
                    size="sm"
                    colorScheme="orange"
                    onClick={() => setShowRefundConfirm(true)}
                  >
                    환불 처리
                  </Button>
                )}
              </>
            )}
          </VStack>
        </Section>
      )}
    </VStack>
  );
}

// ─── 모달 ─────────────────────────────────────────────────────

interface ShopifyReturnDetailModalProps {
  item: ShopifyReturnItem | null;
  onClose: () => void;
}

export function ShopifyReturnDetailModal({
  item,
  onClose,
}: ShopifyReturnDetailModalProps): React.JSX.Element | null {
  if (!item) return null;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.400"
        zIndex={1000}
        onClick={onClose}
      />
      <Box
        position="fixed"
        top={0}
        right={0}
        bottom={0}
        w={{ base: "100%", md: "480px" }}
        bg="white"
        zIndex={1001}
        display="flex"
        flexDirection="column"
        boxShadow="-4px 0 20px rgba(0,0,0,0.12)"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
          flexShrink={0}
        >
          <Text fontWeight="semibold" fontSize="md">
            반품 상세
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
        <Box flex={1} overflowY="auto" px={5} py={4}>
          <ReturnDetailContent item={item} onClose={onClose} />
        </Box>
      </Box>
    </>
  );
}
