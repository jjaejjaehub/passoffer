"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Table,
  Text,
} from "@chakra-ui/react";
import { Download, RefreshCw } from "lucide-react";

import {
  buildOrderEventLogCsvUrl,
  useOrderEventLogs,
  type OrderEventLog,
  type OrderEventLogResult,
  type OrderEventLogType,
} from "@/entities/order-event-log";
import { useChannels } from "@/entities/channel";
import { EmptyState, PageHeader, TableSkeleton } from "@/shared/ui";

const EVENT_TYPES: OrderEventLogType[] = [
  "auto_match_success",
  "auto_match_failed",
  "duplicate_suspect",
  "status_sync",
  "collect_error",
];

const RESULTS: OrderEventLogResult[] = ["ok", "warn", "error"];

function resultColor(result: OrderEventLogResult): string {
  if (result === "ok") return "green";
  if (result === "warn") return "yellow";
  return "red";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function OrderEventLogsPage(): React.JSX.Element {
  const t = useTranslations("pages.orderEventLogs");

  const [eventType, setEventType] = useState<OrderEventLogType | "">("");
  const [result, setResult] = useState<OrderEventLogResult | "">("");
  const [channelId, setChannelId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: channels = [] } = useChannels();

  const filters = useMemo(
    () => ({
      eventType: eventType ? [eventType] : undefined,
      result: result ? [result] : undefined,
      channelId: channelId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      pageSize: 50,
    }),
    [eventType, result, channelId, dateFrom, dateTo],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useOrderEventLogs(filters);

  const items: OrderEventLog[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const csvUrl = buildOrderEventLogCsvUrl({
    eventType: filters.eventType,
    result: filters.result,
    channelId: filters.channelId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: 10000,
  });

  return (
    <Box>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              loading={isRefetching}
            >
              <RefreshCw size={14} />
              {t("actions.refresh")}
            </Button>
            <Button size="sm" colorPalette="blue" asChild>
              <a href={csvUrl} download>
                <Download size={14} />
                {t("actions.downloadCsv")}
              </a>
            </Button>
          </HStack>
        }
      />

      <Flex
        gap={3}
        mb={4}
        wrap="wrap"
        p={3}
        bg="gray.50"
        borderWidth="1px"
        borderRadius="md"
      >
        <Box minW="160px">
          <Text fontSize="xs" mb={1} color="gray.600">
            {t("filters.eventType")}
          </Text>
          <select
            value={eventType}
            onChange={(e) =>
              setEventType(e.target.value as OrderEventLogType | "")
            }
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              fontSize: 14,
            }}
          >
            <option value="">{t("filters.all")}</option>
            {EVENT_TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`eventType.${v}`)}
              </option>
            ))}
          </select>
        </Box>

        <Box minW="140px">
          <Text fontSize="xs" mb={1} color="gray.600">
            {t("filters.result")}
          </Text>
          <select
            value={result}
            onChange={(e) =>
              setResult(e.target.value as OrderEventLogResult | "")
            }
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              fontSize: 14,
            }}
          >
            <option value="">{t("filters.all")}</option>
            {RESULTS.map((v) => (
              <option key={v} value={v}>
                {t(`result.${v}`)}
              </option>
            ))}
          </select>
        </Box>

        <Box minW="200px">
          <Text fontSize="xs" mb={1} color="gray.600">
            {t("filters.channel")}
          </Text>
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              fontSize: 14,
            }}
          >
            <option value="">{t("filters.all")}</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Box>

        <Box minW="180px">
          <Text fontSize="xs" mb={1} color="gray.600">
            {t("filters.dateFrom")}
          </Text>
          <Input
            type="datetime-local"
            size="sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Box>

        <Box minW="180px">
          <Text fontSize="xs" mb={1} color="gray.600">
            {t("filters.dateTo")}
          </Text>
          <Input
            type="datetime-local"
            size="sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Box>
      </Flex>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <Box p={4} bg="red.50" color="red.700" borderRadius="md">
          {t("errors.loadFailed")}:{" "}
          {error instanceof Error ? error.message : ""}
        </Box>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <>
          <Box overflowX="auto" borderWidth="1px" borderRadius="md">
            <Table.Root size="sm" variant="line">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader>
                    {t("table.createdAt")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("table.eventType")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{t("table.result")}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t("table.channel")}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t("table.order")}</Table.ColumnHeader>
                  <Table.ColumnHeader>{t("table.message")}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell whiteSpace="nowrap" fontSize="xs">
                      {formatDate(item.createdAt)}
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">
                      <Badge variant="subtle">
                        {t(`eventType.${item.eventType}`)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={resultColor(item.result)}>
                        {t(`result.${item.result}`)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{item.channelName ?? "-"}</Table.Cell>
                    <Table.Cell>{item.channelOrderId ?? "-"}</Table.Cell>
                    <Table.Cell maxW="400px">
                      <Text fontSize="sm" lineClamp={2}>
                        {item.message ?? "-"}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          <Flex justify="center" mt={4}>
            {hasNextPage ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                {t("actions.loadMore")}
              </Button>
            ) : (
              <Text fontSize="xs" color="gray.500">
                {t("actions.noMore")}
              </Text>
            )}
          </Flex>
        </>
      )}
    </Box>
  );
}
