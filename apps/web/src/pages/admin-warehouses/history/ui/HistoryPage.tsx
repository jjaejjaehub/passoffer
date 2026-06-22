"use client";

import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { HistoryEvent, MovementType } from "@oms/types";
import { useWarehouseHistory } from "@/entities/warehouse";
import { useDebouncedValue } from "@/shared/lib";
import { EmptyState, LoadingState } from "@/shared/ui";
import {
  ALL_MOVEMENT_TYPES,
  HistoryEventDetailDrawer,
  HistoryFilterBar,
  HistoryTimeline,
  WarehouseSelector,
  useSelectedWarehouseId,
} from "@/widgets/admin-warehouses";

const PAGE_SIZE_DAYS = 5;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

export function HistoryPage(): ReactElement {
  const { warehouseId } = useSelectedWarehouseId();
  const initial = useMemo(defaultRange, []);

  const [startDate, setStartDate] = useState<string>(initial.startDate);
  const [endDate, setEndDate] = useState<string>(initial.endDate);
  const [selectedTypes, setSelectedTypes] = useState<Set<MovementType>>(
    () => new Set(ALL_MOVEMENT_TYPES),
  );
  const [search, setSearch] = useState<string>("");
  const [openEvent, setOpenEvent] = useState<HistoryEvent | null>(null);
  const [visibleDateCount, setVisibleDateCount] =
    useState<number>(PAGE_SIZE_DAYS);

  const debouncedSearch = useDebouncedValue(search, 300);

  const range = useMemo(
    () =>
      startDate !== "" && endDate !== "" && startDate <= endDate
        ? { startDate, endDate }
        : undefined,
    [startDate, endDate],
  );

  const historyQuery = useWarehouseHistory(warehouseId ?? undefined, range);

  const filtered = useMemo(() => {
    const events = historyQuery.data ?? [];
    const term = debouncedSearch.trim().toLowerCase();
    return events.filter((ev) => {
      if (!selectedTypes.has(ev.type)) return false;
      if (term !== "" && !ev.sku.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [historyQuery.data, selectedTypes, debouncedSearch]);

  const distinctDates = useMemo(() => {
    const set = new Set<string>();
    for (const ev of filtered) set.add(ev.occurredAt.slice(0, 10));
    return set.size;
  }, [filtered]);

  const handleToggleType = (type: MovementType): void => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      if (next.size === 0) return new Set(ALL_MOVEMENT_TYPES);
      return next;
    });
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const handleSelectAllTypes = (): void => {
    setSelectedTypes(new Set(ALL_MOVEMENT_TYPES));
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const handleResetRange = (): void => {
    const r = defaultRange();
    setStartDate(r.startDate);
    setEndDate(r.endDate);
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const handleStartDateChange = (value: string): void => {
    setStartDate(value);
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const handleEndDateChange = (value: string): void => {
    setEndDate(value);
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const handleSearchChange = (value: string): void => {
    setSearch(value);
    setVisibleDateCount(PAGE_SIZE_DAYS);
  };

  const canLoadMore = visibleDateCount < distinctDates;

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">재고 이력</Heading>
        <WarehouseSelector />
      </Flex>

      {warehouseId === null ? (
        <EmptyState
          title="창고를 선택해주세요"
          description="우측 상단에서 창고를 선택하면 재고 이력이 표시됩니다."
        />
      ) : (
        <Stack gap={4}>
          <HistoryFilterBar
            selectedTypes={selectedTypes}
            onToggleType={handleToggleType}
            onSelectAllTypes={handleSelectAllTypes}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            search={search}
            onSearchChange={handleSearchChange}
            onResetRange={handleResetRange}
          />

          {range === undefined ? (
            <EmptyState
              title="기간을 선택해주세요"
              description="시작일과 종료일이 모두 필요합니다."
            />
          ) : historyQuery.isLoading ? (
            <LoadingState rows={6} />
          ) : historyQuery.isError ? (
            <EmptyState
              title="이력을 불러오지 못했습니다"
              description="잠시 후 다시 시도해 주세요."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="조건에 맞는 이력이 없습니다"
              description="필터를 변경하거나 기간을 늘려 보세요."
            />
          ) : (
            <Stack gap={4}>
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" color="gray.500">
                  총 {filtered.length.toLocaleString()}건 · {distinctDates}일치
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {Math.min(visibleDateCount, distinctDates)} / {distinctDates}
                  일 표시
                </Text>
              </Flex>
              <HistoryTimeline
                events={filtered}
                onSelect={setOpenEvent}
                visibleDateCount={visibleDateCount}
              />
              {canLoadMore ? (
                <Flex justify="center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setVisibleDateCount((c) => c + PAGE_SIZE_DAYS)
                    }
                  >
                    더 보기 ({distinctDates - visibleDateCount}일 남음)
                  </Button>
                </Flex>
              ) : null}
            </Stack>
          )}
        </Stack>
      )}

      <HistoryEventDetailDrawer
        event={openEvent}
        onClose={() => setOpenEvent(null)}
      />
    </Box>
  );
}
