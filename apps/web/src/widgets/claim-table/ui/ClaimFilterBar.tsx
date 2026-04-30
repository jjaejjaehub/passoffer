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

import { CHANNEL_CONFIG, LIVE_CHANNELS } from "@/shared/config";
import type { ChannelId } from "@/shared/config";

export type ClaimStatusFilter =
  | "전체"
  | "취소요청"
  | "취소중"
  | "취소완료"
  | "반품요청"
  | "반품중"
  | "반품완료"
  | "교환신청"
  | "교환승인"
  | "재배송중"
  | "미수취환불"
  | "미납취소";

export const CLAIM_STATUS_TABS: ClaimStatusFilter[] = [
  "전체",
  "취소요청",
  "취소중",
  "취소완료",
  "반품요청",
  "반품중",
  "반품완료",
  "교환신청",
  "교환승인",
  "재배송중",
  "미수취환불",
  "미납취소",
];

// 필터 탭 → Qoo10 ClaimStat 코드
export const CLAIM_STATUS_CODE: Record<ClaimStatusFilter, string> = {
  전체: "",
  취소요청: "1",
  취소중: "2",
  취소완료: "3",
  반품요청: "4",
  반품중: "5",
  반품완료: "6",
  교환신청: "11",
  교환승인: "12",
  재배송중: "13",
  미수취환불: "14",
  미납취소: "16",
};

type DateRange = "오늘" | "7일" | "30일" | "직접입력";
const DATE_RANGES: DateRange[] = ["오늘", "7일", "30일", "직접입력"];

interface ClaimFilterBarProps {
  channelId: ChannelId | "all";
  status: ClaimStatusFilter;
  dateRange: string;
  search: string;
  statusCounts: Record<string, number>;
  onChannelChange: (id: ChannelId | "all") => void;
  onStatusChange: (status: ClaimStatusFilter) => void;
  onDateChange: (range: string) => void;
  onSearchChange: (value: string) => void;
}

export function ClaimFilterBar({
  channelId,
  status,
  dateRange,
  search,
  statusCounts,
  onChannelChange,
  onStatusChange,
  onDateChange,
  onSearchChange,
}: ClaimFilterBarProps): React.JSX.Element {
  const [searchValue, setSearchValue] = useState<string>(search);
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchValue !== search) onSearchChange(searchValue);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchValue, search, onSearchChange]);

  const formatDisplayRange = (start: Date, end: Date): string => {
    const fmt = (d: Date) => formatDateFns(d, "yyyy.MM.dd");
    return `${fmt(start)} ~ ${fmt(end)}`;
  };

  const resetCustomRange = (): void => {
    setCustomStart(null);
    setCustomEnd(null);
    setHoverDate(null);
    setCurrentMonth(startOfMonth(new Date()));
    setCustomOpen(false);
  };

  const applyCustomRange = (start: Date, end: Date): void => {
    const s = isAfter(start, end) ? end : start;
    const e = isAfter(start, end) ? start : end;
    onDateChange(formatDisplayRange(s, e));
    setCustomStart(s);
    setCustomEnd(e);
    setCustomOpen(false);
  };

  const monthDates = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(addMonths(currentMonth, 1)), {
      weekStartsOn: 0,
    });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const isInRange = (date: Date): boolean => {
    if (customStart && customEnd) {
      const s = isAfter(customStart, customEnd) ? customEnd : customStart;
      const e = isAfter(customStart, customEnd) ? customStart : customEnd;
      return isAfter(date, s) && isBefore(date, e);
    }
    if (customStart && hoverDate) {
      const s = isAfter(customStart, hoverDate) ? hoverDate : customStart;
      const e = isAfter(customStart, hoverDate) ? customStart : hoverDate;
      return isAfter(date, s) && isBefore(date, e);
    }
    return false;
  };

  const renderMonthGrid = (monthDays: Date[]): React.JSX.Element => {
    const month = monthDays[0] ?? currentMonth;
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return (
      <Box flex="1">
        <Text fontSize="sm" fontWeight="medium" textAlign="center" mb={2}>
          {formatDateFns(month, "yyyy년 M월")}
        </Text>
        <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
          {weekdays.map((d) => (
            <Box key={d} textAlign="center" fontSize="xs" color="gray.400">
              {d}
            </Box>
          ))}
        </Grid>
        <Grid templateColumns="repeat(7, 1fr)" gap={1}>
          {monthDays.map((day) => {
            const isStart = customStart && isSameDay(day, customStart);
            const isEnd = customEnd && isSameDay(day, customEnd);
            const inRange = isInRange(day);
            const bg =
              isStart || isEnd ? "gray.900" : inRange ? "gray.100" : "white";
            const color = isStart || isEnd ? "white" : "gray.700";
            return (
              <Button
                key={day.toISOString()}
                variant="ghost"
                size="xs"
                height="28px"
                bg={bg}
                color={color}
                _hover={{ bg: isStart || isEnd ? "gray.800" : "gray.200" }}
                fontWeight={isSameDay(day, new Date()) ? "semibold" : "normal"}
                onClick={() => {
                  if (!customStart || (customStart && customEnd)) {
                    setCustomStart(day);
                    setCustomEnd(null);
                    setHoverDate(null);
                    onDateChange("직접입력");
                    return;
                  }
                  applyCustomRange(customStart, day);
                  setHoverDate(null);
                }}
                onMouseEnter={() => {
                  if (customStart && !customEnd) setHoverDate(day);
                }}
                onMouseLeave={() => {
                  if (customStart && !customEnd) setHoverDate(null);
                }}
              >
                {formatDateFns(day, "d")}
              </Button>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const channelTabs = LIVE_CHANNELS.filter((ch) =>
    (["qoo10", "rakuten", "shopify"] as const).includes(ch.id as "qoo10" | "rakuten" | "shopify"),
  ).map((ch) => ({ id: ch.id, name: ch.name }));

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
    >
      {/* Row 0: 채널 탭 */}
      <Flex
        px={4}
        pt={3}
        pb={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
        align="center"
        gap={1}
      >
        {channelTabs.map((ch) => {
          const isSelected = channelId === ch.id;
          const isDisabled = CHANNEL_CONFIG[ch.id as ChannelId]?.isLive === false;
          return (
            <Button
              key={ch.id}
              variant="ghost"
              size="sm"
              onClick={isDisabled ? undefined : () => onChannelChange(ch.id)}
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
              <Text fontSize="sm">{ch.name}</Text>
            </Button>
          );
        })}
      </Flex>

      {/* Row 1: 클레임 상태 탭 (Shopify 채널에서는 숨김) */}
      {channelId !== "shopify" && <Flex
        px={4}
        py={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
        align="center"
        overflowX="auto"
        gap={1}
      >
        {CLAIM_STATUS_TABS.map((tab) => {
          const isSelected = status === tab;
          return (
            <Button
              key={tab}
              variant={isSelected ? "solid" : "ghost"}
              size="sm"
              onClick={() => onStatusChange(tab)}
              bg={isSelected ? "gray.100" : "transparent"}
              color={isSelected ? "gray.900" : "gray.500"}
              _hover={{ bg: isSelected ? "gray.100" : "gray.50" }}
              height="auto"
              px={3}
              py={1.5}
              borderRadius="md"
              flexShrink={0}
            >
              <Flex align="center" gap={1}>
                <Text fontSize="sm">{tab}</Text>
                {statusCounts[tab] !== undefined && (
                  <Text
                    fontSize="xs"
                    color={isSelected ? "gray.700" : "gray.400"}
                  >
                    ({statusCounts[tab]})
                  </Text>
                )}
              </Flex>
            </Button>
          );
        })}
      </Flex>}

      {/* Row 2: 날짜 범위 + 검색 (Shopify에서는 날짜 범위 숨김) */}
      <Flex
        px={4}
        py={3}
        align="center"
        justify="space-between"
        gap={4}
        flexWrap="wrap"
      >
        {/* 날짜 범위 버튼 (Shopify에서는 숨김) */}
        {channelId !== "shopify" && <Flex borderRadius="md" gap={0}>
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
            const buttonLabel = isCustom && rangeLabel ? rangeLabel : range;

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
                  _hover={{ bg: isSelected ? "gray.800" : "gray.50" }}
                  height="32px"
                  px={3}
                  onClick={() => {
                    if (customStart || customEnd) resetCustomRange();
                    onDateChange(range);
                  }}
                >
                  {buttonLabel}
                </Button>
              );
            }

            return (
              <Popover.Root
                key={range}
                open={customOpen}
                onOpenChange={(details) => {
                  setCustomOpen(details.open);
                  if (details.open && !customStart && !customEnd)
                    onDateChange("직접입력");
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
                    _hover={{ bg: isSelected ? "gray.800" : "gray.50" }}
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
                      {renderMonthGrid(
                        monthDates.filter((d) => isSameMonth(d, currentMonth)),
                      )}
                      {renderMonthGrid(
                        monthDates.filter((d) =>
                          isSameMonth(d, addMonths(currentMonth, 1)),
                        ),
                      )}
                    </Flex>
                    <Flex justify="flex-end" gap={2} mt={3}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          resetCustomRange();
                          onDateChange("30일");
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
        </Flex>}

        {/* 검색 */}
        <Flex gap={2} flex="1" justify="flex-end">
          <Box position="relative" minW="260px" maxW="360px" w="100%">
            <Input
              placeholder="주문번호, 상품명, 구매자 검색"
              size="sm"
              pl={8}
              pr={8}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
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
                onClick={() => {
                  setSearchValue("");
                  onSearchChange("");
                }}
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
