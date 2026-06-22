"use client";

import { useEffect } from "react";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import { reportError } from "@/shared/lib";

interface OrdersErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrdersError({
  error,
  reset,
}: OrdersErrorProps): React.JSX.Element {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <Box py={16} textAlign="center">
      <Heading as="h2" size="lg" mb={4}>
        주문 목록을 불러오는 중 문제가 발생했습니다.
      </Heading>
      <Text mb={8} color="gray.600">
        잠시 후 다시 시도해 주세요.
      </Text>
      <Button onClick={reset}>다시 시도</Button>
    </Box>
  );
}
