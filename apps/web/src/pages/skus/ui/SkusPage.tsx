"use client";

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useDeleteSku, useSkus } from "@/entities/sku";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";

function SkusTab({
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
  const { data, isLoading } = useSkus({ search, page, pageSize: 20 });
  const { mutateAsync: deleteSku } = useDeleteSku();
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

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
      await deleteSku(confirmDeleteId);
      appToaster.create({ title: "삭제 완료", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "삭제 실패";
      appToaster.create({ title: "삭제 실패", description: message, type: "error" });
    } finally {
      setConfirmDeleteId(null);
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

      <Box flex="1" minH={0} overflowY="auto" overflowX="auto">
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>SKU 코드 / 이름</Table.ColumnHeader>
              <Table.ColumnHeader>바코드</Table.ColumnHeader>
              <Table.ColumnHeader>재고</Table.ColumnHeader>
              <Table.ColumnHeader>마스터 변형 매핑</Table.ColumnHeader>
              <Table.ColumnHeader>판매상품 매핑</Table.ColumnHeader>
              <Table.ColumnHeader>수정일</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                    등록된 SKU가 없습니다.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((item) => (
                <Table.Row
                  key={item.id}
                  cursor="pointer"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => navigateTo(ROUTES.skuEdit(item.id))}
                >
                  <Table.Cell>
                    <Stack gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium">{item.code}</Text>
                      <Text fontSize="xs" color="gray.500">{item.name ?? "-"}</Text>
                    </Stack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.barcode ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">{item.stock}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.masterVariantCount}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{item.listedSkuCount}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Flex gap={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => navigateTo(ROUTES.skuEdit(item.id))}
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
                          disabled={item.masterVariantCount > 0 || item.listedSkuCount > 0}
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

      <Flex mt={4} align="center" justify="center" gap={2} flexShrink={0}>
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

function SkusPageContent(): React.JSX.Element {
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
    router.push(`${ROUTES.skus}?${next.toString()}`);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" minH={0}>
      <Flex align="flex-start" justify="space-between" mb={4} flexShrink={0}>
        <PageHeader
          title="SKU 관리"
          description="재고 단위(SKU)를 관리합니다. 마스터 변형과 판매상품은 SKU를 통해 재고에 연결됩니다."
        />
        <Button
          bg="gray.900"
          color="white"
          _hover={{ bg: "gray.800" }}
          size="sm"
          onClick={() => router.push(ROUTES.skuNew)}
          flexShrink={0}
          mt={1}
        >
          SKU 등록
        </Button>
      </Flex>

      <Flex mb={4} flexShrink={0}>
        <Box position="relative" minW="260px" maxW="360px" w="100%">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="SKU 코드/이름/바코드 검색"
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

      <SkusTab
        search={debouncedSearch}
        page={page}
        onPageChange={handlePageChange}
      />
    </Box>
  );
}

export function SkusPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      }
    >
      <SkusPageContent />
    </Suspense>
  );
}
