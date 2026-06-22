'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Scissors, X } from 'lucide-react';

import { useNewOrderItems, useSplitOrder } from '@/entities/order';
import { appToaster } from '@/shared/ui/app-toaster';

export interface SplitOrderModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  onCompleted?: () => void;
}

export function SplitOrderModal({
  open,
  onClose,
  orderId,
  onCompleted,
}: SplitOrderModalProps): React.JSX.Element | null {
  const enabled = open && !!orderId;
  const { data, isLoading, error } = useNewOrderItems(enabled ? orderId : null);
  const splitMut = useSplitOrder();

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, orderId]);

  const items = data?.items ?? [];
  const totalItems = items.length;
  const selectedCount = selected.size;
  const remainCount = totalItems - selectedCount;

  const canSubmit = useMemo(() => {
    return (
      !!orderId &&
      totalItems >= 2 &&
      selectedCount >= 1 &&
      remainCount >= 1 &&
      !splitMut.isPending
    );
  }, [orderId, totalItems, selectedCount, remainCount, splitMut.isPending]);

  if (!open) return null;

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (): Promise<void> => {
    if (!orderId) return;
    try {
      const res = await splitMut.mutateAsync({
        orderId,
        splits: [{ itemIds: Array.from(selected) }],
      });
      appToaster.create({
        title: '주문 분할 완료',
        description: `자식 주문 ${res.childOrderIds.length}건 생성`,
        type: 'success',
      });
      onCompleted?.();
      onClose();
    } catch (err) {
      appToaster.create({
        title: '주문 분할 실패',
        description: err instanceof Error ? err.message : String(err),
        type: 'error',
      });
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => {
          if (!splitMut.isPending) onClose();
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: 'calc(100% - 32px)', md: '640px' }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
        overflowY="auto"
      >
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Flex align="center" gap={2}>
            <Scissors size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                주문 분할
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                선택한 line item이 새 주문으로 분리됩니다 (남은 항목은 원본에 유지)
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={splitMut.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              cursor: splitMut.isPending ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={4}>
          <VStack gap={3} align="stretch">
            {isLoading && (
              <Flex justify="center" py={6}>
                <Spinner />
              </Flex>
            )}

            {error && (
              <Box
                bg="red.50"
                borderWidth="1px"
                borderColor="red.200"
                color="red.700"
                fontSize="sm"
                px={3}
                py={2}
                borderRadius="md"
              >
                {error instanceof Error ? error.message : String(error)}
              </Box>
            )}

            {!isLoading && items.length > 0 && (
              <>
                <Box
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  overflow="hidden"
                >
                  {items.map((it) => {
                    const checked = selected.has(it.id);
                    return (
                      <Flex
                        key={it.id}
                        align="center"
                        gap={3}
                        px={3}
                        py={2}
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                        bg={checked ? 'blue.50' : 'white'}
                        cursor="pointer"
                        onClick={() => toggle(it.id)}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(it.id)}
                        />
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="medium" truncate>
                            {it.channelItemTitle ?? '(제목 없음)'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {it.channelItemCode ?? '-'}
                            {it.channelOption ? ` · ${it.channelOption}` : ''}
                          </Text>
                        </Box>
                        <Text fontSize="sm" color="gray.700" minW="60px" textAlign="right">
                          x {it.orderQty}
                        </Text>
                      </Flex>
                    );
                  })}
                </Box>

                <HStack gap={3} justify="space-between" px={1}>
                  <Text fontSize="xs" color="gray.600">
                    분할 대상: {selectedCount}건 · 원본 유지: {remainCount}건
                  </Text>
                  {totalItems < 2 && (
                    <Text fontSize="xs" color="red.600">
                      line item이 1개뿐인 주문은 분할할 수 없습니다
                    </Text>
                  )}
                  {totalItems >= 2 && (selectedCount === 0 || remainCount === 0) && (
                    <Text fontSize="xs" color="orange.600">
                      최소 1개를 선택하고 1개 이상은 남겨야 합니다
                    </Text>
                  )}
                </HStack>
              </>
            )}

            {!isLoading && items.length === 0 && !error && (
              <Box
                bg="gray.50"
                borderWidth="1px"
                borderColor="gray.200"
                color="gray.600"
                fontSize="sm"
                px={3}
                py={4}
                borderRadius="md"
                textAlign="center"
              >
                line item이 없습니다
              </Box>
            )}

            <HStack gap={2} justify="flex-end" pt={2}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={splitMut.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                size="sm"
                loading={splitMut.isPending}
                disabled={!canSubmit}
                onClick={() => {
                  void submit();
                }}
              >
                분할 실행
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
