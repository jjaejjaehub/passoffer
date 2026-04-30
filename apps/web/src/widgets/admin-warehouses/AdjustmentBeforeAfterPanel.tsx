"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import type { ReactElement } from "react";

interface BeforeAfterRow {
  label: string;
  locationCode: string;
  locationPath?: string;
  sku: string;
  lotCode: string | null;
  before: number;
  after: number;
  tone: "decrease" | "increase";
}

interface AdjustmentBeforeAfterPanelProps {
  source: BeforeAfterRow;
  destination: BeforeAfterRow;
  delta: number;
}

export function AdjustmentBeforeAfterPanel({
  source,
  destination,
  delta,
}: AdjustmentBeforeAfterPanelProps): ReactElement {
  return (
    <Stack gap={3}>
      <Flex align="stretch" gap={3}>
        <SidePanel data={source} />
        <Flex
          align="center"
          justify="center"
          minW="60px"
          color="gray.500"
        >
          <Stack align="center" gap={1}>
            <ArrowRight size={28} />
            <Text fontSize="sm" fontFamily="mono" fontWeight="bold">
              {delta.toLocaleString()}
            </Text>
          </Stack>
        </Flex>
        <SidePanel data={destination} />
      </Flex>
    </Stack>
  );
}

function SidePanel({ data }: { data: BeforeAfterRow }): ReactElement {
  const afterColor =
    data.tone === "decrease" ? "red.600" : "blue.600";
  const isNegativeAfter = data.after < 0;

  return (
    <Box
      flex="1"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      p={4}
    >
      <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">
        {data.label}
      </Text>
      <Stack gap={2}>
        <Box>
          <Text fontSize="xs" color="gray.500">
            로케이션
          </Text>
          <Text fontFamily="mono" fontSize="sm">
            {data.locationCode}
          </Text>
          {data.locationPath ? (
            <Text fontSize="xs" color="gray.500">
              {data.locationPath}
            </Text>
          ) : null}
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">
            SKU / LOT
          </Text>
          <Text fontFamily="mono" fontSize="sm">
            {data.sku}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {data.lotCode ? `LOT ${data.lotCode}` : "LOT 없음"}
          </Text>
        </Box>
        <Flex align="baseline" justify="space-between" pt={2} borderTopWidth="1px" borderColor="gray.100">
          <Stack gap={0}>
            <Text fontSize="xs" color="gray.500">
              이전 수량
            </Text>
            <Text fontFamily="mono" fontSize="lg">
              {data.before.toLocaleString()}
            </Text>
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text fontSize="xs" color="gray.500">
              이후 수량
            </Text>
            <Text
              fontFamily="mono"
              fontSize="lg"
              fontWeight="bold"
              color={isNegativeAfter ? "red.700" : afterColor}
            >
              {data.after.toLocaleString()}
            </Text>
            {isNegativeAfter ? (
              <Text fontSize="xs" color="red.600" fontWeight="medium">
                음수 재고 발생
              </Text>
            ) : null}
          </Stack>
        </Flex>
      </Stack>
    </Box>
  );
}
