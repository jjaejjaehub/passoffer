"use client";

import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { Link2, Gift, Package } from "lucide-react";

type SlotProps = {
  icon: React.ElementType;
  label: string;
  hint: string;
};

function Slot({ icon, label, hint }: SlotProps): React.JSX.Element {
  return (
    <Box
      px={3}
      py={2.5}
      borderRadius="md"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="gray.200"
      _hover={{ bg: "gray.50" }}
    >
      <Flex align="center" gap={2}>
        <Icon as={icon} boxSize={3.5} color="gray.500" />
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {label}
        </Text>
      </Flex>
      <Text fontSize="xs" color="gray.400" mt={0.5} pl={5}>
        {hint}
      </Text>
    </Box>
  );
}

export function OrdersAuxPanel(): React.JSX.Element {
  return (
    <Box
      as="aside"
      w="220px"
      flexShrink={0}
      borderWidth="1px"
      borderRadius="md"
      bg="white"
      p={3}
    >
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2} px={1}>
        규칙 / 매핑
      </Text>
      <Flex direction="column" gap={2}>
        <Slot icon={Link2} label="매칭규칙" hint="채널↔상품 자동 매칭" />
        <Slot icon={Gift} label="사은품규칙" hint="조건별 사은품 부여" />
        <Slot icon={Package} label="SKU매칭" hint="옵션↔SKU 매핑" />
      </Flex>
      <Text fontSize="2xs" color="gray.400" mt={3} px={1}>
        ※ 슬롯 예약 (메뉴 미노출)
      </Text>
    </Box>
  );
}
