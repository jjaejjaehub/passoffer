"use client";

import { Box, Stack, Table, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";
import type { BulkCreateResult } from "@/entities/master-product";
import type { ParsedMasterProductItem } from "@/entities/master-product/lib/parseMasterProductExcel";

interface MasterProductPreviewTableProps {
  items: ParsedMasterProductItem[];
  results?: BulkCreateResult[];
}

function formatOptions(item: ParsedMasterProductItem): string {
  if (!item.optionGroups || item.optionGroups.length === 0) return "-";
  return item.optionGroups
    .map((g) => `${g.name}(${g.values.length})`)
    .join(", ");
}

export function MasterProductPreviewTable({
  items,
  results,
}: MasterProductPreviewTableProps): ReactElement {
  const resultByCode = new Map<string, BulkCreateResult>();
  if (results) {
    for (const r of results) resultByCode.set(r.code, r);
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="40px">#</Table.ColumnHeader>
            <Table.ColumnHeader>code</Table.ColumnHeader>
            <Table.ColumnHeader>title</Table.ColumnHeader>
            <Table.ColumnHeader>brand</Table.ColumnHeader>
            <Table.ColumnHeader>옵션 그룹</Table.ColumnHeader>
            <Table.ColumnHeader>변형 수</Table.ColumnHeader>
            <Table.ColumnHeader>소비자가</Table.ColumnHeader>
            {results !== undefined && (
              <Table.ColumnHeader>결과</Table.ColumnHeader>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={results !== undefined ? 8 : 7}>
                <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                  파일에서 추출된 상품이 없습니다.
                </Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            items.map((item, idx) => {
              const r = resultByCode.get(item.code);
              const bg =
                r === undefined ? undefined : r.ok ? "green.50" : "red.50";
              return (
                <Table.Row key={item.code} bg={bg}>
                  <Table.Cell>
                    <Text fontSize="xs" color="gray.500">
                      {idx + 1}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {item.code}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.title}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.brand ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs">{formatOptions(item)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.variants?.length ?? 0}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.retailPrice ?? "-"}</Text>
                  </Table.Cell>
                  {results !== undefined && (
                    <Table.Cell>
                      {r === undefined ? (
                        <Text fontSize="xs" color="gray.500">
                          대기
                        </Text>
                      ) : r.ok ? (
                        <Stack gap={0}>
                          <Text fontSize="xs" color="green.700">
                            성공
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            변형 {r.variantsCreated}개
                          </Text>
                        </Stack>
                      ) : (
                        <Text fontSize="xs" color="red.700">
                          {r.error}
                        </Text>
                      )}
                    </Table.Cell>
                  )}
                </Table.Row>
              );
            })
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
