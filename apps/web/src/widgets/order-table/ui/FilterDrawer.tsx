"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Filter, X } from "lucide-react";

export interface OrderFilters {
  shippingMethods?: string[];
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "latest" | "amount_high" | "delayed";
  assignee?: string;
}

const SHIPPING_METHODS = [
  { id: "international", label: "국제배송" },
  { id: "domestic", label: "국내배송" },
  { id: "express", label: "특급배송" },
];

const SORT_OPTIONS: {
  value: NonNullable<OrderFilters["sortBy"]>;
  label: string;
}[] = [
  { value: "latest", label: "최신순" },
  { value: "amount_high", label: "금액 높은순" },
  { value: "delayed", label: "처리 지연순" },
];

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: OrderFilters;
  onFiltersChange: (filters: Partial<OrderFilters>) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function FilterDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
}: FilterDrawerProps): React.JSX.Element | null {
  const handleShippingMethodToggle = (methodId: string): void => {
    const current = filters.shippingMethods ?? [];
    const updated = current.includes(methodId)
      ? current.filter((id) => id !== methodId)
      : [...current, methodId];
    onFiltersChange({ shippingMethods: updated.length ? updated : undefined });
  };

  if (!open) return null;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.400"
        zIndex={1000}
        onClick={() => onOpenChange(false)}
      />
      <Box
        position="fixed"
        top={0}
        right={0}
        bottom={0}
        w={{ base: "100%", sm: "360px" }}
        bg="white"
        zIndex={1001}
        boxShadow="-8px 0 24px rgba(0,0,0,0.12)"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <HStack gap={2}>
            <Filter size={16} />
            <Text fontWeight="semibold" fontSize="md">
              상세 필터
            </Text>
            {activeFilterCount > 0 && (
              <Box
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                w={5}
                h={5}
                borderRadius="full"
                bg="blue.500"
                color="white"
                fontSize="xs"
                fontWeight="bold"
              >
                {activeFilterCount}
              </Box>
            )}
          </HStack>
          <Box
            as="button"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
            color="gray.500"
            _hover={{ color: "gray.800" }}
            display="flex"
            alignItems="center"
          >
            <X size={20} />
          </Box>
        </Flex>

        {/* Content */}
        <Box flex={1} overflowY="auto" px={5} py={5}>
          <VStack align="stretch" gap={6}>
            {/* 배송 방법 */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.900" mb={3}>
                배송 방법
              </Text>
              <VStack align="stretch" gap={2}>
                {SHIPPING_METHODS.map((method) => (
                  <Box
                    as="label"
                    key={method.id}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    cursor="pointer"
                  >
                    <input
                      type="checkbox"
                      id={`shipping-${method.id}`}
                      checked={
                        filters.shippingMethods?.includes(method.id) ?? false
                      }
                      onChange={() => handleShippingMethodToggle(method.id)}
                      aria-label={method.label}
                      style={{
                        cursor: "pointer",
                        width: "14px",
                        height: "14px",
                      }}
                    />
                    <Text fontSize="sm" color="gray.700">
                      {method.label}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* 금액 범위 */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.900" mb={3}>
                금액 범위
              </Text>
              <Flex align="center" gap={2}>
                <Input
                  type="number"
                  size="sm"
                  placeholder="₩0"
                  value={filters.minAmount ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      minAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
                <Text color="gray.400" flexShrink={0}>
                  ~
                </Text>
                <Input
                  type="number"
                  size="sm"
                  placeholder="₩0"
                  value={filters.maxAmount ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      maxAmount: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Flex>
            </Box>

            {/* 정렬 기준 */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.900" mb={3}>
                정렬 기준
              </Text>
              <VStack align="stretch" gap={2}>
                {SORT_OPTIONS.map((opt) => (
                  <Box
                    as="label"
                    key={opt.value}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    cursor="pointer"
                  >
                    <input
                      type="radio"
                      name="sortBy"
                      value={opt.value}
                      checked={(filters.sortBy ?? "latest") === opt.value}
                      onChange={() => onFiltersChange({ sortBy: opt.value })}
                      style={{
                        cursor: "pointer",
                        width: "14px",
                        height: "14px",
                      }}
                    />
                    <Text fontSize="sm" color="gray.700">
                      {opt.label}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* 처리 담당자 */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.900" mb={3}>
                처리 담당자
              </Text>
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
                value={filters.assignee ?? "all"}
                onChange={(e) =>
                  onFiltersChange({
                    assignee:
                      e.target.value === "all" ? undefined : e.target.value,
                  })
                }
              >
                <option value="all">전체 담당자</option>
                <option value="user1">담당자 1</option>
                <option value="user2">담당자 2</option>
                <option value="user3">담당자 3</option>
              </select>
            </Box>
          </VStack>
        </Box>

        {/* Footer */}
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderTopWidth="1px"
          borderColor="gray.200"
          gap={2}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReset()}
            color="gray.600"
          >
            초기화
            {activeFilterCount > 0 && (
              <Box
                as="span"
                ml={1}
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                w={4}
                h={4}
                borderRadius="full"
                bg="gray.200"
                fontSize="xs"
                color="gray.700"
              >
                {activeFilterCount}
              </Box>
            )}
          </Button>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            필터 적용
          </Button>
        </Flex>
      </Box>
    </>
  );
}
