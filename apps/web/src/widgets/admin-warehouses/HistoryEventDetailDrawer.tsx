"use client";

import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowRightLeft,
  PackageMinus,
  PackagePlus,
  Settings2,
} from "lucide-react";
import type { ReactElement } from "react";
import { DEFAULT_ADJUSTMENT_REASONS } from "@oms/types";
import type { AdjustmentReason, HistoryEvent, MovementType } from "@oms/types";

const TYPE_META: Record<
  MovementType,
  {
    label: string;
    palette: string;
    icon: typeof PackagePlus;
    deltaSign: 1 | -1 | 0;
  }
> = {
  inbound: { label: "입고", palette: "blue", icon: PackagePlus, deltaSign: 1 },
  outbound: {
    label: "출고",
    palette: "purple",
    icon: PackageMinus,
    deltaSign: -1,
  },
  transfer: {
    label: "이동",
    palette: "teal",
    icon: ArrowRightLeft,
    deltaSign: 0,
  },
  adjustment: { label: "조정", palette: "gray", icon: Settings2, deltaSign: 0 },
};

function reasonLabel(code?: string): string | null {
  if (!code) return null;
  const fixed = DEFAULT_ADJUSTMENT_REASONS as Record<string, string>;
  return fixed[code as AdjustmentReason] ?? code;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface HistoryEventDetailDrawerProps {
  event: HistoryEvent | null;
  onClose: () => void;
}

export function HistoryEventDetailDrawer({
  event,
  onClose,
}: HistoryEventDetailDrawerProps): ReactElement {
  const isOpen = event !== null;
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      size="md"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>이력 상세</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={4}>
            {event === null ? null : <DetailBody event={event} />}
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" size="sm" onClick={onClose}>
              닫기
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

function DetailBody({ event }: { event: HistoryEvent }): ReactElement {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const isExternal = event.sourceVendor !== "self";
  const signed =
    meta.deltaSign === 1
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
  const reason = reasonLabel(event.reasonCode);

  return (
    <Stack gap={5}>
      <Flex align="center" gap={3}>
        <Flex
          align="center"
          justify="center"
          w="44px"
          h="44px"
          borderRadius="md"
          bg={`${meta.palette}.50`}
          color={`${meta.palette}.600`}
        >
          <Icon size={24} />
        </Flex>
        <Stack gap={1}>
          <HStack gap={2}>
            <Badge size="sm" colorPalette={meta.palette}>
              {meta.label}
            </Badge>
            {isExternal ? (
              <Badge size="sm" colorPalette="orange" variant="subtle">
                외부 이벤트
              </Badge>
            ) : null}
          </HStack>
          <Text fontSize="xs" color="gray.500" fontFamily="mono">
            {event.id}
          </Text>
        </Stack>
      </Flex>

      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="gray.50"
        p={4}
      >
        <Text fontSize="xs" color="gray.500" mb={1}>
          수량 변화
        </Text>
        <Text
          fontFamily="mono"
          fontSize="3xl"
          fontWeight="bold"
          color={deltaColor}
        >
          {deltaPrefix}
          {signed.toLocaleString()}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={1}>
          절대값 {Math.abs(event.quantity).toLocaleString()}개
        </Text>
      </Box>

      <Stack gap={3}>
        <DetailRow label="SKU" mono value={event.sku} />
        <DetailRow label="발생 시각" value={formatDateTime(event.occurredAt)} />
        <DetailRow label="소스 시스템" value={event.sourceVendor} mono />
        {reason ? <DetailRow label="사유" value={reason} /> : null}
        {event.vendorRef ? (
          <DetailRow label="벤더 레퍼런스" mono value={event.vendorRef} />
        ) : null}
      </Stack>
    </Stack>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): ReactElement {
  return (
    <Flex
      align="baseline"
      justify="space-between"
      gap={4}
      borderBottomWidth="1px"
      borderColor="gray.100"
      pb={2}
    >
      <Text fontSize="xs" color="gray.500" minW="80px">
        {label}
      </Text>
      <Text
        fontSize="sm"
        textAlign="right"
        fontFamily={mono ? "mono" : undefined}
      >
        {value}
      </Text>
    </Flex>
  );
}
