'use client';

import type React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';

interface TruncatedCellProps {
  value: string | number | null | undefined;
  maxW?: string | number;
  disableTooltip?: boolean;
  tooltipDisabled?: boolean;
}

export function TruncatedCell({
  value,
  maxW = '100%',
  disableTooltip,
  tooltipDisabled,
}: TruncatedCellProps): React.ReactElement {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '');

  if (isEmpty) {
    return <Box color="gray.400">—</Box>;
  }

  const display = String(value);
  const shouldDisable = Boolean(tooltipDisabled ?? disableTooltip);

  return (
    <Tooltip.Root openDelay={300} disabled={shouldDisable}>
      <Tooltip.Trigger asChild>
        {/* asChild로 Box를 직접 trigger로 사용 — 중간 wrapper span 제거 */}
        <Box
          maxW={maxW}
          w="100%"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          cursor="default"
          display="block"
        >
          {display}
        </Box>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>{display}</Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

