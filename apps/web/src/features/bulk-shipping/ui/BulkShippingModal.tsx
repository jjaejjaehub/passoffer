"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Truck, X } from "lucide-react";

import {
  useBulkSetSendingInfo,
  type BulkSetSendingInfoItem,
  type BulkSetSendingInfoResultItem,
  type OrderListItem,
} from "@/entities/order";
import { appToaster } from "@/shared/ui/app-toaster";

export interface BulkShippingModalProps {
  open: boolean;
  onClose: () => void;
  orders: OrderListItem[];
  onCompleted?: () => void;
}

interface Row {
  orderId: string;
  channelOrderId: string;
  receiverName: string | null;
  shippingCorp: string;
  trackingNo: string;
}

type Mode = "direct" | "paste";

const CARRIER_PRESETS = [
  "日本郵便",
  "ヤマト運輸",
  "佐川急便",
  "西濃運輸",
  "福山通運",
  "EMS",
  "DHL",
  "FedEx",
  "UPS",
];

function parsePasteText(
  text: string,
): Map<string, { shippingCorp: string; trackingNo: string }> {
  const map = new Map<string, { shippingCorp: string; trackingNo: string }>();
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line
      .split(/[\t,]/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 3) continue;
    const [channelOrderId, shippingCorp, trackingNo] = cols;
    if (!channelOrderId || !shippingCorp || !trackingNo) continue;
    map.set(channelOrderId, { shippingCorp, trackingNo });
  }
  return map;
}

export function BulkShippingModal({
  open,
  onClose,
  orders,
  onCompleted,
}: BulkShippingModalProps): React.JSX.Element | null {
  const [mode, setMode] = useState<Mode>("direct");
  const [rows, setRows] = useState<Row[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [defaultCarrier, setDefaultCarrier] = useState("");
  const [results, setResults] = useState<BulkSetSendingInfoResultItem[] | null>(
    null,
  );

  const mutation = useBulkSetSendingInfo();

  useEffect(() => {
    if (!open) return;
    setRows(
      orders.map((o) => ({
        orderId: o.id,
        channelOrderId: o.channelOrderId,
        receiverName: o.receiverName,
        shippingCorp: "",
        trackingNo: "",
      })),
    );
    setPasteText("");
    setDefaultCarrier("");
    setResults(null);
    setMode("direct");
  }, [open, orders]);

  const filledCount = useMemo(
    () =>
      rows.filter((r) => r.shippingCorp.trim() && r.trackingNo.trim()).length,
    [rows],
  );

  if (!open) return null;

  const submitting = mutation.isPending;

  const applyDefaultCarrier = (): void => {
    if (!defaultCarrier.trim()) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        shippingCorp: r.shippingCorp.trim()
          ? r.shippingCorp
          : defaultCarrier.trim(),
      })),
    );
  };

  const applyPaste = (): void => {
    const parsed = parsePasteText(pasteText);
    if (parsed.size === 0) {
      appToaster.create({
        title: "붙여넣은 데이터에서 유효한 행을 찾지 못했습니다.",
        type: "warning",
      });
      return;
    }
    let matched = 0;
    setRows((prev) =>
      prev.map((r) => {
        const hit = parsed.get(r.channelOrderId);
        if (!hit) return r;
        matched += 1;
        return {
          ...r,
          shippingCorp: hit.shippingCorp,
          trackingNo: hit.trackingNo,
        };
      }),
    );
    appToaster.create({
      title: `${matched}건 매칭 완료 (${parsed.size}건 입력 중)`,
      type: matched > 0 ? "success" : "warning",
    });
    setMode("direct");
  };

  const updateRow = (
    orderId: string,
    patch: Partial<Pick<Row, "shippingCorp" | "trackingNo">>,
  ): void => {
    setRows((prev) =>
      prev.map((r) => (r.orderId === orderId ? { ...r, ...patch } : r)),
    );
  };

  const submit = async (): Promise<void> => {
    const items: BulkSetSendingInfoItem[] = rows
      .filter((r) => r.shippingCorp.trim() && r.trackingNo.trim())
      .map((r) => ({
        orderId: r.orderId,
        shippingCorp: r.shippingCorp.trim(),
        trackingNo: r.trackingNo.trim(),
      }));
    if (items.length === 0) {
      appToaster.create({
        title: "입력된 운송장 정보가 없습니다.",
        type: "warning",
      });
      return;
    }
    try {
      const result = await mutation.mutateAsync({ items });
      setResults(result.results);
      const parts: string[] = [`${result.totalSent.toLocaleString()}건 전송`];
      if (result.totalFailed > 0)
        parts.push(`${result.totalFailed.toLocaleString()}건 실패`);
      if (result.skipped > 0)
        parts.push(`${result.skipped.toLocaleString()}건 스킵`);
      appToaster.create({
        title: parts.join(" / "),
        type: result.totalFailed > 0 ? "warning" : "success",
      });
      if (result.totalFailed === 0) {
        onCompleted?.();
        onClose();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "운송장 전송에 실패했습니다.";
      appToaster.create({ title: message, type: "error" });
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
          if (!submitting) onClose();
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
        overflow="hidden"
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
            <Truck size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                운송장 일괄 전송
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                선택된 {orders.length.toLocaleString()}건 중 입력된{" "}
                {filledCount.toLocaleString()}건이 전송됩니다
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#718096",
              background: "transparent",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={4} flex={1} overflowY="auto">
          <VStack gap={4} align="stretch">
            <HStack gap={2}>
              <Button
                type="button"
                size="sm"
                variant={mode === "direct" ? "solid" : "outline"}
                colorScheme={mode === "direct" ? "blue" : "gray"}
                onClick={() => setMode("direct")}
              >
                직접 입력
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "paste" ? "solid" : "outline"}
                colorScheme={mode === "paste" ? "blue" : "gray"}
                onClick={() => setMode("paste")}
              >
                엑셀/CSV 붙여넣기
              </Button>
            </HStack>

            {mode === "paste" ? (
              <Box>
                <Text fontSize="sm" color="gray.700" mb={1}>
                  채널주문번호, 택배사, 운송장번호 순서로 한 줄에 한 건씩 (탭
                  또는 쉼표 구분)
                </Text>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={
                    "JP123456789\t日本郵便\t12345678\nJP987654321,ヤマト運輸,98765432"
                  }
                  rows={8}
                  fontFamily="mono"
                  fontSize="sm"
                />
                <HStack gap={2} mt={2} justify="flex-end">
                  <Button
                    type="button"
                    size="sm"
                    colorScheme="blue"
                    onClick={applyPaste}
                    disabled={!pasteText.trim()}
                  >
                    적용
                  </Button>
                </HStack>
              </Box>
            ) : (
              <Box>
                <HStack gap={2} mb={2} wrap="wrap">
                  <Text fontSize="sm" color="gray.700">
                    기본 택배사 일괄 적용:
                  </Text>
                  <Input
                    size="sm"
                    value={defaultCarrier}
                    onChange={(e) => setDefaultCarrier(e.target.value)}
                    placeholder="택배사명 입력"
                    width="200px"
                    list="carrier-presets"
                  />
                  <datalist id="carrier-presets">
                    {CARRIER_PRESETS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyDefaultCarrier}
                    disabled={!defaultCarrier.trim()}
                  >
                    빈 행에 적용
                  </Button>
                </HStack>
                <Box
                  borderWidth="1px"
                  borderRadius="md"
                  maxH="380px"
                  overflowY="auto"
                >
                  <Table.Root size="sm" stickyHeader variant="line">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        <Table.ColumnHeader>채널주문번호</Table.ColumnHeader>
                        <Table.ColumnHeader>수취인</Table.ColumnHeader>
                        <Table.ColumnHeader>택배사</Table.ColumnHeader>
                        <Table.ColumnHeader>운송장번호</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center" w="80px">
                          상태
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {rows.map((row) => {
                        const result = results?.find(
                          (r) => r.orderId === row.orderId,
                        );
                        const filled =
                          row.shippingCorp.trim() && row.trackingNo.trim();
                        return (
                          <Table.Row key={row.orderId}>
                            <Table.Cell fontSize="xs" fontFamily="mono">
                              {row.channelOrderId}
                            </Table.Cell>
                            <Table.Cell fontSize="xs">
                              {row.receiverName ?? "-"}
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                size="xs"
                                value={row.shippingCorp}
                                onChange={(e) =>
                                  updateRow(row.orderId, {
                                    shippingCorp: e.target.value,
                                  })
                                }
                                placeholder="日本郵便"
                                list="carrier-presets"
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                size="xs"
                                value={row.trackingNo}
                                onChange={(e) =>
                                  updateRow(row.orderId, {
                                    trackingNo: e.target.value,
                                  })
                                }
                                placeholder="12345678"
                              />
                            </Table.Cell>
                            <Table.Cell textAlign="center">
                              {result ? (
                                <Badge
                                  colorPalette={result.ok ? "green" : "red"}
                                  variant="solid"
                                  fontSize="xs"
                                  title={result.message}
                                >
                                  {result.ok ? "성공" : "실패"}
                                </Badge>
                              ) : filled ? (
                                <Badge
                                  colorPalette="blue"
                                  variant="subtle"
                                  fontSize="xs"
                                >
                                  대기
                                </Badge>
                              ) : (
                                <Badge
                                  colorPalette="gray"
                                  variant="subtle"
                                  fontSize="xs"
                                >
                                  미입력
                                </Badge>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Box>
            )}

            <Box
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
              borderRadius="md"
              px={3}
              py={2}
            >
              <Text fontSize="xs" color="blue.800">
                Qoo10 SetSendingInfoBulk(15773)로 500건씩 일괄 호출됩니다.
                <br />
                출고대기/배송보류/송장출력 상태 주문만 처리되며, 그 외 상태는
                스킵됩니다.
              </Text>
            </Box>

            <HStack gap={2} justify="flex-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                size="sm"
                loading={submitting}
                onClick={() => {
                  void submit();
                }}
                disabled={filledCount === 0}
              >
                {filledCount.toLocaleString()}건 전송
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
