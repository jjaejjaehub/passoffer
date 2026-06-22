"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onBulkShip: () => void;
  onBulkCancel: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onBulkShip,
  onBulkCancel,
  onClearSelection,
}: BulkActionBarProps): React.JSX.Element {
  const handleSelectAllClick = (): void => {
    onSelectAll(!isAllSelected);
  };

  const handleBulkCancelClick = (): void => {
    // 간단한 브라우저 confirm으로 대체 (Chakra AlertDialog 미사용)
    const confirmed = window.confirm(
      `선택한 ${selectedCount}건 주문을 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (confirmed) {
      onBulkCancel();
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Box
            position="sticky"
            top="var(--filter-bar-height, 120px)"
            zIndex={9}
            borderBottomWidth="1px"
            borderColor="gray.200"
            bg="gray.50"
          >
            <Flex px={4} py={2} align="center" justify="space-between">
              <HStack gap={3}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAllClick}
                />
                <Text fontSize="sm" fontWeight="medium" color="gray.900">
                  {selectedCount}건 선택됨
                  {totalCount > 0 && ` (총 ${totalCount}건 중)`}
                </Text>
              </HStack>

              <HStack gap={2}>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  onClick={onBulkShip}
                >
                  배송 처리
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  borderColor="gray.300"
                  color="gray.600"
                  _hover={{ bg: "gray.100", color: "gray.900" }}
                  onClick={handleBulkCancelClick}
                >
                  취소 처리
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  color="gray.500"
                  _hover={{ color: "gray.900" }}
                  onClick={onClearSelection}
                >
                  선택 해제
                </Button>
              </HStack>
            </Flex>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
