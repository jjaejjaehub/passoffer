"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChannels, type ChannelRecord } from "@/entities/channel/api/channelQueries";
import {
  useCollectOrders,
  type ChannelOpResult,
  type CollectResult,
} from "@/entities/order/api/orderSyncMutations";
import { useOrderSettings } from "@/entities/user-settings";
import { appToaster } from "@/shared/ui/app-toaster";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 결과 표시 후 자동으로 닫지 않음 (사용자가 닫기 버튼 클릭) */
}

const SUPPORTED_TYPES: ChannelRecord["channelType"][] = ["QOO10_JP", "SHOPIFY"];

function toIsoStartOfDay(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`).toISOString();
}

function toIsoEndOfDay(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T23:59:59.999Z`).toISOString();
}

function shiftDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CollectOrdersModal({ open, onClose }: Props): React.JSX.Element | null {
  const { data: channels, isLoading: channelsLoading } = useChannels();
  const { data: settings } = useOrderSettings();
  const collect = useCollectOrders();

  const supportedChannels = useMemo(
    () =>
      (channels ?? []).filter(
        (c) => SUPPORTED_TYPES.includes(c.channelType) && c.status === "ACTIVE",
      ),
    [channels],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const today = new Date();
  const defaultLookback = settings?.lookbackDays ?? 30;
  const [sinceDate, setSinceDate] = useState<string>(() =>
    shiftDate(today, -defaultLookback),
  );
  const [untilDate, setUntilDate] = useState<string>(() => shiftDate(today, 0));
  const [result, setResult] = useState<CollectResult | null>(null);

  useEffect(() => {
    if (!open) return;
    if (settings?.lookbackDays) {
      setSinceDate(shiftDate(new Date(), -settings.lookbackDays));
      setUntilDate(shiftDate(new Date(), 0));
    }
    setResult(null);
    if (selectedIds.size === 0 && supportedChannels.length > 0) {
      setSelectedIds(new Set(supportedChannels.map((c) => c.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings?.lookbackDays, supportedChannels.length]);

  if (!open) return null;

  const toggle = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = async (): Promise<void> => {
    if (selectedIds.size === 0) {
      appToaster.create({ title: "채널을 1개 이상 선택하세요", type: "warning" });
      return;
    }
    try {
      const r = await collect.mutateAsync({
        channelIds: Array.from(selectedIds),
        sinceDate: toIsoStartOfDay(sinceDate),
        untilDate: toIsoEndOfDay(untilDate),
      });
      setResult(r);
      appToaster.create({
        title: `수집 완료 — 신규 ${r.totalInserted} / 갱신 ${r.totalUpdated}`,
        type: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "수집 실패";
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
        onClick={() => !collect.isPending && onClose()}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={1001}
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        w={{ base: "92vw", md: "520px" }}
        maxH="85vh"
        overflowY="auto"
        p={6}
      >
        <Text fontWeight="semibold" fontSize="md" mb={1}>
          주문 수집
        </Text>
        <Text fontSize="sm" color="gray.500" mb={5}>
          선택한 채널에서 기간 내 출고 전(결제완료·신규주문) 단계의 주문을
          가져옵니다.
        </Text>

        <Stack gap={4} mb={5}>
          <Box>
            <Text fontSize="xs" color="gray.600" mb={2} fontWeight="medium">
              채널 선택
            </Text>
            {channelsLoading ? (
              <Text fontSize="sm" color="gray.500">
                채널 불러오는 중…
              </Text>
            ) : supportedChannels.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                연결된 Qoo10/Shopify 채널이 없습니다.
              </Text>
            ) : (
              <Stack gap={1.5}>
                {supportedChannels.map((c) => (
                  <Flex
                    key={c.id}
                    align="center"
                    gap={2}
                    px={2}
                    py={1.5}
                    borderWidth="1px"
                    borderColor={selectedIds.has(c.id) ? "blue.300" : "gray.200"}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => toggle(c.id)}
                  >
                    <Checkbox.Root
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                    <Text fontSize="sm" fontWeight="medium">
                      {c.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      · {c.channelType}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            )}
          </Box>

          <Flex gap={2}>
            <Box flex={1}>
              <Text fontSize="xs" color="gray.600" mb={1} fontWeight="medium">
                시작일
              </Text>
              <Input
                type="date"
                size="sm"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="xs" color="gray.600" mb={1} fontWeight="medium">
                종료일
              </Text>
              <Input
                type="date"
                size="sm"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
              />
            </Box>
          </Flex>
        </Stack>

        {result && <ResultPanel channels={result.channels} />}

        <Flex justify="flex-end" gap={2} mt={5}>
          <Button
            size="sm"
            variant="outline"
            borderColor="gray.300"
            onClick={onClose}
            disabled={collect.isPending}
          >
            닫기
          </Button>
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={() => void handleRun()}
            loading={collect.isPending}
            disabled={supportedChannels.length === 0}
          >
            <Download size={14} />
            수집 실행
          </Button>
        </Flex>
      </Box>
    </>
  );
}

function ResultPanel({ channels }: { channels: ChannelOpResult[] }): React.JSX.Element {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
      bg="gray.50"
      mt={2}
    >
      <Text fontSize="xs" fontWeight="medium" mb={2} color="gray.700">
        결과
      </Text>
      <Stack gap={1.5}>
        {channels.map((ch) => (
          <Flex key={ch.channelId} justify="space-between" fontSize="xs">
            <Text fontWeight="medium">{ch.channelKey}</Text>
            <Text color="gray.600">
              처리 {ch.processed} · 신규 {ch.inserted} · 갱신 {ch.updated}
              {ch.errors.length > 0 && (
                <Text as="span" color="red.500" ml={1}>
                  · 오류 {ch.errors.length}
                </Text>
              )}
            </Text>
          </Flex>
        ))}
      </Stack>
    </Box>
  );
}
