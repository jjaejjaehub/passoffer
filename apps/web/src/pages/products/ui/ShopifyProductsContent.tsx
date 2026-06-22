import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { KeyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useShopifyProducts,
  useShopifyUpdateProductStatus,
  useShopifyDeleteProduct,
} from "@/entities/product";
import {
  ShopifyProductBulkActionBar,
  ShopifyBulkDeleteDialog,
} from "@/features/edit-item-status";
import { ShopifyProductTable } from "@/widgets/product-table";
import { ErrorState, EmptyState } from "@/shared/ui";

interface ShopifyProductsContentProps {
  debouncedSearch: string;
  activeStatus: string;
  isActiveChannel: boolean;
  onPageChange?: (direction: "prev" | "next") => void;
  setAfterCursor: (cursor: string | undefined) => void;
  setCursorStack: React.Dispatch<React.SetStateAction<string[]>>;
  afterCursor: string | undefined;
  cursorStack: string[];
}

export function ShopifyProductsContent({
  debouncedSearch,
  activeStatus,
  isActiveChannel,
  setAfterCursor,
  setCursorStack,
  afterCursor,
  cursorStack,
}: ShopifyProductsContentProps): React.JSX.Element {
  const router = useRouter();

  const [selectedShopifyProductIds, setSelectedShopifyProductIds] = useState<
    Set<string>
  >(() => new Set());
  const [shopifyDeleteTargetId, setShopifyDeleteTargetId] = useState<
    string | null
  >(null);
  const [shopifyBulkDeleteOpen, setShopifyBulkDeleteOpen] = useState(false);
  const [shopifyBulkPending, setShopifyBulkPending] = useState(false);

  const {
    data: shopifyData,
    pageInfo: shopifyPageInfo,
    isLoading: shopifyLoading,
    error: shopifyError,
    hasApiKey: shopifyHasApiKey,
    refetch: shopifyRefetch,
  } = useShopifyProducts({
    status: activeStatus === "all" ? undefined : activeStatus,
    enabled: isActiveChannel,
  });

  const {
    mutateAsync: updateShopifyStatusAsync,
    isPending: isShopifyStatusPending,
  } = useShopifyUpdateProductStatus();
  const { mutateAsync: deleteShopifyProductAsync } = useShopifyDeleteProduct();

  const handleShopifyBulkPublish = async (): Promise<void> => {
    setShopifyBulkPending(true);
    try {
      await Promise.all(
        Array.from(selectedShopifyProductIds).map((id) =>
          updateShopifyStatusAsync({ productId: id, status: "ACTIVE" }),
        ),
      );
      setSelectedShopifyProductIds(new Set());
    } finally {
      setShopifyBulkPending(false);
    }
  };

  const handleShopifyBulkUnpublish = async (): Promise<void> => {
    setShopifyBulkPending(true);
    try {
      await Promise.all(
        Array.from(selectedShopifyProductIds).map((id) =>
          updateShopifyStatusAsync({ productId: id, status: "DRAFT" }),
        ),
      );
      setSelectedShopifyProductIds(new Set());
    } finally {
      setShopifyBulkPending(false);
    }
  };

  const handleShopifyBulkDelete = async (): Promise<void> => {
    await Promise.all(
      Array.from(selectedShopifyProductIds).map((id) =>
        deleteShopifyProductAsync(id),
      ),
    );
    setSelectedShopifyProductIds(new Set());
    setShopifyBulkDeleteOpen(false);
  };

  if (!shopifyHasApiKey) {
    return (
      <EmptyState
        icon={<KeyIcon />}
        title="Shopify API 키가 없습니다"
        description="채널 설정에서 Shopify 채널을 연결하면 상품을 조회할 수 있습니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push("/settings/channels"),
        }}
      />
    );
  }

  if (shopifyLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner />
      </Box>
    );
  }

  if (shopifyError) {
    const isAuthError = shopifyError.type === "AUTH_ERROR";
    return (
      <ErrorState
        title={
          isAuthError
            ? "Shopify API 인증 실패"
            : "Shopify 상품 조회 중 오류 발생"
        }
        description={
          isAuthError
            ? "API 키 또는 액세스 토큰이 유효하지 않습니다. 채널 설정에서 자격증명을 확인해 주세요."
            : shopifyError.message
        }
        onRetry={
          isAuthError
            ? () => router.push("/settings/channels")
            : () => shopifyRefetch()
        }
        actionLabel={isAuthError ? "채널 설정" : "다시 시도"}
      />
    );
  }

  if (shopifyData.length === 0) {
    return (
      <EmptyState
        title="표시할 상품이 없습니다"
        description="선택한 상태에 해당하는 Shopify 상품이 없습니다."
      />
    );
  }

  return (
    <>
      <ShopifyProductBulkActionBar
        selectedIds={selectedShopifyProductIds}
        isPending={shopifyBulkPending || isShopifyStatusPending}
        onBulkPublish={() => {
          void handleShopifyBulkPublish();
        }}
        onBulkUnpublish={() => {
          void handleShopifyBulkUnpublish();
        }}
        onBulkDelete={() => setShopifyBulkDeleteOpen(true)}
      />
      <ShopifyBulkDeleteDialog
        isOpen={shopifyBulkDeleteOpen}
        count={selectedShopifyProductIds.size}
        onClose={() => setShopifyBulkDeleteOpen(false)}
        onConfirm={handleShopifyBulkDelete}
      />
      <ShopifyProductTable
        items={shopifyData}
        selectedProductId={null}
        onSelectProduct={(id) => {
          const numericId = id.split("/").pop() ?? id;
          router.push(`/products/${encodeURIComponent(numericId)}/edit`);
        }}
        selectedProductIds={selectedShopifyProductIds}
        onToggleRowSelection={(id) => {
          setSelectedShopifyProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onToggleAllSelection={(checked) => {
          if (!checked) {
            setSelectedShopifyProductIds(new Set());
            return;
          }
          setSelectedShopifyProductIds(
            new Set(shopifyData.map((item) => item.id)),
          );
        }}
        onRowPublish={(id) => {
          void updateShopifyStatusAsync({ productId: id, status: "ACTIVE" });
        }}
        onRowUnpublish={(id) => {
          void updateShopifyStatusAsync({ productId: id, status: "DRAFT" });
        }}
        isStatusActionPending={isShopifyStatusPending}
        onRowDelete={(id) => setShopifyDeleteTargetId(id)}
      />
      {shopifyDeleteTargetId && (
        <ShopifyDeleteConfirmDialog
          isOpen={!!shopifyDeleteTargetId}
          onClose={() => setShopifyDeleteTargetId(null)}
          onConfirm={async () => {
            if (shopifyDeleteTargetId) {
              await deleteShopifyProductAsync(shopifyDeleteTargetId);
            }
            setShopifyDeleteTargetId(null);
          }}
        />
      )}
      <Text mt={2} px={3} fontSize="xs" color="gray.400">
        {shopifyPageInfo.hasNextPage || cursorStack.length > 0
          ? `${shopifyData.length}개 표시 중`
          : `총 ${shopifyData.length}개`}
      </Text>

      <Flex mt={4} align="center" justify="center" gap={2}>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => {
            const prev = cursorStack.slice(0, -1);
            setCursorStack(prev);
            setAfterCursor(prev[prev.length - 1]);
          }}
          disabled={cursorStack.length === 0}
        >
          이전
        </Button>
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => {
            if (shopifyPageInfo.endCursor) {
              setCursorStack((prev) => [
                ...prev,
                shopifyPageInfo.endCursor as string,
              ]);
              setAfterCursor(shopifyPageInfo.endCursor);
            }
          }}
          disabled={!shopifyPageInfo.hasNextPage}
        >
          다음
        </Button>
      </Flex>
    </>
  );
}

// ─── Shopify 상품 삭제 확인 다이얼로그 ─────────────────────────
export function ShopifyDeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}): React.JSX.Element | null {
  const [isPending, setIsPending] = useState(false);
  if (!isOpen) return null;

  const handleConfirm = async (): Promise<void> => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.400"
        zIndex={1400}
        onClick={onClose}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        style={{ transform: "translate(-50%, -50%)" }}
        zIndex={1401}
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        p={6}
        w="360px"
      >
        <Text fontWeight="semibold" fontSize="md" mb={2}>
          상품을 삭제하시겠습니까?
        </Text>
        <Text fontSize="sm" color="gray.600" mb={5}>
          삭제된 상품은 Shopify에서 완전히 제거되며 복구할 수 없습니다.
        </Text>
        <Flex justify="flex-end" gap={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            size="sm"
            colorScheme="red"
            onClick={() => void handleConfirm()}
            loading={isPending}
          >
            삭제
          </Button>
        </Flex>
      </Box>
    </>
  );
}
