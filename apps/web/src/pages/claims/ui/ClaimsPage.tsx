"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { format, subDays } from "date-fns";
import { AlertTriangle, KeyIcon } from "lucide-react";

import { useChannelApiKey, useActiveChannel } from "@/entities/channel";
import { useClaimsSummary } from "@/entities/claims";
import { useQoo10Claims, useQoo10CancelProcess, useQoo10ClaimAccept, useQoo10ClaimRedelivery } from "@/entities/order";
import { useShopifyReturns } from "@/entities/order";
import { appToaster } from "@/shared/ui";
import type { ChannelId } from "@/shared/config";
import type { Qoo10ClaimItem } from "@/shared/api/qoo10/types";
import type { ShopifyReturnItem } from "@/entities/order";
import { PageHeader, TableSkeleton } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  ClaimFilterBar,
  ClaimTable,
  ShopifyReturnTable,
  CLAIM_STATUS_CODE,
  type ClaimStatusFilter,
} from "@/widgets/claim-table";
import { ShopifyReturnDetailModal } from "@/features/view-return-detail";

// ─── 상수 ─────────────────────────────────────────────────────

const SHOPIFY_RETURN_STATUSES = [
  "ALL",
  "REQUESTED",
  "OPEN",
  "CLOSED",
  "DECLINED",
  "CANCELLED",
] as const;

type ShopifyReturnStatus = (typeof SHOPIFY_RETURN_STATUSES)[number];

// ─── 날짜 파싱 (Qoo10) ─────────────────────────────────────────

function dateRangeToParams(
  range: string,
): { search_Sdate: string; search_Edate: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyyMMdd");

  if (range === "오늘") {
    return { search_Sdate: fmt(today), search_Edate: fmt(today) };
  }
  if (range === "7일") {
    return { search_Sdate: fmt(subDays(today, 7)), search_Edate: fmt(today) };
  }
  if (range.includes("~")) {
    const parts = range.split("~").map((s) => s.trim());
    const toYMD = (s: string) => s.replace(/\./g, "");
    return { search_Sdate: toYMD(parts[0] ?? ""), search_Edate: toYMD(parts[1] ?? "") };
  }
  return { search_Sdate: fmt(subDays(today, 30)), search_Edate: fmt(today) };
}

// ─── Qoo10 클레임 섹션 ────────────────────────────────────────

function Qoo10ClaimsSection({
  statusFilter,
  dateRange,
  search,
}: {
  statusFilter: ClaimStatusFilter;
  dateRange: string;
  search: string;
}): React.JSX.Element {
  const t = useTranslations("pages.claims");
  const router = useRouter();
  const { hasKey } = useChannelApiKey("qoo10");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const cancelProcess = useQoo10CancelProcess();
  const claimAccept = useQoo10ClaimAccept();
  const claimRedelivery = useQoo10ClaimRedelivery();

  const dateParams = dateRangeToParams(dateRange);
  const claimStatCode = CLAIM_STATUS_CODE[statusFilter];

  const { data: rawClaims, isLoading, error } = useQoo10Claims({
    ClaimStat: claimStatCode,
    search_Sdate: dateParams.search_Sdate,
    search_Edate: dateParams.search_Edate,
    search_condition: "2",
  });

  const filteredClaims = useMemo<Qoo10ClaimItem[]>(() => {
    if (!search.trim()) return rawClaims;
    const q = search.toLowerCase();
    return rawClaims.filter(
      (c) =>
        String(c.orderNo).includes(q) ||
        String(c.packNo).includes(q) ||
        c.itemTitle?.toLowerCase().includes(q) ||
        c.buyer?.toLowerCase().includes(q) ||
        c.receiver?.toLowerCase().includes(q),
    );
  }, [rawClaims, search]);

  if (!hasKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title={t("emptyState.qoo10NoKeyTitle")}
        description={t("emptyState.qoo10NoKeyDescription")}
        action={{ label: t("actions.goToChannelSettings"), onClick: () => router.push("/settings/channels") }}
      />
    );
  }

  if (error?.type === "AUTH_ERROR") {
    return (
      <ErrorBox
        title={t("errors.authFailedTitle")}
        message={t("errors.authFailedMessage")}
        action={{ label: t("actions.goToChannelSettings"), onClick: () => router.push("/settings/channels") }}
      />
    );
  }

  if (error) {
    return <ErrorBox title={t("errors.queryFailedTitle")} message={error.message} />;
  }

  if (isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  if (filteredClaims.length === 0) {
    return (
      <EmptyState
        title={t("emptyState.claimsEmptyTitle")}
        description={t("emptyState.claimsEmptyDescription")}
      />
    );
  }

  const selectedClaims = filteredClaims.filter((c) => selectedIds.includes(c.orderNo));
  const cancelable = selectedClaims.filter((c) => c.claimStatus === '1');
  const acceptable = selectedClaims.filter((c) => c.claimStatus === '4');
  const redeliverable = selectedClaims.filter((c) => c.claimStatus === '11');

  const handleBulkAction = async (
    packNos: number[],
    mutate: (packNo: number) => Promise<void>,
    successMsg: string,
  ): Promise<void> => {
    try {
      await Promise.all(packNos.map((packNo) => mutate(packNo)));
      appToaster.create({ type: 'success', title: successMsg });
      setSelectedIds([]);
    } catch {
      appToaster.create({ type: 'error', title: t("toasts.processError") });
    }
  };

  return (
    <Box flex="1" mt={2} minW={0} display="flex" flexDirection="column" gap={2}>
      {selectedIds.length > 0 && (
        <Flex gap={2} align="center" px={1} py={2} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <Text fontSize="sm" color="blue.700" fontWeight="medium" mr={2}>
            {t("actions.selected", { count: selectedIds.length })}
          </Text>
          {cancelable.length > 0 && (
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              loading={cancelProcess.isPending}
              onClick={() =>
                handleBulkAction(
                  cancelable.map((c) => c.packNo),
                  cancelProcess.mutateAsync,
                  t("toasts.cancelApproveDone", { count: cancelable.length }),
                )
              }
            >
              {t("actions.cancelApprove", { count: cancelable.length })}
            </Button>
          )}
          {acceptable.length > 0 && (
            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              loading={claimAccept.isPending}
              onClick={() =>
                handleBulkAction(
                  acceptable.map((c) => c.packNo),
                  claimAccept.mutateAsync,
                  t("toasts.returnApproveDone", { count: acceptable.length }),
                )
              }
            >
              {t("actions.returnApprove", { count: acceptable.length })}
            </Button>
          )}
          {redeliverable.length > 0 && (
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              loading={claimRedelivery.isPending}
              onClick={() =>
                handleBulkAction(
                  redeliverable.map((c) => c.packNo),
                  claimRedelivery.mutateAsync,
                  t("toasts.redeliveryDone", { count: redeliverable.length }),
                )
              }
            >
              {t("actions.redeliveryProcess", { count: redeliverable.length })}
            </Button>
          )}
        </Flex>
      )}
      <Box overflowX="auto" overflowY="auto">
        <ClaimTable
          claims={filteredClaims}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Box>
    </Box>
  );
}

// ─── Shopify 반품 섹션 ────────────────────────────────────────

function ShopifyReturnsSection({ search }: { search: string }): React.JSX.Element {
  const t = useTranslations("pages.claims");
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopify");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ShopifyReturnStatus>("ALL");
  const [selectedReturn, setSelectedReturn] = useState<ShopifyReturnItem | null>(null);

  const { data, isLoading, error } = useShopifyReturns({
    claimStatus: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const filteredData = useMemo<ShopifyReturnItem[]>(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.orderName.toLowerCase().includes(q) ||
        r.returnName.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.lineItems.some((li) => li.lineItemName.toLowerCase().includes(q)),
    );
  }, [data, search]);

  // 상태별 카운트
  const statusCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { ALL: data.length };
    for (const ret of data) {
      counts[ret.status] = (counts[ret.status] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  if (!hasKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title={t("emptyState.shopifyNoKeyTitle")}
        description={t("emptyState.shopifyNoKeyDescription")}
        action={{ label: t("actions.goToChannelSettings"), onClick: () => router.push("/settings/channels") }}
      />
    );
  }

  return (
    <Box flex="1" display="flex" flexDirection="column" minW={0}>
      {/* 반품 상태 탭 */}
      <Flex
        px={4}
        py={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
        align="center"
        overflowX="auto"
        gap={1}
        bg="white"
        position="sticky"
        top="0"
        zIndex={5}
      >
        {SHOPIFY_RETURN_STATUSES.map((value) => {
          const isSelected = statusFilter === value;
          const count = statusCounts[value];
          return (
            <Button
              key={value}
              variant={isSelected ? "solid" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter(value); }}
              bg={isSelected ? "gray.100" : "transparent"}
              color={isSelected ? "gray.900" : "gray.500"}
              _hover={{ bg: isSelected ? "gray.100" : "gray.50" }}
              height="auto"
              px={3}
              py={1.5}
              borderRadius="md"
              flexShrink={0}
            >
              <Flex align="center" gap={1}>
                <Text fontSize="sm">{t(`shopifyStatuses.${value}`)}</Text>
                {count !== undefined && (
                  <Text fontSize="xs" color={isSelected ? "gray.700" : "gray.400"}>
                    ({count})
                  </Text>
                )}
              </Flex>
            </Button>
          );
        })}
      </Flex>

      {/* 에러 */}
      {error && (
        <Box m={4}>
          <ErrorBox
            title={t("errors.returnsQueryFailedTitle")}
            message={error.message}
          />
        </Box>
      )}

      {/* 로딩 */}
      {isLoading && (
        <Box px={4} pt={3}>
          <TableSkeleton rows={8} cols={6} showFilterBar={false} />
        </Box>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && filteredData.length === 0 && (
        <EmptyState
          title={t("emptyState.returnsEmptyTitle")}
          description={t("emptyState.returnsEmptyDescription")}
        />
      )}

      {/* 테이블 */}
      {!isLoading && !error && filteredData.length > 0 && (
        <Box flex="1" mt={2} minW={0} overflowX="auto" overflowY="auto">
          <ShopifyReturnTable
            returns={filteredData}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(item) => setSelectedReturn(item)}
          />
        </Box>
      )}

      {/* 상세 모달 — 테이블 밖에 마운트 */}
      <ShopifyReturnDetailModal
        item={selectedReturn}
        onClose={() => setSelectedReturn(null)}
      />

    </Box>
  );
}

// ─── 공통 에러 박스 ────────────────────────────────────────────

function ErrorBox({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}): React.JSX.Element {
  return (
    <Box
      role="alert"
      mb={4}
      display="flex"
      alignItems="flex-start"
      gap={3}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      borderColor="red.200"
      bg="red.50"
    >
      <Box mt={1} color="red.500">
        <AlertTriangle size={18} />
      </Box>
      <Box flex="1">
        <Text fontWeight="semibold" mb={1}>{title}</Text>
        <Text fontSize="sm" color="gray.700">{message}</Text>
      </Box>
      {action && (
        <Button ml={4} colorScheme="blue" onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </Box>
  );
}

// ─── 미지원 채널 섹션 ─────────────────────────────────────────

function UnsupportedChannelSection({ channelName }: { channelName: string }): React.JSX.Element {
  const t = useTranslations("pages.claims");
  return (
    <EmptyState
      title={t("unsupported.title", { channel: channelName })}
      description={t("unsupported.description", { channel: channelName })}
    />
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────

function ClaimsPageContent(): React.JSX.Element {
  const t = useTranslations("pages.claims");
  const { activeChannel, setActiveChannel } = useActiveChannel();
  const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>("전체");
  const [dateRange, setDateRange] = useState<string>("30일");
  const [search, setSearch] = useState<string>("");

  const statusCounts = useMemo<Record<string, number>>(() => ({}), []);

  const channelId: ChannelId | "all" = activeChannel;

  const { summary } = useClaimsSummary({ dateField: "orderedAt" });

  function renderClaimsSection(): React.JSX.Element {
    switch (channelId) {
      case "shopify":
        return <ShopifyReturnsSection search={search} />;
      case "shopee":
        return <UnsupportedChannelSection channelName="Shopee" />;
      case "rakuten":
        return <UnsupportedChannelSection channelName="Rakuten" />;
      case "amazon":
        return <UnsupportedChannelSection channelName="Amazon" />;
      default:
        return (
          <Qoo10ClaimsSection
            statusFilter={statusFilter}
            dateRange={dateRange}
            search={search}
          />
        );
    }
  }

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title={t("title")}
        description={t("description")}
        mb={2}
      />

      <HStack
        gap={3}
        px={3}
        py={2}
        bg="gray.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.200"
        wrap="wrap"
        mb={2}
      >
        <Badge colorPalette="red" variant="solid">
          {t("summary.cancelStage", { count: summary.cancel })}
        </Badge>
        <Badge colorPalette="orange" variant="solid">
          {t("summary.returnStage", { count: summary.return })}
        </Badge>
        <Badge colorPalette="purple" variant="solid">
          {t("summary.exchangeStage", { count: summary.exchange })}
        </Badge>
        <Badge colorPalette="blue" variant="solid">
          {t("summary.swapStage", { count: summary.swap })}
        </Badge>
        <Badge colorPalette="gray" variant="solid">
          {t("summary.totalStage", { count: summary.total })}
        </Badge>
      </HStack>

      <ClaimFilterBar
        channelId={channelId}
        status={statusFilter}
        dateRange={dateRange}
        search={search}
        statusCounts={channelId === "shopify" ? {} : statusCounts}
        onChannelChange={(id) => {
          setActiveChannel(id as ChannelId);
          setStatusFilter("전체");
        }}
        onStatusChange={setStatusFilter}
        onDateChange={setDateRange}
        onSearchChange={setSearch}
      />

      {renderClaimsSection()}
    </Box>
  );
}

export function ClaimsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
      <ClaimsPageContent />
    </Suspense>
  );
}
