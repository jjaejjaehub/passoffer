"use client";

import type React from "react";
import type { BoxProps } from "@chakra-ui/react";
import { Box } from "@chakra-ui/react";
import type { OrderStatus } from "@/shared/config";

type StatusBadgeProps = BoxProps & {
  status: OrderStatus;
};

export function StatusBadge({
  status,
  ...rest
}: StatusBadgeProps): React.JSX.Element {
  if (status === "신규") {
    return (
      <Box
        as="span"
        px={2}
        py={1}
        fontSize="xs"
        borderRadius="full"
        bg="gray.900"
        color="white"
        {...rest}
      >
        신규
      </Box>
    );
  }

  if (status === "처리중") {
    return (
      <Box
        as="span"
        px={2}
        py={1}
        fontSize="xs"
        borderRadius="full"
        borderWidth="1px"
        borderColor="#262626"
        bg="white"
        color="gray.900"
        {...rest}
      >
        처리중
      </Box>
    );
  }

  if (status === "배송준비") {
    return (
      <Box
        as="span"
        px={2}
        py={1}
        fontSize="xs"
        borderRadius="full"
        borderWidth="1px"
        borderColor="#a3a3a3"
        bg="white"
        color="gray.700"
        {...rest}
      >
        배송준비
      </Box>
    );
  }

  if (status === "배송중") {
    return (
      <Box
        as="span"
        px={2}
        py={1}
        fontSize="xs"
        borderRadius="full"
        bg="gray.100"
        color="gray.700"
        {...rest}
      >
        배송중
      </Box>
    );
  }

  if (status === "완료") {
    return (
      <Box
        as="span"
        px={2}
        py={1}
        fontSize="xs"
        borderRadius="full"
        borderWidth="1px"
        borderColor="#e5e5e5"
        bg="white"
        color="gray.400"
        {...rest}
      >
        완료
      </Box>
    );
  }

  return (
    <Box
      as="span"
      px={2}
      py={1}
      fontSize="xs"
      borderRadius="full"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="#d4d4d4"
      bg="white"
      color="gray.400"
      {...rest}
    >
      {status}
    </Box>
  );
}
