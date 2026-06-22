"use client";

import { Box, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { InventoryRow } from "@oms/types";

interface AdjustmentSkuLotPickerProps {
  rows: InventoryRow[];
  selected: { sku: string; lotCode: string | null } | null;
  onSelect: (row: InventoryRow) => void;
  isLoading?: boolean;
  emptyText?: string;
}

export function AdjustmentSkuLotPicker({
  rows,
  selected,
  onSelect,
  isLoading = false,
  emptyText = "이 로케이션에는 재고가 없습니다",
}: AdjustmentSkuLotPickerProps): ReactElement {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return rows;
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        (r.vendorSku ?? "").toLowerCase().includes(q) ||
        (r.lotCode ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const isMatch = (row: InventoryRow): boolean => {
    if (!selected) return false;
    return (
      selected.sku === row.sku &&
      (selected.lotCode ?? null) === (row.lotCode ?? null)
    );
  };

  return (
    <Stack gap={2}>
      <Input
        size="sm"
        placeholder="SKU 또는 LOT 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        maxH="320px"
        overflowY="auto"
      >
        {isLoading ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            로딩 중...
          </Text>
        ) : rows.length === 0 ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            {emptyText}
          </Text>
        ) : filtered.length === 0 ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            검색 결과가 없습니다.
          </Text>
        ) : (
          filtered.map((row, idx) => {
            const match = isMatch(row);
            const available = row.quantity - row.reservedQuantity;
            const disabled = available <= 0;
            return (
              <Flex
                key={`${row.sku}-${row.lotCode ?? "no-lot"}-${idx}`}
                px={3}
                py={2}
                align="center"
                justify="space-between"
                bg={match ? "blue.50" : undefined}
                borderLeftWidth={match ? "3px" : "0"}
                borderLeftColor={match ? "blue.500" : undefined}
                cursor={disabled ? "not-allowed" : "pointer"}
                opacity={disabled ? 0.5 : 1}
                _hover={
                  disabled ? undefined : { bg: match ? "blue.50" : "gray.50" }
                }
                title={disabled ? "가용 수량이 없습니다" : undefined}
                onClick={() => {
                  if (disabled) return;
                  onSelect(row);
                }}
              >
                <Box>
                  <Text fontFamily="mono" fontSize="sm">
                    {row.sku}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {row.lotCode ? `LOT ${row.lotCode}` : "LOT 없음"}
                    {row.vendorSku ? ` · 공급사 SKU ${row.vendorSku}` : ""}
                  </Text>
                </Box>
                <Box textAlign="right">
                  <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
                    {row.quantity.toLocaleString()}
                  </Text>
                  <Text fontFamily="mono" fontSize="xs" color="gray.500">
                    예약 {row.reservedQuantity.toLocaleString()} · 가용{" "}
                    {available.toLocaleString()}
                  </Text>
                </Box>
              </Flex>
            );
          })
        )}
      </Box>
    </Stack>
  );
}
