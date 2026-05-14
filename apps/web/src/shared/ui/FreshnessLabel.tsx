"use client";

import { Badge, Tooltip } from "@chakra-ui/react";
import type { Freshness } from "@oms/types";

const FRESHNESS_STYLES: Record<
  Freshness,
  { label: string; bg: string; color: string }
> = {
  fresh: { label: "최신", bg: "green.50", color: "green.700" },
  stale: { label: "오래됨", bg: "gray.100", color: "gray.500" },
  unknown: { label: "불명", bg: "gray.50", color: "gray.400" },
};

interface Props {
  freshness: Freshness;
  fetchedAt?: string;
}

export function FreshnessLabel({
  freshness,
  fetchedAt,
}: Props): React.JSX.Element {
  const style = FRESHNESS_STYLES[freshness];
  const tooltip = fetchedAt
    ? `마지막 동기화: ${new Date(fetchedAt).toLocaleString("ko-KR")}`
    : undefined;

  const badge = (
    <Badge
      px={1.5}
      py={0.5}
      borderRadius="md"
      fontSize="10px"
      fontWeight="medium"
      bg={style.bg}
      color={style.color}
      textTransform="none"
    >
      {style.label}
    </Badge>
  );

  if (tooltip) {
    return (
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger asChild>
          <span>{badge}</span>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content>{tooltip}</Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    );
  }
  return badge;
}
