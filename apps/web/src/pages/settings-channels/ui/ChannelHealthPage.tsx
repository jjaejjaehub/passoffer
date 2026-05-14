"use client";

import { Box, Button, Flex, Grid, Spinner, Text } from "@chakra-ui/react";
import type { ConnectionStatus } from "@oms/types";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import {
  type ChannelRecord,
  useChannelCapabilities,
  useChannelHealth,
  useChannels,
} from "@/entities/channel";
import { ConnectionStatusDot, PageHeader, VendorBadge } from "@/shared/ui";

function ChannelHealthCard({
  channel,
}: {
  channel: ChannelRecord;
}): React.JSX.Element {
  const [forceRefetch, setForceRefetch] = useState(0);
  const { data: health, isLoading, refetch } = useChannelHealth(channel.id);
  const { data: caps } = useChannelCapabilities(channel.id);

  const handleTest = async (): Promise<void> => {
    setForceRefetch((n) => n + 1);
    await refetch();
  };

  const statusIcon = (
    status: ConnectionStatus | undefined,
  ): React.JSX.Element => {
    if (!status)
      return <Clock size={14} color="var(--chakra-colors-gray-400)" />;
    if (status === "connected")
      return <CheckCircle size={14} color="var(--chakra-colors-green-500)" />;
    if (status === "degraded")
      return (
        <AlertTriangle size={14} color="var(--chakra-colors-yellow-500)" />
      );
    return <WifiOff size={14} color="var(--chakra-colors-gray-400)" />;
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      borderColor="gray.200"
      bg="white"
      p={4}
    >
      <Flex justify="space-between" align="flex-start" mb={3}>
        <Box>
          <Flex align="center" gap={2} mb={1}>
            <Text fontWeight="semibold" fontSize="sm">
              {channel.name}
            </Text>
            <VendorBadge vendor={channel.channelType as never} />
          </Flex>
          <Flex align="center" gap={1.5}>
            {isLoading ? (
              <Spinner size="xs" color="gray.400" />
            ) : (
              <ConnectionStatusDot
                status={health?.status ?? "disconnected"}
                checkedAt={health?.checkedAt}
                showLabel
              />
            )}
          </Flex>
        </Box>
        <Button
          size="xs"
          variant="outline"
          borderColor="gray.200"
          onClick={() => void handleTest()}
          loading={isLoading}
        >
          <RefreshCw size={12} />
          테스트
        </Button>
      </Flex>

      <Grid templateColumns="1fr 1fr" gap={2} mt={3}>
        <Box bg="gray.50" borderRadius="md" p={2}>
          <Text fontSize="10px" color="gray.500" mb={0.5}>
            응답 지연
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {health?.latencyMs != null ? `${health.latencyMs}ms` : "—"}
          </Text>
        </Box>
        <Box bg="gray.50" borderRadius="md" p={2}>
          <Text fontSize="10px" color="gray.500" mb={0.5}>
            마지막 확인
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {health?.checkedAt
              ? new Date(health.checkedAt).toLocaleTimeString("ko-KR")
              : "—"}
          </Text>
        </Box>
      </Grid>

      {health?.message && (
        <Box mt={2} px={2} py={1.5} bg="red.50" borderRadius="md">
          <Text fontSize="xs" color="red.600">
            {health.message}
          </Text>
        </Box>
      )}

      {/* Capabilities */}
      <Box mt={3}>
        <Text fontSize="10px" color="gray.400" mb={1.5}>
          지원 기능
        </Text>
        <Flex wrap="wrap" gap={1}>
          {(
            [
              { key: "supportsOrderFetch", label: "주문조회" },
              { key: "supportsClaimFetch", label: "클레임" },
              { key: "supportsProductRegister", label: "상품등록" },
              { key: "supportsInventoryRead", label: "재고조회" },
              { key: "supportsInventoryWrite", label: "재고조정" },
              { key: "supportsRealtimeStock", label: "실시간재고" },
            ] as const
          ).map(({ key, label }) => {
            const supported = caps?.capabilities[key] ?? true;
            return (
              <Box
                key={key}
                px={1.5}
                py={0.5}
                borderRadius="sm"
                fontSize="10px"
                bg={supported ? "blue.50" : "gray.100"}
                color={supported ? "blue.600" : "gray.400"}
                textDecoration={supported ? "none" : "line-through"}
              >
                {label}
              </Box>
            );
          })}
        </Flex>
      </Box>
    </Box>
  );
}

export function ChannelHealthPage(): React.JSX.Element {
  const { data: channels, isLoading } = useChannels();

  return (
    <Box>
      <PageHeader
        title="채널 연결 상태"
        description="각 채널의 API 연결 상태와 지원 기능을 확인합니다."
      />

      {isLoading ? (
        <Flex justify="center" py={16}>
          <Spinner />
        </Flex>
      ) : !channels?.length ? (
        <Box py={10} textAlign="center">
          <Text color="gray.500" fontSize="sm">
            연결된 채널이 없습니다.
          </Text>
        </Box>
      ) : (
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          }}
          gap={4}
        >
          {channels.map((ch) => (
            <ChannelHealthCard key={ch.id} channel={ch} />
          ))}
        </Grid>
      )}
    </Box>
  );
}
