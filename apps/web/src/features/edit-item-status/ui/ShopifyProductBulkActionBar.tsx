"use client";

import { useState } from "react";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";

export interface ShopifyProductBulkActionBarProps {
  selectedIds: Set<string>;
  isPending: boolean;
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
  onBulkDelete: () => void;
}

export function ShopifyProductBulkActionBar({
  selectedIds,
  isPending,
  onBulkPublish,
  onBulkUnpublish,
  onBulkDelete,
}: ShopifyProductBulkActionBarProps): React.JSX.Element | null {
  if (selectedIds.size === 0) return null;

  return (
    <HStack
      flexWrap="wrap"
      alignItems="center"
      gap={3}
      py={2}
      px={3}
      mb={2}
      borderWidth="1px"
      borderColor="blue.200"
      borderRadius="md"
      bg="blue.50"
    >
      <Text fontSize="sm" fontWeight="medium" color="gray.800">
        {selectedIds.size}개 선택됨
      </Text>

      <Button
        type="button"
        size="sm"
        bg="gray.900"
        color="white"
        _hover={{ bg: "gray.800" }}
        disabled={isPending}
        onClick={onBulkPublish}
      >
        판매로 변경
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        borderColor="gray.300"
        disabled={isPending}
        onClick={onBulkUnpublish}
      >
        판매중지로 변경
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        color="red.600"
        disabled={isPending}
        onClick={onBulkDelete}
      >
        삭제
      </Button>
    </HStack>
  );
}

// ─── 일괄 삭제 확인 다이얼로그 ─────────────────────────────────

interface ShopifyBulkDeleteDialogProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ShopifyBulkDeleteDialog({
  isOpen,
  count,
  onClose,
  onConfirm,
}: ShopifyBulkDeleteDialogProps): React.JSX.Element | null {
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
      <Box position="fixed" inset={0} bg="blackAlpha.400" zIndex={1400} onClick={onClose} />
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
        w="380px"
      >
        <Text fontWeight="semibold" fontSize="md" mb={2}>
          {count}개 상품을 삭제하시겠습니까?
        </Text>
        <Text fontSize="sm" color="gray.600" mb={5}>
          선택한 상품이 Shopify에서 완전히 제거되며 복구할 수 없습니다.
        </Text>
        <Flex justify="flex-end" gap={2}>
          <Button size="sm" variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button
            size="sm"
            bg="red.500"
            color="white"
            _hover={{ bg: "red.600" }}
            loading={isPending}
            onClick={() => { void handleConfirm(); }}
          >
            {count}개 삭제
          </Button>
        </Flex>
      </Box>
    </>
  );
}
