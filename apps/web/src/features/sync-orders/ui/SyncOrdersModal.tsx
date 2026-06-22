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
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useChannels,
  type ChannelRecord,
} from "@/entities/channel/api/channelQueries";
import {
  useSyncOrders,
  type ChannelOpResult,
  type SyncResult,
} from "@/entities/order/api/orderSyncMutations";
import { useOrderSettings } from "@/entities/user-settings";
import { appToaster } from "@/shared/ui/app-toaster";

interface Props {
  open: boolean;
  onClose: () => void;
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

export function SyncOrdersModal({
  open,
  onClose,
}: Props): React.JSX.Element | null {
  const { data: channels, isLoading: channelsLoading } = useChannels();
  const { data: settings } = useOrderSettings();
  const sync = useSyncOrders();

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
  const [result, setResult] = useState<SyncResult | null>(null);

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
      appToaster.create({
        title: "채널을 1개 이상 선택하세요",
        type: "warning",
      });
      return;
    }
    try {
      const r = await sync.mutateAsync({
        channelIds: Array.from(selectedIds),
        sinceDate: toIsoStartOfDay(sinceDate),
        untilDate: toIsoEndOfDay(untilDate),
      });
      setResult(r);
      appToaster.create({
        title: `동기화 완료 — 갱신 ${r.totalUpdated} / 스킵 ${r.totalSkipped}`,
        type: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "동기화 실패";
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
        onClick={() => !sync.isPending && onClose()}
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
          주문 동기화
        </Text>
        <Text fontSize="sm" color="gray.500" mb={5}>
          기존 주문의 상태/배송 정보를 채널 최신본과 일치시킵니다.
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
                    borderColor={
                      selectedIds.has(c.id) ? "blue.300" : "gray.200"
                    }
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
            disabled={sync.isPending}
          >
            닫기
          </Button>
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={() => void handleRun()}
            loading={sync.isPending}
            disabled={supportedChannels.length === 0}
          >
            <RefreshCw size={14} />
            동기화 실행
          </Button>
        </Flex>
      </Box>
    </>
  );
}

function ResultPanel({
  channels,
}: {
  channels: ChannelOpResult[];
}): React.JSX.Element {
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
              처리 {ch.processed} · 갱신 {ch.updated} · 스킵 {ch.skipped}
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
