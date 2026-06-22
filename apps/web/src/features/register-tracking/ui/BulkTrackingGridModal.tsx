'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Table2, X } from 'lucide-react';

import {
  useBulkSetSendingInfo,
  type OrderListItem,
} from '@/entities/order';
import { appToaster } from '@/shared/ui/app-toaster';

import { CARRIER_OPTIONS } from '../model/schema';

export interface BulkTrackingGridModalProps {
  open: boolean;
  onClose: () => void;
  orders: OrderListItem[];
  onCompleted?: () => void;
}

interface RowState {
  carrierName: string;
  trackingNo: string;
}

function formatTrackingNumber(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

export function BulkTrackingGridModal({
  open,
  onClose,
  orders,
  onCompleted,
}: BulkTrackingGridModalProps): React.JSX.Element | null {
  const bulkMut = useBulkSetSendingInfo();
  const [rows, setRows] = useState<Map<string, RowState>>(() => new Map());

  useEffect(() => {
    if (open) {
      const init = new Map<string, RowState>();
      orders.forEach((o) => {
        init.set(o.id, { carrierName: '', trackingNo: '' });
      });
      setRows(init);
    }
  }, [open, orders]);

  const filledCount = useMemo(
    () =>
      Array.from(rows.values()).filter(
        (r) => r.carrierName.trim() && r.trackingNo.trim(),
      ).length,
    [rows],
  );

  const canSubmit = filledCount > 0 && !bulkMut.isPending;

  if (!open) return null;

  const updateRow = (id: string, patch: Partial<RowState>): void => {
    setRows((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { carrierName: '', trackingNo: '' };
      next.set(id, { ...cur, ...patch });
      return next;
    });
  };

  const applyToAll = (carrierName: string): void => {
    setRows((prev) => {
      const next = new Map(prev);
      for (const [id, cur] of next) {
        next.set(id, { ...cur, carrierName });
      }
      return next;
    });
  };

  const submit = async (): Promise<void> => {
    const items = Array.from(rows.entries())
      .filter(([, v]) => v.carrierName.trim() && v.trackingNo.trim())
      .map(([orderId, v]) => ({
        orderId,
        shippingCorp: v.carrierName.trim(),
        trackingNo: v.trackingNo.replace(/-/g, ''),
      }));
    if (items.length === 0) return;
    try {
      const res = await bulkMut.mutateAsync({ items });
      appToaster.create({
        title: '운송장 전송 완료',
        description: `요청 ${res.totalRequested}건 / 성공 ${res.totalSent}건 / 실패 ${res.totalFailed}건`,
        type: res.totalFailed > 0 ? 'warning' : 'success',
      });
      onCompleted?.();
      onClose();
    } catch (err) {
      appToaster.create({
        title: '운송장 전송 실패',
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
          if (!bulkMut.isPending) onClose();
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: 'calc(100% - 32px)', md: '900px' }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
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
            <Table2 size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                운송장 직접 입력
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                선택한 {orders.length}건의 주문에 택배사와 송장번호를 입력하세요
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={bulkMut.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              cursor: bulkMut.isPending ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={3} borderBottomWidth="1px" borderColor="gray.100">
          <HStack gap={2}>
            <Text fontSize="xs" color="gray.600">
              택배사 일괄 적용:
            </Text>
            {CARRIER_OPTIONS.map((c) => (
              <Button
                key={c.id}
                size="xs"
                variant="outline"
                onClick={() => applyToAll(c.name)}
              >
                {c.name}
              </Button>
            ))}
          </HStack>
        </Box>

        <Box px={5} py={4} overflowY="auto" flex={1}>
          <VStack gap={3} align="stretch">
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              overflow="hidden"
            >
              <Box
                as="table"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <Box as="thead" bg="gray.50">
                  <Box as="tr">
                    <Box
                      as="th"
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4a5568',
                        width: 60,
                      }}
                    >
                      #
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4a5568',
                      }}
                    >
                      주문번호
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4a5568',
                      }}
                    >
                      수령인
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4a5568',
                        width: 180,
                      }}
                    >
                      택배사
                    </Box>
                    <Box
                      as="th"
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4a5568',
                        width: 220,
                      }}
                    >
                      송장번호
                    </Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {orders.map((o, idx) => {
                    const r =
                      rows.get(o.id) ?? { carrierName: '', trackingNo: '' };
                    return (
                      <Box
                        as="tr"
                        key={o.id}
                        style={{ borderTop: '1px solid #edf2f7' }}
                      >
                        <Box
                          as="td"
                          style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            color: '#718096',
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box
                          as="td"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                        >
                          {o.channelOrderId ?? '-'}
                        </Box>
                        <Box
                          as="td"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                        >
                          {o.receiverName ?? '-'}
                        </Box>
                        <Box as="td" style={{ padding: '6px 10px' }}>
                          <select
                            value={r.carrierName}
                            onChange={(e) =>
                              updateRow(o.id, { carrierName: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: 13,
                              border: '1px solid #cbd5e0',
                              borderRadius: 4,
                              background: 'white',
                            }}
                          >
                            <option value="">택배사 선택</option>
                            {CARRIER_OPTIONS.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </Box>
                        <Box as="td" style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            value={r.trackingNo}
                            onChange={(e) =>
                              updateRow(o.id, {
                                trackingNo: formatTrackingNumber(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="송장번호 입력"
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              fontSize: 13,
                              border: '1px solid #cbd5e0',
                              borderRadius: 4,
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </VStack>
        </Box>

        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={3}
          borderTopWidth="1px"
          borderColor="gray.200"
        >
          <Text fontSize="xs" color="gray.600">
            입력 완료: {filledCount} / {orders.length}건
          </Text>
          <HStack gap={2}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={bulkMut.isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              colorScheme="blue"
              size="sm"
              loading={bulkMut.isPending}
              disabled={!canSubmit}
              onClick={() => {
                void submit();
              }}
            >
              {filledCount}건 전송
            </Button>
          </HStack>
        </Flex>
      </Box>
    </>
  );
}
