"use client";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, KeyIcon, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useChannelApiKey, useActiveChannel, useChannelUuid } from "@/entities/channel";
import type { ChannelId } from "@/shared/config";
import { executeEditItemStatus, useEditItemStatus } from "@/entities/item";
import {
  QOO10_PRODUCT_LIST_STATUSES,
  useQoo10Products,
} from "@/entities/product";
import {
  DeleteConfirmDialog,
  ItemBulkActionBar,
  StatusChangeConfirmDialog,
} from "@/features/edit-item-status";
import {
  ProductDetailModal,
} from "@/features/view-product-detail";
import { ShopeeProductsContent } from "./ShopeeProductsContent";
import { ShopifyProductsContent } from "./ShopifyProductsContent";
import { http } from "@/shared/api";
import { LIVE_CHANNELS, qoo10ProductsQueryRoot } from "@/shared/config";
import type { Product } from "@oms/types";
import { ErrorState, EmptyState, PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";
import { ProductTable } from "@/widgets/product-table";

const STATUS_TABS = [
  { id: "all", label: "전체" },
  { id: "S2", label: "거래가능" },
  { id: "S1", label: "거래대기" },
  { id: "S0", label: "검수대기" },
  { id: "S3", label: "거래중지" },
  { id: "S5", label: "거래제한" },
  { id: "S8", label: "승인거부" },
] as const;

const SHOPIFY_STATUS_TABS = [
  { id: "all", label: "전체" },
  { id: "ACTIVE", label: "판매" },
  { id: "DRAFT", label: "판매중지" },
  { id: "ARCHIVED", label: "보관됨" },
] as const;

type ShopifyStatusId = (typeof SHOPIFY_STATUS_TABS)[number]["id"];

const SHOPIFY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "판매",
  DRAFT: "판매중지",
  ARCHIVED: "보관됨",
};

// Shopee item_status 문서 기반: NORMAL / BANNED / UNLIST / REVIEWING / SELLER_DELETE / SHOPEE_DELETE
const SHOPEE_STATUS_TABS = [
  { id: "all", label: "전체", apiValues: ["NORMAL", "BANNED", "UNLIST", "REVIEWING"] },
  { id: "NORMAL", label: "판매중", apiValues: ["NORMAL"] },
  { id: "UNLIST", label: "판매중지", apiValues: ["UNLIST"] },
  { id: "REVIEWING", label: "검수중", apiValues: ["REVIEWING"] },
  { id: "BANNED", label: "차단", apiValues: ["BANNED"] },
  { id: "SELLER_DELETE", label: "삭제", apiValues: ["SELLER_DELETE"] },
] as const;

type ShopeeStatusId = (typeof SHOPEE_STATUS_TABS)[number]["id"];

const SHOPEE_STATUS_LABEL: Record<string, string> = {
  NORMAL: "판매중",
  UNLIST: "판매중지",
  REVIEWING: "검수중",
  BANNED: "차단",
  SELLER_DELETE: "삭제",
  SHOPEE_DELETE: "쇼피삭제",
};

function ProductsPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentSearchParams = searchParams ?? new URLSearchParams();

  const initialPageParam = currentSearchParams.get("page") ?? "1";
  const initialPage = Number(initialPageParam);
  const safeInitialPage =
    Number.isNaN(initialPage) || initialPage < 1 ? 1 : initialPage;

  const { activeChannel: globalChannel, setActiveChannel } = useActiveChannel();
  // URL param이 있으면 우선, 없으면 전역 채널 사용
  const activeChannel = currentSearchParams.get("channel") ?? globalChannel;
  const activeStatus = (currentSearchParams.get("status") ?? "all") as (typeof STATUS_TABS)[number]["id"];
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
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [statusTargetCodes, setStatusTargetCodes] = useState<string[]>([]);
  const [statusTargetValue, setStatusTargetValue] = useState<"1" | "2" | null>(
    null,
  );
  const [statusActionPending, setStatusActionPending] =
    useState<boolean>(false);

  const activeShopifyStatus = (currentSearchParams.get("status") ?? "all") as ShopifyStatusId;
  const [shopifyAfterCursor, setShopifyAfterCursor] = useState<string | undefined>(undefined);
  const [shopifyCursorStack, setShopifyCursorStack] = useState<string[]>([]);

  const {
    mutateAsync: editItemStatusAsync,
    isPending: isEditItemStatusPending,
  } = useEditItemStatus();

  const page = safeInitialPage;
  const isAllStatuses = activeStatus === "all";

  const isShopeeChannel = activeChannel === "shopee";
  const isShopifyChannel = activeChannel === "shopify";

  const activeShopeeStatus = (currentSearchParams.get("status") ?? "all") as ShopeeStatusId;

  const shopeeStatusTab = SHOPEE_STATUS_TABS.find(
    (t) => t.id === activeShopeeStatus,
  ) ?? SHOPEE_STATUS_TABS[0];

  const { hasKey } = useChannelApiKey("qoo10");
  const qoo10ChannelUuid = useChannelUuid("qoo10");

  const isQoo10Channel = !isShopeeChannel && !isShopifyChannel;

  const { data, totalPages, isLoading, error, hasApiKey, refetch, statusTotals: mergeStatusTotals } =
    useQoo10Products({
      ItemStatus: isAllStatuses ? "S2" : activeStatus,
      Page: String(page),
      mergeAllStatuses: isAllStatuses,
      enabled: isQoo10Channel,
    });

  const statusTotalQueries = useQueries({
    queries: QOO10_PRODUCT_LIST_STATUSES.map((statusId) => ({
      queryKey: [...qoo10ProductsQueryRoot, "total", statusId, qoo10ChannelUuid] as const,
      enabled: hasKey && isQoo10Channel && !mergeStatusTotals && !!qoo10ChannelUuid,
      staleTime: 5 * 60 * 1000,
      retry: false,
      queryFn: async (): Promise<number> => {
        const result = await http.get<{ items: Product[]; totalItems: number }>(
          `/api/products?channelId=${qoo10ChannelUuid}&itemStatus=${statusId}&page=1`,
        );
        return result.totalItems ?? (Array.isArray(result.items) ? result.items.length : 0);
      },
    })),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // URL param 변경 시 전역 채널 동기화
  useEffect(() => {
    const urlChannel = currentSearchParams.get("channel");
    if (urlChannel && (urlChannel === "qoo10" || urlChannel === "shopee" || urlChannel === "shopify")) {
      setActiveChannel(urlChannel as ChannelId);
    }
  }, [currentSearchParams, setActiveChannel]);

  const filteredItems = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) {
      return data;
    }

    return data.filter((item) => {
      return (
        item.id.toLowerCase().includes(query) ||
        item.sellerCode.toLowerCase().includes(query)
      );
    });
  }, [data, debouncedSearch]);

  // End of filteredItems


  // 페이지·상태 탭·검색·채널이 바뀌면 행 선택을 비움 (의도적 트리거 전용 deps)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 필터/페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedItemCodes(new Set());
  }, [page, activeStatus, debouncedSearch, activeChannel]);


  const toggleRowSelection = (itemCode: string): void => {
    setSelectedItemCodes((prev) => {
      const next = new Set(prev);
      if (next.has(itemCode)) {
        next.delete(itemCode);
      } else {
        next.add(itemCode);
      }
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
      next.add(item.id);
    }
    setSelectedItemCodes(next);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (deleteTargetCodes.length === 0) {
      return;
    }
    const results = await Promise.allSettled(
      deleteTargetCodes.map((code) =>
        executeEditItemStatus({
          itemCode: code.trim(),
          status: "3",
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.length - fulfilled;

    appToaster.create({
      title: "처리 완료",
      description: `성공 ${fulfilled}건, 실패 ${rejected}건`,
      type: rejected > 0 ? "warning" : "success",
    });

    void queryClient.invalidateQueries({
      queryKey: qoo10ProductsQueryRoot,
    });
    setSelectedItemCodes(new Set());
  };

  const openStatusDialog = (itemCodes: string[], status: "1" | "2"): void => {
    setStatusTargetCodes(itemCodes);
    setStatusTargetValue(status);
    setStatusDialogOpen(true);
  };

  const handleStatusConfirm = async (): Promise<void> => {
    if (statusTargetCodes.length === 0 || statusTargetValue === null) {
      return;
    }

    const status = statusTargetValue;
    if (statusTargetCodes.length === 1) {
      await editItemStatusAsync({
        itemCode: statusTargetCodes[0],
        status,
      });
      return;
    }

    setStatusActionPending(true);
    try {
      const results = await Promise.allSettled(
        statusTargetCodes.map((code) =>
          executeEditItemStatus({
            itemCode: code.trim(),
            status,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.length - fulfilled;

      appToaster.create({
        title: "일괄 처리 완료",
        description: `성공 ${fulfilled}건, 실패 ${rejected}건`,
        type: rejected > 0 ? "warning" : "success",
      });

      void queryClient.invalidateQueries({
        queryKey: qoo10ProductsQueryRoot,
      });
      setSelectedItemCodes(new Set());
    } finally {
      setStatusActionPending(false);
    }
  };

  const channelTabs = LIVE_CHANNELS.map((channel) => ({
    id: channel.id,
    name: channel.name,
    isLive: channel.isLive,
  }));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      S0: 0,
      S1: 0,
      S2: 0,
      S3: 0,
      S5: 0,
      S8: 0,
    };

    if (mergeStatusTotals) {
      // mergeAll 응답에 포함된 상태별 totals 사용 (별도 쿼리 불필요)
      QOO10_PRODUCT_LIST_STATUSES.forEach((statusId) => {
        const total = mergeStatusTotals[statusId] ?? 0;
        counts[statusId] = total;
        counts.all += total;
      });
    } else {
      QOO10_PRODUCT_LIST_STATUSES.forEach((statusId, index) => {
        const total = statusTotalQueries[index]?.data ?? 0;
        counts[statusId] = total;
        counts.all += total;
      });
    }

    return counts;
  }, [mergeStatusTotals, statusTotalQueries]);

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 0) {
      return [1];
    }

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
    const nextSearchParams = new URLSearchParams(
      currentSearchParams.toString(),
    );
    nextSearchParams.set("page", String(boundedPage));
    router.push(`/products?${nextSearchParams.toString()}`);
  };

  const handleStatusChange = (
    statusId: (typeof STATUS_TABS)[number]["id"],
  ): void => {
    setSelectedItemCode(null);
    setSelectedSellerCode(null);
    const nextSearchParams = new URLSearchParams(
      currentSearchParams.toString(),
    );
    nextSearchParams.set("status", statusId);
    nextSearchParams.set("page", "1");
    router.push(`/products?${nextSearchParams.toString()}`);
  };

  const handleChannelChange = (channelId: string): void => {
    setSelectedItemCode(null);
    setSelectedSellerCode(null);

    setActiveChannel(channelId as ChannelId);
    const nextSearchParams = new URLSearchParams(
      currentSearchParams.toString(),
    );
    nextSearchParams.set("channel", channelId);
    nextSearchParams.delete("status");
    nextSearchParams.set("page", "1");
    router.push(`/products?${nextSearchParams.toString()}`);
  };


  const handleClearSearch = (): void => {
    setSearchInput("");
    setDebouncedSearch("");
  };


  const renderContent = (): React.JSX.Element => {
    if (isShopeeChannel) {
      return (
        <ShopeeProductsContent
          debouncedSearch={debouncedSearch}
          activeStatus={activeShopeeStatus}
          apiValues={shopeeStatusTab.apiValues as unknown as string[]}
          isActiveChannel={isShopeeChannel}
        />
      );
    }

    if (isShopifyChannel) {
      return (
        <ShopifyProductsContent
          debouncedSearch={debouncedSearch}
          activeStatus={activeShopifyStatus}
          isActiveChannel={isShopifyChannel}
          afterCursor={shopifyAfterCursor}
          setAfterCursor={setShopifyAfterCursor}
          cursorStack={shopifyCursorStack}
          setCursorStack={setShopifyCursorStack}
        />
      );
    }

    if (!hasApiKey) {
      return (
        <EmptyState
          icon={<KeyIcon />}
          title="Qoo10 API 키가 없습니다"
          description="채널 설정에서 Qoo10 API 키를 등록하면 상품을 조회할 수 있습니다."
          action={{
            label: "채널 설정으로 이동",
            onClick: () => router.push("/settings/channels"),
          }}
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

    if (error) {
      return (
        <ErrorState
          title="상품 조회 중 오류 발생"
          description={error.message}
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
      <>
        <ItemBulkActionBar
          selectedIds={selectedItemCodes}
          items={filteredItems}
          remotePending={isEditItemStatusPending || statusActionPending}
          onBulkSuspendRequest={() => {
            openStatusDialog(Array.from(selectedItemCodes), "1");
          }}
          onBulkActivateRequest={() => {
            openStatusDialog(Array.from(selectedItemCodes), "2");
          }}
          onBulkDeleteRequest={() => {
            setDeleteTargetCodes(Array.from(selectedItemCodes));
            setDeleteDialogOpen(true);
          }}
        />
        <ProductTable
          items={filteredItems}
          selectedItemCode={selectedItemCode}
          onSelectItem={(itemCode, sellerCode) => {
            setSelectedItemCode(itemCode);
            setSelectedSellerCode(sellerCode);
          }}
          selectedItemCodes={selectedItemCodes}
          onToggleRowSelection={toggleRowSelection}
          onToggleAllSelection={toggleAllSelection}
          onRowSuspend={(itemCode) => {
            openStatusDialog([itemCode], "1");
          }}
          onRowActivate={(itemCode) => {
            openStatusDialog([itemCode], "2");
          }}
          onRowDeleteRequest={(itemCode) => {
            setDeleteTargetCodes([itemCode]);
            setDeleteDialogOpen(true);
          }}
          isStatusActionPending={isEditItemStatusPending || statusActionPending}
        />
      </>
    );
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <PageHeader
        title="상품 조회"
        description="상품 상태를 조회하고 검색할 수 있습니다."
        mb={2}
      />

      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Flex
          px={4}
          pt={3}
          pb={2}
          borderBottomWidth="1px"
          borderColor="gray.100"
          align="center"
          gap={1}
        >
          {channelTabs.map((channel) => {
            const isSelected = activeChannel === channel.id;
            const isDisabled = !channel.isLive || channel.id === "rakuten" || channel.id === "amazon";

            return (
              <Button
                key={channel.id}
                variant="ghost"
                size="sm"
                onClick={
                  isDisabled ? undefined : () => handleChannelChange(channel.id)
                }
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
                _hover={
                  isDisabled
                    ? { bg: "transparent", boxShadow: "none" }
                    : {
                        bg: "transparent",
                        color: "gray.900",
                        boxShadow:
                          "inset 0 -2px 0 0 var(--chakra-colors-gray-200)",
                      }
                }
                _active={{ bg: "transparent" }}
                _focus={{
                  boxShadow: isSelected
                    ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                    : "none",
                }}
                disabled={isDisabled}
                opacity={isDisabled ? 0.4 : 1}
                cursor={isDisabled ? "not-allowed" : "pointer"}
                pointerEvents={isDisabled ? "none" : "auto"}
              >
                <Text fontSize="sm">{channel.name}</Text>
              </Button>
            );
          })}
        </Flex>

        <Flex
          px={4}
          py={2}
          borderBottomWidth="1px"
          borderColor="gray.100"
          align="center"
          overflowX="auto"
          gap={1}
        >
          {isShopifyChannel
            ? SHOPIFY_STATUS_TABS.map((tab) => {
                const isSelected = activeShopifyStatus === tab.id;
                return (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={isSelected ? "solid" : "ghost"}
                    onClick={() => {
                      const next = new URLSearchParams(currentSearchParams.toString());
                      next.set("status", tab.id);
                      next.set("page", "1");
                      router.push(`/products?${next.toString()}`);
                    }}
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
              })
            : isShopeeChannel
              ? SHOPEE_STATUS_TABS.map((tab) => {
                  const isSelected = activeShopeeStatus === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      size="sm"
                      variant={isSelected ? "solid" : "ghost"}
                      onClick={() => {
                        const next = new URLSearchParams(currentSearchParams.toString());
                        next.set("status", tab.id);
                        next.set("page", "1");
                        router.push(`/products?${next.toString()}`);
                      }}
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
                })
              : STATUS_TABS.map((tab) => {
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
                    <Flex align="center" gap={1}>
                      <Text fontSize="sm">{tab.label}</Text>
                      <Text
                        fontSize="xs"
                        color={isSelected ? "gray.700" : "gray.400"}
                      >
                        ({statusCounts[tab.id] ?? 0})
                      </Text>
                    </Flex>
                  </Button>
                );
              })}
        </Flex>

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
                placeholder={
                  isShopifyChannel
                    ? "상품명 검색"
                    : isShopeeChannel
                      ? "상품명 또는 SKU 검색"
                      : "상품코드 검색"
                }
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

      {renderContent()}

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTargetCodes([]);
        }}
        itemCodes={deleteTargetCodes}
        onConfirm={handleDeleteConfirm}
      />
      <StatusChangeConfirmDialog
        isOpen={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setStatusTargetCodes([]);
          setStatusTargetValue(null);
        }}
        itemCodes={statusTargetCodes}
        actionLabel={statusTargetValue === "1" ? "판매중지" : "판매중으로 변경"}
        onConfirm={handleStatusConfirm}
      />


      <ProductDetailModal
        itemCode={selectedItemCode}
        sellerCode={selectedSellerCode}
        onClose={() => {
          setSelectedItemCode(null);
          setSelectedSellerCode(null);
        }}
      />

      {isQoo10Channel && (
        <Flex mt={4} align="center" justify="center" gap={2}>
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

export function ProductsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
