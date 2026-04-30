"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { format, subDays } from "date-fns";
import { AlertTriangle, KeyIcon } from "lucide-react";

import { useChannelApiKey, useActiveChannel } from "@/entities/channel";
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
  { value: "ALL", label: "전체" },
  { value: "REQUESTED", label: "요청됨" },
  { value: "OPEN", label: "진행중" },
  { value: "CLOSED", label: "완료" },
  { value: "DECLINED", label: "거절됨" },
  { value: "CANCELLED", label: "취소됨" },
] as const;

type ShopifyReturnStatus = (typeof SHOPIFY_RETURN_STATUSES)[number]["value"];

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
        title="Qoo10 API 키가 없습니다"
        description="채널 설정에서 Qoo10 API 키를 등록하면 클레임이 자동으로 수집됩니다."
        action={{ label: "채널 설정으로 이동", onClick: () => router.push("/settings/channels") }}
      />
    );
  }

  if (error?.type === "AUTH_ERROR") {
    return (
      <ErrorBox
        title="API 키 인증 실패"
        message="API 키 인증에 실패했습니다. 채널 설정에서 키를 확인해 주세요."
        action={{ label: "채널 설정으로 이동", onClick: () => router.push("/settings/channels") }}
      />
    );
  }

  if (error) {
    return <ErrorBox title="클레임 조회 중 오류 발생" message={error.message} />;
  }

  if (isLoading) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  if (filteredClaims.length === 0) {
    return (
      <EmptyState
        title="표시할 클레임이 없습니다"
        description="선택한 기간과 필터 조건에 해당하는 클레임이 없습니다."
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
      appToaster.create({ type: 'error', title: '처리 중 오류가 발생했습니다.' });
    }
  };

  return (
    <Box flex="1" mt={2} minW={0} display="flex" flexDirection="column" gap={2}>
      {selectedIds.length > 0 && (
        <Flex gap={2} align="center" px={1} py={2} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
          <Text fontSize="sm" color="blue.700" fontWeight="medium" mr={2}>
            {selectedIds.length}건 선택됨
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
                  `취소 승인 완료 (${cancelable.length}건)`,
                )
              }
            >
              취소 승인 ({cancelable.length})
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
                  `반품 승인 완료 (${acceptable.length}건)`,
                )
              }
            >
              반품 승인 ({acceptable.length})
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
                  `재배송 처리 완료 (${redeliverable.length}건)`,
                )
              }
            >
              재배송 처리 ({redeliverable.length})
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
        title="Shopify API 키가 없습니다"
        description="채널 설정에서 Shopify API 키를 등록하면 반품 현황이 자동으로 수집됩니다."
        action={{ label: "채널 설정으로 이동", onClick: () => router.push("/settings/channels") }}
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
        {SHOPIFY_RETURN_STATUSES.map(({ value, label }) => {
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
                <Text fontSize="sm">{label}</Text>
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
            title="반품 조회 중 오류 발생"
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
          title="표시할 반품이 없습니다"
          description="현재 필터 조건에 해당하는 반품이 없습니다."
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
  return (
    <EmptyState
      title={`${channelName} 클레임 미지원`}
      description={`${channelName} 채널의 클레임 관리는 아직 지원되지 않습니다.`}
    />
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────

function ClaimsPageContent(): React.JSX.Element {
  const { activeChannel, setActiveChannel } = useActiveChannel();
  const [statusFilter, setStatusFilter] = useState<ClaimStatusFilter>("전체");
  const [dateRange, setDateRange] = useState<string>("30일");
  const [search, setSearch] = useState<string>("");

  const statusCounts = useMemo<Record<string, number>>(() => ({}), []);

  const channelId: ChannelId | "all" = activeChannel;

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
        title="클레임 관리"
        description="취소·반품·교환 클레임 현황을 조회합니다."
        mb={2}
      />

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
