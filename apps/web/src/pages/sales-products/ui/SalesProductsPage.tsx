"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link as LinkIcon, RefreshCw, Search, Unlink, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  useChannelProducts,
  useChannels,
  useUnlinkChannelProduct,
  type ChannelProductItem,
  type ChannelRecord,
} from "@/entities/channel";
import { executeEditItemStatus, useEditItemStatus } from "@/entities/item";
import {
  usePullSalesFromChannel,
  usePushStockToChannel,
  useSyncProductInfoToChannel,
} from "@/entities/master-product";
import { masterProductsQueryRoot } from "@/entities/master-product/api/masterProductQueries";
import {
  useShopifyDeleteProduct,
  useShopifyUpdateProductStatus,
} from "@/entities/product";
import {
  DeleteConfirmDialog,
  StatusChangeConfirmDialog,
} from "@/features/edit-item-status";
import {
  ProductDetailModal,
  ShopifyProductDetailModal,
} from "@/features/view-product-detail";
import { ROUTES, qoo10ProductsQueryRoot } from "@/shared/config";
import { ErrorState, EmptyState, PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";
import { LinkMasterProductModal } from "./LinkMasterProductModal";

type StatusTab = { id: string; label: string };

const QOO10_STATUS_TABS: StatusTab[] = [
  { id: "all", label: "전체" },
  { id: "S2", label: "거래가능" },
  { id: "S1", label: "거래대기" },
  { id: "S0", label: "검수대기" },
  { id: "S3", label: "거래중지" },
  { id: "S5", label: "거래제한" },
  { id: "S8", label: "승인거부" },
];

const SHOPIFY_STATUS_TABS: StatusTab[] = [
  { id: "all", label: "전체" },
  { id: "ACTIVE", label: "판매" },
  { id: "DRAFT", label: "판매중지" },
  { id: "ARCHIVED", label: "보관됨" },
];

const SHOPEE_STATUS_TABS: StatusTab[] = [
  { id: "all", label: "전체" },
  { id: "NORMAL", label: "판매중" },
  { id: "UNLIST", label: "판매중지" },
  { id: "REVIEWING", label: "검수중" },
  { id: "BANNED", label: "차단" },
  { id: "SELLER_DELETE", label: "삭제" },
];

const RAKUTEN_STATUS_TABS: StatusTab[] = [{ id: "all", label: "전체" }];

function getStatusTabsForChannel(
  channelType: ChannelRecord["channelType"],
): StatusTab[] {
  switch (channelType) {
    case "QOO10_JP":
      return QOO10_STATUS_TABS;
    case "SHOPIFY":
      return SHOPIFY_STATUS_TABS;
    case "SHOPEE":
      return SHOPEE_STATUS_TABS;
    case "RAKUTEN":
      return RAKUTEN_STATUS_TABS;
    default:
      return [{ id: "all", label: "전체" }];
  }
}

function getLinkStatusBadge(item: ChannelProductItem) {
  if (item.linkStatus === "linked") {
    return (
      <Badge
        colorScheme="green"
        px={2}
        py={0.5}
        borderRadius="md"
        fontSize="xs"
      >
        연결됨
      </Badge>
    );
  }
  return (
    <Badge colorScheme="yellow" px={2} py={0.5} borderRadius="md" fontSize="xs">
      미연결
    </Badge>
  );
}

function SalesProductRow({
  item,
  channelId,
  canManage,
  canViewDetail,
  isActive,
  activateLabel,
  suspendLabel,
  selected,
  onToggleSelected,
  onSelectDetail,
  onLinkSuccess,
  onRowSuspend,
  onRowActivate,
  onRowDeleteRequest,
  isStatusActionPending,
}: {
  item: ChannelProductItem;
  channelId: string;
  canManage: boolean;
  canViewDetail: boolean;
  isActive: boolean;
  activateLabel: string;
  suspendLabel: string;
  selected: boolean;
  onToggleSelected: () => void;
  onSelectDetail: () => void;
  onLinkSuccess: () => void;
  onRowSuspend: (channelItemId: string) => void;
  onRowActivate: (channelItemId: string) => void;
  onRowDeleteRequest: (channelItemId: string, listedProductId?: string) => void;
  isStatusActionPending: boolean;
}) {
  const router = useRouter();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const { mutateAsync: unlinkProduct, isPending: isUnlinking } =
    useUnlinkChannelProduct();
  const { mutateAsync: pullSales, isPending: isPulling } =
    usePullSalesFromChannel();
  const { mutateAsync: pushStock, isPending: isPushingStock } =
    usePushStockToChannel();
  const { mutateAsync: syncInfo, isPending: isSyncingInfo } =
    useSyncProductInfoToChannel();

  async function handlePushStock() {
    if (!item.listedProductId) return;
    try {
      await pushStock(item.listedProductId);
      appToaster.success({ title: "재고 동기화 완료" });
    } catch {
      appToaster.error({ title: "재고 동기화 실패" });
    }
  }

  async function handleSyncInfo() {
    if (!item.listedProductId) return;
    try {
      await syncInfo(item.listedProductId);
      appToaster.success({ title: "상품 정보 동기화 완료" });
    } catch {
      appToaster.error({ title: "상품 정보 동기화 실패" });
    }
  }

  async function handleUnlink() {
    if (!item.listedProductId) return;
    try {
      await unlinkProduct(item.listedProductId);
      appToaster.success({ title: "연결 해제 완료" });
      onLinkSuccess();
    } catch {
      appToaster.error({ title: "연결 해제 실패" });
    }
  }

  async function handlePullSales() {
    if (!item.listedProductId) return;
    try {
      await pullSales(item.listedProductId);
      appToaster.success({ title: "판매 동기화 완료" });
    } catch {
      appToaster.error({ title: "판매 동기화 실패" });
    }
  }

  return (
    <>
      <Table.Row>
        {canManage && (
          <Table.Cell w="40px">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
            />
          </Table.Cell>
        )}
        <Table.Cell w="60px">
          {item.images[0] ? (
            <Image
              src={item.images[0]}
              alt={item.title}
              boxSize="48px"
              objectFit="cover"
              borderRadius="sm"
              cursor={canViewDetail ? "pointer" : "default"}
              onClick={canViewDetail ? onSelectDetail : undefined}
            />
          ) : (
            <Box boxSize="48px" bg="gray.100" borderRadius="sm" />
          )}
        </Table.Cell>
        <Table.Cell>
          <Stack gap={0.5}>
            <Text
              fontWeight="medium"
              fontSize="sm"
              lineClamp={2}
              cursor={canViewDetail ? "pointer" : "default"}
              onClick={canViewDetail ? onSelectDetail : undefined}
              _hover={canViewDetail ? { color: "blue.600" } : undefined}
            >
              {item.title}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {item.channelItemId}
            </Text>
            {item.sellerCode && (
              <Text fontSize="xs" color="gray.400">
                판매자코드: {item.sellerCode}
              </Text>
            )}
          </Stack>
        </Table.Cell>
        <Table.Cell>
          <Text fontSize="sm">{item.variants.length}개</Text>
        </Table.Cell>
        <Table.Cell>{getLinkStatusBadge(item)}</Table.Cell>
        <Table.Cell>
          <Flex gap={2} justify="flex-end" wrap="wrap">
            {canManage && (
              <>
                {isActive ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onRowSuspend(item.channelItemId)}
                    loading={isStatusActionPending}
                  >
                    {suspendLabel}
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onRowActivate(item.channelItemId)}
                    loading={isStatusActionPending}
                  >
                    {activateLabel}
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  onClick={() =>
                    onRowDeleteRequest(item.channelItemId, item.listedProductId)
                  }
                >
                  삭제
                </Button>
              </>
            )}
            {item.linkStatus === "linked" ? (
              <>
                {item.masterProductId && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      router.push(
                        ROUTES.masterProductEdit(item.masterProductId!),
                      )
                    }
                  >
                    마스터 보기
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  onClick={handleUnlink}
                  loading={isUnlinking}
                >
                  <Unlink size={12} />
                  연결 해제
                </Button>
              </>
            ) : (
              <Button
                size="xs"
                colorScheme="blue"
                onClick={() => setLinkModalOpen(true)}
              >
                <LinkIcon size={12} />
                마스터 연결
              </Button>
            )}
          </Flex>
        </Table.Cell>
      </Table.Row>

      {linkModalOpen && (
        <LinkMasterProductModal
          channelId={channelId}
          channelProduct={item}
          onClose={() => setLinkModalOpen(false)}
          onSuccess={() => {
            setLinkModalOpen(false);
            onLinkSuccess();
          }}
        />
      )}
    </>
  );
}

function SalesProductsPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentSearchParams = searchParams ?? new URLSearchParams();

  const { data: channels, isLoading: isLoadingChannels } = useChannels();
  const channelList = channels ?? [];

  const urlChannelId = currentSearchParams.get("channel");
  const matchedUrlChannel = urlChannelId
    ? (channelList.find((c) => c.id === urlChannelId) ?? null)
    : null;
  const activeChannel = matchedUrlChannel ?? channelList[0] ?? null;
  const activeChannelId = activeChannel?.id ?? null;

  const activeStatus = currentSearchParams.get("status") ?? "all";
  const initialPageParam = currentSearchParams.get("page") ?? "1";
  const initialPage = Number(initialPageParam);
  const page = Number.isNaN(initialPage) || initialPage < 1 ? 1 : initialPage;
  const pageSize = 50;

  const isQoo10 = activeChannel?.channelType === "QOO10_JP";
  const isShopify = activeChannel?.channelType === "SHOPIFY";
  const canManage = isQoo10 || isShopify;
  const activateLabel = isShopify ? "판매(ACTIVE)" : "판매중";
  const suspendLabel = isShopify ? "판매중지(DRAFT)" : "판매중지";

  const isItemActive = (item: ChannelProductItem): boolean => {
    if (isQoo10) return item.status === "S2";
    if (isShopify) return item.status === "ACTIVE";
    return false;
  };

  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [selectedSellerCode, setSelectedSellerCode] = useState<string | null>(
    null,
  );
  const [selectedItemCodes, setSelectedItemCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteTargetCodes, setDeleteTargetCodes] = useState<string[]>([]);
  const [deleteTargetListedIds, setDeleteTargetListedIds] = useState<string[]>(
    [],
  );
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [statusTargetCodes, setStatusTargetCodes] = useState<string[]>([]);
  const [statusTargetValue, setStatusTargetValue] = useState<"1" | "2" | null>(
    null,
  );
  const [statusActionPending, setStatusActionPending] =
    useState<boolean>(false);

  const {
    mutateAsync: editItemStatusAsync,
    isPending: isEditItemStatusPending,
  } = useEditItemStatus();

  const {
    mutateAsync: updateShopifyStatusAsync,
    isPending: isShopifyStatusPending,
  } = useShopifyUpdateProductStatus(activeChannelId ?? undefined);
  const { mutateAsync: deleteShopifyProductAsync } = useShopifyDeleteProduct(
    activeChannelId ?? undefined,
  );
  const { mutateAsync: unlinkChannelProductAsync } = useUnlinkChannelProduct();

  // 디바운스 검색
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // 잘못된 channel URL 파라미터(예: 슬러그 'qoo10')를 실제 채널 UUID로 정정
  useEffect(() => {
    if (channelList.length === 0) return;
    if (!urlChannelId) return;
    if (matchedUrlChannel) return;
    const fallbackId = channelList[0]?.id;
    if (!fallbackId) return;
    const next = new URLSearchParams(currentSearchParams.toString());
    next.set("channel", fallbackId);
    router.replace(`/sales-products?${next.toString()}`);
  }, [
    channelList,
    urlChannelId,
    matchedUrlChannel,
    currentSearchParams,
    router,
  ]);

  const { data, isLoading, isError, error, refetch } = useChannelProducts(
    activeChannelId ?? "",
    {
      page,
      pageSize,
      status: activeStatus === "all" ? undefined : activeStatus,
      enabled: !!activeChannelId,
    },
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.channelItemId.toLowerCase().includes(q) ||
        (it.sellerCode ?? "").toLowerCase().includes(q),
    );
  }, [items, debouncedSearch]);

  // 필터/페이지/채널 변경 시 선택 초기화
  // biome-ignore lint/correctness/useExhaustiveDependencies: 의도적 트리거
  useEffect(() => {
    setSelectedItemCodes(new Set());
  }, [page, activeStatus, debouncedSearch, activeChannelId]);

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 0) return [1];
    const numbers: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let current = start; current <= end; current += 1) {
      numbers.push(current);
    }
    return numbers;
  }, [page, totalPages]);

  const movePage = (nextPage: number): void => {
    const boundedPage = Math.max(1, Math.min(totalPages || 1, nextPage));
    const next = new URLSearchParams(currentSearchParams.toString());
    next.set("page", String(boundedPage));
    router.push(`/sales-products?${next.toString()}`);
  };

  const handleStatusChange = (statusId: string): void => {
    const next = new URLSearchParams(currentSearchParams.toString());
    next.set("status", statusId);
    next.set("page", "1");
    router.push(`/sales-products?${next.toString()}`);
  };

  const handleChannelChange = (channelId: string): void => {
    const next = new URLSearchParams(currentSearchParams.toString());
    next.set("channel", channelId);
    next.delete("status");
    next.set("page", "1");
    router.push(`/sales-products?${next.toString()}`);
  };

  const handleClearSearch = (): void => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  const toggleRowSelection = (itemCode: string): void => {
    setSelectedItemCodes((prev) => {
      const next = new Set(prev);
      if (next.has(itemCode)) next.delete(itemCode);
      else next.add(itemCode);
      return next;
    });
  };

  const toggleAllSelection = (checked: boolean): void => {
    if (!checked) {
      setSelectedItemCodes(new Set());
      return;
    }
    const next = new Set<string>();
    for (const item of filteredItems) {
      next.add(item.channelItemId);
    }
    setSelectedItemCodes(next);
  };

  const openStatusDialog = (itemCodes: string[], status: "1" | "2"): void => {
    setStatusTargetCodes(itemCodes);
    setStatusTargetValue(status);
    setStatusDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (deleteTargetCodes.length === 0) return;
    const results = isShopify
      ? await Promise.allSettled(
          deleteTargetCodes.map((code) =>
            deleteShopifyProductAsync(code.trim()),
          ),
        )
      : await Promise.allSettled(
          deleteTargetCodes.map((code) =>
            executeEditItemStatus({ itemCode: code.trim(), status: "3" }),
          ),
        );
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.length - fulfilled;
    appToaster.create({
      title: "처리 완료",
      description: `성공 ${fulfilled}건, 실패 ${rejected}건`,
      type: rejected > 0 ? "warning" : "success",
    });

    // 채널 삭제 성공한 항목의 listed_products 레코드도 함께 제거
    if (deleteTargetListedIds.length > 0) {
      await Promise.allSettled(
        deleteTargetListedIds.map((id) => unlinkChannelProductAsync(id)),
      );
      void queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
    }

    if (isQoo10) {
      void queryClient.invalidateQueries({ queryKey: qoo10ProductsQueryRoot });
    }
    void queryClient.invalidateQueries({
      queryKey: ["channel-products", activeChannelId],
    });
    setSelectedItemCodes(new Set());
    setDeleteTargetListedIds([]);
  };

  const handleStatusConfirm = async (): Promise<void> => {
    if (statusTargetCodes.length === 0 || statusTargetValue === null) return;
    const status = statusTargetValue;

    if (isShopify) {
      const shopifyStatus: "ACTIVE" | "DRAFT" =
        status === "2" ? "ACTIVE" : "DRAFT";
      if (statusTargetCodes.length === 1) {
        await updateShopifyStatusAsync({
          productId: statusTargetCodes[0],
          status: shopifyStatus,
        });
        void queryClient.invalidateQueries({
          queryKey: ["channel-products", activeChannelId],
        });
        return;
      }
      setStatusActionPending(true);
      try {
        const results = await Promise.allSettled(
          statusTargetCodes.map((code) =>
            updateShopifyStatusAsync({
              productId: code.trim(),
              status: shopifyStatus,
            }),
          ),
        );
        const fulfilled = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const rejected = results.length - fulfilled;
        appToaster.create({
          title: "일괄 처리 완료",
          description: `성공 ${fulfilled}건, 실패 ${rejected}건`,
          type: rejected > 0 ? "warning" : "success",
        });
        void queryClient.invalidateQueries({
          queryKey: ["channel-products", activeChannelId],
        });
        setSelectedItemCodes(new Set());
      } finally {
        setStatusActionPending(false);
      }
      return;
    }

    if (statusTargetCodes.length === 1) {
      await editItemStatusAsync({ itemCode: statusTargetCodes[0], status });
      void queryClient.invalidateQueries({
        queryKey: ["channel-products", activeChannelId],
      });
      return;
    }
    setStatusActionPending(true);
    try {
      const results = await Promise.allSettled(
        statusTargetCodes.map((code) =>
          executeEditItemStatus({ itemCode: code.trim(), status }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.length - fulfilled;
      appToaster.create({
        title: "일괄 처리 완료",
        description: `성공 ${fulfilled}건, 실패 ${rejected}건`,
        type: rejected > 0 ? "warning" : "success",
      });
      void queryClient.invalidateQueries({ queryKey: qoo10ProductsQueryRoot });
      void queryClient.invalidateQueries({
        queryKey: ["channel-products", activeChannelId],
      });
      setSelectedItemCodes(new Set());
    } finally {
      setStatusActionPending(false);
    }
  };

  const statusTabs = activeChannel
    ? getStatusTabsForChannel(activeChannel.channelType)
    : [{ id: "all", label: "전체" }];

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((it) => selectedItemCodes.has(it.channelItemId));

  if (isLoadingChannels) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner />
      </Box>
    );
  }

  const renderContent = (): React.JSX.Element => {
    if (channelList.length === 0) {
      return (
        <EmptyState
          title="연결된 채널이 없습니다"
          description="설정에서 채널을 추가해주세요."
          action={{
            label: "채널 설정으로 이동",
            onClick: () => router.push("/settings/channels"),
          }}
        />
      );
    }

    if (!activeChannelId) {
      return (
        <EmptyState
          title="채널을 선택해 주세요"
          description="상단 탭에서 채널을 선택하면 상품을 조회할 수 있습니다."
        />
      );
    }

    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      );
    }

    if (isError) {
      return (
        <ErrorState
          title="채널 상품을 불러오지 못했습니다"
          description={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      );
    }

    if (filteredItems.length === 0) {
      return (
        <EmptyState
          title="표시할 상품이 없습니다"
          description="선택한 상태 또는 검색 조건에 맞는 상품이 없습니다."
        />
      );
    }

    return (
      <Stack
        gap={3}
        px={4}
        height="100%"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <Flex justify="space-between" align="center" flexShrink={0}>
          <Text fontSize="sm" color="gray.500">
            총 {totalItems.toLocaleString()}개
            {debouncedSearch && ` (필터링: ${filteredItems.length}개)`}
          </Text>
          {canManage &&
            selectedItemCodes.size > 0 &&
            (() => {
              const selectedItems = filteredItems.filter((it) =>
                selectedItemCodes.has(it.channelItemId),
              );
              const hasInactive = selectedItems.some((it) => !isItemActive(it));
              const hasActive = selectedItems.some((it) => isItemActive(it));
              return (
                <Flex gap={2}>
                  {hasInactive && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        openStatusDialog(Array.from(selectedItemCodes), "2")
                      }
                      loading={
                        isEditItemStatusPending ||
                        isShopifyStatusPending ||
                        statusActionPending
                      }
                    >
                      선택 {activateLabel} ({selectedItemCodes.size})
                    </Button>
                  )}
                  {hasActive && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        openStatusDialog(Array.from(selectedItemCodes), "1")
                      }
                      loading={
                        isEditItemStatusPending ||
                        isShopifyStatusPending ||
                        statusActionPending
                      }
                    >
                      선택 {suspendLabel} ({selectedItemCodes.size})
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="red"
                    onClick={() => {
                      const codes = Array.from(selectedItemCodes);
                      setDeleteTargetCodes(codes);
                      setDeleteTargetListedIds(
                        filteredItems
                          .filter(
                            (i) =>
                              codes.includes(i.channelItemId) &&
                              i.listedProductId,
                          )
                          .map((i) => i.listedProductId!),
                      );
                      setDeleteDialogOpen(true);
                    }}
                  >
                    선택 삭제 ({selectedItemCodes.size})
                  </Button>
                </Flex>
              );
            })()}
        </Flex>

        <Box flex="1" minH={0} overflowY="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                {canManage && (
                  <Table.ColumnHeader
                    w="40px"
                    position="sticky"
                    top={0}
                    zIndex={1}
                    bg="white"
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAllSelection(e.target.checked)}
                    />
                  </Table.ColumnHeader>
                )}
                <Table.ColumnHeader
                  w="60px"
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                />
                <Table.ColumnHeader
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                >
                  상품명 / 채널 ID
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  w="80px"
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                >
                  옵션 수
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  w="100px"
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                >
                  연결 상태
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  w="320px"
                  textAlign="right"
                  position="sticky"
                  top={0}
                  zIndex={1}
                  bg="white"
                >
                  작업
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredItems.map((item) => (
                <SalesProductRow
                  key={item.channelItemId}
                  item={item}
                  channelId={activeChannelId}
                  canManage={canManage}
                  canViewDetail={isQoo10 || isShopify}
                  isActive={isItemActive(item)}
                  activateLabel={activateLabel}
                  suspendLabel={suspendLabel}
                  selected={selectedItemCodes.has(item.channelItemId)}
                  onToggleSelected={() =>
                    toggleRowSelection(item.channelItemId)
                  }
                  onSelectDetail={() => {
                    setSelectedItemCode(item.channelItemId);
                    setSelectedSellerCode(item.sellerCode ?? null);
                  }}
                  onLinkSuccess={() => void refetch()}
                  onRowSuspend={(code) => openStatusDialog([code], "1")}
                  onRowActivate={(code) => openStatusDialog([code], "2")}
                  onRowDeleteRequest={(code, listedId) => {
                    setDeleteTargetCodes([code]);
                    setDeleteTargetListedIds(listedId ? [listedId] : []);
                    setDeleteDialogOpen(true);
                  }}
                  isStatusActionPending={
                    isEditItemStatusPending ||
                    isShopifyStatusPending ||
                    statusActionPending
                  }
                />
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Stack>
    );
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" minH={0}>
      <PageHeader
        title="판매 상품 관리"
        description="채널 상품과 마스터 상품을 연결합니다."
        mb={2}
      />

      <Box
        flexShrink={0}
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        {/* 채널 탭 */}
        <Flex
          px={4}
          pt={3}
          pb={2}
          borderBottomWidth="1px"
          borderColor="gray.100"
          align="center"
          gap={1}
          overflowX="auto"
        >
          {channelList.map((channel) => {
            const isSelected = activeChannelId === channel.id;
            return (
              <Button
                key={channel.id}
                variant="ghost"
                size="sm"
                onClick={() => handleChannelChange(channel.id)}
                fontWeight={isSelected ? "semibold" : "normal"}
                color={isSelected ? "gray.900" : "gray.500"}
                borderRadius={0}
                px={3}
                py={2}
                height="auto"
                border="none"
                outline="none"
                boxShadow={
                  isSelected
                    ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                    : "none"
                }
                _hover={{
                  bg: "transparent",
                  color: "gray.900",
                  boxShadow: "inset 0 -2px 0 0 var(--chakra-colors-gray-200)",
                }}
                _active={{ bg: "transparent" }}
                _focus={{
                  boxShadow: isSelected
                    ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                    : "none",
                }}
              >
                <Text fontSize="sm">{channel.name}</Text>
              </Button>
            );
          })}
        </Flex>

        {/* 상태 탭 */}
        {statusTabs.length > 1 && (
          <Flex
            px={4}
            py={2}
            borderBottomWidth="1px"
            borderColor="gray.100"
            align="center"
            overflowX="auto"
            gap={1}
          >
            {statusTabs.map((tab) => {
              const isSelected = activeStatus === tab.id;
              return (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={isSelected ? "solid" : "ghost"}
                  onClick={() => handleStatusChange(tab.id)}
                  bg={isSelected ? "gray.100" : "transparent"}
                  color={isSelected ? "gray.900" : "gray.500"}
                  _hover={{ bg: isSelected ? "gray.100" : "gray.50" }}
                  height="auto"
                  px={3}
                  py={1.5}
                  borderRadius="md"
                >
                  <Text fontSize="sm">{tab.label}</Text>
                </Button>
              );
            })}
          </Flex>
        )}

        {/* 검색 */}
        <Flex
          px={4}
          py={3}
          align="center"
          justify="space-between"
          gap={4}
          flexWrap="wrap"
        >
          <Flex gap={2} flex="1" justify="flex-end">
            <Box position="relative" minW="260px" maxW="360px" w="100%">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="상품명 / 채널 ID / 판매자코드 검색"
                pl={8}
                pr={8}
                size="sm"
                borderColor="gray.200"
                w="100%"
              />
              <Icon
                as={Search}
                boxSize={4}
                color="gray.400"
                position="absolute"
                left={2}
                top="50%"
                transform="translateY(-50%)"
              />
              {searchInput && (
                <button
                  type="button"
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                  }}
                  onClick={handleClearSearch}
                >
                  <Icon as={X} boxSize={4} />
                </button>
              )}
            </Box>
          </Flex>
        </Flex>
      </Box>

      <Box mt={4} flex="1" minH={0} display="flex" flexDirection="column">
        {renderContent()}
      </Box>

      {canManage && (
        <DeleteConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeleteTargetCodes([]);
          }}
          itemCodes={deleteTargetCodes}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {canManage && (
        <StatusChangeConfirmDialog
          isOpen={statusDialogOpen}
          onClose={() => {
            setStatusDialogOpen(false);
            setStatusTargetCodes([]);
            setStatusTargetValue(null);
          }}
          itemCodes={statusTargetCodes}
          actionLabel={
            statusTargetValue === "1"
              ? isShopify
                ? "판매중지(DRAFT)로 변경"
                : "판매중지"
              : isShopify
                ? "판매(ACTIVE)로 변경"
                : "판매중으로 변경"
          }
          onConfirm={handleStatusConfirm}
        />
      )}

      {isQoo10 && (
        <ProductDetailModal
          itemCode={selectedItemCode}
          sellerCode={selectedSellerCode}
          onClose={() => {
            setSelectedItemCode(null);
            setSelectedSellerCode(null);
          }}
        />
      )}

      {isShopify && (
        <ShopifyProductDetailModal
          productId={selectedItemCode}
          onClose={() => {
            setSelectedItemCode(null);
            setSelectedSellerCode(null);
          }}
        />
      )}

      {totalPages > 0 && filteredItems.length > 0 && (
        <Flex mt={4} mb={6} align="center" justify="center" gap={2}>
          <Button
            size="sm"
            variant="outline"
            borderColor="gray.300"
            onClick={() => movePage(page - 1)}
            disabled={page <= 1}
          >
            이전
          </Button>
          {visiblePageNumbers.map((number) => {
            const isCurrent = page === number;
            return (
              <Button
                key={number}
                size="sm"
                variant={isCurrent ? "solid" : "outline"}
                bg={isCurrent ? "gray.900" : "white"}
                color={isCurrent ? "white" : "gray.700"}
                borderColor={isCurrent ? "gray.900" : "gray.300"}
                _hover={{ bg: isCurrent ? "gray.800" : "gray.50" }}
                onClick={() => movePage(number)}
              >
                {number}
              </Button>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            borderColor="gray.300"
            onClick={() => movePage(page + 1)}
            disabled={totalPages <= 0 || page >= totalPages}
          >
            다음
          </Button>
        </Flex>
      )}
    </Box>
  );
}

export function SalesProductsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      }
    >
      <SalesProductsPageContent />
    </Suspense>
  );
}
