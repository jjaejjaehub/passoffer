"use client";

import type React from "react";
import { HStack, Button } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import type { ChannelId } from "@/shared/config";
import { CHANNEL_NAMES, LIVE_CHANNELS } from "@/shared/config";

interface ChannelFilterBarProps {
  value: ChannelId[];
  onChange: (value: ChannelId[]) => void;
}

export function ChannelFilterBar({
  value,
  onChange,
}: ChannelFilterBarProps): React.JSX.Element {
  const tChannels = useTranslations("config.channels");
  const handleToggle = (channelId: ChannelId): void => {
    const isSelected = value.includes(channelId);
    if (isSelected) {
      onChange(value.filter((id) => id !== channelId));
      return;
    }
    onChange([...value, channelId]);
  };

  return (
    <HStack gap={2}>
      {LIVE_CHANNELS.map((channel) => {
        const isSelected = value.includes(channel.id);
        let channelName: string = CHANNEL_NAMES[channel.id];
        try {
          channelName = tChannels(`${channel.id}.name`);
        } catch {
          channelName = CHANNEL_NAMES[channel.id];
        }
        return (
          <Button
            key={channel.id}
            size="sm"
            variant="outline"
            bg={isSelected ? "gray.900" : "white"}
            color={isSelected ? "white" : "gray.800"}
            borderColor={isSelected ? "gray.900" : "gray.200"}
            _hover={{
              bg: isSelected ? "gray.800" : "gray.50",
            }}
            onClick={() => handleToggle(channel.id)}
          >
            {channelName}
          </Button>
        );
      })}
    </HStack>
  );
}
