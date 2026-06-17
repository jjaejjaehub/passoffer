"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  chakra,
  Flex,
  HStack,
  Switch,
  Text,
} from "@chakra-ui/react";

const ChakraButton = chakra("button");
const ChakraTd = chakra("td");
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";

const ROW_HEIGHT = 36;
import {
  type ChannelId,
  DEFAULT_COLUMN_ORDER,
  type DefaultColumnKey,
  type FulfillmentRank,
  LS_KEYS,
  PAGE_SIZE_OPTIONS,
  type PageSize,
  SORTABLE_FIELDS,
  type SortableField,
} from "@/shared/config";
import { useLocalStoragePref } from "@/shared/lib";
import type { OrderListItem, OrderListParams } from "@/entities/order";

interface OrderTableV2Props {
  items: OrderListItem[];
  total: number;
  isLoading?: boolean;
  params: OrderListParams;
  onParamsChange: (next: OrderListParams) => void;
  onRowClick?: (row: OrderListItem) => void;
}

// 65필드 전체 노출용 컬럼 키 (OrderListItem 키 그대로 사용 — id 등 일부 제외)
const ALL_FIELD_KEYS: (keyof OrderListItem)[] = [
  "channelId",
  "channelOrderId",
  "channelPackNo",
  "channelItemNo",
  "channelAccountId",
  "relatedOrders",
  "buyerName",
  "buyerKana",
  "buyerTel",
  "buyerMobile",
  "buyerEmail",
  "buyerLanguage",
  "receiverName",
  "receiverKana",
  "receiverTel",
  "receiverMobile",
  "receiverEmail",
  "zipCode",
  "shippingAddress",
  "address1",
  "address2",
  "receiverCountry",
  "desiredDeliveryDate",
  "senderName",
  "senderTel",
  "senderNation",
  "senderZipCode",
  "senderAddress",
  "orderedAt",
  "paidAt",
  "paymentMethod",
  "currency",
  "orderPrice",
  "discount",
  "cartDiscountSeller",
  "cartDiscountChannel",
  "total",
  "shippingWay",
  "shippingMessage",
  "shippingRate",
  "shippingRateType",
  "shippingDueDate",
  "shippedAt",
  "deliveredAt",
  "trackingCarrier",
  "trackingNo",
  "trackingConflict",
  "fulfillmentStatus",
  "claimStatus",
  "displayStatus",
  "isDispatchDelayed",
  "dispatchHoldReason",
  "syncLocked",
  "holdStatus",
  "heldFromStatus",
  "claimType",
  "claimReason",
  "claimRequestedAt",
  "claimResolvedAt",
  "returnTrackingNo",
  "bundleNumber",
  "bundleable",
  "bundleRoleIsPrimary",
  "autoMatched",
  "matchedBy",
  "createdAt",
  "updatedAt",
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

function formatMoney(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString();
}

function formatCell(key: keyof OrderListItem, row: OrderListItem): string {
  const v = row[key];
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "—";
  if (typeof v === "object") return "—";
  return String(v);
}

export function OrderTableV2({
  items,
  total,
  isLoading,
  params,
  onParamsChange,
  onRowClick,
}: OrderTableV2Props): React.JSX.Element {
  const t = useTranslations("widgets.orderTableV2");
  const tCols = useTranslations("config.orderColumns");
  const tFulfillment = useTranslations("config.fulfillmentRank");
  const tSortFields = useTranslations("config.sortFields");
  const tChannels = useTranslations("config.channels");
  const [pageSize, setPageSize] = useLocalStoragePref<PageSize>(
    LS_KEYS.pageSize,
    (params.pageSize as PageSize) ?? 100,
  );
  const [exposeAll65, setExposeAll65] = useLocalStoragePref<boolean>(
    LS_KEYS.exposeAll65,
    false,
  );
  const [columnOrder, setColumnOrder] = useLocalStoragePref<string[]>(
    LS_KEYS.columnOrder,
    [...DEFAULT_COLUMN_ORDER],
  );

  const [showSortMenu, setShowSortMenu] = useState(false);

  // 페이지 사이즈 동기화 (localStorage → params)
  useEffect(() => {
    if (params.pageSize !== pageSize) {
      onParamsChange({ ...params, pageSize, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // 컬럼 정의 — 기본 모드 OR 65필드 모드
  const columns = useMemo<ColumnDef<OrderListItem>[]>(() => {
    if (exposeAll65) {
      return ALL_FIELD_KEYS.map((key) => ({
        id: String(key),
        header: String(key),
        accessorFn: (row) => row[key],
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.700" lineClamp={1}>
            {formatCell(key, row.original)}
          </Text>
        ),
      }));
    }

    const defs: Record<DefaultColumnKey, ColumnDef<OrderListItem>> = {
      orderedAt: {
        id: "orderedAt",
        header: tCols("orderedAt"),
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.700">
            {formatDate(row.original.orderedAt)}
          </Text>
        ),
      },
      channelId: {
        id: "channelId",
        header: tCols("channelId"),
        cell: ({ row }) => {
          const id = row.original.channelId as ChannelId;
          let name: string = id;
          try {
            name = tChannels(`${id}.name`);
          } catch {
            name = id;
          }
          return (
            <Text fontSize="xs" color="gray.700">
              {name}
            </Text>
          );
        },
      },
      channelOrderId: {
        id: "channelOrderId",
        header: tCols("channelOrderId"),
        cell: ({ row }) => (
          <Text fontSize="xs" fontWeight="medium" color="gray.800">
            {row.original.channelOrderId}
          </Text>
        ),
      },
      buyerName: {
        id: "buyerName",
        header: tCols("buyerName"),
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.700">
            {row.original.buyerName ?? "—"}
          </Text>
        ),
      },
      productSummary: {
        id: "productSummary",
        header: tCols("productSummary"),
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.700" lineClamp={1}>
            {row.original.channelItemNo ?? "—"}
          </Text>
        ),
      },
      total: {
        id: "total",
        header: tCols("total"),
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.800" textAlign="right">
            {formatMoney(row.original.total)}
          </Text>
        ),
      },
      fulfillmentStatus: {
        id: "fulfillmentStatus",
        header: tCols("fulfillmentStatus"),
        cell: ({ row }) => {
          const rank = row.original.fulfillmentStatus as FulfillmentRank;
          let label: string = String(rank);
          try {
            label = tFulfillment(String(rank));
          } catch {
            label = String(rank);
          }
          return (
            <Text fontSize="xs" color="gray.700">
              {label}
            </Text>
          );
        },
      },
      trackingNo: {
        id: "trackingNo",
        header: tCols("trackingNo"),
        cell: ({ row }) => (
          <Text fontSize="xs" color="gray.600">
            {row.original.trackingNo ?? "—"}
          </Text>
        ),
      },
    };

    const ordered = columnOrder
      .filter((k): k is DefaultColumnKey => k in defs)
      .map((k) => defs[k]);
    // 누락된 기본 컬럼 보강 (사용자가 한 번도 reorder 한 적 없거나 새 컬럼 추가 시)
    for (const k of DEFAULT_COLUMN_ORDER) {
      if (!columnOrder.includes(k)) ordered.push(defs[k]);
    }
    return ordered;
  }, [exposeAll65, columnOrder, tCols, tChannels, tFulfillment]);

  const table = useReactTable<OrderListItem>({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── 가상 스크롤 (1000+ 행 렌더 비용 감소)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalHeight - virtualItems[virtualItems.length - 1].end
      : 0;

  // ── 헤더 드래그 reorder (기본 모드 전용)
  const dragKey = useRef<string | null>(null);
  function onHeaderDragStart(key: string): void {
    dragKey.current = key;
  }
  function onHeaderDragOver(e: React.DragEvent): void {
    e.preventDefault();
  }
  function onHeaderDrop(targetKey: string): void {
    const from = dragKey.current;
    dragKey.current = null;
    if (!from || from === targetKey) return;
    const next = [...columnOrder];
    const fromIdx = next.indexOf(from);
    const toIdx = next.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
    setColumnOrder(next);
  }

  // ── 정렬 메뉴
  function applySort(field: SortableField): void {
    const sameField = params.sortBy === field;
    const nextDir: "asc" | "desc" = sameField
      ? params.sortDir === "asc"
        ? "desc"
        : "asc"
      : "desc";
    onParamsChange({ ...params, sortBy: field, sortDir: nextDir, page: 1 });
    setShowSortMenu(false);
  }

  // ── 페이지네이션
  const page = params.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  function goPage(p: number): void {
    const safe = Math.max(1, Math.min(totalPages, p));
    if (safe === page) return;
    onParamsChange({ ...params, page: safe });
  }

  return (
    <Box bg="white" borderWidth="1px" borderRadius="md" overflow="hidden">
      {/* 도구 행 */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderBottomWidth="1px"
        borderColor="gray.100"
      >
        <HStack gap={2}>
          <Text fontSize="xs" color="gray.500">
            {t("totalCount", { count: total })}
          </Text>
          {params.sortBy && (
            <Text fontSize="xs" color="gray.400">
              {t("sortPrefix", {
                field: tSortFields(params.sortBy as SortableField),
                dir: params.sortDir ?? "desc",
              })}
            </Text>
          )}
        </HStack>

        <HStack gap={3}>
          {/* 65필드 토글 */}
          <Flex align="center" gap={1.5}>
            <Text fontSize="xs" color="gray.600">
              {t("exposeAll65")}
            </Text>
            <Switch.Root
              size="sm"
              checked={exposeAll65}
              onCheckedChange={(e) => setExposeAll65(e.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </Flex>

          {/* 데이터 정렬 메뉴 */}
          <Box position="relative">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowSortMenu((v) => !v)}
            >
              {t("sortMenu")}
            </Button>
            {showSortMenu && (
              <Box
                position="absolute"
                right={0}
                top="calc(100% + 4px)"
                bg="white"
                borderWidth="1px"
                borderRadius="md"
                boxShadow="md"
                zIndex={10}
                minW="160px"
                py={1}
              >
                {SORTABLE_FIELDS.map((field) => {
                  const active = params.sortBy === field;
                  const dir = active ? params.sortDir ?? "desc" : null;
                  return (
                    <ChakraButton
                      key={field}
                      type="button"
                      onClick={() => applySort(field)}
                      w="full"
                      textAlign="left"
                      px={3}
                      py={1.5}
                      fontSize="xs"
                      color={active ? "blue.600" : "gray.700"}
                      bg={active ? "blue.50" : "transparent"}
                      _hover={{ bg: "gray.50" }}
                    >
                      {tSortFields(field)}
                      {dir && (
                        <Text as="span" ml={1} color="gray.400">
                          ({dir})
                        </Text>
                      )}
                    </ChakraButton>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* 페이지 사이즈 */}
          <Flex align="center" gap={1}>
            <Text fontSize="xs" color="gray.500">
              {t("pageSizeLabel")}
            </Text>
            <select
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value) as PageSize;
                setPageSize(v);
                onParamsChange({ ...params, pageSize: v, page: 1 });
              }}
              style={{
                height: 26,
                padding: "0 6px",
                borderRadius: 4,
                border: "1px solid var(--chakra-colors-gray-200)",
                fontSize: 12,
                background: "white",
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Flex>
        </HStack>
      </Flex>

      {/* 테이블 — 가상 스크롤 컨테이너 */}
      <Box
        ref={scrollRef}
        overflowX="auto"
        overflowY="auto"
        maxH="calc(100vh - 360px)"
      >
        <Box
          as="table"
          w="full"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box as="thead" bg="gray.50" position="sticky" top={0} zIndex={1}>
            {table.getHeaderGroups().map((hg) => (
              <Box as="tr" key={hg.id}>
                {hg.headers.map((header) => {
                  const key = header.column.id;
                  const draggable = !exposeAll65;
                  return (
                    <Box
                      as="th"
                      key={header.id}
                      draggable={draggable}
                      onDragStart={
                        draggable ? () => onHeaderDragStart(key) : undefined
                      }
                      onDragOver={draggable ? onHeaderDragOver : undefined}
                      onDrop={draggable ? () => onHeaderDrop(key) : undefined}
                      px={3}
                      py={2}
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.600"
                      textAlign="left"
                      borderBottomWidth="1px"
                      borderColor="gray.200"
                      whiteSpace="nowrap"
                      cursor={draggable ? "grab" : "default"}
                      userSelect="none"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
          <Box as="tbody">
            {isLoading && rows.length === 0 && (
              <Box as="tr">
                <ChakraTd
                  colSpan={columns.length}
                  py={10}
                  textAlign="center"
                  color="gray.400"
                  fontSize="sm"
                >
                  {t("loading")}
                </ChakraTd>
              </Box>
            )}
            {!isLoading && rows.length === 0 && (
              <Box as="tr">
                <ChakraTd
                  colSpan={columns.length}
                  py={10}
                  textAlign="center"
                  color="gray.400"
                  fontSize="sm"
                >
                  {t("empty")}
                </ChakraTd>
              </Box>
            )}
            {paddingTop > 0 && (
              <Box as="tr" style={{ height: `${paddingTop}px` }}>
                <ChakraTd colSpan={columns.length} p={0} border="none" />
              </Box>
            )}
            {virtualItems.map((vi) => {
              const row = rows[vi.index];
              return (
                <Box
                  as="tr"
                  key={row.id}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  onClick={() => onRowClick?.(row.original)}
                  cursor={onRowClick ? "pointer" : "default"}
                  _hover={{ bg: "gray.50" }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Box
                      as="td"
                      key={cell.id}
                      px={3}
                      py={2}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                      whiteSpace="nowrap"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Box>
                  ))}
                </Box>
              );
            })}
            {paddingBottom > 0 && (
              <Box as="tr" style={{ height: `${paddingBottom}px` }}>
                <ChakraTd colSpan={columns.length} p={0} border="none" />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* 페이지네이션 */}
      <Flex
        align="center"
        justify="space-between"
        px={3}
        py={2}
        borderTopWidth="1px"
        borderColor="gray.100"
      >
        <Text fontSize="xs" color="gray.500">
          {t("pageLabel", { page, total: totalPages })}
        </Text>
        <HStack gap={1}>
          <Button
            size="xs"
            variant="outline"
            onClick={() => goPage(1)}
            disabled={page === 1}
          >
            «
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => goPage(page - 1)}
            disabled={page === 1}
          >
            ‹
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
          >
            ›
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => goPage(totalPages)}
            disabled={page >= totalPages}
          >
            »
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
