"use client";

import { Box, Table, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { InventoryRow, WMSCapabilities } from "@oms/types";
import { EmptyState, StatusBadge } from "@/shared/ui";

interface InventoryTableProps {
  rows: InventoryRow[];
  capabilities: WMSCapabilities;
  groupBy: "lot" | "sku";
}

type SortKey = "sku" | "lotCode" | "quantity";
type SortDir = "asc" | "desc";

interface SkuGroupRow {
  sku: string;
  vendorSku?: string;
  lotCount: number;
  totalQuantity: number;
  totalReserved: number;
  freshness: InventoryRow["freshness"];
}

export function InventoryTable({
  rows,
  capabilities,
  groupBy,
}: InventoryTableProps): ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>("sku");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedLotRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "sku") return a.sku.localeCompare(b.sku) * dir;
      if (sortKey === "lotCode") {
        return (a.lotCode ?? "").localeCompare(b.lotCode ?? "") * dir;
      }
      return (a.quantity - b.quantity) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const skuGroups = useMemo<SkuGroupRow[]>(() => {
    if (groupBy !== "sku") return [];
    const map = new Map<string, SkuGroupRow>();
    for (const r of rows) {
      const existing = map.get(r.sku);
      if (existing) {
        existing.lotCount += 1;
        existing.totalQuantity += r.quantity;
        existing.totalReserved += r.reservedQuantity;
        if (r.freshness === "stale" && existing.freshness === "fresh") {
          existing.freshness = "stale";
        }
      } else {
        map.set(r.sku, {
          sku: r.sku,
          vendorSku: r.vendorSku,
          lotCount: 1,
          totalQuantity: r.quantity,
          totalReserved: r.reservedQuantity,
          freshness: r.freshness,
        });
      }
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "quantity")
        return (a.totalQuantity - b.totalQuantity) * dir;
      return a.sku.localeCompare(b.sku) * dir;
    });
    return arr;
  }, [rows, groupBy, sortKey, sortDir]);

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="조회된 재고가 없습니다"
        description="검색어를 변경하거나 새로고침해 주세요."
      />
    );
  }

  const showLotColumn = capabilities.supportsLotTracking;
  const showLocationColumn = capabilities.supportsLocationTree;

  return (
    <Box>
      {!capabilities.supportsLotTracking ? (
        <Box
          mb={3}
          px={3}
          py={2}
          bg="blue.50"
          borderRadius="md"
          color="blue.800"
          fontSize="sm"
        >
          이 창고는 LOT 추적을 지원하지 않습니다. LOT 단위 그룹은
          비활성화됩니다.
        </Box>
      ) : null}

      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
        bg="white"
      >
        <Table.Root size="sm" variant="line">
          <Table.Header bg="gray.50">
            <Table.Row>
              <SortableHeader
                label="SKU"
                active={sortKey === "sku"}
                dir={sortDir}
                onClick={() => toggleSort("sku")}
              />
              {groupBy === "lot" && showLotColumn ? (
                <SortableHeader
                  label="LOT 번호"
                  active={sortKey === "lotCode"}
                  dir={sortDir}
                  onClick={() => toggleSort("lotCode")}
                />
              ) : null}
              {groupBy === "sku" ? (
                <Table.ColumnHeader>LOT 수</Table.ColumnHeader>
              ) : null}
              {groupBy === "lot" && showLocationColumn ? (
                <Table.ColumnHeader>로케이션</Table.ColumnHeader>
              ) : null}
              <SortableHeader
                label="수량"
                active={sortKey === "quantity"}
                dir={sortDir}
                onClick={() => toggleSort("quantity")}
                isNumeric
              />
              <Table.ColumnHeader>예약</Table.ColumnHeader>
              <Table.ColumnHeader>신선도</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {groupBy === "lot"
              ? sortedLotRows.map((row, idx) => (
                  <Table.Row
                    key={`${row.sku}-${row.lotCode ?? idx}`}
                    bg={row.quantity === 0 ? "gray.50" : undefined}
                    color={row.quantity === 0 ? "fg.muted" : undefined}
                  >
                    <Table.Cell fontFamily="mono">{row.sku}</Table.Cell>
                    {showLotColumn ? (
                      <Table.Cell fontFamily="mono">
                        {row.lotCode ?? "—"}
                      </Table.Cell>
                    ) : null}
                    {showLocationColumn ? (
                      <Table.Cell>{row.locationCode ?? "—"}</Table.Cell>
                    ) : null}
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {row.quantity === 0 ? (
                        <Text as="span" color="gray.500">
                          품절
                        </Text>
                      ) : (
                        row.quantity.toLocaleString()
                      )}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {row.reservedQuantity.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>
                      <FreshnessBadge value={row.freshness} />
                    </Table.Cell>
                  </Table.Row>
                ))
              : skuGroups.map((g) => (
                  <Table.Row key={g.sku}>
                    <Table.Cell fontFamily="mono">{g.sku}</Table.Cell>
                    <Table.Cell>{g.lotCount}개 LOT</Table.Cell>
                    {showLocationColumn ? (
                      <Table.Cell color="fg.muted">—</Table.Cell>
                    ) : null}
                    <Table.Cell
                      textAlign="right"
                      fontFamily="mono"
                      fontWeight="bold"
                      color="blue.700"
                    >
                      {g.totalQuantity.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {g.totalReserved.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>
                      <FreshnessBadge value={g.freshness} />
                    </Table.Cell>
                  </Table.Row>
                ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  isNumeric?: boolean;
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  isNumeric = false,
}: SortableHeaderProps): ReactElement {
  const Icon = active
    ? dir === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;
  return (
    <Table.ColumnHeader textAlign={isNumeric ? "right" : undefined}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
          color: active ? "#2563eb" : "inherit",
          fontWeight: 600,
        }}
      >
        {label}
        <Icon size={12} />
      </button>
    </Table.ColumnHeader>
  );
}

function FreshnessBadge({
  value,
}: {
  value: InventoryRow["freshness"];
}): ReactElement {
  if (value === "fresh") {
    return <StatusBadge tone="success" label="실시간" />;
  }
  if (value === "stale") {
    return <StatusBadge tone="warning" label="지연" />;
  }
  return <StatusBadge tone="neutral" label="미상" />;
}
