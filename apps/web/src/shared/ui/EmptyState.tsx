"use client";

import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import type { ReactNode, ReactElement } from "react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): ReactElement {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.200"
      bg="white"
      py={10}
      px={8}
      textAlign="center"
    >
      <VStack>
        {icon && <Box fontSize="3xl">{icon}</Box>}
        <Heading as="h3" size="md">
          {title}
        </Heading>
        {description && (
          <Text fontSize="sm" color="gray.600">
            {description}
          </Text>
        )}
        {action && (
          <Button
            size="sm"
            mt={2}
            variant="outline"
            borderColor="gray.300"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </VStack>
    </Box>
  );
}
