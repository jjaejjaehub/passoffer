import { Box, Button, Text } from "@chakra-ui/react";
import { AlertTriangle } from "lucide-react";
import React from "react";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  actionLabel?: string;
}

export function ErrorState({
  title = "오류가 발생했습니다",
  description,
  onRetry,
  actionLabel = "다시 시도",
}: ErrorStateProps): React.JSX.Element {
  return (
    <Box
      role="alert"
      display="flex"
      alignItems="flex-start"
      gap={3}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
      mt={4} // By default give some margin top, but let parent override if needed later (or just hardcode mt=4 if standard)
    >
      <Box mt={1} color="red.500">
        <AlertTriangle size={18} />
      </Box>
      <Box flex="1">
        <Text fontWeight="semibold" mb={1}>
          {title}
        </Text>
        {description && (
          <Text fontSize="sm" color="gray.700">
            {description}
          </Text>
        )}
      </Box>
      {onRetry && (
        <Button ml={4} variant="outline" size="sm" onClick={onRetry}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
