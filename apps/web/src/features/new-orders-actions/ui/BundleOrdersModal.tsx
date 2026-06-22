"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Package, X } from "lucide-react";

import { useBundleOrders, type OrderListItem } from "@/entities/order";
import { appToaster } from "@/shared/ui/app-toaster";

export interface BundleOrdersModalProps {
  open: boolean;
  onClose: () => void;
  orders: OrderListItem[];
  onCompleted?: () => void;
}

interface ValidationResult {
  ok: boolean;
  message: string | null;
}

function validateOrders(orders: OrderListItem[]): ValidationResult {
  if (orders.length < 2) {
    return { ok: false, message: "합포장은 2건 이상 선택해야 합니다" };
  }
  const first = orders[0];
  const sameReceiver = orders.every(
    (o) =>
      (o.receiverName ?? "") === (first.receiverName ?? "") &&
      (o.zipCode ?? "") === (first.zipCode ?? ""),
  );
  if (!sameReceiver) {
    return {
      ok: false,
      message: "수령인 이름과 우편번호가 모두 동일해야 합니다",
    };
  }
  const distinctBundles = new Set(
    orders.map((o) => o.bundleNumber).filter((b): b is string => !!b),
  );
  if (distinctBundles.size >= 2) {
    return {
      ok: false,
      message: "서로 다른 합포장 그룹에 이미 속해있어 합칠 수 없습니다",
    };
  }
  return { ok: true, message: null };
}

export function BundleOrdersModal({
  open,
  onClose,
  orders,
  onCompleted,
}: BundleOrdersModalProps): React.JSX.Element | null {
  const bundleMut = useBundleOrders();
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    if (open && orders.length > 0) {
      setPrimaryId(orders[0].id);
    }
  }, [open, orders]);

  const validation = useMemo(() => validateOrders(orders), [orders]);

  if (!open) return null;

  const submit = async (): Promise<void> => {
    if (!validation.ok || !primaryId) return;
    try {
      const res = await bundleMut.mutateAsync({
        orderIds: orders.map((o) => o.id),
        primaryOrderId: primaryId,
      });
      appToaster.create({
        title: "합포장 완료",
        description: `${res.orderIds.length}건 합포장 (그룹 ${res.bundleNumber})`,
        type: "success",
      });
      onCompleted?.();
      onClose();
    } catch (err) {
      appToaster.create({
        title: "합포장 실패",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => {
          if (!bundleMut.isPending) onClose();
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "720px" }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
        overflowY="auto"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Flex align="center" gap={2}>
            <Package size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                합포장 묶기
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                선택한 주문이 동일한 bundleNumber로 묶입니다 (대표 주문 지정)
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={bundleMut.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#718096",
              background: "transparent",
              border: "none",
              cursor: bundleMut.isPending ? "not-allowed" : "pointer",
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={4}>
          <VStack gap={3} align="stretch">
            {!validation.ok && (
              <Box
                bg="red.50"
                borderWidth="1px"
                borderColor="red.200"
                color="red.700"
                fontSize="sm"
                px={3}
                py={2}
                borderRadius="md"
              >
                {validation.message}
              </Box>
            )}

            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              overflow="hidden"
            >
              <Box
                as="table"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <Box as="thead" bg="gray.50">
                  <Box as="tr">
                    <Box
                      as="th"
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#4a5568",
                        width: 60,
                      }}
                    >
                      대표
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#4a5568",
                      }}
                    >
                      주문번호
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#4a5568",
                      }}
                    >
                      수령인
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#4a5568",
                      }}
                    >
                      우편번호
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#4a5568",
                      }}
                    >
                      합포장 그룹
                    </Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {orders.map((o) => (
                    <Box
                      as="tr"
                      key={o.id}
                      style={{
                        borderTop: "1px solid #edf2f7",
                        background: primaryId === o.id ? "#ebf8ff" : "white",
                        cursor: "pointer",
                      }}
                      onClick={() => setPrimaryId(o.id)}
                    >
                      <Box
                        as="td"
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                        }}
                      >
                        <input
                          type="radio"
                          name="primary-order"
                          checked={primaryId === o.id}
                          onChange={() => setPrimaryId(o.id)}
                        />
                      </Box>
                      <Box
                        as="td"
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {o.channelOrderId ?? "-"}
                      </Box>
                      <Box
                        as="td"
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {o.receiverName ?? "-"}
                      </Box>
                      <Box
                        as="td"
                        style={{ padding: "8px 10px", fontSize: 13 }}
                      >
                        {o.zipCode ?? "-"}
                      </Box>
                      <Box
                        as="td"
                        style={{
                          padding: "8px 10px",
                          fontSize: 12,
                          color: o.bundleNumber ? "#2b6cb0" : "#a0aec0",
                        }}
                      >
                        {o.bundleNumber ?? "(미지정)"}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <HStack gap={2} justify="flex-end" pt={2}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={bundleMut.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                size="sm"
                loading={bundleMut.isPending}
                disabled={!validation.ok || !primaryId || bundleMut.isPending}
                onClick={() => {
                  void submit();
                }}
              >
                합포장 실행
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
