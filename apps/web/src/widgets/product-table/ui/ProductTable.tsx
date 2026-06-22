"use client";

import { Box, Button, HStack } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import type { Product } from "@oms/types";

import {
  canActivate,
  canSuspend,
  itemStatusFromQoo10Code,
} from "@/entities/item";
import { TruncatedCell } from "@/shared/ui";

const STATUS_MAP: Record<string, string> = {
  S0: "검수대기",
  S1: "거래대기",
  S2: "거래가능",
  S3: "거래중지",
  S5: "거래제한",
  S8: "승인거부",
};

function isDetailViewable(
  rawStatus: string | undefined,
  status: string,
): boolean {
  if (rawStatus) return rawStatus === "S1" || rawStatus === "S2";
  return status === "active";
}

function ItemStatusBadge({
  rawStatus,
  status,
}: {
  rawStatus?: string;
  status: string;
}): React.JSX.Element {
  const displayStatus = rawStatus ?? status;
  const isTradable = rawStatus ? rawStatus === "S2" : status === "active";
  const label = rawStatus
    ? (STATUS_MAP[rawStatus] ?? rawStatus)
    : status === "active"
      ? "거래가능"
      : "거래중지";

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="sm"
      borderWidth="1px"
      borderStyle={isTradable ? "solid" : "dashed"}
      borderColor={isTradable ? "gray.900" : "gray.300"}
      color="gray.800"
      bg="white"
    >
      {label}
    </Box>
  );
}

export interface ProductTableProps {
  items: Product[];
  selectedItemCode: string | null;
  onSelectItem: (itemCode: string, sellerCode: string) => void;
  selectedItemCodes: Set<string>;
  onToggleRowSelection: (itemCode: string) => void;
  onToggleAllSelection: (checked: boolean) => void;
  onRowSuspend: (itemCode: string) => void;
  onRowActivate: (itemCode: string) => void;
  onRowDeleteRequest: (itemCode: string) => void;
  isStatusActionPending: boolean;
}

export function ProductTable({
  items,
  selectedItemCode,
  onSelectItem,
  selectedItemCodes,
  onToggleRowSelection,
  onToggleAllSelection,
  onRowSuspend,
  onRowActivate,
  onRowDeleteRequest,
  isStatusActionPending,
}: ProductTableProps): React.JSX.Element {
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const isAllSelected: boolean =
    items.length > 0 && items.every((item) => selectedItemCodes.has(item.id));

  const selectedInViewCount: number = items.filter((item) =>
    selectedItemCodes.has(item.id),
  ).length;

  const isIndeterminate: boolean =
    selectedInViewCount > 0 && selectedInViewCount < items.length;

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

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
                w="44px"
                minW="44px"
                px={2}
                py={3}
                textAlign="center"
                fontSize="xs"
                color="gray.500"
              >
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(event) =>
                    onToggleAllSelection(event.target.checked)
                  }
                  disabled={items.length === 0 || isStatusActionPending}
                  aria-label="전체 선택"
                />
              </Box>
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
                상품코드
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
                minW="120px"
                w="120px"
              >
                거래상태
              </Box>
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="right"
                fontSize="xs"
                color="gray.500"
                minW="220px"
              >
                작업
              </Box>
            </Box>
          </Box>
          <Box as="tbody">
            {items.map((item) => {
              const isRowSelected = selectedItemCode === item.id;
              const domainStatus = item.rawStatus
                ? itemStatusFromQoo10Code(item.rawStatus)
                : item.status === "active"
                  ? "거래가능"
                  : "거래중지";
              const showSuspend = canSuspend(domainStatus);
              const showActivate = canActivate(domainStatus);
              const canViewDetail = isDetailViewable(
                item.rawStatus,
                item.status,
              );

              return (
                <Box
                  key={`${item.id}-${item.sellerCode}`}
                  as="tr"
                  borderTopWidth="1px"
                  borderColor="gray.100"
                  bg={isRowSelected ? "gray.50" : "white"}
                >
                  <Box
                    as="td"
                    px={2}
                    py={3}
                    textAlign="center"
                    verticalAlign="middle"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemCodes.has(item.id)}
                      onChange={() => onToggleRowSelection(item.id)}
                      disabled={isStatusActionPending}
                      aria-label={`${item.id} 선택`}
                    />
                  </Box>
                  <Box as="td" px={4} py={3}>
                    {canViewDetail ? (
                      <Button
                        type="button"
                        variant="plain"
                        fontFamily="mono"
                        fontSize="sm"
                        color="gray.900"
                        textDecoration="underline"
                        textUnderlineOffset="2px"
                        h="auto"
                        minH={0}
                        p={0}
                        textAlign="left"
                        fontWeight="normal"
                        _hover={{ color: "gray.600" }}
                        onClick={() => onSelectItem(item.id, item.sellerCode)}
                      >
                        {item.id}
                      </Button>
                    ) : (
                      <Box
                        as="span"
                        fontFamily="mono"
                        fontSize="sm"
                        color="gray.400"
                        title={`${item.rawStatus ? (STATUS_MAP[item.rawStatus] ?? item.rawStatus) : item.status} 상태의 상품은 상세 조회가 불가합니다`}
                        cursor="not-allowed"
                      >
                        {item.id}
                      </Box>
                    )}
                  </Box>
                  <Box as="td" px={4} py={3}>
                    <TruncatedCell value={item.sellerCode} maxW="160px" />
                  </Box>
                  <Box as="td" px={4} py={3}>
                    <ItemStatusBadge
                      rawStatus={item.rawStatus}
                      status={item.status}
                    />
                  </Box>
                  <Box as="td" px={4} py={3} textAlign="right">
                    <HStack gap={2} justify="flex-end" flexWrap="wrap">
                      {showSuspend ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          borderColor="gray.300"
                          disabled={isStatusActionPending}
                          onClick={() => onRowSuspend(item.id)}
                        >
                          판매중지
                        </Button>
                      ) : null}
                      {showActivate ? (
                        <Button
                          type="button"
                          variant="solid"
                          size="sm"
                          colorPalette="gray"
                          bg="gray.900"
                          color="white"
                          _hover={{ bg: "gray.800" }}
                          disabled={isStatusActionPending}
                          onClick={() => onRowActivate(item.id)}
                        >
                          판매중으로 변경
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        colorPalette="red"
                        color="red.600"
                        size="sm"
                        disabled={isStatusActionPending}
                        onClick={() => onRowDeleteRequest(item.id)}
                      >
                        삭제
                      </Button>
                    </HStack>
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
