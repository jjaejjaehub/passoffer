"use client";

import { Badge, Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { ArrowRightLeft, PackageMinus, PackagePlus, Settings2 } from "lucide-react";
import type { ReactElement } from "react";
import type { HistoryEvent, MovementType } from "@oms/types";

const TYPE_META: Record<
  MovementType,
  { label: string; palette: string; icon: typeof PackagePlus; deltaSign: 1 | -1 | 0 }
> = {
  inbound: { label: "입고", palette: "blue", icon: PackagePlus, deltaSign: 1 },
  outbound: { label: "출고", palette: "purple", icon: PackageMinus, deltaSign: -1 },
  transfer: { label: "이동", palette: "teal", icon: ArrowRightLeft, deltaSign: 0 },
  adjustment: { label: "조정", palette: "gray", icon: Settings2, deltaSign: 0 },
};

function groupByDate(events: HistoryEvent[]): Array<{ date: string; events: HistoryEvent[] }> {
  const map = new Map<string, HistoryEvent[]>();
  for (const ev of events) {
    const date = ev.occurredAt.slice(0, 10);
    const list = map.get(date);
    if (list) list.push(ev);
    else map.set(date, [ev]);
  }
  const out = Array.from(map.entries()).map(([date, evs]) => ({
    date,
    events: [...evs].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
  }));
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeading(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

interface HistoryTimelineProps {
  events: HistoryEvent[];
  onSelect: (event: HistoryEvent) => void;
  visibleDateCount: number;
}

export function HistoryTimeline({
  events,
  onSelect,
  visibleDateCount,
}: HistoryTimelineProps): ReactElement {
  const grouped = groupByDate(events);
  const visible = grouped.slice(0, visibleDateCount);

  return (
    <Stack gap={6}>
      {visible.map((group) => (
        <Stack key={group.date} gap={2}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" fontWeight="bold" color="gray.700">
              {formatDateHeading(group.date)}
            </Text>
            <Text fontSize="xs" color="gray.400">
              {group.events.length}건
            </Text>
          </Flex>
          <Stack gap={2}>
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} onSelect={onSelect} />
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function EventCard({
  event,
  onSelect,
}: {
  event: HistoryEvent;
  onSelect: (event: HistoryEvent) => void;
}): ReactElement {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const isExternal = event.sourceVendor !== "self";
  const signed = meta.deltaSign === 1
    ? event.quantity
    : meta.deltaSign === -1
      ? -Math.abs(event.quantity)
      : event.quantity;
  const deltaColor =
    meta.deltaSign === 1
      ? "green.700"
      : meta.deltaSign === -1
        ? "red.600"
        : "gray.700";
  const deltaPrefix = signed > 0 ? "+" : "";

  return (
    <Flex
      role="button"
      tabIndex={0}
      align="center"
      gap={3}
      px={3}
      py={3}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      cursor="pointer"
      _hover={{ bg: "gray.50" }}
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(event);
        }
      }}
    >
      <Flex
        align="center"
        justify="center"
        w="32px"
        h="32px"
        borderRadius="md"
        bg={`${meta.palette}.50`}
        color={`${meta.palette}.600`}
      >
        <Icon size={18} />
      </Flex>
      <Box minW="60px">
        <Badge size="sm" colorPalette={meta.palette}>
          {meta.label}
        </Badge>
      </Box>
      <Box flex="1" minW={0}>
        <Text fontFamily="mono" fontSize="sm" lineClamp={1}>
          {event.sku}
        </Text>
        {event.reasonCode ? (
          <Text fontSize="xs" color="gray.500" lineClamp={1}>
            사유: {event.reasonCode}
          </Text>
        ) : null}
      </Box>
      <Box minW="100px" textAlign="right">
        <Text
          fontFamily="mono"
          fontSize="md"
          fontWeight="bold"
          color={deltaColor}
        >
          {deltaPrefix}
          {signed.toLocaleString()}
        </Text>
      </Box>
      <HStack gap={2} minW="120px" justify="flex-end">
        <Text fontSize="xs" color="gray.500" fontFamily="mono">
          {formatTime(event.occurredAt)}
        </Text>
        {isExternal ? (
          <Badge size="xs" colorPalette="orange" variant="subtle">
            외부
          </Badge>
        ) : null}
      </HStack>
    </Flex>
  );
}
