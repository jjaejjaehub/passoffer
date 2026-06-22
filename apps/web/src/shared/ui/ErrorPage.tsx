"use client";

import { Box, Button, Heading, Text } from "@chakra-ui/react";

interface ErrorPageProps {
  title?: string;
  description?: string;
  reset: () => void;
}

export function ErrorPage({
  title = "문제가 발생했습니다.",
  description = "잠시 후 다시 시도해 주세요.",
  reset,
}: ErrorPageProps): React.JSX.Element {
  return (
    <Box py={16} textAlign="center">
      <Heading as="h2" size="lg" mb={4}>
        {title}
      </Heading>
      <Text mb={8} color="gray.600">
        {description}
      </Text>
      <Button onClick={reset} colorScheme="blue">
        다시 시도
      </Button>
    </Box>
  );
}
