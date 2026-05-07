"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { RefreshCw, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCheckListedProductFromChannel, useDeleteMasterProduct, useListedProducts, useMasterProducts, usePullSalesFromChannel, useSyncListedProduct, type MasterProduct } from "@/entities/master-product";
import { useChannels } from "@/entities/channel";
import { BulkListToChannelModal } from "@/features/list-to-channel";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";

const TABS = [
  { id: "master", label: "마스터 상품" },
  { id: "listed", label: "판매상품 관리" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SYNC_STATUS_LABEL: Record<string, string> = {
  SYNCED: "동기화됨",
  PENDING: "대기중",
  FAILED: "실패",
};

function MasterProductsTab({
  search,
  page,
  onPageChange,
}: {
  search: string;
  page: number;
  onPageChange: (next: number) => void;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, refetch } = useMasterProducts({ search, page, pageSize: 20 });
  const { mutateAsync: deleteMasterProduct } = useDeleteMasterProduct();
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, page]);

  useEffect(() => {
    if (pendingHref !== null && pathname === pendingHref) {
      setPendingHref(null);
    }
  }, [pendingHref, pathname]);

  function navigateTo(href: string) {
    setPendingHref(href);
    router.push(href);
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!confirmDeleteId) return;
    try {
      await deleteMasterProduct(confirmDeleteId);
      appToaster.create({ title: "삭제 완료", type: "success" });
    } catch {
      appToaster.create({ title: "삭제 실패", type: "error" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const allChecked = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const indeterminate = !allChecked && items.some((item) => selectedIds.has(item.id));

  const toggleAll = (): void => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const toggleOne = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedProducts: MasterProduct[] = items.filter((item) => selectedIds.has(item.id));

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box position="relative">
      {pendingHref !== null && (
        <Box
          position="absolute"
          inset={0}
          zIndex={10}
          bg="whiteAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
        >
          <Spinner color="gray.400" size="md" />
        </Box>
      )}

      {/* 일괄 액션 바 */}
      {selectedIds.size > 0 && (
        <Flex
          align="center"
          justify="space-between"
          mb={3}
          px={3}
          py={2}
          bg="gray.900"
          borderRadius="md"
          color="white"
        >
          <Text fontSize="sm" fontWeight="medium">{selectedIds.size}개 선택됨</Text>
          <Flex gap={2}>
            <Button
              size="xs"
              variant="outline"
              borderColor="whiteAlpha.400"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => setSelectedIds(new Set())}
            >
              선택 해제
            </Button>
            <Button
              size="xs"
              bg="white"
              color="gray.900"
              _hover={{ bg: "gray.100" }}
              onClick={() => setBulkModalOpen(true)}
            >
              채널 일괄 등록
            </Button>
          </Flex>
        </Flex>
      )}

      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="40px" onClick={(e) => e.stopPropagation()}>
                <Checkbox.Root
                  checked={indeterminate ? "indeterminate" : allChecked}
                  onCheckedChange={toggleAll}
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>
              <Table.ColumnHeader>상품명/코드</Table.ColumnHeader>
              <Table.ColumnHeader>브랜드</Table.ColumnHeader>
              <Table.ColumnHeader>소비자가</Table.ColumnHeader>
              <Table.ColumnHeader>변형 수</Table.ColumnHeader>
              <Table.ColumnHeader>등록 채널 수</Table.ColumnHeader>
              <Table.ColumnHeader>등록일</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                    마스터 상품이 없습니다.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((item) => (
                <Table.Row
                  key={item.id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  bg={selectedIds.has(item.id) ? "blue.50" : undefined}
                  onClick={() => navigateTo(ROUTES.masterProductEdit(item.id))}
                >
                  <Table.Cell onClick={(e) => { e.stopPropagation(); toggleOne(item.id); }}>
                    <Checkbox.Root
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <Stack gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium">{item.title}</Text>
                      <Text fontSize="xs" color="gray.500">{item.code}</Text>
                    </Stack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.brand ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.retailPrice ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.variantCount}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.listedChannelCount}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</Text>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Flex gap={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => navigateTo(ROUTES.masterProductEdit(item.id))}
                      >
                        편집
                      </Button>
                      {confirmDeleteId === item.id ? (
                        <Flex gap={1}>
                          <Button
                            size="xs"
                            bg="red.600"
                            color="white"
                            _hover={{ bg: "red.700" }}
                            onClick={() => void handleDeleteConfirm()}
                          >
                            확인
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            borderColor="gray.300"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            취소
                          </Button>
                        </Flex>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          onClick={() => setConfirmDeleteId(item.id)}
                        >
                          삭제
                        </Button>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <BulkListToChannelModal
        products={selectedProducts}
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        onSuccess={() => {
          setSelectedIds(new Set());
          void refetch();
        }}
      />

      <Flex mt={4} align="center" justify="center" gap={2}>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          이전
        </Button>
        <Text fontSize="sm" color="gray.600">
          {page} / {totalPages || 1}
        </Text>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= (totalPages || 1)}
        >
          다음
        </Button>
      </Flex>
    </Box>
  );
}

function ListedProductsTab({
  search,
  page,
  onPageChange,
}: {
  search: string;
  page: number;
  onPageChange: (next: number) => void;
}): React.JSX.Element {
  const router = useRouter();
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const { data: channels } = useChannels();
  const { data, isLoading, refetch } = useListedProducts({ channelId: selectedChannelId, search, page, pageSize: 20 });
  const { mutateAsync: sync } = useSyncListedProduct();
  const { mutateAsync: checkChannel } = useCheckListedProductFromChannel();
  const { mutateAsync: pullSales } = usePullSalesFromChannel();
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleCheckChannel = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation();
    setCheckingId(id);
    try {
      const result = await checkChannel(id);
      void refetch();
      if (result.status === "IN_SYNC") {
        appToaster.create({ title: "채널 데이터와 일치합니다.", type: "success" });
      } else if (result.status === "OUT_OF_SYNC") {
        const diffFields = result.diffs?.map((d) => d.field).join(", ") ?? "";
        appToaster.create({ title: `채널 데이터 불일치: ${diffFields}`, type: "warning" });
      } else if (result.status === "CHANNEL_DELETED") {
        appToaster.create({ title: "채널에서 삭제된 상품입니다.", type: "error" });
      } else if (result.status === "UNSUPPORTED") {
        appToaster.create({ title: result.message ?? "지원하지 않는 채널입니다.", type: "info" });
      } else {
        appToaster.create({ title: result.message ?? "확인 실패", type: "error" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "채널 데이터 확인에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    } finally {
      setCheckingId(null);
    }
  };

  const handleSync = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation();
    setSyncingId(id);
    try {
      await sync(id);
      appToaster.create({ title: "동기화 완료", type: "success" });
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "동기화에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    } finally {
      setSyncingId(null);
    }
  };

  const handlePullSales = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation();
    setPullingId(id);
    try {
      const result = await pullSales(id);
      void refetch();
      if (result.status === "OK") {
        const count = result.processedOrderCount ?? 0;
        const summary = (result.deductions ?? []).map((d) => `${d.sku} -${d.soldQty}`).join(", ");
        appToaster.create({
          title: count === 0 ? "신규 주문 없음" : `처리된 주문 ${count}건${summary ? ` (${summary})` : ""}`,
          type: count === 0 ? "info" : "success",
        });
      } else if (result.status === "UNSUPPORTED") {
        appToaster.create({ title: result.message ?? "지원하지 않는 채널입니다.", type: "info" });
      } else {
        appToaster.create({ title: result.message ?? "판매 동기화 실패", type: "error" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "판매 동기화에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    } finally {
      setPullingId(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="flex-end" mb={3}>
        <Button
          size="xs"
          variant="outline"
          borderColor="gray.300"
          onClick={() => void refetch()}
          gap={1}
        >
          <RefreshCw size={11} />
          새로고침
        </Button>
      </Flex>

      {channels && channels.length > 0 && (
        <Flex gap={1.5} mb={3} flexWrap="wrap">
          <Button
            size="xs"
            variant={selectedChannelId === undefined ? "solid" : "outline"}
            bg={selectedChannelId === undefined ? "gray.900" : undefined}
            color={selectedChannelId === undefined ? "white" : "gray.700"}
            borderColor="gray.200"
            _hover={{ borderColor: "gray.400" }}
            onClick={() => setSelectedChannelId(undefined)}
          >
            전체
          </Button>
          {channels.map((ch) => (
            <Button
              key={ch.id}
              size="xs"
              variant={selectedChannelId === ch.id ? "solid" : "outline"}
              bg={selectedChannelId === ch.id ? "gray.900" : undefined}
              color={selectedChannelId === ch.id ? "white" : "gray.700"}
              borderColor="gray.200"
              _hover={{ borderColor: "gray.400" }}
              onClick={() => setSelectedChannelId(ch.id)}
            >
              {ch.name}
            </Button>
          ))}
        </Flex>
      )}
      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>상품명</Table.ColumnHeader>
              <Table.ColumnHeader>채널</Table.ColumnHeader>
              <Table.ColumnHeader>상태</Table.ColumnHeader>
              <Table.ColumnHeader>동기화 상태</Table.ColumnHeader>
              <Table.ColumnHeader>마지막 동기화</Table.ColumnHeader>
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                    판매상품이 없습니다.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((item) => (
                <Table.Row
                  key={item.id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => router.push(ROUTES.listedProductDetail(item.id))}
                >
                  <Table.Cell>
                    <Stack gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium">{item.title ?? "-"}</Text>
                      {item.channelItemCode && (
                        <Text fontSize="xs" color="gray.500">{item.channelItemCode}</Text>
                      )}
                    </Stack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.channelName}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.status ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text
                      fontSize="sm"
                      color={
                        item.syncStatus === "SYNCED"
                          ? "green.600"
                          : item.syncStatus === "FAILED"
                            ? "red.600"
                            : "orange.600"
                      }
                    >
                      {SYNC_STATUS_LABEL[item.syncStatus] ?? item.syncStatus}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {item.lastSyncedAt
                        ? new Date(item.lastSyncedAt).toLocaleString("ko-KR")
                        : "-"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    {item.syncStatus !== "SYNCED" && (
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor={item.syncStatus === "FAILED" ? "red.300" : "orange.300"}
                        color={item.syncStatus === "FAILED" ? "red.600" : "orange.600"}
                        _hover={{ bg: item.syncStatus === "FAILED" ? "red.50" : "orange.50" }}
                        loading={syncingId === item.id}
                        onClick={(e) => void handleSync(e, item.id)}
                        gap={1}
                      >
                        <RefreshCw size={11} />
                        동기화
                      </Button>
                    )}
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    {item.channelItemCode && (
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="blue.200"
                        color="blue.600"
                        _hover={{ bg: "blue.50" }}
                        loading={checkingId === item.id}
                        onClick={(e) => void handleCheckChannel(e, item.id)}
                        gap={1}
                      >
                        채널 확인
                      </Button>
                    )}
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    {item.channelItemCode && (
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="purple.200"
                        color="purple.600"
                        _hover={{ bg: "purple.50" }}
                        loading={pullingId === item.id}
                        onClick={(e) => void handlePullSales(e, item.id)}
                        gap={1}
                      >
                        판매 동기화
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      <Flex mt={4} align="center" justify="center" gap={2}>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          이전
        </Button>
        <Text fontSize="sm" color="gray.600">
          {page} / {totalPages || 1}
        </Text>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= (totalPages || 1)}
        >
          다음
        </Button>
      </Flex>
    </Box>
  );
}

function MasterProductsPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = searchParams ?? new URLSearchParams();

  const activeTab = (params.get("tab") ?? "master") as TabId;
  const initialPage = Number(params.get("page") ?? "1");
  const page = Number.isNaN(initialPage) || initialPage < 1 ? 1 : initialPage;

  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleTabChange = (tab: TabId): void => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    next.set("page", "1");
    router.push(`${ROUTES.masterProducts}?${next.toString()}`);
  };

  const handlePageChange = (nextPage: number): void => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(Math.max(1, nextPage)));
    router.push(`${ROUTES.masterProducts}?${next.toString()}`);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Flex align="flex-start" justify="space-between" mb={4}>
        <PageHeader
          title="마스터 상품"
          description="채널에 등록할 마스터 상품을 관리합니다."
        />
        <Button
          bg="gray.900"
          color="white"
          _hover={{ bg: "gray.800" }}
          size="sm"
          onClick={() => router.push(ROUTES.masterProductNew)}
          flexShrink={0}
          mt={1}
        >
          마스터 상품 등록
        </Button>
      </Flex>

      <Box
        borderBottomWidth="1px"
        borderColor="gray.200"
        mb={4}
      >
        <Flex gap={1}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => handleTabChange(tab.id)}
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
              >
                <Text fontSize="sm">{tab.label}</Text>
              </Button>
            );
          })}
        </Flex>
      </Box>

      <Flex mb={4}>
        <Box position="relative" minW="260px" maxW="360px" w="100%">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상품명 검색"
            pl={8}
            pr={8}
            size="sm"
            borderColor="gray.200"
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
              onClick={() => {
                setSearchInput("");
                setDebouncedSearch("");
              }}
            >
              <Icon as={X} boxSize={4} />
            </button>
          )}
        </Box>
      </Flex>

      {activeTab === "master" ? (
        <MasterProductsTab
          search={debouncedSearch}
          page={page}
          onPageChange={handlePageChange}
        />
      ) : (
        <ListedProductsTab
          search={debouncedSearch}
          page={page}
          onPageChange={handlePageChange}
        />
      )}
    </Box>
  );
}

export function MasterProductsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      }
    >
      <MasterProductsPageContent />
    </Suspense>
  );
}
