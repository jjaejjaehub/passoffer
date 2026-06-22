"use client";

import { useMemo, useRef, useState } from "react";
import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

import { useBulkSetSendingInfo, type OrderListItem } from "@/entities/order";
import { appToaster } from "@/shared/ui/app-toaster";

import { CARRIER_OPTIONS } from "../model/schema";

export interface ExcelUploadTrackingModalProps {
  open: boolean;
  onClose: () => void;
  candidateOrders: OrderListItem[];
  onCompleted?: () => void;
}

interface ParsedRow {
  rowIndex: number;
  channelOrderId: string;
  carrierRaw: string;
  trackingRaw: string;
  matchedOrder: OrderListItem | null;
  resolvedCarrier: string | null;
  trackingDigits: string;
  errors: string[];
}

const CARRIER_NAME_SET = new Set<string>(CARRIER_OPTIONS.map((c) => c.name));
const CARRIER_ID_TO_NAME = new Map<string, string>(
  CARRIER_OPTIONS.map((c) => [c.id, c.name]),
);

function resolveCarrier(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (CARRIER_NAME_SET.has(v)) return v;
  const byId = CARRIER_ID_TO_NAME.get(v.toLowerCase());
  if (byId) return byId;
  return null;
}

function downloadTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    ["주문번호", "택배사", "송장번호"],
    ["예: ABC-12345", "CJ대한통운", "1234567890"],
  ]);
  ws["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "운송장양식");
  XLSX.writeFile(wb, "tracking_template.xlsx");
}

function parseFile(
  file: File,
  candidates: OrderListItem[],
): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });
        const orderByChannelId = new Map<string, OrderListItem>();
        candidates.forEach((o) => {
          if (o.channelOrderId) orderByChannelId.set(o.channelOrderId, o);
        });
        const rows: ParsedRow[] = raw.map((row, idx) => {
          const channelOrderId = String(
            row["주문번호"] ?? row["orderId"] ?? "",
          ).trim();
          const carrierRaw = String(
            row["택배사"] ?? row["carrier"] ?? "",
          ).trim();
          const trackingRaw = String(
            row["송장번호"] ?? row["trackingNo"] ?? "",
          ).trim();
          const errors: string[] = [];
          const matched = channelOrderId
            ? (orderByChannelId.get(channelOrderId) ?? null)
            : null;
          const resolvedCarrier = resolveCarrier(carrierRaw);
          const trackingDigits = trackingRaw.replace(/[^\d]/g, "");
          if (!channelOrderId) errors.push("주문번호 누락");
          else if (!matched) errors.push("일치하는 주문 없음");
          if (!carrierRaw) errors.push("택배사 누락");
          else if (!resolvedCarrier) errors.push("알 수 없는 택배사");
          if (!trackingRaw) errors.push("송장번호 누락");
          else if (trackingDigits.length < 6) errors.push("송장번호 형식 오류");
          return {
            rowIndex: idx + 2,
            channelOrderId,
            carrierRaw,
            trackingRaw,
            matchedOrder: matched,
            resolvedCarrier,
            trackingDigits,
            errors,
          };
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function ExcelUploadTrackingModal({
  open,
  onClose,
  candidateOrders,
  onCompleted,
}: ExcelUploadTrackingModalProps): React.JSX.Element | null {
  const bulkMut = useBulkSetSendingInfo();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const validRows = useMemo(
    () => rows.filter((r) => r.errors.length === 0),
    [rows],
  );
  const invalidCount = rows.length - validRows.length;
  const canSubmit = validRows.length > 0 && !bulkMut.isPending;

  if (!open) return null;

  const reset = (): void => {
    setFileName(null);
    setRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    try {
      const parsed = await parseFile(file, candidateOrders);
      setRows(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setRows([]);
    }
  };

  const submit = async (): Promise<void> => {
    if (validRows.length === 0) return;
    const items = validRows.map((r) => ({
      orderId: r.matchedOrder!.id,
      shippingCorp: r.resolvedCarrier!,
      trackingNo: r.trackingDigits,
    }));
    try {
      const res = await bulkMut.mutateAsync({ items });
      appToaster.create({
        title: "운송장 전송 완료",
        description: `요청 ${res.totalRequested}건 / 성공 ${res.totalSent}건 / 실패 ${res.totalFailed}건`,
        type: res.totalFailed > 0 ? "warning" : "success",
      });
      onCompleted?.();
      reset();
      onClose();
    } catch (err) {
      appToaster.create({
        title: "운송장 전송 실패",
        description: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => {
          if (!bulkMut.isPending) {
            reset();
            onClose();
          }
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: "calc(100% - 32px)", md: "900px" }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Flex align="center" gap={2}>
            <FileSpreadsheet size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                엑셀로 운송장 일괄 등록
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                양식 다운로드 → 채워서 업로드 → 미리보기 확인 → 일괄 전송
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={() => {
              if (!bulkMut.isPending) {
                reset();
                onClose();
              }
            }}
            disabled={bulkMut.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#718096",
              background: "transparent",
              border: "none",
              cursor: bulkMut.isPending ? "not-allowed" : "pointer",
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={3} borderBottomWidth="1px" borderColor="gray.100">
          <HStack gap={3}>
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download size={14} style={{ marginRight: 6 }} />
              양식 다운로드
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                void handleFile(e);
              }}
            />
            <Button
              size="sm"
              colorScheme="blue"
              variant="solid"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              엑셀 업로드
            </Button>
            {fileName && (
              <Text fontSize="xs" color="gray.600">
                선택된 파일: {fileName}
              </Text>
            )}
            {rows.length > 0 && (
              <Button size="xs" variant="ghost" onClick={reset}>
                초기화
              </Button>
            )}
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={2}>
            컬럼: 주문번호 / 택배사 / 송장번호 (택배사는 한글명 또는 코드 cj /
            lotte / hanjin / epost / etc)
          </Text>
        </Box>

        <Box px={5} py={4} overflowY="auto" flex={1}>
          {parseError && (
            <Box
              bg="red.50"
              borderWidth="1px"
              borderColor="red.200"
              color="red.700"
              fontSize="sm"
              px={3}
              py={2}
              borderRadius="md"
              mb={3}
            >
              파일 파싱 실패: {parseError}
            </Box>
          )}

          {rows.length === 0 && !parseError && (
            <Box
              bg="gray.50"
              borderWidth="1px"
              borderColor="gray.200"
              color="gray.600"
              fontSize="sm"
              px={3}
              py={8}
              borderRadius="md"
              textAlign="center"
            >
              양식을 다운로드한 후 업로드하면 미리보기가 표시됩니다
            </Box>
          )}

          {rows.length > 0 && (
            <VStack gap={3} align="stretch">
              <HStack gap={4} fontSize="sm">
                <Text color="gray.700">총 {rows.length}행</Text>
                <Text color="green.700">유효 {validRows.length}행</Text>
                <Text color="red.700">에러 {invalidCount}행</Text>
              </HStack>
              <Box
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                overflow="hidden"
              >
                <Box
                  as="table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <Box as="thead" bg="gray.50">
                    <Box as="tr">
                      {["행", "주문번호", "택배사", "송장번호", "상태"].map(
                        (h) => (
                          <Box
                            as="th"
                            key={h}
                            style={{
                              padding: "8px 10px",
                              textAlign: "left",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#4a5568",
                            }}
                          >
                            {h}
                          </Box>
                        ),
                      )}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {rows.map((r) => {
                      const isOk = r.errors.length === 0;
                      return (
                        <Box
                          as="tr"
                          key={r.rowIndex}
                          style={{
                            borderTop: "1px solid #edf2f7",
                            background: isOk ? "white" : "#fff5f5",
                          }}
                        >
                          <Box
                            as="td"
                            style={{
                              padding: "6px 10px",
                              fontSize: 12,
                              color: "#718096",
                            }}
                          >
                            {r.rowIndex}
                          </Box>
                          <Box
                            as="td"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          >
                            {r.channelOrderId || "-"}
                          </Box>
                          <Box
                            as="td"
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          >
                            {r.resolvedCarrier ?? (
                              <Text as="span" fontSize="13px" color="red.600">
                                {r.carrierRaw || "-"}
                              </Text>
                            )}
                          </Box>
                          <Box
                            as="td"
                            style={{
                              padding: "6px 10px",
                              fontSize: 13,
                              fontFamily: "monospace",
                            }}
                          >
                            {r.trackingDigits || "-"}
                          </Box>
                          <Box
                            as="td"
                            style={{
                              padding: "6px 10px",
                              fontSize: 12,
                              color: isOk ? "#22543d" : "#742a2a",
                            }}
                          >
                            {isOk ? "✓ 유효" : `✗ ${r.errors.join(", ")}`}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </VStack>
          )}
        </Box>

        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={3}
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          <Text fontSize="xs" color="gray.600">
            {validRows.length > 0
              ? `${validRows.length}건이 전송됩니다`
              : "유효한 행이 없습니다"}
          </Text>
          <HStack gap={2}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!bulkMut.isPending) {
                  reset();
                  onClose();
                }
              }}
              disabled={bulkMut.isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              colorScheme="blue"
              size="sm"
              loading={bulkMut.isPending}
              disabled={!canSubmit}
              onClick={() => {
                void submit();
              }}
            >
              {validRows.length}건 전송
            </Button>
          </HStack>
        </Flex>
      </Box>
    </>
  );
}
