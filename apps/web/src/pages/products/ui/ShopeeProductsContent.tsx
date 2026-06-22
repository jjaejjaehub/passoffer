import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { KeyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  type ShopeeProductItem,
  useShopeeDeleteItem,
  useShopeeProducts,
  useShopeeUnlistItem,
  getShopeeErrorMessage,
} from "@/entities/product";
import { appToaster } from "@/shared/ui/app-toaster";
import { EmptyState, ErrorState } from "@/shared/ui";
import { ShopeeProductDetailModal } from "@/features/view-product-detail";
import {
  DeleteConfirmDialog,
  StatusChangeConfirmDialog,
} from "@/features/edit-item-status";

const SHOPEE_STATUS_LABEL: Record<string, string> = {
  NORMAL: "판매중",
  UNLIST: "판매중지",
  REVIEWING: "검수중",
  BANNED: "차단",
  SELLER_DELETE: "삭제",
  SHOPEE_DELETE: "쇼피삭제",
};

interface ShopeeProductsContentProps {
  debouncedSearch: string;
  activeStatus: string;
  apiValues: string[];
  isActiveChannel: boolean;
}

export function ShopeeProductsContent({
  debouncedSearch,
  apiValues,
  isActiveChannel,
}: ShopeeProductsContentProps): React.JSX.Element {
  const router = useRouter();
  const [shopeeOffset, setShopeeOffset] = useState<number>(0);
  const [selectedShopeeItemId, setSelectedShopeeItemId] = useState<
    number | null
  >(null);

  const [shopeeStatusDialogOpen, setShopeeStatusDialogOpen] =
    useState<boolean>(false);
  const [shopeeStatusTarget, setShopeeStatusTarget] = useState<{
    itemId: number;
    unlist: boolean;
  } | null>(null);
  const [shopeeDeleteDialogOpen, setShopeeDeleteDialogOpen] =
    useState<boolean>(false);
  const [shopeeDeleteTargetId, setShopeeDeleteTargetId] = useState<
    number | null
  >(null);

  const { mutateAsync: unlistItemAsync } = useShopeeUnlistItem();
  const { mutateAsync: deleteItemAsync } = useShopeeDeleteItem();

  const {
    data: shopeeData,
    totalCount: shopeeTotalCount,
    hasNextPage: shopeeHasNextPage,
    nextOffset: shopeeNextOffset,
    isLoading: shopeeLoading,
    error: shopeeError,
    hasApiKey: shopeeHasApiKey,
    refetch: shopeeRefetch,
  } = useShopeeProducts({
    offset: shopeeOffset,
    pageSize: 50,
    itemStatus: apiValues,
    enabled: isActiveChannel,
  });

  const filteredShopeeItems = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) {
      return shopeeData;
    }

    return shopeeData.filter((item) => {
      return (
        item.itemName.toLowerCase().includes(query) ||
        item.itemSku.toLowerCase().includes(query)
      );
    });
  }, [shopeeData, debouncedSearch]);

  const handleShopeeStatusConfirm = async (): Promise<void> => {
    if (!shopeeStatusTarget) return;
    try {
      await unlistItemAsync(shopeeStatusTarget);
      appToaster.create({
        title: shopeeStatusTarget.unlist ? "판매중지 완료" : "판매 재개 완료",
        type: "success",
      });
      shopeeRefetch();
    } catch (error) {
      appToaster.create({
        title: shopeeStatusTarget.unlist ? "판매중지 실패" : "판매 재개 실패",
        description: getShopeeErrorMessage(error),
        type: "error",
      });
    }
  };

  const handleShopeeDeleteConfirm = async (): Promise<void> => {
    if (shopeeDeleteTargetId === null) return;
    try {
      await deleteItemAsync(shopeeDeleteTargetId);
      appToaster.create({ title: "삭제 완료", type: "success" });
      shopeeRefetch();
    } catch (error) {
      appToaster.create({
        title: "삭제 실패",
        description: getShopeeErrorMessage(error),
        type: "error",
      });
    }
  };

  const renderContent = () => {
    if (!shopeeHasApiKey) {
      return (
        <EmptyState
          icon={<KeyIcon />}
          title="Shopee API 키가 없습니다"
          description="채널 설정에서 Shopee 채널을 연결하면 상품을 조회할 수 있습니다."
          action={{
            label: "채널 설정으로 이동",
            onClick: () => router.push("/settings/channels"),
          }}
        />
      );
    }

    if (shopeeLoading) {
      return (
        <Box display="flex" justifyContent="center" py={10}>
          <Spinner />
        </Box>
      );
    }

    if (shopeeError) {
      return (
        <ErrorState
          title="Shopee 상품 조회 중 오류 발생"
          description={shopeeError.message}
          onRetry={() => shopeeRefetch()}
        />
      );
    }

    if (shopeeData.length === 0) {
      return (
        <EmptyState
          title="표시할 상품이 없습니다"
          description="선택한 상태에 해당하는 상품이 없습니다."
        />
      );
    }

    if (filteredShopeeItems.length === 0) {
      return (
        <EmptyState
          title="검색 결과가 없습니다"
          description="상품명 또는 SKU로 다시 검색해 주세요."
        />
      );
    }

    return (
      <Box overflowX="auto" mt={2}>
        <Box as="table" width="100%" fontSize="sm" borderCollapse="collapse">
          <Box as="thead">
            <Box as="tr" borderBottomWidth="1px" borderColor="gray.200">
              {["Item ID", "상품명", "SKU", "상태", "가격", "재고", "작업"].map(
                (h) => (
                  <Box
                    key={h}
                    as="th"
                    px={3}
                    py={2}
                    textAlign="left"
                    fontWeight="semibold"
                    color="gray.600"
                    whiteSpace="nowrap"
                  >
                    {h}
                  </Box>
                ),
              )}
            </Box>
          </Box>
          <Box as="tbody">
            {filteredShopeeItems.map((item: ShopeeProductItem) => (
              <Box
                key={item.itemId}
                as="tr"
                borderBottomWidth="1px"
                borderColor="gray.100"
                _hover={{ bg: "gray.50" }}
                cursor="pointer"
                onClick={() => setSelectedShopeeItemId(item.itemId)}
              >
                <Box as="td" px={3} py={2} color="gray.500" fontFamily="mono">
                  {item.itemId}
                </Box>
                <Box as="td" px={3} py={2} maxW="280px">
                  <Text lineClamp={1}>{item.itemName}</Text>
                </Box>
                <Box as="td" px={3} py={2} color="gray.500">
                  {item.itemSku || "-"}
                </Box>
                <Box as="td" px={3} py={2}>
                  <Box
                    as="span"
                    display="inline-flex"
                    alignItems="center"
                    px={2}
                    py={0.5}
                    fontSize="xs"
                    borderRadius="sm"
                    borderWidth="1px"
                    borderColor={
                      item.itemStatus === "NORMAL" ? "gray.900" : "gray.300"
                    }
                    borderStyle={
                      item.itemStatus === "NORMAL" ? "solid" : "dashed"
                    }
                    color="gray.800"
                  >
                    {SHOPEE_STATUS_LABEL[item.itemStatus] ?? item.itemStatus}
                  </Box>
                </Box>
                <Box as="td" px={3} py={2} whiteSpace="nowrap">
                  {item.price.toLocaleString()} {item.currency}
                </Box>
                <Box as="td" px={3} py={2}>
                  {item.stock.toLocaleString()}
                </Box>
                <Box
                  as="td"
                  px={3}
                  py={2}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Flex gap={1}>
                    {item.itemStatus === "NORMAL" && (
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="gray.400"
                        color="gray.700"
                        _hover={{ bg: "gray.50" }}
                        onClick={() => {
                          setShopeeStatusTarget({
                            itemId: item.itemId,
                            unlist: true,
                          });
                          setShopeeStatusDialogOpen(true);
                        }}
                      >
                        판매중지
                      </Button>
                    )}
                    {item.itemStatus === "UNLIST" && (
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="gray.400"
                        color="gray.700"
                        _hover={{ bg: "gray.50" }}
                        onClick={() => {
                          setShopeeStatusTarget({
                            itemId: item.itemId,
                            unlist: false,
                          });
                          setShopeeStatusDialogOpen(true);
                        }}
                      >
                        판매재개
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      borderColor="red.300"
                      color="red.600"
                      _hover={{ bg: "red.50" }}
                      onClick={() => {
                        setShopeeDeleteTargetId(item.itemId);
                        setShopeeDeleteDialogOpen(true);
                      }}
                    >
                      삭제
                    </Button>
                  </Flex>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        <Text mt={2} px={3} fontSize="xs" color="gray.400">
          총 {shopeeTotalCount.toLocaleString()}개
          {shopeeHasNextPage && " · 다음 페이지 있음"}
        </Text>
      </Box>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Shopee 상품 상세 모달 */}
      <ShopeeProductDetailModal
        itemId={selectedShopeeItemId}
        onClose={() => setSelectedShopeeItemId(null)}
      />

      {/* Shopee 상태 변경 요약 다이얼로그 */}
      <StatusChangeConfirmDialog
        isOpen={shopeeStatusDialogOpen}
        onClose={() => {
          setShopeeStatusDialogOpen(false);
          setShopeeStatusTarget(null);
        }}
        onConfirm={handleShopeeStatusConfirm}
        itemCodes={
          shopeeStatusTarget ? [String(shopeeStatusTarget.itemId)] : []
        }
        actionLabel={
          shopeeStatusTarget?.unlist ? "판매중지" : "판매중으로 변경"
        }
      />

      {/* Shopee 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        isOpen={shopeeDeleteDialogOpen}
        onClose={() => {
          setShopeeDeleteDialogOpen(false);
          setShopeeDeleteTargetId(null);
        }}
        onConfirm={handleShopeeDeleteConfirm}
        itemCodes={
          shopeeDeleteTargetId !== null ? [String(shopeeDeleteTargetId)] : []
        }
      />
    </>
  );
}
