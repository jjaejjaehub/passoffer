"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  parseExcelFile,
  validateRows,
  summarize,
} from "@/entities/inbound-batch";
import type { ParsedBatch, ParsedRow } from "@/entities/inbound-batch";
import { useMasterProducts } from "@/entities/master-product";
import {
  useCreateInboundOrder,
  useWarehouseCapabilities,
} from "@/entities/warehouse";
import { ExcelUploadDropzone } from "@/features/inbound-excel-upload";
import { EmptyState, LoadingState } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";
import {
  BatchDetailDrawer,
  InboundBatchTable,
  WarehouseSelector,
  useSelectedWarehouseId,
} from "@/widgets/admin-warehouses";
import type { InboundBatch } from "@oms/types";

const NO_BATCH_INBOUND_REASON = "이 창고는 배치 입고를 지원하지 않습니다";

function genId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickEarliestDate(rows: ParsedRow[]): string {
  let earliest: number | null = null;
  for (const r of rows) {
    if (r.expectedAt === null) continue;
    const t = new Date(r.expectedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (earliest === null || t < earliest) earliest = t;
  }
  if (earliest === null) return new Date().toISOString();
  return new Date(earliest).toISOString();
}

function toInboundBatch(batch: ParsedBatch): InboundBatch {
  const valid = batch.rows.filter((r) => r.errors.length === 0);
  return {
    expectedAt: pickEarliestDate(valid),
    items: valid.map((r) => ({
      sku: r.sku as string,
      quantity: r.quantity as number,
      ...(r.lotCode !== null ? { lotCode: r.lotCode } : {}),
    })),
    note: `엑셀 업로드: ${batch.fileName}`,
  };
}

export function InboundPage(): ReactElement {
  const { warehouseId } = useSelectedWarehouseId();
  const [batches, setBatches] = useState<ParsedBatch[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [pendingDispatchIds, setPendingDispatchIds] = useState<Set<string>>(
    new Set(),
  );

  const capabilitiesQuery = useWarehouseCapabilities(warehouseId ?? undefined);
  const masterQuery = useMasterProducts({ pageSize: 1000 });
  const createInbound = useCreateInboundOrder(warehouseId ?? "");

  const skuSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of masterQuery.data?.items ?? []) {
      if (item.code) set.add(item.code);
    }
    return set;
  }, [masterQuery.data]);

  const capabilities = capabilitiesQuery.data?.capabilities ?? null;
  const supportsBatchInbound = capabilities?.supportsBatchInbound ?? false;
  const uploadDisabled =
    warehouseId === null ||
    capabilitiesQuery.isLoading ||
    masterQuery.isLoading ||
    !supportsBatchInbound;
  const uploadDisabledReason =
    !supportsBatchInbound && capabilities !== null
      ? NO_BATCH_INBOUND_REASON
      : undefined;

  async function handleFile(file: File): Promise<void> {
    setParsing(true);
    try {
      const { rows, presentColumns } = await parseExcelFile(file);
      const { rows: validated, missingColumns } = validateRows({
        rows,
        presentColumns,
        skuSet,
      });
      const summary = summarize(validated);

      const newBatch: ParsedBatch = {
        id: genId(),
        fileName: file.name,
        createdAt: new Date().toISOString(),
        rows: validated,
        status: "pending_dispatch",
        vendorRef: null,
        dispatchError: null,
      };
      setBatches((prev) => [newBatch, ...prev]);

      if (missingColumns.length > 0) {
        appToaster.create({
          title: "필수 컬럼이 누락되었습니다",
          description: `누락: ${missingColumns.join(", ")} · 모든 행이 오류로 표시됩니다.`,
          type: "warning",
        });
      } else if (summary.errorCount > 0) {
        appToaster.create({
          title: "일부 행에 오류가 있습니다",
          description: `정상 ${summary.validCount} / 오류 ${summary.errorCount} (총 ${summary.total})`,
          type: "warning",
        });
      } else {
        appToaster.create({
          title: "엑셀 파싱 완료",
          description: `정상 ${summary.validCount}행이 등록되었습니다.`,
          type: "success",
        });
      }
    } catch (e) {
      appToaster.create({
        title: "엑셀 파싱 실패",
        description: e instanceof Error ? e.message : "알 수 없는 오류",
        type: "error",
      });
    } finally {
      setParsing(false);
    }
  }

  async function dispatchOne(id: string): Promise<void> {
    const target = batches.find((b) => b.id === id);
    if (!target) return;
    if (target.status !== "pending_dispatch") return;
    const validRows = target.rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      appToaster.create({
        title: "전송할 정상 행이 없습니다",
        type: "warning",
      });
      return;
    }
    setPendingDispatchIds((prev) => new Set(prev).add(id));
    try {
      const payload = toInboundBatch(target);
      const res = await createInbound.mutateAsync(payload);
      setBatches((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: "instructed",
                vendorRef: res.vendorRef ?? null,
                dispatchError: null,
              }
            : b,
        ),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "전송 실패";
      setBatches((prev) =>
        prev.map((b) => (b.id === id ? { ...b, dispatchError: msg } : b)),
      );
      throw e;
    } finally {
      setPendingDispatchIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkDispatch(): Promise<void> {
    const ids = batches
      .filter(
        (b) =>
          selectedIds.has(b.id) &&
          b.status === "pending_dispatch" &&
          b.rows.some((r) => r.errors.length === 0),
      )
      .map((b) => b.id);
    if (ids.length === 0) {
      appToaster.create({
        title: "전송할 배치가 없습니다",
        type: "warning",
      });
      return;
    }

    const results = await Promise.allSettled(ids.map((id) => dispatchOne(id)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    appToaster.create({
      title: "전송 결과",
      description: `성공 ${ok} · 실패 ${fail}`,
      type: fail === 0 ? "success" : "warning",
    });
  }

  function toggleOne(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(next: boolean): void {
    if (!next) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(
      new Set(
        batches.filter((b) => b.status === "pending_dispatch").map((b) => b.id),
      ),
    );
  }

  const selectedDispatchable = batches.filter(
    (b) =>
      selectedIds.has(b.id) &&
      b.status === "pending_dispatch" &&
      b.rows.some((r) => r.errors.length === 0),
  ).length;
  const bulkPending = pendingDispatchIds.size > 0;

  const detailBatch = batches.find((b) => b.id === openDetailId) ?? null;
  const detailPending =
    detailBatch !== null && pendingDispatchIds.has(detailBatch.id);

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">입고 예정</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title="창고를 선택해주세요"
          description="우측 상단에서 창고를 선택하면 입고 예정 업로드와 배치 목록이 표시됩니다."
        />
      ) : capabilitiesQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : capabilitiesQuery.isError ? (
        <EmptyState
          title="창고 정보를 불러오지 못했습니다"
          description="새로고침 후에도 동일하면 관리자에게 문의해 주세요."
        />
      ) : (
        <Stack gap={6}>
          <ExcelUploadDropzone
            onFile={(f) => {
              void handleFile(f);
            }}
            disabled={uploadDisabled || parsing}
            disabledReason={uploadDisabledReason}
          />

          <Box>
            <Flex align="center" justify="space-between" mb={3}>
              <Text fontSize="sm" color="gray.700">
                배치 목록 ({batches.length})
              </Text>
              <HStack gap={2}>
                <Text fontSize="xs" color="gray.500">
                  선택 {selectedDispatchable}개
                </Text>
                <Button
                  size="sm"
                  colorPalette="blue"
                  disabled={selectedDispatchable === 0 || bulkPending}
                  loading={bulkPending}
                  onClick={() => {
                    void handleBulkDispatch();
                  }}
                  title={
                    selectedDispatchable === 0
                      ? "전송 가능한 배치를 선택해 주세요"
                      : undefined
                  }
                >
                  선택 일괄 전송
                </Button>
              </HStack>
            </Flex>
            <InboundBatchTable
              batches={batches}
              selectedIds={selectedIds}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              onOpenDetail={(id) => setOpenDetailId(id)}
            />
          </Box>
        </Stack>
      )}

      <BatchDetailDrawer
        batch={detailBatch}
        onClose={() => setOpenDetailId(null)}
        onDispatch={(id) => {
          void dispatchOne(id).catch(() => {});
        }}
        dispatchPending={detailPending}
      />
    </Box>
  );
}
