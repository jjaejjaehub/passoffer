import { Badge, Icon } from "@chakra-ui/react";
import type { LucideIcon } from "lucide-react";

export type StatusBadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

interface StatusBadgeProps {
  tone: StatusBadgeTone;
  label: string;
  icon?: LucideIcon;
}

const toneStyles: Record<StatusBadgeTone, { bg: string; color: string }> = {
  success: { bg: "green.50", color: "green.700" },
  warning: { bg: "yellow.50", color: "yellow.800" },
  danger: { bg: "red.50", color: "red.700" },
  neutral: { bg: "gray.100", color: "gray.700" },
  info: { bg: "blue.50", color: "blue.700" },
};

export function StatusBadge({ tone, label, icon }: StatusBadgeProps): React.JSX.Element {
  const style = toneStyles[tone];
  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={2}
      py={0.5}
      borderRadius="md"
      fontSize="xs"
      fontWeight="medium"
      bg={style.bg}
      color={style.color}
      textTransform="none"
    >
      {icon ? <Icon as={icon} boxSize={3} /> : null}
      {label}
    </Badge>
  );
}
