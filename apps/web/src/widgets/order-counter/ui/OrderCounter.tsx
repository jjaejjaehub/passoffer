"use client";

import { Box, chakra, Flex, HStack, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

const ChakraButton = chakra("button");
import { COUNTER_LINES, type CounterChip } from "@/shared/config";
import type { OrderCounts } from "@/entities/order";

type Tone = NonNullable<CounterChip["tone"]>;

const TONE_BG: Record<Tone, string> = {
  neutral: "gray.50",
  blue: "blue.50",
  amber: "amber.50",
  green: "green.50",
  red: "red.50",
  violet: "purple.50",
};

const TONE_FG: Record<Tone, string> = {
  neutral: "gray.700",
  blue: "blue.700",
  amber: "orange.700",
  green: "green.700",
  red: "red.600",
  violet: "purple.700",
};

const TONE_ACTIVE_BG: Record<Tone, string> = {
  neutral: "gray.900",
  blue: "blue.600",
  amber: "orange.500",
  green: "green.600",
  red: "red.600",
  violet: "purple.600",
};

interface OrderCounterProps {
  counts: OrderCounts;
  // 현재 선택된 rank 배열 (없으면 'all').
  selectedRanks: number[];
  onChange: (ranks: number[]) => void;
}

function rankArraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function OrderCounter({
  counts,
  selectedRanks,
  onChange,
}: OrderCounterProps): React.JSX.Element {
  const tLines = useTranslations("config.counterLines");
  const tSemantic = useTranslations("config.semantic");

  function handleClick(chip: CounterChip): void {
    // 'all' or no ranks → 전체 (필터 해제)
    if (!chip.statusRanks || chip.statusRanks.length === 0) {
      onChange([]);
      return;
    }
    // 이미 동일 선택 → 해제
    if (rankArraysEqual(selectedRanks, chip.statusRanks)) {
      onChange([]);
      return;
    }
    onChange(chip.statusRanks);
  }

  function isActive(chip: CounterChip): boolean {
    if (!chip.statusRanks || chip.statusRanks.length === 0) {
      return selectedRanks.length === 0;
    }
    return rankArraysEqual(selectedRanks, chip.statusRanks);
  }

  return (
    <Box bg="white" borderWidth="1px" borderRadius="md" p={3}>
      <Flex direction="column" gap={2}>
        {COUNTER_LINES.map((line) => (
          <Flex key={line.id} align="center" gap={3}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="gray.500"
              w="64px"
              flexShrink={0}
            >
              {tLines(line.id)}
            </Text>
            <HStack gap={1.5} wrap="wrap">
              {line.chips.map((chip) => {
                const tone = chip.tone ?? "neutral";
                const active = isActive(chip);
                const count = counts[chip.key] ?? 0;
                return (
                  <ChakraButton
                    key={chip.key}
                    type="button"
                    onClick={() => handleClick(chip)}
                    px={2.5}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="medium"
                    bg={active ? TONE_ACTIVE_BG[tone] : TONE_BG[tone]}
                    color={active ? "white" : TONE_FG[tone]}
                    borderWidth="1px"
                    borderColor={active ? TONE_ACTIVE_BG[tone] : "transparent"}
                    transition="all 0.12s"
                    _hover={{ opacity: 0.85 }}
                  >
                    {tSemantic(chip.key)}{" "}
                    <Text as="span" fontWeight="bold" ml={0.5}>
                      {count.toLocaleString()}
                    </Text>
                  </ChakraButton>
                );
              })}
            </HStack>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
