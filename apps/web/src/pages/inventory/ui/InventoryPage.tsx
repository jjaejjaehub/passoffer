"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { useChannelApiKey, useChannelUuid, useActiveChannel } from "@/entities/channel";
import {
  useQoo10Products,
} from "@/entities/product";
import {
  useShopifyInventory,
  shopifyInventoryQueryRoot,
  type ShopifyInventoryProduct,
  type ShopifyInventoryVariant,
} from "@/entities/product";
import { EditInventoryModal } from "@/features/edit-inventory";
import { http } from "@/shared/api";
import { appToaster } from "@/shared/ui/app-toaster";
import type { Product } from "@oms/types";
import { InventoryTable } from "@/widgets/inventory-table";
import type { InventoryOptionType, InventoryRow } from "@/widgets/inventory-table";

type InventoryChannel = "qoo10" | "shopify";

// ─── Qoo10 재고 섹션 ───────────────────────────────────────────

const DETAIL_VIEWABLE = new Set(["S1", "S2"]);

const QOO10_STATUS_TABS = [
  { label: "거래가능 (S2)", value: "S2" },
  { label: "거래대기 (S1)", value: "S1" },
];

function Qoo10InventorySection(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState("S2");
  const [page, setPage] = useState("1");
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editingQty, setEditingQty] = useState<number | undefined>(undefined);
  const [fetchTick, setFetchTick] = useState(0);

  const [itemMeta, setItemMeta] = useState<
    Record<
      string,
      { optionType: InventoryOptionType; qty?: number; title?: string }
    >
  >({});

  // 진행 중인 배치 요청의 아이템 코드 셋 (중복 요청 방지)
  const pendingRef = useRef<Set<string>>(new Set());

  const { hasKey, isLoading: isCredentialLoading } = useChannelApiKey("qoo10");

  const { data, isLoading: isProductsLoading, error, hasApiKey, totalPages } = useQoo10Products({
    ItemStatus: statusFilter,
    Page: page,
  });

  const isLoading = isCredentialLoading || isProductsLoading;
  const items: Product[] = data ?? [];

  useEffect(() => {
    if (!hasKey || items.length === 0) return;

    // 아직 조회되지 않았고 진행 중도 아닌 아이템만 추려 배치 요청
    const toFetch = items.filter(
      (item) =>
        DETAIL_VIEWABLE.has(item.rawStatus ?? "") &&
        !itemMeta[item.id] &&
        !pendingRef.current.has(item.id),
    );

    // DETAIL_VIEWABLE 아닌 아이템은 즉시 "none" 처리
    const nonViewable = items.filter(
      (item) =>
        !DETAIL_VIEWABLE.has(item.rawStatus ?? "") && !itemMeta[item.id],
    );
    if (nonViewable.length > 0) {
      setItemMeta((prev) => {
        const next = { ...prev };
        for (const item of nonViewable) next[item.id] = { optionType: "none" };
        return next;
      });
    }

    if (toFetch.length === 0) return;

    // loading 상태 선점 + pending 등록
    for (const item of toFetch) pendingRef.current.add(item.id);
    setItemMeta((prev) => {
      const next = { ...prev };
      for (const item of toFetch) next[item.id] = { optionType: "loading" };
      return next;
    });

    // 배치 API 단일 호출 (브라우저 → Fastify × 1, 서버 → Qoo10 × N 병렬)
    void http
      .post<{ results: Record<string, { optionType: InventoryOptionType; qty?: number; title?: string }> }>(
        "/api/qoo10/items/inventory-meta-batch",
        { items: toFetch.map((item) => ({ itemCode: item.id, sellerCode: item.sellerCode })) },
      )
      .then((res) => {
        setItemMeta((prev) => ({ ...prev, ...res.results }));
      })
      .catch(() => {
        // 실패 시 "none"으로 폴백
        setItemMeta((prev) => {
          const next = { ...prev };
          for (const item of toFetch) next[item.id] = { optionType: "none" };
          return next;
        });
      })
      .finally(() => {
        for (const item of toFetch) pendingRef.current.delete(item.id);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hasKey, fetchTick]);

  useEffect(() => {
    setPage("1");
    setItemMeta({});
  }, [statusFilter]);

  const rows: InventoryRow[] = useMemo(
    () =>
      items.map((item) => {
        const meta = itemMeta[item.id];
        return {
          item,
          optionType: meta?.optionType ?? "loading",
          qty: meta?.qty,
          title: meta?.title,
        };
      }),
    [items, itemMeta],
  );

  const handleEditClick = useCallback(
    (item: Product) => {
      const meta = itemMeta[item.id];
      setEditingItem(item);
      setEditingQty(meta?.qty);
    },
    [itemMeta],
  );

  const handleSaveSuccess = useCallback((itemCode: string) => {
    setItemMeta((prev) => {
      const next = { ...prev };
      delete next[itemCode];
      return next;
    });
    setFetchTick((n) => n + 1);
  }, []);

  return (
    <>
      {/* 상태 탭 */}
      <HStack gap={1} mb={4}>
        {QOO10_STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              fontWeight={isActive ? "semibold" : "normal"}
              color={isActive ? "gray.900" : "gray.500"}
              borderRadius="md"
              bg={isActive ? "gray.100" : "transparent"}
              _hover={{ bg: isActive ? "gray.100" : "gray.50" }}
            >
              {tab.label}
            </Button>
          );
        })}
      </HStack>

      {!hasApiKey && (
        <Box
          bg="orange.50"
          borderWidth="1px"
          borderColor="orange.200"
          borderRadius="md"
          px={4}
          py={3}
          mb={4}
        >
          <Text fontSize="sm" color="orange.700">
            Qoo10 API 키가 없습니다. 채널 설정에서 API 키를 등록해 주세요.
          </Text>
        </Box>
      )}

      {error ? (
        <Box
          bg="red.50"
          borderWidth="1px"
          borderColor="red.200"
          borderRadius="md"
          px={4}
          py={3}
          mb={4}
        >
          <Text fontSize="sm" color="red.700">
            {error.message}
          </Text>
        </Box>
      ) : null}

      {isLoading ? (
        <Flex justify="center" py={12}>
          <Spinner color="gray.400" />
        </Flex>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <Box
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          px={4}
          py={8}
          textAlign="center"
        >
          <Text fontSize="sm" color="gray.500">
            상품이 없습니다.
          </Text>
        </Box>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <InventoryTable rows={rows} onEditClick={handleEditClick} />
      ) : null}

      {!isLoading && items.length > 0 ? (
        <HStack gap={2} justify="center" mt={4}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            borderColor="gray.300"
            disabled={page === "1"}
            onClick={() =>
              setPage((p) => String(Math.max(1, parseInt(p, 10) - 1)))
            }
          >
            이전
          </Button>
          <Text fontSize="sm" color="gray.600" px={2}>
            {page} / {totalPages || 1}
          </Text>
          <Button
            type="button"
            variant="outline"
            size="sm"
            borderColor="gray.300"
            disabled={parseInt(page, 10) >= (totalPages || 1)}
            onClick={() => setPage((p) => String(parseInt(p, 10) + 1))}
          >
            다음
          </Button>
        </HStack>
      ) : null}

      <EditInventoryModal
        item={editingItem}
        currentQty={editingQty}
        onClose={() => {
          setEditingItem(null);
          setEditingQty(undefined);
        }}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  );
}

// ─── Shopify 재고 섹션 ─────────────────────────────────────────

const SHOPIFY_STATUS_TABS = [
  { id: "all", label: "전체" },
  { id: "ACTIVE", label: "판매" },
  { id: "DRAFT", label: "판매중지" },
  { id: "ARCHIVED", label: "보관됨" },
] as const;

type ShopifyStatusId = (typeof SHOPIFY_STATUS_TABS)[number]["id"];

interface EditingVariant {
  product: ShopifyInventoryProduct;
  variant: ShopifyInventoryVariant;
}

function ShopifyInventorySection(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<ShopifyStatusId>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditingVariant | null>(null);
  const [newQty, setNewQty] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();
  const { hasKey } = useChannelApiKey("shopify");
  const channelUuid = useChannelUuid("shopify");

  const { data, pageInfo, isLoading, error, hasApiKey, refetch } =
    useShopifyInventory({
      pageSize: 50,
      after: afterCursor,
      keyword: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });

  const handleSearchChange = (value: string): void => {
    setSearchInput(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setAfterCursor(undefined);
      setCursorStack([]);
    }, 300);
  };

  const handleEditClick = (
    product: ShopifyInventoryProduct,
    variant: ShopifyInventoryVariant,
  ): void => {
    setEditing({ product, variant });
    setNewQty(String(variant.inventoryQuantity));
  };

  const handleSaveInventory = async (): Promise<void> => {
    if (!editing || !channelUuid) return;
    const qty = parseInt(newQty, 10);
    if (Number.isNaN(qty) || qty < 0) {
      appToaster.create({
        title: "유효하지 않은 수량",
        description: "0 이상의 정수를 입력해 주세요.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      await http.post(
        `/api/inventory/${channelUuid}/adjust`,
        {
          inventoryItemId: editing.variant.inventoryItemId,
          newQuantity: qty,
          currentQuantity: editing.variant.inventoryQuantity,
        },
      );
      appToaster.create({
        title: "재고가 업데이트되었습니다",
        type: "success",
      });
      void queryClient.invalidateQueries({ queryKey: shopifyInventoryQueryRoot });
      setEditing(null);
    } catch {
      appToaster.create({
        title: "재고 업데이트 실패",
        description: "잠시 후 다시 시도해 주세요.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasApiKey) {
    return (
      <Box
        bg="orange.50"
        borderWidth="1px"
        borderColor="orange.200"
        borderRadius="md"
        px={4}
        py={3}
      >
        <Text fontSize="sm" color="orange.700">
          Shopify API 키가 없습니다. 채널 설정에서 API 키를 등록해 주세요.
        </Text>
      </Box>
    );
  }

  return (
    <>
      {/* 필터 */}
      <Flex gap={3} mb={4} wrap="wrap" align="center">
        <HStack gap={1}>
          {SHOPIFY_STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setAfterCursor(undefined);
                  setCursorStack([]);
                }}
                fontWeight={isActive ? "semibold" : "normal"}
                color={isActive ? "gray.900" : "gray.500"}
                borderRadius="md"
                bg={isActive ? "gray.100" : "transparent"}
                _hover={{ bg: isActive ? "gray.100" : "gray.50" }}
              >
                {tab.label}
              </Button>
            );
          })}
        </HStack>

        <Flex
          align="center"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          px={3}
          py={1.5}
          gap={2}
          bg="white"
          flex="1"
          maxW="280px"
        >
          <Search size={14} color="var(--chakra-colors-gray-400)" />
          <Input
            placeholder="상품명 검색"
            fontSize="sm"
            border="none"
            outline="none"
            p={0}
            h="auto"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <Box
              as="button"
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
                setAfterCursor(undefined);
                setCursorStack([]);
              }}
              color="gray.400"
              _hover={{ color: "gray.600" }}
            >
              <X size={14} />
            </Box>
          )}
        </Flex>
      </Flex>

      {error ? (
        <Box
          bg="red.50"
          borderWidth="1px"
          borderColor="red.200"
          borderRadius="md"
          px={4}
          py={3}
          mb={4}
        >
          <Text fontSize="sm" color="red.700">
            {error.message}
          </Text>
          <Button
            size="xs"
            variant="outline"
            mt={2}
            onClick={() => refetch()}
          >
            다시 시도
          </Button>
        </Box>
      ) : null}

      {isLoading ? (
        <Flex justify="center" py={12}>
          <Spinner color="gray.400" />
        </Flex>
      ) : data.length === 0 ? (
        <Box
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          px={4}
          py={8}
          textAlign="center"
        >
          <Text fontSize="sm" color="gray.500">
            상품이 없습니다.
          </Text>
        </Box>
      ) : (
        <>
          <ShopifyInventoryTable
            products={data}
            onEditClick={handleEditClick}
          />

          {/* 페이지네이션 */}
          <HStack gap={2} justify="center" mt={4}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              borderColor="gray.300"
              disabled={cursorStack.length === 0}
              onClick={() => {
                const prev = [...cursorStack];
                const last = prev.pop();
                setCursorStack(prev);
                setAfterCursor(last || undefined);
              }}
            >
              이전
            </Button>
            <Text fontSize="sm" color="gray.600" px={2}>
              {cursorStack.length + 1} 페이지
            </Text>
            <Button
              type="button"
              variant="outline"
              size="sm"
              borderColor="gray.300"
              disabled={!pageInfo.hasNextPage}
              onClick={() => {
                if (pageInfo.endCursor) {
                  setCursorStack((prev) => [...prev, afterCursor ?? ""]);
                  setAfterCursor(pageInfo.endCursor);
                }
              }}
            >
              다음
            </Button>
          </HStack>
        </>
      )}

      {/* 재고 수정 모달 */}
      {editing && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setEditing(null)}
        >
          <Box
            bg="white"
            borderRadius="lg"
            p={6}
            w="360px"
            maxW="90vw"
            boxShadow="xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Text fontWeight="semibold" fontSize="md" mb={1}>
              재고 수정
            </Text>
            <Text fontSize="sm" color="gray.600" mb={4}>
              {editing.product.title}
              {editing.variant.variantTitle !== "Default Title" && (
                <> / {editing.variant.variantTitle}</>
              )}
            </Text>

            <Text fontSize="xs" color="gray.500" mb={1}>
              현재 재고: {editing.variant.inventoryQuantity}
            </Text>
            <Input
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="새 수량 입력"
              mb={4}
            />

            <HStack justify="flex-end" gap={2}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleSaveInventory}
                loading={isSaving}
              >
                저장
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </>
  );
}

// ─── Shopify 재고 테이블 ───────────────────────────────────────

function ShopifyInventoryTable({
  products,
  onEditClick,
}: {
  products: ShopifyInventoryProduct[];
  onEditClick: (
    product: ShopifyInventoryProduct,
    variant: ShopifyInventoryVariant,
  ) => void;
}): React.JSX.Element {
  const allVariants = products.flatMap((p) =>
    p.variants.filter((v) => v.tracked),
  );
  const outOfStockCount = allVariants.filter((v) => v.inventoryQuantity <= 0).length;
  const lowStockCount = allVariants.filter(
    (v) => v.inventoryQuantity > 0 && v.inventoryQuantity <= 5,
  ).length;

  return (
    <>
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <HStack gap={2} mb={3}>
          {outOfStockCount > 0 && (
            <Box
              display="inline-flex"
              alignItems="center"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="semibold"
              bg="red.100"
              color="red.700"
            >
              재고 부족 {outOfStockCount}개
            </Box>
          )}
          {lowStockCount > 0 && (
            <Box
              display="inline-flex"
              alignItems="center"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="semibold"
              bg="orange.100"
              color="orange.700"
            >
              임박 {lowStockCount}개
            </Box>
          )}
        </HStack>
      )}
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        bg="white"
        overflow="hidden"
      >
        <Box overflowX="auto">
          <Box
            as="table"
            w="max-content"
            minW="100%"
            fontSize="sm"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <Box
              as="thead"
              bg="white"
              position="sticky"
              top={0}
              zIndex={1}
              boxShadow="inset 0 -1px 0 var(--chakra-colors-gray-100)"
            >
              <Box as="tr">
                {[
                  { label: "상품명", width: "240px" },
                  { label: "변형", width: "160px" },
                  { label: "SKU", width: "140px" },
                  { label: "가격", width: "100px" },
                  { label: "재고", width: "80px" },
                  { label: "추적", width: "60px" },
                  { label: "", width: "80px" },
                ].map((col) => (
                  <Box
                    key={col.label}
                    as="th"
                    px={4}
                    py={3}
                    textAlign="left"
                    fontSize="xs"
                    color="gray.500"
                    whiteSpace="nowrap"
                    minW={col.width}
                    w={col.width}
                  >
                    {col.label}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {products.flatMap((product: ShopifyInventoryProduct) =>
                product.variants.map((variant: ShopifyInventoryVariant, vi: number) => {
                  const isOutOfStock = variant.tracked && variant.inventoryQuantity <= 0;
                  const isLowStock =
                    variant.tracked &&
                    variant.inventoryQuantity > 0 &&
                    variant.inventoryQuantity <= 5;
                  const rowBg = isOutOfStock
                    ? "red.50"
                    : isLowStock
                      ? "orange.50"
                      : undefined;

                  return (
                    <Box
                      as="tr"
                      key={`${product.productId}-${variant.variantId}`}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                      bg={rowBg}
                      _hover={{ bg: isOutOfStock ? "red.100" : isLowStock ? "orange.100" : "gray.50" }}
                    >
                      {/* 상품명: 첫 번째 변형에만 표시 */}
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        minW="240px"
                        maxW="240px"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        color="gray.900"
                        fontWeight={vi === 0 ? "medium" : "normal"}
                        opacity={vi === 0 ? 1 : 0.4}
                      >
                        {vi === 0 ? product.title : ""}
                      </Box>
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        whiteSpace="nowrap"
                        minW="160px"
                        color="gray.700"
                      >
                        {variant.variantTitle === "Default Title"
                          ? "-"
                          : variant.variantTitle}
                      </Box>
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        whiteSpace="nowrap"
                        minW="140px"
                        color="gray.500"
                        fontSize="xs"
                      >
                        {variant.sku ?? "-"}
                      </Box>
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        whiteSpace="nowrap"
                        minW="100px"
                        color="gray.800"
                      >
                        {parseFloat(variant.price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Box>
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        whiteSpace="nowrap"
                        minW="80px"
                        fontWeight={isOutOfStock ? "bold" : "semibold"}
                        color={
                          isOutOfStock
                            ? "red.600"
                            : isLowStock
                              ? "orange.600"
                              : "gray.900"
                        }
                      >
                        {variant.tracked ? variant.inventoryQuantity : "-"}
                      </Box>
                      <Box
                        as="td"
                        px={4}
                        py={3}
                        whiteSpace="nowrap"
                        minW="60px"
                        color={variant.tracked ? "green.600" : "gray.400"}
                        fontSize="xs"
                      >
                        {variant.tracked ? "추적" : "미추적"}
                      </Box>
                      <Box as="td" px={4} py={3} minW="80px">
                        {variant.tracked && (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            borderColor="gray.300"
                            onClick={() => onEditClick(product, variant)}
                          >
                            수정
                          </Button>
                        )}
                      </Box>
                    </Box>
                  );
                }),
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

// ─── 메인 InventoryPage ────────────────────────────────────────

const CHANNEL_TABS: { id: InventoryChannel; label: string }[] = [
  { id: "qoo10", label: "Qoo10" },
  { id: "shopify", label: "Shopify" },
];

export function InventoryPage(): React.JSX.Element {
  const { activeChannel } = useActiveChannel();

  const defaultChannel: InventoryChannel =
    activeChannel === "shopify" ? "shopify" : "qoo10";

  const [selectedChannel, setSelectedChannel] =
    useState<InventoryChannel>(defaultChannel);

  return (
    <Box px={6} py={6}>
      {/* Header */}
      <Box mb={4}>
        <Text fontSize="xl" fontWeight="semibold" color="gray.900">
          재고 관리
        </Text>
        <Text fontSize="sm" color="gray.500" mt={0.5}>
          채널별 상품 재고를 조회하고 수정합니다.
        </Text>
      </Box>

      {/* 채널 탭 */}
      <Flex
        borderBottomWidth="1px"
        borderColor="gray.100"
        mb={6}
        gap={1}
      >
        {CHANNEL_TABS.map((tab) => {
          const isActive = selectedChannel === tab.id;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedChannel(tab.id)}
              borderRadius={0}
              color={isActive ? "gray.900" : "gray.500"}
              fontWeight={isActive ? "semibold" : "normal"}
              px={3}
              py={2}
              height="auto"
              border="none"
              boxShadow={
                isActive
                  ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                  : "none"
              }
              _hover={{ bg: "transparent", color: "gray.900" }}
              _active={{ bg: "transparent" }}
            >
              {tab.label}
            </Button>
          );
        })}
      </Flex>

      {selectedChannel === "qoo10" ? (
        <Qoo10InventorySection />
      ) : (
        <ShopifyInventorySection />
      )}
    </Box>
  );
}
