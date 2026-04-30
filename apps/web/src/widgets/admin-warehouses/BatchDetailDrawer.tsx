"use client";

import {
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import type { ReactElement } from "react";
import type { ParsedBatch, ParsedRow, ParsedRowError } from "@/entities/inbound-batch";

interface BatchDetailDrawerProps {
  batch: ParsedBatch | null;
  onClose: () => void;
  onDispatch?: (id: string) => void;
  dispatchPending?: boolean;
}

function formatError(err: ParsedRowError): string {
  switch (err.code) {
    case "missing_columns":
      return `필수 컬럼 누락: ${err.missing.join(", ")}`;
    case "sku_not_found":
      return `등록되지 않은 SKU: ${err.sku || "(빈 값)"}`;
    case "quantity_invalid":
      return `수량 오류: ${err.raw === null || err.raw === undefined ? "(빈 값)" : String(err.raw)}`;
    case "date_invalid":
      return `날짜 오류: ${err.raw === null || err.raw === undefined ? "(빈 값)" : String(err.raw)}`;
  }
}

function formatRowDate(value: string | null): string {
  if (value === null) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function rowsByErrorFirst(rows: ParsedRow[]): ParsedRow[] {
  return [...rows].sort((a, b) => {
    const aErr = a.errors.length > 0 ? 0 : 1;
    const bErr = b.errors.length > 0 ? 0 : 1;
    if (aErr !== bErr) return aErr - bErr;
    return a.rowIndex - b.rowIndex;
  });
}

export function BatchDetailDrawer({
  batch,
  onClose,
  onDispatch,
  dispatchPending = false,
}: BatchDetailDrawerProps): ReactElement {
  const isOpen = batch !== null;
  const total = batch?.rows.length ?? 0;
  const validCount = batch?.rows.filter((r) => r.errors.length === 0).length ?? 0;
  const errorCount = total - validCount;
  const sorted = batch ? rowsByErrorFirst(batch.rows) : [];
  const canDispatch =
    batch !== null &&
    batch.status === "pending_dispatch" &&
    validCount > 0 &&
    onDispatch !== undefined;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      size="xl"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              배치 상세 {batch ? `— ${batch.fileName}` : ""}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={4}>
            {batch === null ? null : (
              <Stack gap={4}>
                <HStack gap={6} fontSize="sm">
                  <Text>
                    <Text as="span" color="gray.500">
                      총
                    </Text>{" "}
                    <strong>{total}</strong>
                  </Text>
                  <Text color="green.700">
                    정상 <strong>{validCount}</strong>
                  </Text>
                  <Text color="red.600">
                    오류 <strong>{errorCount}</strong>
                  </Text>
                  {batch.vendorRef !== null ? (
                    <Text color="gray.600">
                      Vendor Ref:{" "}
                      <Text as="span" fontFamily="mono">
                        {batch.vendorRef}
                      </Text>
                    </Text>
                  ) : null}
                </HStack>

                {batch.dispatchError !== null ? (
                  <Box
                    bg="red.50"
                    borderWidth="1px"
                    borderColor="red.200"
                    borderRadius="md"
                    px={3}
                    py={2}
                  >
                    <Text fontSize="sm" color="red.700">
                      전송 실패: {batch.dispatchError}
                    </Text>
                  </Box>
                ) : null}

                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  overflow="hidden"
                  maxH="60vh"
                  overflowY="auto"
                >
                  <Table.Root size="sm" variant="line">
                    <Table.Header bg="gray.50" position="sticky" top={0} zIndex={1}>
                      <Table.Row>
                        <Table.ColumnHeader w="60px">행</Table.ColumnHeader>
                        <Table.ColumnHeader>SKU</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">수량</Table.ColumnHeader>
                        <Table.ColumnHeader>예정일</Table.ColumnHeader>
                        <Table.ColumnHeader>로트</Table.ColumnHeader>
                        <Table.ColumnHeader>상태/오류</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {sorted.map((row) => {
                        const hasError = row.errors.length > 0;
                        return (
                          <Table.Row
                            key={row.rowIndex}
                            bg={hasError ? "red.50" : undefined}
                          >
                            <Table.Cell fontFamily="mono" fontSize="xs">
                              {row.rowIndex}
                            </Table.Cell>
                            <Table.Cell fontFamily="mono" fontSize="xs">
                              {row.sku ?? String(row.rawSku ?? "-")}
                            </Table.Cell>
                            <Table.Cell textAlign="right" fontFamily="mono">
                              {row.quantity ?? "-"}
                            </Table.Cell>
                            <Table.Cell fontSize="xs">
                              {formatRowDate(row.expectedAt)}
                            </Table.Cell>
                            <Table.Cell fontSize="xs">
                              {row.lotCode ?? "-"}
                            </Table.Cell>
                            <Table.Cell fontSize="xs">
                              {hasError ? (
                                <Stack gap={1}>
                                  {row.errors.map((err, i) => (
                                    <Text key={i} color="red.600">
                                      {formatError(err)}
                                    </Text>
                                  ))}
                                </Stack>
                              ) : (
                                <Text color="green.700">정상</Text>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Stack>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Flex w="100%" justify="space-between" align="center">
              <Text fontSize="xs" color="gray.500">
                오류 행은 자동으로 위쪽에 표시됩니다.
              </Text>
              <HStack gap={2}>
                <Button variant="outline" size="sm" onClick={onClose}>
                  닫기
                </Button>
                {batch !== null && onDispatch !== undefined ? (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    disabled={!canDispatch}
                    loading={dispatchPending}
                    onClick={() => onDispatch(batch.id)}
                    title={
                      !canDispatch
                        ? batch.status !== "pending_dispatch"
                          ? "이미 전송된 배치입니다"
                          : "정상 행이 없습니다"
                        : undefined
                    }
                  >
                    벤더로 전송
                  </Button>
                ) : null}
              </HStack>
            </Flex>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
