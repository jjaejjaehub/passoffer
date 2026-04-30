'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format } from 'date-fns';
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Clock, Truck, X } from 'lucide-react';

import type { Order } from '@/entities/order';
import { appToaster } from '@/shared/ui/app-toaster';
import { CARRIER_OPTIONS, trackingSchema, type TrackingFormValues } from '../model/schema';

interface TrackingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  onSubmit: (
    orderIds: string[],
    data: TrackingFormValues,
  ) => Promise<{ success: boolean; channelSyncFailed?: boolean }>;
}

type ActiveTab = 'shipDate' | 'tracking';

function FieldError({ message }: { message?: string }): React.JSX.Element | null {
  if (!message) return null;
  return <Text fontSize="sm" color="red.500" mt={1}>{message}</Text>;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }): React.JSX.Element {
  return (
    <Text as="label" fontSize="sm" fontWeight="medium" color="gray.700" mb={1} display="block">
      {children}
      {required && <Text as="span" color="red.500" ml={0.5}>*</Text>}
    </Text>
  );
}

export function TrackingFormModal({
  open,
  onOpenChange,
  orders,
  onSubmit,
}: TrackingFormModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shipDate');
  const isBulkMode = orders.length > 1;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      expectedShipDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      carrierId: undefined,
      trackingNumber: '',
      sendToChannel: true,
      memo: '',
    },
  });

  const memo = watch('memo') ?? '';
  const expectedShipDate = watch('expectedShipDate');
  const sendToChannel = watch('sendToChannel');

  const quickDateOptions = [
    { label: '내일', days: 1 },
    { label: '모레', days: 2 },
    { label: '3일 후', days: 3 },
    { label: '일주일 후', days: 7 },
  ];

  const handleFormSubmit = async (data: TrackingFormValues): Promise<void> => {
    if (activeTab === 'tracking') {
      if (!data.carrierId) {
        setError('carrierId', { message: '택배사를 선택해 주세요' });
        return;
      }
      const digits = (data.trackingNumber ?? '').replace(/\D/g, '');
      if (digits.length < 10) {
        setError('trackingNumber', { message: '송장번호는 10자리 이상이어야 합니다' });
        return;
      }
    }

    try {
      const result = await onSubmit(
        orders.map((o) => o.id),
        data,
      );
      if (result.success) {
        if (activeTab === 'shipDate') {
          appToaster.create({
            title: `발송 예정일이 ${data.expectedShipDate ?? ''}로 설정되었습니다`,
            type: 'success',
          });
        } else if (result.channelSyncFailed) {
          appToaster.create({
            title: '송장은 등록됐으나 Qoo10 전송에 실패했습니다. 재전송이 필요합니다.',
            type: 'warning',
          });
        } else {
          appToaster.create({
            title: '송장이 등록됐고 Qoo10에 전송됐습니다',
            type: 'success',
          });
        }
        onOpenChange(false);
        reset();
      }
    } catch {
      appToaster.create({
        title: '처리에 실패했습니다. 다시 시도해 주세요.',
        type: 'error',
      });
    }
  };

  if (!open) return null;

  return (
    <>
      <Box position="fixed" inset={0} bg="blackAlpha.500" zIndex={1000} onClick={() => onOpenChange(false)} />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w={{ base: 'calc(100% - 32px)', md: '520px' }}
        bg="white"
        zIndex={1001}
        borderRadius="xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.18)"
        display="flex"
        flexDirection="column"
        maxH="90vh"
        overflowY="auto"
      >
        {/* Header */}
        <Flex
          align="center"
          justify="space-between"
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              {isBulkMode ? `${orders.length}건 주문 배송 처리` : `배송 처리 · ${orders[0]?.id ?? ''}`}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              발송 예정일 또는 운송장 번호를 입력하세요
            </Text>
          </Box>
          <Box
            as="button"
            onClick={() => onOpenChange(false)}
            color="gray.500"
            _hover={{ color: 'gray.800' }}
            display="flex"
            alignItems="center"
          >
            <X size={20} />
          </Box>
        </Flex>

        {/* Tab Nav */}
        <HStack gap={0} borderBottomWidth="1px" borderColor="gray.200" px={4}>
          {([
            { id: 'shipDate' as const, icon: <Clock size={14} />, label: '발송 예정일' },
            { id: 'tracking' as const, icon: <Truck size={14} />, label: '운송장 입력' },
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                borderRadius={0}
                borderBottomWidth="2px"
                borderBottomColor={isActive ? 'blue.500' : 'transparent'}
                color={isActive ? 'blue.600' : 'gray.500'}
                fontWeight={isActive ? 'semibold' : 'normal'}
                px={4}
                py={3}
                _hover={{ bg: 'transparent', color: 'gray.800' }}
                _active={{ bg: 'transparent' }}
              >
                <Flex align="center" gap={1.5}>
                  {tab.icon}
                  {tab.label}
                </Flex>
              </Button>
            );
          })}
        </HStack>

        {/* Order Summary */}
        <Box px={5} pt={4}>
          {isBulkMode ? (
            <Box
              maxH="100px"
              overflowY="auto"
              bg="gray.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              p={3}
              mb={4}
            >
              <VStack align="stretch" gap={1}>
                {orders.map((order) => (
                  <Flex key={order.id} justify="space-between" fontSize="sm">
                    <Text fontFamily="mono" color="gray.600">{order.id}</Text>
                    <Text color="gray.500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="200px">
                      {order.items[0]?.productName}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </Box>
          ) : (
            orders[0] && (
              <Box bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={3} mb={4}>
                <Text fontSize="sm" fontWeight="medium" color="gray.900">
                  {orders[0].items[0]?.productName}
                  {orders[0].items.length > 1 && ` 외 ${orders[0].items.length - 1}건`}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={0.5}>
                  {orders[0].buyerName} · {orders[0].shippingAddress}
                </Text>
              </Box>
            )
          )}
        </Box>

        {/* Form */}
        <Box
          as="form"
          onSubmit={(e: React.BaseSyntheticEvent) => {
            e.preventDefault();
            void handleSubmit(handleFormSubmit)();
          }}
          px={5}
          pb={5}
        >
          <VStack gap={4} align="stretch">
            {/* Tab: Ship Date */}
            {activeTab === 'shipDate' && (
              <Box>
                <FieldLabel required>발송 예정일</FieldLabel>
                <Flex wrap="wrap" gap={2} mb={2}>
                  {quickDateOptions.map((option) => {
                    const dateValue = format(addDays(new Date(), option.days), 'yyyy-MM-dd');
                    const isSelected = expectedShipDate === dateValue;
                    return (
                      <Button
                        key={option.days}
                        type="button"
                        size="xs"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorScheme={isSelected ? 'blue' : 'gray'}
                        onClick={() => setValue('expectedShipDate', dateValue)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </Flex>
                <Input
                  type="date"
                  size="sm"
                  aria-label="발송 예정일"
                  {...register('expectedShipDate')}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <FieldError message={errors.expectedShipDate?.message} />
              </Box>
            )}

            {/* Tab: Tracking */}
            {activeTab === 'tracking' && (
              <>
                <Box>
                  <FieldLabel required>택배사</FieldLabel>
                  <select
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: errors.carrierId ? '1px solid #FC8181' : '1px solid #e2e8f0',
                      fontSize: '14px',
                      color: '#1a202c',
                      backgroundColor: 'white',
                    }}
                    {...register('carrierId')}
                    aria-label="택배사"
                  >
                    <option value="">택배사를 선택해 주세요</option>
                    {CARRIER_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <FieldError message={errors.carrierId?.message} />
                </Box>

                <Box>
                  <FieldLabel required>송장번호</FieldLabel>
                  <Input
                    size="sm"
                    placeholder="예: 1234-5678-9012"
                    fontFamily="mono"
                    {...register('trackingNumber')}
                    onChange={(e) => {
                      const formatted = e.target.value
                        .replace(/[^\d]/g, '')
                        .replace(/(.{4})/g, '$1-')
                        .replace(/-$/, '');
                      setValue('trackingNumber', formatted, { shouldValidate: true });
                    }}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>숫자와 하이픈(-)만 입력하세요</Text>
                  <FieldError message={errors.trackingNumber?.message} />
                </Box>

                <Box p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200">
                  <Flex align="center" justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">Qoo10 자동 전송</Text>
                      <Text fontSize="xs" color="gray.500">저장 시 Qoo10에 즉시 전송됩니다</Text>
                    </Box>
                    <input
                      type="checkbox"
                      aria-label="Qoo10 자동 전송"
                      checked={sendToChannel ?? true}
                      onChange={(e) => setValue('sendToChannel', e.target.checked)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </Flex>
                </Box>
              </>
            )}

            {/* Memo (공통) */}
            <Box>
              <FieldLabel>메모</FieldLabel>
              <textarea
                rows={2}
                placeholder="배송 관련 메모 (선택)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  resize: 'none',
                  color: '#1a202c',
                  backgroundColor: 'white',
                }}
                {...register('memo')}
              />
              <Flex justify="flex-end" mt={1}>
                <Text fontSize="xs" color="gray.400">{memo.length}/200</Text>
              </Flex>
              <FieldError message={errors.memo?.message} />
            </Box>

            <HStack gap={2} justify="flex-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                size="sm"
                loading={isSubmitting}
              >
                {activeTab === 'shipDate' ? '예정일 저장' : '송장 등록'}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
