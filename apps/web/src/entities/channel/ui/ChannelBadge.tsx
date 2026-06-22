"use client";

import type React from "react";
import type { BoxProps } from "@chakra-ui/react";
import { Box, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import type { ChannelId } from "@/shared/config";
import { CHANNEL_CONFIG } from "@/shared/config";

type ChannelBadgeVariant = "default" | "pill" | "icon-only";

type ChannelBadgeProps = BoxProps & {
  channelId: ChannelId;
  variant?: ChannelBadgeVariant;
};

export function ChannelBadge({
  channelId,
  variant = "default",
  ...rest
}: ChannelBadgeProps): React.JSX.Element {
  const channel = CHANNEL_CONFIG[channelId];
  const tChannels = useTranslations("config.channels");
  let channelName: string = channel.name;
  try {
    channelName = tChannels(`${channelId}.name`);
  } catch {
    channelName = channel.name;
  }

  if (variant === "icon-only") {
    return (
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        w={6}
        h={6}
        borderRadius="full"
        borderWidth="1px"
        borderColor="gray.200"
        bg="white"
        fontSize="xs"
        fontWeight="semibold"
        color="gray.900"
        {...rest}
      >
        {channel.initial}
      </Box>
    );
  }

  const borderRadius = variant === "pill" ? "full" : "md";

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={2}
      px={3}
      py={1}
      borderRadius={borderRadius}
      borderWidth="1px"
      borderColor="gray.200"
      bg="white"
      color="gray.800"
      {...rest}
    >
      <Box
        w={6}
        h={6}
        borderRadius="full"
        borderWidth="1px"
        borderColor="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="semibold"
        color="inherit"
      >
        {channel.initial}
      </Box>
      <Text fontSize="sm" color="inherit">
        {channelName}
      </Text>
    </Box>
  );
}
