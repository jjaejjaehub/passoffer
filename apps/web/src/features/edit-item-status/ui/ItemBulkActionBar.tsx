"use client";

import { Box, Button, HStack, Text, Tooltip } from "@chakra-ui/react";
import {
  canActivate,
  canSuspend,
  itemStatusFromQoo10Code,
} from "@/entities/item";
import type { Product } from "@oms/types";

export interface ItemBulkActionBarProps {
  selectedIds: Set<string>;
  items: Product[];
  remotePending: boolean;
  onBulkSuspendRequest: () => void;
  onBulkActivateRequest: () => void;
  onBulkDeleteRequest: () => void;
}

export function ItemBulkActionBar({
  selectedIds,
  items,
  remotePending,
  onBulkSuspendRequest,
  onBulkActivateRequest,
  onBulkDeleteRequest,
}: ItemBulkActionBarProps): React.JSX.Element | null {
  const selectedRows: Product[] = items.filter((item) =>
    selectedIds.has(item.id),
  );

  const canBulkSuspend: boolean =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const domainStatus = row.rawStatus
        ? itemStatusFromQoo10Code(row.rawStatus)
        : row.status === "active"
          ? "거래가능"
          : "거래중지";
      return canSuspend(domainStatus);
    });

  const canBulkActivate: boolean =
    selectedRows.length > 0 &&
    selectedRows.every((row) => {
      const domainStatus = row.rawStatus
        ? itemStatusFromQoo10Code(row.rawStatus)
        : row.status === "active"
          ? "거래가능"
          : "거래중지";
      return canActivate(domainStatus);
    });

  const isBusy = remotePending;

  if (selectedIds.size === 0) {
    return null;
  }

  return (
    <HStack
      flexWrap="wrap"
      alignItems="center"
      gap={3}
      py={2}
      px={3}
      mb={2}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="gray.50"
    >
      <Text fontSize="sm" fontWeight="medium" color="gray.800">
        {selectedIds.size}개 선택됨
      </Text>

      <Tooltip.Root openDelay={200} disabled={canBulkSuspend}>
        <Tooltip.Trigger asChild>
          <Box as="span" display="inline-block">
            <Button
              type="button"
              variant="outline"
              size="sm"
              borderColor="gray.300"
              disabled={isBusy || !canBulkSuspend}
              opacity={!canBulkSuspend ? 0.4 : 1}
              onClick={onBulkSuspendRequest}
            >
              판매중지
            </Button>
          </Box>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content>거래가능 상품만 선택해주세요</Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>

      <Tooltip.Root openDelay={200} disabled={canBulkActivate}>
        <Tooltip.Trigger asChild>
          <Box as="span" display="inline-block">
            <Button
              type="button"
              variant="solid"
              size="sm"
              colorPalette="gray"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              disabled={isBusy || !canBulkActivate}
              opacity={!canBulkActivate ? 0.4 : 1}
              onClick={onBulkActivateRequest}
            >
              판매중으로 변경
            </Button>
          </Box>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content>거래대기 상품만 선택해주세요</Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>

      <Button
        type="button"
        variant="ghost"
        colorPalette="red"
        color="red.600"
        size="sm"
        disabled={isBusy}
        onClick={onBulkDeleteRequest}
      >
        삭제
      </Button>
    </HStack>
  );
}
