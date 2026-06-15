"use client";

import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { Link2, Gift, Package } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("widgets.ordersAuxPanel");
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
        {t("sectionTitle")}
      </Text>
      <Flex direction="column" gap={2}>
        <Slot
          icon={Link2}
          label={t("slots.matching.label")}
          hint={t("slots.matching.hint")}
        />
        <Slot
          icon={Gift}
          label={t("slots.gift.label")}
          hint={t("slots.gift.hint")}
        />
        <Slot
          icon={Package}
          label={t("slots.skuMatch.label")}
          hint={t("slots.skuMatch.hint")}
        />
      </Flex>
      <Text fontSize="2xs" color="gray.400" mt={3} px={1}>
        {t("reservedNote")}
      </Text>
    </Box>
  );
}
