"use client";

import { Button, Dialog, Text } from "@chakra-ui/react";

export interface StatusChangeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemCodes: string[];
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function StatusChangeConfirmDialog({
  isOpen,
  onClose,
  itemCodes,
  actionLabel,
  onConfirm,
}: StatusChangeConfirmDialogProps): React.JSX.Element {
  const handleOpenChange = (details: { open: boolean }): void => {
    if (!details.open) {
      onClose();
    }
  };

  const handleConfirmClick = (): void => {
    void Promise.resolve(onConfirm()).finally(() => {
      onClose();
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="md" role="alertdialog">
          <Dialog.Header>
            <Dialog.Title>{actionLabel} 확인</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="gray.700">
              선택한 상품을 {actionLabel} 하시겠습니까?
            </Text>
            {itemCodes.length > 1 ? (
              <Text mt={2} fontSize="xs" color="gray.500">
                대상 {itemCodes.length}건
              </Text>
            ) : null}
          </Dialog.Body>
          <Dialog.Footer gap={2}>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              취소
            </Button>
            <Button
              type="button"
              variant="solid"
              colorPalette="gray"
              size="sm"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              onClick={handleConfirmClick}
            >
              확인
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
