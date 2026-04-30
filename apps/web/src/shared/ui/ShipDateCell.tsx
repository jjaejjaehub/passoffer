'use client';

import type React from 'react';
import type { BoxProps, ButtonProps } from '@chakra-ui/react';
import {
  Box,
  Button,
  Grid,
  HStack,
  IconButton,
  Popover,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';

interface ShipDateCellProps {
  orderId: string;
  value: string | null;
  onChange: (date: string | null) => void;
  isDisabled?: boolean;
  onDateSelected?: () => void;
  buttonProps?: ButtonProps;
  containerProps?: BoxProps;
}

const today = startOfDay(new Date());

export function ShipDateCell({
  value,
  onChange,
  isDisabled = false,
  onDateSelected,
  buttonProps,
  containerProps,
}: ShipDateCellProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (!value) {
      return today;
    }
    const parsed = parse(value, 'yyyy.MM.dd', new Date());
    return Number.isNaN(parsed.getTime()) ? today : parsed;
  });

  const quickDates = useMemo(
    () => [
      { label: '오늘', date: today },
      { label: '내일', date: addDays(today, 1) },
      { label: '모레', date: addDays(today, 2) },
    ],
    [],
  );

  const handleQuickSelect = useCallback(
    (date: Date): void => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}.${month}.${day}`;
      setViewMonth(date);
      onChange(formatted);
      setOpen(false);
      if (onDateSelected) {
        onDateSelected();
      }
    },
    [onChange, onDateSelected],
  );

  const handleReset = useCallback((): void => {
    setViewMonth(today);
    onChange(null);
    setOpen(false);
  }, [onChange]);

  const handleOpenChange = useCallback(
    (details: { open: boolean }): void => {
      setOpen(details.open);
      if (details.open) {
        if (value) {
          const parsed = parse(value, 'yyyy.MM.dd', new Date());
          if (!Number.isNaN(parsed.getTime())) {
            setViewMonth(parsed);
            return;
          }
        }
        setViewMonth(today);
      }
    },
    [value],
  );

  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }
    const parsed = parse(value, 'yyyy.MM.dd', new Date());
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  if (isDisabled) {
    return (
      <Text fontSize="sm" color="gray.400">
        {value ?? '—'}
      </Text>
    );
  }

  return (
    <Box {...containerProps}>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <Button
            variant="ghost"
            size="xs"
            fontWeight="normal"
            color={value ? 'gray.700' : 'gray.400'}
            px={2}
            h={7}
            justifyContent="flex-start"
            fontSize="xs"
            {...buttonProps}
          >
            {value ? `${value} ✎` : '날짜 선택'}
          </Button>
        </Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content w="260px" p={3}>
            <VStack gap={3} align="stretch">
              <HStack gap={1}>
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    variant="outline"
                    size="xs"
                    flex={1}
                    borderColor="gray.200"
                    color="gray.700"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => handleQuickSelect(qd.date)}
                  >
                    {qd.label}
                  </Button>
                ))}
              </HStack>

              <Box>
                <HStack justify="space-between" mb={2}>
                  <IconButton
                    aria-label="이전 달"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setViewMonth((current) => startOfMonth(addDays(current, -1)))
                    }
                  >
                    ‹
                  </IconButton>
                  <Text fontSize="sm" fontWeight="medium">
                    {format(viewMonth, 'yyyy년 M월', { locale: ko })}
                  </Text>
                  <IconButton
                    aria-label="다음 달"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      setViewMonth((current) => startOfMonth(addDays(current, 32)))
                    }
                  >
                    ›
                  </IconButton>
                </HStack>

                <Grid templateColumns="repeat(7, 1fr)" gap={0} mb={1}>
                  {['일', '월', '화', '수', '목', '금', '토'].map((dayLabel) => (
                    <Text
                      key={dayLabel}
                      fontSize="xs"
                      color="gray.400"
                      textAlign="center"
                    >
                      {dayLabel}
                    </Text>
                  ))}
                </Grid>

                <Grid templateColumns="repeat(7, 1fr)" gap={0}>
                  {Array.from({ length: getDay(startOfMonth(viewMonth)) }).map(
                    (_, index) => (
                      <Box key={`empty-${startOfMonth(viewMonth).getTime()}-${index}`} />
                    ),
                  )}
                  {eachDayOfInterval({
                    start: startOfMonth(viewMonth),
                    end: endOfMonth(viewMonth),
                  }).map((day) => {
                    const isSelected =
                      selectedDate !== undefined && isSameDay(day, selectedDate);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    const isToday = isSameDay(day, startOfDay(new Date()));

                    return (
                      <Button
                        key={day.toISOString()}
                        size="xs"
                        variant="ghost"
                        w="100%"
                        h={7}
                        borderRadius="sm"
                        fontSize="xs"
                        bg={isSelected ? 'gray.900' : 'transparent'}
                        color={
                          isSelected
                            ? 'white'
                            : isPast
                              ? 'gray.300'
                              : isToday
                                ? 'gray.900'
                                : 'gray.700'
                        }
                        fontWeight={isToday && !isSelected ? 'bold' : 'normal'}
                        cursor={isPast ? 'not-allowed' : 'pointer'}
                        _hover={
                          isPast
                            ? {}
                            : {
                                bg: isSelected ? 'gray.800' : 'gray.100',
                              }
                        }
                        onClick={isPast ? undefined : () => handleQuickSelect(day)}
                      >
                        {format(day, 'd')}
                      </Button>
                    );
                  })}
                </Grid>
              </Box>

              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">
                  {value ?? '날짜를 선택하세요'}
                </Text>
                {value && (
                  <Button
                    variant="ghost"
                    size="xs"
                    color="gray.400"
                    onClick={handleReset}
                  >
                    초기화
                  </Button>
                )}
              </HStack>
            </VStack>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </Box>
  );
}

