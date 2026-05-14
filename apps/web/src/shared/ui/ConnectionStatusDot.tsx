"use client";

import { Box, Flex, Text, Tooltip } from "@chakra-ui/react";
import type { ConnectionStatus } from "@oms/types";

const STATUS_STYLES: Record<
  ConnectionStatus,
  { color: string; label: string }
> = {
  connected: { color: "green.400", label: "연결됨" },
  degraded: { color: "yellow.400", label: "지연" },
  disconnected: { color: "gray.300", label: "미연결" },
  pending: { color: "blue.300", label: "확인 중" },
};

interface Props {
  status: ConnectionStatus;
  checkedAt?: string;
  showLabel?: boolean;
}

export function ConnectionStatusDot({
  status,
  checkedAt,
  showLabel = false,
}: Props): React.JSX.Element {
  const style = STATUS_STYLES[status];
  const tooltipLabel = checkedAt
    ? `${style.label} · ${new Date(checkedAt).toLocaleString("ko-KR")}`
    : style.label;

  return (
    <Tooltip.Root openDelay={200}>
      <Tooltip.Trigger asChild>
        <Flex align="center" gap={1.5} display="inline-flex" cursor="default">
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg={style.color}
            flexShrink={0}
          />
          {showLabel && (
            <Text fontSize="xs" color="gray.600">
              {style.label}
            </Text>
          )}
        </Flex>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{tooltipLabel}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}
