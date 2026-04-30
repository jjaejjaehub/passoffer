"use client";

import { Box, Table, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import type { ReactElement } from "react";
import type { InventoryRow, LocationNode } from "@oms/types";

interface LocationFlatListProps {
  nodes: LocationNode[];
  inventory: InventoryRow[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

function flatten(nodes: LocationNode[]): LocationNode[] {
  const out: LocationNode[] = [];
  const walk = (list: LocationNode[]): void => {
    for (const n of list) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function LocationFlatList({
  nodes,
  inventory,
  selectedCode,
  onSelect,
}: LocationFlatListProps): ReactElement {
  const flat = useMemo(() => flatten(nodes), [nodes]);

  const stockByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of inventory) {
      if (r.locationCode === undefined) continue;
      m.set(r.locationCode, (m.get(r.locationCode) ?? 0) + r.quantity);
    }
    return m;
  }, [inventory]);

  return (
    <Box>
      <Box
        mb={3}
        px={3}
        py={2}
        bg="blue.50"
        borderRadius="md"
        color="blue.800"
        fontSize="sm"
      >
        이 창고는 로케이션 트리를 지원하지 않습니다. 평면 목록으로 표시합니다.
      </Box>

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
              <Table.ColumnHeader>코드</Table.ColumnHeader>
              <Table.ColumnHeader>이름</Table.ColumnHeader>
              <Table.ColumnHeader>경로</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">재고</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {flat.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text fontSize="sm" color="gray.500" py={4} textAlign="center">
                    로케이션이 없습니다.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              flat.map((n) => {
                const isSelected = selectedCode === n.code;
                return (
                  <Table.Row
                    key={n.code}
                    bg={isSelected ? "blue.50" : undefined}
                    cursor="pointer"
                    onClick={() => onSelect(n.code)}
                    _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                  >
                    <Table.Cell fontFamily="mono">{n.code}</Table.Cell>
                    <Table.Cell>{n.name}</Table.Cell>
                    <Table.Cell color="gray.600" fontSize="xs">
                      {n.fullPath}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {(stockByCode.get(n.code) ?? 0).toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}
