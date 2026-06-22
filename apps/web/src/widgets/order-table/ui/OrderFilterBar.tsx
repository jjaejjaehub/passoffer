"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Input,
  Popover,
  Text,
} from "@chakra-ui/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format as formatDateFns,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Search, X } from "lucide-react";
import { LIVE_CHANNELS } from "@/shared/config";

type DateRange = "오늘" | "7일" | "30일" | "직접입력";

interface OrderFilterBarProps {
  channelId: string;
  status: string;
  dateRange: string;
  search: string;
  statusCounts: Record<string, number>;
  onChannelChange: (id: string) => void;
  onStatusChange: (status: string) => void;
  onDateChange: (range: string) => void;
  onSearchChange: (value: string) => void;
}

const STATUS_TABS: string[] = [
  "전체",
  "신규",
  "처리중",
  "배송준비",
  "배송중",
  "완료",
  "취소·반품",
];

const DATE_RANGES: DateRange[] = ["오늘", "7일", "30일", "직접입력"];

export function OrderFilterBar({
  channelId,
  status,
  dateRange,
  search,
  statusCounts,
  onChannelChange,
  onStatusChange,
  onDateChange,
  onSearchChange,
}: OrderFilterBarProps): React.JSX.Element {
  const [searchValue, setSearchValue] = useState<string>(search);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );

  const channelTabs = LIVE_CHANNELS.map((channel) => ({
    id: channel.id,
    name: channel.name,
    isLive: channel.isLive,
  }));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchValue !== search) {
        onSearchChange(searchValue);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchValue, search, onSearchChange]);

  const handleDateRangeChange = (range: DateRange): void => {
    onDateChange(range);
  };

  const resetCustomRange = (): void => {
    setCustomStart(null);
    setCustomEnd(null);
    setHoverDate(null);
    setCurrentMonth(startOfMonth(new Date()));
    setCustomOpen(false);
  };

  const formatDisplayRange = (start: Date, end: Date): string => {
    const fmt = (value: Date): string => formatDateFns(value, "yyyy.MM.dd");
    return `${fmt(start)} ~ ${fmt(end)}`;
  };

  const applyCustomRange = (start: Date, end: Date): void => {
    const startDate = isAfter(start, end) ? end : start;
    const endDate = isAfter(start, end) ? start : end;
    const label = formatDisplayRange(startDate, endDate);
    onDateChange(label);
    setCustomStart(startDate);
    setCustomEnd(endDate);
    setCustomOpen(false);
  };

  const handleClearSearch = (): void => {
    setSearchValue("");
    onSearchChange("");
  };

  const monthDates = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(addMonths(currentMonth, 1)), {
      weekStartsOn: 0,
    });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
    >
      {/* Row 1: Channel Tabs */}
      <Flex
        px={4}
        pt={3}
        pb={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
        align="center"
        gap={1}
      >
        {channelTabs.map((channel) => {
          const isSelected = channelId === channel.id;
          const isDisabled = !channel.isLive || channel.id === "rakuten";
          return (
            <Button
              key={channel.id}
              variant="ghost"
              size="sm"
              onClick={
                isDisabled ? undefined : () => onChannelChange(channel.id)
              }
              fontWeight={isSelected ? "semibold" : "normal"}
              color={isSelected ? "gray.900" : "gray.500"}
              borderRadius={0}
              px={3}
              py={2}
              height="auto"
              border="none"
              outline="none"
              boxShadow={
                isSelected
                  ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                  : "none"
              }
              _hover={
                isDisabled
                  ? { bg: "transparent", boxShadow: "none" }
                  : {
                      bg: "transparent",
                      color: "gray.900",
                      boxShadow:
                        "inset 0 -2px 0 0 var(--chakra-colors-gray-200)",
                    }
              }
              _active={{ bg: "transparent" }}
              _focus={{
                boxShadow: isSelected
                  ? "inset 0 -2px 0 0 var(--chakra-colors-gray-900)"
                  : "none",
              }}
              disabled={isDisabled}
              opacity={isDisabled ? 0.4 : 1}
              cursor={isDisabled ? "not-allowed" : "pointer"}
              pointerEvents={isDisabled ? "none" : "auto"}
            >
              <Text fontSize="sm">{channel.name}</Text>
            </Button>
          );
        })}
      </Flex>

      {/* Row 2: Status Tabs */}
      <Flex
        px={4}
        py={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
        align="center"
        overflowX="auto"
        gap={1}
      >
        {STATUS_TABS.map((statusKey) => {
          const isSelected = status === statusKey;
          return (
            <Button
              key={statusKey}
              variant={isSelected ? "solid" : "ghost"}
              size="sm"
              onClick={() => onStatusChange(statusKey)}
              bg={isSelected ? "gray.100" : "transparent"}
              color={isSelected ? "gray.900" : "gray.500"}
              _hover={{ bg: isSelected ? "gray.100" : "gray.50" }}
              height="auto"
              px={3}
              py={1.5}
              borderRadius="md"
            >
              <Flex align="center" gap={1}>
                <Text fontSize="sm">{statusKey}</Text>
                <Text
                  fontSize="xs"
                  color={isSelected ? "gray.700" : "gray.400"}
                >
                  ({statusCounts[statusKey] ?? 0})
                </Text>
              </Flex>
            </Button>
          );
        })}
      </Flex>

      {/* Row 3: Date Range + Search + Actions */}
      <Flex
        px={4}
        py={3}
        align="center"
        justify="space-between"
        gap={4}
        flexWrap="wrap"
      >
        {/* Left: Date Range */}
        <Flex borderRadius="md" gap={0}>
          {DATE_RANGES.map((range, index) => {
            const isCustom = range === "직접입력";

            const rangeLabel =
              isCustom && customStart && customEnd
                ? formatDisplayRange(customStart, customEnd)
                : null;

            const isSelected = isCustom
              ? dateRange === rangeLabel
              : dateRange === range;

            const isFirst = index === 0;
            const isLast = index === DATE_RANGES.length - 1;

            const buttonLabel =
              isCustom && rangeLabel != null ? rangeLabel : range;

            if (!isCustom) {
              return (
                <Button
                  key={range}
                  variant={isSelected ? "solid" : "outline"}
                  size="sm"
                  bg={isSelected ? "gray.900" : "white"}
                  color={isSelected ? "white" : "gray.700"}
                  borderColor={isSelected ? "gray.900" : "gray.200"}
                  borderLeftRadius={isFirst ? "md" : 0}
                  borderRightRadius={isLast ? "md" : 0}
                  _hover={{
                    bg: isSelected ? "gray.800" : "gray.50",
                  }}
                  height="32px"
                  px={3}
                  onClick={() => {
                    // 직접입력으로 선택된 커스텀 범위가 있다면 먼저 초기화
                    if (customStart || customEnd) {
                      resetCustomRange();
                    }
                    handleDateRangeChange(range);
                  }}
                >
                  {buttonLabel}
                </Button>
              );
            }

            const isInRange = (date: Date): boolean => {
              if (customStart && customEnd) {
                const start = isAfter(customStart, customEnd)
                  ? customEnd
                  : customStart;
                const end = isAfter(customStart, customEnd)
                  ? customStart
                  : customEnd;
                return isAfter(date, start) && isBefore(date, end);
              }
              if (customStart && hoverDate) {
                const start = isAfter(customStart, hoverDate)
                  ? hoverDate
                  : customStart;
                const end = isAfter(customStart, hoverDate)
                  ? customStart
                  : hoverDate;
                return isAfter(date, start) && isBefore(date, end);
              }
              return false;
            };

            const handleDayClick = (date: Date): void => {
              if (!customStart || (customStart && customEnd)) {
                setCustomStart(date);
                setCustomEnd(null);
                setHoverDate(null);
                onDateChange("직접입력");
                return;
              }

              if (customStart && !customEnd) {
                applyCustomRange(customStart, date);
                setHoverDate(null);
              }
            };

            const handleDayHover = (date: Date | null): void => {
              if (customStart && !customEnd) {
                setHoverDate(date);
              }
            };

            const renderMonthLabel = (month: Date): string =>
              formatDateFns(month, "yyyy년 M월");

            const daysInFirstMonth = monthDates.filter((day) =>
              isSameMonth(day, currentMonth),
            );
            const daysInSecondMonth = monthDates.filter((day) =>
              isSameMonth(day, addMonths(currentMonth, 1)),
            );

            const renderMonthGrid = (monthDays: Date[]): React.JSX.Element => {
              const month = monthDays[0] ?? currentMonth;
              const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

              return (
                <Box flex="1">
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    textAlign="center"
                    mb={2}
                  >
                    {renderMonthLabel(month)}
                  </Text>
                  <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
                    {weekdays.map((weekday) => (
                      <Box
                        key={weekday}
                        textAlign="center"
                        fontSize="xs"
                        color="gray.400"
                      >
                        {weekday}
                      </Box>
                    ))}
                  </Grid>
                  <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                    {monthDays.map((day) => {
                      const isStart =
                        customStart && isSameDay(day, customStart);
                      const isEnd = customEnd && isSameDay(day, customEnd);
                      const inRange = isInRange(day);

                      let bg = "white";
                      let color = "gray.700";

                      if (isStart || isEnd) {
                        bg = "gray.900";
                        color = "white";
                      } else if (inRange) {
                        bg = "gray.100";
                      }

                      const isToday = isSameDay(day, new Date());

                      return (
                        <Button
                          key={day.toISOString()}
                          variant="ghost"
                          size="xs"
                          height="28px"
                          onClick={() => handleDayClick(day)}
                          onMouseEnter={() => handleDayHover(day)}
                          onMouseLeave={() => handleDayHover(null)}
                          bg={bg}
                          color={color}
                          _hover={{
                            bg: isStart || isEnd ? "gray.800" : "gray.200",
                          }}
                          fontWeight={isToday ? "semibold" : "normal"}
                        >
                          {formatDateFns(day, "d")}
                        </Button>
                      );
                    })}
                  </Grid>
                </Box>
              );
            };

            return (
              <Popover.Root
                key={range}
                open={customOpen}
                onOpenChange={(details) => {
                  setCustomOpen(details.open);
                  if (details.open && !customStart && !customEnd) {
                    onDateChange("직접입력");
                  }
                }}
              >
                <Popover.Trigger>
                  <Button
                    as="div"
                    variant={isSelected ? "solid" : "outline"}
                    size="sm"
                    bg={isSelected ? "gray.900" : "white"}
                    color={isSelected ? "white" : "gray.700"}
                    borderColor={isSelected ? "gray.900" : "gray.200"}
                    borderLeftRadius={isFirst ? "md" : 0}
                    borderRightRadius={isLast ? "md" : 0}
                    _hover={{
                      bg: isSelected ? "gray.800" : "gray.50",
                    }}
                    height="32px"
                    px={3}
                  >
                    {buttonLabel}
                  </Button>
                </Popover.Trigger>
                <Popover.Positioner>
                  <Popover.Content
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    boxShadow="md"
                    p={3}
                    minW="580px"
                  >
                    <Flex justify="space-between" align="center" mb={3}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setCurrentMonth((prev) => addMonths(prev, -1))
                        }
                      >
                        {"< 이전"}
                      </Button>
                      <Text fontSize="xs" color="gray.500">
                        기간을 선택하세요
                      </Text>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setCurrentMonth((prev) => addMonths(prev, 1))
                        }
                      >
                        {"다음 >"}
                      </Button>
                    </Flex>
                    <Flex gap={4}>
                      {renderMonthGrid(daysInFirstMonth)}
                      {renderMonthGrid(daysInSecondMonth)}
                    </Flex>
                    <Flex justify="flex-end" gap={2} mt={3}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          resetCustomRange();
                          onDateChange("7일");
                        }}
                      >
                        초기화
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setCustomOpen(false)}
                      >
                        닫기
                      </Button>
                    </Flex>
                  </Popover.Content>
                </Popover.Positioner>
              </Popover.Root>
            );
          })}
        </Flex>

        {/* Right: Search */}
        <Flex gap={2} flex="1" justify="flex-end">
          {/* Search */}
          <Box position="relative" minW="260px" maxW="360px" w="100%">
            <Input
              placeholder="주문번호, 상품명, 구매자 검색"
              size="sm"
              pl={8}
              pr={8}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              borderColor="gray.200"
              w="100%"
            />
            <Icon
              as={Search}
              boxSize={4}
              color="gray.400"
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
            />
            {searchValue && (
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
                onClick={handleClearSearch}
              >
                <Icon as={X} boxSize={4} />
              </button>
            )}
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}
