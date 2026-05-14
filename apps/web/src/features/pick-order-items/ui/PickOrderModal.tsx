"use client";

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
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useWarehouses } from "@/entities/warehouse";
import { appToaster } from "@/shared/ui/app-toaster";
import {
  useOrderPickContext,
  usePickOrderItems,
} from "../api/pickOrderQueries";
import type { OrderItemPickState, PickAllocation } from "../model/types";

interface PickOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelOrderId: string | null;
  onComplete?: () => void;
}

interface DraftAllocation {
  warehouseId: string;
  quantity: number;
}

type DraftMap = Record<string, DraftAllocation[]>;

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Text
      fontSize="xs"
      fontWeight="semibold"
      color="gray.600"
      textTransform="uppercase"
      letterSpacing="0.04em"
    >
      {children}
    </Text>
  );
}

function sumAlloc(rows: DraftAllocation[]): number {
  return rows.reduce(
    (acc, r) => acc + (Number.isFinite(r.quantity) ? r.quantity : 0),
    0,
  );
}

function pickedTotal(item: OrderItemPickState): number {
  return Object.values(item.pickedQuantityByWarehouse ?? {}).reduce(
    (a, b) => a + b,
    0,
  );
}

export function PickOrderModal({
  open,
  onOpenChange,
  channelOrderId,
  onComplete,
}: PickOrderModalProps): React.JSX.Element | null {
  const contextQuery = useOrderPickContext(channelOrderId);
  const warehousesQuery = useWarehouses();
  const orderId = contextQuery.data?.orderId ?? null;
  const pickMutation = usePickOrderItems(orderId, channelOrderId);

  const [drafts, setDrafts] = useState<DraftMap>({});

  useEffect(() => {
    if (!open) {
      setDrafts({});
    }
  }, [open]);

  useEffect(() => {
    if (open && contextQuery.data) {
      const next: DraftMap = {};
      for (const item of contextQuery.data.items) {
        next[item.id] = [];
      }
      setDrafts(next);
    }
  }, [open, contextQuery.data]);

  const warehouses = warehousesQuery.data ?? [];
  const items = contextQuery.data?.items ?? [];

  const totals = useMemo(() => {
    return items.map((item) => {
      const already = pickedTotal(item);
      const draftSum = sumAlloc(drafts[item.id] ?? []);
      const remaining = item.quantity - already - draftSum;
      return { id: item.id, already, draftSum, remaining };
    });
  }, [items, drafts]);

  const hasOverPick = totals.some((t) => t.remaining < 0);
  const hasAnyAllocation = totals.some((t) => t.draftSum > 0);

  const addRow = (itemId: string): void => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), { warehouseId: "", quantity: 1 }],
    }));
  };

  const removeRow = (itemId: string, index: number): void => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateRow = (
    itemId: string,
    index: number,
    patch: Partial<DraftAllocation>,
  ): void => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!orderId) return;

    const allocations: PickAllocation[] = [];
    for (const [orderItemId, rows] of Object.entries(drafts)) {
      for (const row of rows) {
        if (!row.warehouseId) {
          appToaster.create({ title: "창고를 선택해 주세요", type: "error" });
          return;
        }
        if (!Number.isFinite(row.quantity) || row.quantity < 1) {
          appToaster.create({
            title: "수량은 1 이상이어야 합니다",
            type: "error",
          });
          return;
        }
        allocations.push({
          orderItemId,
          warehouseId: row.warehouseId,
          quantity: row.quantity,
        });
      }
    }

    if (allocations.length === 0) {
      appToaster.create({
        title: "픽업할 항목을 추가해 주세요",
        type: "warning",
      });
      return;
    }

    if (hasOverPick) {
      appToaster.create({
        title: "주문 수량을 초과한 항목이 있습니다",
        type: "error",
      });
      return;
    }

    try {
      const result = await pickMutation.mutateAsync({ allocations });
      appToaster.create({
        title: result.allComplete
          ? "픽업이 완료되었습니다"
          : "픽업이 일부 처리되었습니다",
        type: "success",
      });
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "픽업 처리에 실패했습니다";
      appToaster.create({ title: message, type: "error" });
    }
  };

  if (!open) return null;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => onOpenChange(false)}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "680px" }}
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
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              픽업 처리
            </Text>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              주문 상품을 창고별로 할당해 출고 처리합니다
            </Text>
          </Box>
          <Box
            as="button"
            onClick={() => onOpenChange(false)}
            color="gray.500"
            _hover={{ color: "gray.800" }}
            display="flex"
            alignItems="center"
          >
            <X size={20} />
          </Box>
        </Flex>

        <Box px={5} py={4}>
          {contextQuery.isLoading || warehousesQuery.isLoading ? (
            <Flex justify="center" py={8}>
              <Spinner />
            </Flex>
          ) : contextQuery.isError ? (
            <Text color="red.500" fontSize="sm">
              주문 정보를 불러오지 못했습니다
            </Text>
          ) : items.length === 0 ? (
            <Text color="gray.500" fontSize="sm">
              픽업할 상품이 없습니다
            </Text>
          ) : (
            <VStack align="stretch" gap={4}>
              {items.map((item, idx) => {
                const total = totals[idx];
                const rows = drafts[item.id] ?? [];
                const cannotAdd = !item.sku;

                return (
                  <Box
                    key={item.id}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={4}
                  >
                    <Flex justify="space-between" align="flex-start" mb={2}>
                      <Box flex={1} minW={0}>
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.900"
                        >
                          {item.productName}
                        </Text>
                        {item.option && (
                          <Text fontSize="xs" color="gray.500" mt={0.5}>
                            {item.option}
                          </Text>
                        )}
                        <HStack gap={3} mt={1} fontSize="xs" color="gray.500">
                          <Text>
                            SKU:{" "}
                            <Text as="span" fontFamily="mono" color="gray.700">
                              {item.sku ?? "없음"}
                            </Text>
                          </Text>
                          <Text>주문 {item.quantity}</Text>
                          <Text>이미 픽업 {total?.already ?? 0}</Text>
                          <Text
                            color={
                              (total?.remaining ?? 0) < 0
                                ? "red.500"
                                : "green.600"
                            }
                          >
                            남은 할당 {total?.remaining ?? 0}
                          </Text>
                        </HStack>
                      </Box>
                    </Flex>

                    {cannotAdd ? (
                      <Text fontSize="xs" color="orange.500" mt={2}>
                        SKU가 없어 픽업할 수 없습니다
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={2} mt={3}>
                        {rows.length === 0 && (
                          <Text fontSize="xs" color="gray.400">
                            창고를 추가해 수량을 할당하세요
                          </Text>
                        )}
                        {rows.map((row, rowIdx) => (
                          <HStack key={rowIdx} gap={2}>
                            <Box flex={1}>
                              <select
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  fontSize: "14px",
                                  color: "#1a202c",
                                  backgroundColor: "white",
                                }}
                                value={row.warehouseId}
                                onChange={(e) =>
                                  updateRow(item.id, rowIdx, {
                                    warehouseId: e.target.value,
                                  })
                                }
                                aria-label="창고"
                              >
                                <option value="">창고 선택</option>
                                {warehouses
                                  .filter((w) => w.status === "ACTIVE")
                                  .map((w) => (
                                    <option key={w.id} value={w.id}>
                                      {w.name} ({w.code})
                                    </option>
                                  ))}
                              </select>
                            </Box>
                            <Box w="100px">
                              <Input
                                type="number"
                                size="sm"
                                min={1}
                                max={item.quantity}
                                value={row.quantity}
                                onChange={(e) =>
                                  updateRow(item.id, rowIdx, {
                                    quantity: Number(e.target.value),
                                  })
                                }
                                aria-label="수량"
                              />
                            </Box>
                            <Box
                              as="button"
                              onClick={() => removeRow(item.id, rowIdx)}
                              color="gray.400"
                              _hover={{ color: "red.500" }}
                              display="flex"
                              alignItems="center"
                              p={1}
                            >
                              <X size={16} />
                            </Box>
                          </HStack>
                        ))}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => addRow(item.id)}
                          alignSelf="flex-start"
                          disabled={(total?.remaining ?? 0) <= 0}
                        >
                          <Plus size={14} />
                          창고 추가
                        </Button>
                      </VStack>
                    )}
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>

        <Flex
          px={5}
          py={4}
          borderTopWidth="1px"
          borderColor="gray.200"
          justify="flex-end"
          gap={2}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pickMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            colorScheme="blue"
            size="sm"
            onClick={() => void handleSubmit()}
            loading={pickMutation.isPending}
            disabled={!hasAnyAllocation || hasOverPick || !orderId}
          >
            픽업 처리
          </Button>
        </Flex>
      </Box>
    </>
  );
}
