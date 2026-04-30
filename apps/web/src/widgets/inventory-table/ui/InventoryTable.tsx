"use client";

import { Box, Button, HStack, Spinner } from "@chakra-ui/react";

import type { Product } from "@oms/types";
import { TruncatedCell } from "@/shared/ui";

export type InventoryOptionType = "combo" | "simple" | "none" | "loading";

export interface InventoryRow {
  item: Product;
  optionType: InventoryOptionType;
  /** 단순형/옵션없음일 때 기본 Qty (상품 상세에서 조회) */
  qty?: number;
  /** 상품명 (상품 상세에서 조회) */
  title?: string;
}

export interface InventoryTableProps {
  rows: InventoryRow[];
  onEditClick: (item: Product) => void;
}

const OPTION_TYPE_LABEL: Record<InventoryOptionType, string> = {
  combo: "조합형",
  simple: "단순형",
  none: "없음",
  loading: "-",
};

export function InventoryTable({
  rows,
  onEditClick,
}: InventoryTableProps): React.JSX.Element {
  return (
    <Box
      mt={2}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
    >
      <Box w="100%" overflowX="auto">
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                minW="140px"
                w="140px"
              >
                Qoo10 상품코드
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                minW="160px"
                w="160px"
              >
                판매자 상품코드
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                minW="200px"
              >
                상품명
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="center"
                fontSize="xs"
                color="gray.500"
                w="100px"
                minW="100px"
              >
                현재 Qty
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="center"
                fontSize="xs"
                color="gray.500"
                w="100px"
                minW="100px"
              >
                옵션 타입
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="right"
                fontSize="xs"
                color="gray.500"
                w="100px"
                minW="100px"
              >
                작업
              </Box>
            </Box>
          </Box>
          <Box as="tbody">
            {rows.map((row) => (
              <Box
                key={`${row.item.id}-${row.item.sellerCode}`}
                as="tr"
                borderTopWidth="1px"
                borderColor="gray.100"
                bg="white"
              >
                <Box as="td" px={4} py={3}>
                  <Box as="span" fontFamily="mono" fontSize="sm" color="gray.900">
                    {row.item.id}
                  </Box>
                </Box>
                <Box as="td" px={4} py={3}>
                  <TruncatedCell value={row.item.sellerCode} maxW="160px" />
                </Box>
                <Box as="td" px={4} py={3}>
                  {row.title !== undefined ? (
                    <TruncatedCell value={row.title} maxW="280px" />
                  ) : (
                    <Box as="span" color="gray.400" fontSize="xs">
                      -
                    </Box>
                  )}
                </Box>
                <Box as="td" px={4} py={3} textAlign="center">
                  {row.optionType === "loading" ? (
                    <Spinner size="xs" color="gray.400" />
                  ) : row.optionType === "combo" ? (
                    <Box as="span" color="gray.500" fontSize="xs">
                      옵션별
                    </Box>
                  ) : row.qty !== undefined ? (
                    <Box as="span" fontFamily="mono" fontSize="sm" color="gray.900">
                      {row.qty.toLocaleString()}
                    </Box>
                  ) : (
                    <Box as="span" color="gray.400" fontSize="xs">
                      -
                    </Box>
                  )}
                </Box>
                <Box as="td" px={4} py={3} textAlign="center">
                  {row.optionType === "loading" ? (
                    <Spinner size="xs" color="gray.400" />
                  ) : (
                    <Box as="span" fontSize="xs" color="gray.600">
                      {OPTION_TYPE_LABEL[row.optionType]}
                    </Box>
                  )}
                </Box>
                <Box as="td" px={4} py={3} textAlign="right">
                  <HStack gap={2} justify="flex-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      borderColor="gray.300"
                      disabled={row.optionType === "loading"}
                      onClick={() => onEditClick(row.item)}
                    >
                      재고 수정
                    </Button>
                  </HStack>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
