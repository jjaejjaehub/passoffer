"use client";

import { Button, HStack, Text } from "@chakra-ui/react";

interface BulkUpdateBarProps {
  selectedCount: number;
  actions: Array<{
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  }>;
}

export function BulkUpdateBar({
  selectedCount,
  actions,
}: BulkUpdateBarProps): React.JSX.Element {
  return (
    <HStack justify="space-between" mb={3}>
      <HStack>
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="outline"
            disabled={action.disabled ?? !action.onClick}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </HStack>
      <Text fontSize="sm" color="gray.600">
        선택됨: {selectedCount}개
      </Text>
    </HStack>
  );
}
