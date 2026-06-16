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
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useDeleteMasterProduct, useMasterProducts, type MasterProduct } from "@/entities/master-product";
import { BulkListToChannelModal } from "@/features/list-to-channel";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";

function MasterProductsTab({
  search,
  page,
  onPageChange,
}: {
  search: string;
  page: number;
  onPageChange: (next: number) => void;
}): React.JSX.Element {
  const t = useTranslations("pages.masterProducts");
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
      appToaster.create({ title: t("toasts.deleteSuccess"), type: "success" });
    } catch {
      appToaster.create({ title: t("toasts.deleteFailed"), type: "error" });
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
    <Box position="relative" display="flex" flexDirection="column" flex="1" minH={0}>
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
          flexShrink={0}
        >
          <Text fontSize="sm" fontWeight="medium">{t("bulk.selected", { count: selectedIds.size })}</Text>
          <Flex gap={2}>
            <Button
              size="xs"
              variant="outline"
              borderColor="whiteAlpha.400"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={() => setSelectedIds(new Set())}
            >
              {t("bulk.clear")}
            </Button>
            <Button
              size="xs"
              bg="white"
              color="gray.900"
              _hover={{ bg: "gray.100" }}
              onClick={() => setBulkModalOpen(true)}
            >
              {t("bulk.listToChannels")}
            </Button>
          </Flex>
        </Flex>
      )}

      <Box flex="1" minH={0} overflowY="auto" overflowX="auto">
        <Table.Root size="sm" stickyHeader>
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
              <Table.ColumnHeader>{t("table.title")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.brand")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.retailPrice")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.variantCount")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.listedChannelCount")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("table.createdAt")}</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                    {t("table.empty")}
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
                    <Text fontSize="sm">
                      {(() => {
                        const common = (item.attributes as Record<string, unknown> | undefined)?.common as
                          | Record<string, unknown>
                          | undefined;
                        const b = common?.brand;
                        return typeof b === "string" && b ? b : "-";
                      })()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {(() => {
                        const common = (item.attributes as Record<string, unknown> | undefined)?.common as
                          | Record<string, unknown>
                          | undefined;
                        const p = common?.retailPrice;
                        if (typeof p === "string" && p) return p;
                        if (typeof p === "number") return String(p);
                        return "-";
                      })()}
                    </Text>
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
                        {t("actions.edit")}
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
                            {t("actions.confirm")}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            borderColor="gray.300"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t("actions.cancel")}
                          </Button>
                        </Flex>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette="red"
                          onClick={() => setConfirmDeleteId(item.id)}
                        >
                          {t("actions.delete")}
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

      <Flex mt={4} align="center" justify="center" gap={2} flexShrink={0}>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {t("actions.prev")}
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
          {t("actions.next")}
        </Button>
      </Flex>
    </Box>
  );
}

function MasterProductsPageContent(): React.JSX.Element {
  const t = useTranslations("pages.masterProducts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = searchParams ?? new URLSearchParams();

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

  const handlePageChange = (nextPage: number): void => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(Math.max(1, nextPage)));
    router.push(`${ROUTES.masterProducts}?${next.toString()}`);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" minH={0}>
      <Flex align="flex-start" justify="space-between" mb={4} flexShrink={0}>
        <PageHeader
          title={t("title")}
          description={t("description")}
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
          {t("createButton")}
        </Button>
      </Flex>

      <Flex mb={4} flexShrink={0}>
        <Box position="relative" minW="260px" maxW="360px" w="100%">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
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

      <MasterProductsTab
        search={debouncedSearch}
        page={page}
        onPageChange={handlePageChange}
      />
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
