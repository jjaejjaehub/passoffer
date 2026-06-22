'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { CheckCircle2, X } from 'lucide-react';

import { appToaster } from '@/shared/ui/app-toaster';

export interface ConfirmOrdersModalProps {
  open: boolean;
  onClose: () => void;
  orderCount: number;
  onConfirm: (input: {
    estimatedShippingDate: string;
    delayType: 1 | 2 | 3 | 4;
  }) => Promise<void>;
}

const DELAY_OPTIONS: Array<{ value: 1 | 2 | 3 | 4; label: string }> = [
  { value: 1, label: '상품준비중' },
  { value: 2, label: '고객요청' },
  { value: 3, label: '배송사 지연' },
  { value: 4, label: '재고부족' },
];

function todayJst(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map((s) => Number.parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function ConfirmOrdersModal({
  open,
  onClose,
  orderCount,
  onConfirm,
}: ConfirmOrdersModalProps): React.JSX.Element | null {
  const todayYmd = useMemo(() => todayJst(), []);
  const minDate = useMemo(() => addDaysYmd(todayYmd, 1), [todayYmd]);

  const [estDate, setEstDate] = useState<string>(minDate);
  const [delayType, setDelayType] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const quickDateOptions: Array<{ label: string; days: number }> = [
    { label: '내일', days: 1 },
    { label: '모레', days: 2 },
    { label: '3일 후', days: 3 },
    { label: '일주일 후', days: 7 },
  ];

  if (!open) return null;

  const submit = async (): Promise<void> => {
    setError(undefined);
    if (!estDate || estDate <= todayYmd) {
      setError('발송예정일은 오늘 이후 날짜만 선택할 수 있습니다.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({ estimatedShippingDate: estDate, delayType });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '주문확인 처리에 실패했습니다.';
      appToaster.create({ title: message, type: 'error' });
    } finally {
      setSubmitting(false);
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
          if (!submitting) onClose();
        }}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: 'calc(100% - 32px)', md: '480px' }}
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
            <CheckCircle2 size={18} color="#3182ce" />
            <Box>
              <Text fontWeight="semibold" fontSize="md">
                주문확인 (결제완료 → 신규주문)
              </Text>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                선택된 {orderCount.toLocaleString()}건 주문을 Qoo10에 확인 처리합니다
              </Text>
            </Box>
          </Flex>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#718096',
              background: 'transparent',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </Flex>

        <Box px={5} py={4}>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                as="label"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                발송 예정일
                <Text as="span" color="red.500" ml={0.5}>
                  *
                </Text>
              </Text>
              <Flex wrap="wrap" gap={2} mb={2}>
                {quickDateOptions.map((option) => {
                  const dateValue = addDaysYmd(todayYmd, option.days);
                  const isSelected = estDate === dateValue;
                  return (
                    <Button
                      key={option.days}
                      type="button"
                      size="xs"
                      variant={isSelected ? 'solid' : 'outline'}
                      colorScheme={isSelected ? 'blue' : 'gray'}
                      onClick={() => setEstDate(dateValue)}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </Flex>
              <Input
                type="date"
                size="sm"
                value={estDate}
                min={minDate}
                onChange={(e) => setEstDate(e.target.value)}
                aria-label="발송 예정일"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                JST 기준 오늘 이후 날짜만 가능합니다 (Qoo10 -10018 오류 회피)
              </Text>
            </Box>

            <Box>
              <Text
                as="label"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                mb={1}
                display="block"
              >
                지연 사유
                <Text as="span" color="red.500" ml={0.5}>
                  *
                </Text>
              </Text>
              <select
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#1a202c',
                  backgroundColor: 'white',
                }}
                value={delayType}
                onChange={(e) =>
                  setDelayType(
                    Number.parseInt(e.target.value, 10) as 1 | 2 | 3 | 4,
                  )
                }
                aria-label="지연 사유"
              >
                {DELAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} · {opt.label}
                  </option>
                ))}
              </select>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Qoo10 DelayType — 기본값 1 (상품준비중)
              </Text>
            </Box>

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
                {error}
              </Box>
            )}

            <Box
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
              borderRadius="md"
              px={3}
              py={2}
            >
              <Text fontSize="xs" color="blue.800">
                Qoo10 SetSellerCheckYNBulk(15772)로 500건씩 일괄 처리됩니다.
                <br />
                Shopify 주문은 API 호출 없이 즉시 신규주문 상태로 전환됩니다.
              </Text>
            </Box>

            <HStack gap={2} justify="flex-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                size="sm"
                loading={submitting}
                onClick={() => {
                  void submit();
                }}
              >
                {orderCount.toLocaleString()}건 확인
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
