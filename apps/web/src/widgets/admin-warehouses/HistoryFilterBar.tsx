"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
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
import type { MovementType } from "@oms/types";

export const ALL_MOVEMENT_TYPES: MovementType[] = [
  "inbound",
  "outbound",
  "transfer",
  "adjustment",
];

const TYPE_META: Record<
  MovementType,
  { label: string; palette: string; icon: typeof PackagePlus }
> = {
  inbound: { label: "입고", palette: "blue", icon: PackagePlus },
  outbound: { label: "출고", palette: "purple", icon: PackageMinus },
  transfer: { label: "이동", palette: "teal", icon: ArrowRightLeft },
  adjustment: { label: "조정", palette: "gray", icon: Settings2 },
};

interface HistoryFilterBarProps {
  selectedTypes: Set<MovementType>;
  onToggleType: (type: MovementType) => void;
  onSelectAllTypes: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onResetRange?: () => void;
}

export function HistoryFilterBar({
  selectedTypes,
  onToggleType,
  onSelectAllTypes,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  search,
  onSearchChange,
  onResetRange,
}: HistoryFilterBarProps): ReactElement {
  const allSelected = selectedTypes.size === ALL_MOVEMENT_TYPES.length;
  return (
    <Stack
      gap={3}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      p={4}
    >
      <Flex align="center" gap={2} wrap="wrap">
        <Text fontSize="xs" color="gray.500" minW="40px">
          유형
        </Text>
        <Button
          size="xs"
          variant={allSelected ? "solid" : "outline"}
          colorPalette="gray"
          onClick={onSelectAllTypes}
        >
          전체
        </Button>
        {ALL_MOVEMENT_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const active = selectedTypes.has(type);
          return (
            <Button
              key={type}
              size="xs"
              variant={active ? "solid" : "outline"}
              colorPalette={meta.palette}
              onClick={() => onToggleType(type)}
            >
              <HStack gap={1}>
                <Icon size={14} />
                <Text>{meta.label}</Text>
              </HStack>
            </Button>
          );
        })}
      </Flex>

      <Flex align="center" gap={3} wrap="wrap">
        <Text fontSize="xs" color="gray.500" minW="40px">
          기간
        </Text>
        <Input
          type="date"
          size="sm"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          maxW="160px"
        />
        <Text fontSize="sm" color="gray.500">
          ~
        </Text>
        <Input
          type="date"
          size="sm"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          maxW="160px"
        />
        {onResetRange ? (
          <Button size="xs" variant="ghost" onClick={onResetRange}>
            최근 30일
          </Button>
        ) : null}
        <Box flex="1" minW="200px">
          <Input
            size="sm"
            placeholder="SKU 검색"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Box>
      </Flex>
    </Stack>
  );
}
