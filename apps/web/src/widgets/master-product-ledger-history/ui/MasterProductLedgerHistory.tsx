"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type {
  MasterProductVariant,
  MasterStockLedgerRefType,
  MasterStockLedgerRow,
  MasterStockLedgerScope,
} from "@/entities/master-product";
import { useMasterProductLedger } from "@/entities/master-product";

interface Props {
  productId: string;
  variants?: MasterProductVariant[];
}

const SCOPE_LABEL: Record<MasterStockLedgerScope, string> = {
  MASTER: "마스터",
  WAREHOUSE: "창고",
  CHANNEL: "채널",
};

const SCOPE_COLOR: Record<MasterStockLedgerScope, string> = {
  MASTER: "gray",
  WAREHOUSE: "blue",
  CHANNEL: "purple",
};

const REF_TYPE_LABEL: Record<MasterStockLedgerRefType, string> = {
  ORDER_RESERVE: "주문 예약",
  ORDER_CANCEL: "주문 취소",
  ORDER_RETURN: "주문 반품",
  WAREHOUSE_PICK: "창고 픽업",
  WAREHOUSE_PICK_REVERSE: "픽업 취소",
  MANUAL_ADJUST: "수동 조정",
  INBOUND: "입고",
  OUTBOUND: "출고",
  TRANSFER: "이동",
  CHANNEL_SYNC: "채널 동기화",
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function deltaColor(delta: number): string {
  if (delta > 0) return "green.600";
  if (delta < 0) return "red.500";
  return "gray.600";
}

function deltaText(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function scopeTarget(row: MasterStockLedgerRow): string {
  if (row.scope === "WAREHOUSE")
    return row.warehouseName ?? row.warehouseId ?? "-";
  if (row.scope === "CHANNEL") {
    const ch = row.channelName ?? row.channelId ?? "-";
    const code = row.listedProductChannelItemId;
    return code ? `${ch} · ${code}` : ch;
  }
  return "-";
}

export function MasterProductLedgerHistory({
  productId,
  variants = [],
}: Props): React.JSX.Element {
  const [variantId, setVariantId] = useState<string | null>(null);
  const query = useMasterProductLedger(productId, { variantId });

  const rows = useMemo(
    () => query.data?.pages.flatMap((p) => p.rows) ?? [],
    [query.data],
  );

  const variantOptions = useMemo(
    () =>
      variants
        .filter((v) => !!v.sku)
        .map((v) => ({
          id: v.id,
          label: `${v.sku}${v.optionLabel ? ` · ${v.optionLabel}` : ""}`,
        })),
    [variants],
  );

  return (
    <Stack gap={3}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text fontSize="sm" color="gray.600">
          창고/채널/마스터 재고 변동을 모두 시간 역순으로 확인합니다.
        </Text>
        {variantOptions.length > 0 && (
          <Box>
            <select
              value={variantId ?? ""}
              onChange={(e) => setVariantId(e.target.value || null)}
              aria-label="변형 필터"
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                color: "#1a202c",
                backgroundColor: "white",
              }}
            >
              <option value="">전체 변형</option>
              {variantOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Box>
        )}
      </Flex>

      {query.isLoading ? (
        <Flex justify="center" py={8}>
          <Spinner />
        </Flex>
      ) : query.isError ? (
        <Text fontSize="sm" color="red.500">
          이력을 불러오지 못했습니다
        </Text>
      ) : rows.length === 0 ? (
        <Box
          py={10}
          textAlign="center"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Text fontSize="sm" color="gray.400">
            재고 변동 이력이 없습니다
          </Text>
        </Box>
      ) : (
        <Box
          overflowX="auto"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row bg="gray.50">
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  시각
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  SKU
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  범위
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  대상
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  사유
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontWeight="medium"
                  color="gray.600"
                  textAlign="right"
                >
                  변동
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  fontWeight="medium"
                  color="gray.600"
                  textAlign="right"
                >
                  이전 → 이후
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="medium" color="gray.600">
                  참조
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell
                    whiteSpace="nowrap"
                    fontSize="xs"
                    color="gray.700"
                  >
                    {formatDateTime(row.createdAt)}
                  </Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="xs" color="gray.700">
                    {row.variantSku ?? "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={SCOPE_COLOR[row.scope]} size="sm">
                      {SCOPE_LABEL[row.scope]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.700">
                    {scopeTarget(row)}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.700">
                    {REF_TYPE_LABEL[row.refType] ?? row.refType}
                  </Table.Cell>
                  <Table.Cell
                    textAlign="right"
                    fontWeight="semibold"
                    color={deltaColor(row.qtyDelta)}
                  >
                    {deltaText(row.qtyDelta)}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontSize="xs" color="gray.600">
                    {row.prevStock} → {row.newStock}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.500" maxW="240px">
                    {row.refId ? (
                      <Text title={row.refId} truncate>
                        {row.refId}
                      </Text>
                    ) : (
                      "-"
                    )}
                    {row.note && (
                      <Text
                        fontSize="xs"
                        color="gray.400"
                        mt={0.5}
                        truncate
                        title={row.note}
                      >
                        {row.note}
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {query.hasNextPage && (
        <Flex justify="center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            loading={query.isFetchingNextPage}
          >
            더 보기
          </Button>
        </Flex>
      )}

      {!query.isLoading && rows.length > 0 && !query.hasNextPage && (
        <Text fontSize="xs" color="gray.400" textAlign="center">
          마지막 이력입니다 · 총 {rows.length}건
        </Text>
      )}
    </Stack>
  );
}
