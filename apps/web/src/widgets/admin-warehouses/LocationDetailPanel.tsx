"use client";

import { Box, Flex, Heading, Table, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";
import type { InventoryRow, LocationNode, WMSVendor } from "@oms/types";
import { EmptyState, StatusBadge } from "@/shared/ui";

interface LocationDetailPanelProps {
  node: LocationNode | null;
  inventory: InventoryRow[];
  vendor: WMSVendor;
}

function findNodeByCode(
  nodes: LocationNode[],
  code: string,
): LocationNode | null {
  for (const n of nodes) {
    if (n.code === code) return n;
    if (n.children) {
      const found = findNodeByCode(n.children, code);
      if (found) return found;
    }
  }
  return null;
}

export function findLocation(
  roots: LocationNode[],
  code: string | null,
): LocationNode | null {
  if (code === null) return null;
  return findNodeByCode(roots, code);
}

export function LocationDetailPanel({
  node,
  inventory,
  vendor,
}: LocationDetailPanelProps): ReactElement {
  if (node === null) {
    return (
      <EmptyState
        title="로케이션을 선택해주세요"
        description="좌측 트리에서 로케이션을 클릭하면 상세 정보가 표시됩니다."
      />
    );
  }

  const stockRows = inventory.filter((r) => r.locationCode === node.code);
  const totalQuantity = stockRows.reduce((sum, r) => sum + r.quantity, 0);
  const totalReserved = stockRows.reduce(
    (sum, r) => sum + r.reservedQuantity,
    0,
  );

  return (
    <Box>
      <Box mb={4}>
        <Flex align="center" gap={2} mb={1}>
          <Heading size="md">{node.name}</Heading>
          <StatusBadge tone="neutral" label={vendor} />
        </Flex>
        <Text fontSize="sm" color="gray.600" fontFamily="mono">
          {node.fullPath}
        </Text>
        <Flex gap={4} mt={2} fontSize="sm" color="gray.700">
          <Text>
            코드: <Text as="span" fontFamily="mono">{node.code}</Text>
          </Text>
          <Text>레벨: {node.level}</Text>
        </Flex>
      </Box>

      <Box mb={4}>
        <Heading size="sm" mb={2}>
          재고 요약
        </Heading>
        <Flex gap={6}>
          <Stat label="총 수량" value={totalQuantity.toLocaleString()} />
          <Stat label="예약 수량" value={totalReserved.toLocaleString()} />
          <Stat label="LOT/SKU 수" value={String(stockRows.length)} />
        </Flex>
      </Box>

      <Box>
        <Heading size="sm" mb={2}>
          보관 중 재고
        </Heading>
        {stockRows.length === 0 ? (
          <Box
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="md"
            p={6}
            textAlign="center"
            color="gray.500"
          >
            <Text fontSize="sm">이 로케이션에는 재고가 없습니다.</Text>
          </Box>
        ) : (
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
                  <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  <Table.ColumnHeader>LOT</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">
                    수량
                  </Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">
                    예약
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {stockRows.map((r, idx) => (
                  <Table.Row key={`${r.sku}-${r.lotCode ?? idx}`}>
                    <Table.Cell fontFamily="mono">{r.sku}</Table.Cell>
                    <Table.Cell fontFamily="mono">
                      {r.lotCode ?? "—"}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {r.quantity.toLocaleString()}
                    </Table.Cell>
                    <Table.Cell textAlign="right" fontFamily="mono">
                      {r.reservedQuantity.toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="bold" fontFamily="mono">
        {value}
      </Text>
    </Box>
  );
}
