"use client";

import { Box, Button, Checkbox, Flex, Table, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import type { ReactElement } from "react";
import type { ParsedBatch, ParsedBatchStatus } from "@/entities/inbound-batch";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import type { StatusBadgeTone } from "@/shared/ui/StatusBadge";

interface InboundBatchTableProps {
  batches: ParsedBatch[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (next: boolean) => void;
  onOpenDetail: (id: string) => void;
}

const STATUS_LABEL: Record<ParsedBatchStatus, string> = {
  pending_dispatch: "전송 대기",
  instructed: "전송 완료",
  received: "입고 완료",
  canceled: "취소",
};

const STATUS_TONE: Record<ParsedBatchStatus, StatusBadgeTone> = {
  pending_dispatch: "warning",
  instructed: "info",
  received: "success",
  canceled: "neutral",
};

function freshnessOf(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "-";
  const diff = Date.now() - created;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function InboundBatchTable({
  batches,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpenDetail,
}: InboundBatchTableProps): ReactElement {
  const dispatchableIds = useMemo(
    () =>
      batches.filter((b) => b.status === "pending_dispatch").map((b) => b.id),
    [batches],
  );
  const allSelected =
    dispatchableIds.length > 0 &&
    dispatchableIds.every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && dispatchableIds.some((id) => selectedIds.has(id));

  return (
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
            <Table.ColumnHeader w="44px">
              <Checkbox.Root
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={(e) => onToggleAll(e.checked === true)}
                disabled={dispatchableIds.length === 0}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Table.ColumnHeader>
            <Table.ColumnHeader>배치 ID</Table.ColumnHeader>
            <Table.ColumnHeader>파일명</Table.ColumnHeader>
            <Table.ColumnHeader>등록일</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">행 개수</Table.ColumnHeader>
            <Table.ColumnHeader>상태</Table.ColumnHeader>
            <Table.ColumnHeader>Vendor Ref</Table.ColumnHeader>
            <Table.ColumnHeader>Freshness</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">액션</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {batches.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={9}>
                <Text fontSize="sm" color="gray.500" py={6} textAlign="center">
                  등록된 배치가 없습니다. 엑셀을 업로드해 주세요.
                </Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            batches.map((batch) => {
              const total = batch.rows.length;
              const validCount = batch.rows.filter(
                (r) => r.errors.length === 0,
              ).length;
              const errorCount = total - validCount;
              const canSelect = batch.status === "pending_dispatch";
              const checked = selectedIds.has(batch.id);
              return (
                <Table.Row key={batch.id}>
                  <Table.Cell>
                    <Checkbox.Root
                      checked={checked}
                      onCheckedChange={() => onToggle(batch.id)}
                      disabled={!canSelect}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="xs">
                    {shortId(batch.id)}
                  </Table.Cell>
                  <Table.Cell fontSize="sm" maxW="220px" truncate>
                    {batch.fileName}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.600">
                    {new Date(batch.createdAt).toLocaleString("ko-KR")}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontSize="sm">
                    <Flex justify="flex-end" gap={2} align="center">
                      <Text>{total.toLocaleString()}</Text>
                      {errorCount > 0 ? (
                        <Text fontSize="xs" color="red.600">
                          (오류 {errorCount})
                        </Text>
                      ) : null}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge
                      tone={STATUS_TONE[batch.status]}
                      label={STATUS_LABEL[batch.status]}
                    />
                    {batch.dispatchError !== null ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {batch.dispatchError}
                      </Text>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="xs" color="gray.700">
                    {batch.vendorRef ?? "-"}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="gray.500">
                    {freshnessOf(batch.createdAt)}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onOpenDetail(batch.id)}
                    >
                      상세
                    </Button>
                  </Table.Cell>
                </Table.Row>
              );
            })
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
