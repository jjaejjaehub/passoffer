"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Check, Link2, Package, Search, X } from "lucide-react";

import {
  useBulkMatchOrderItemSku,
  useMatchOrderItemSku,
  useOrderItemsForMatching,
  useOrders,
  type OrderItemForMatching,
  type OrderListItem,
  type OrderMatchState,
} from "@/entities/order";
import { useSkus } from "@/entities/sku/api/skuQueries";
import type { Sku } from "@/entities/sku/model/types";

type TabKey = "all" | "unmatched" | "partial" | "fully";

const TABS: Array<{
  key: TabKey;
  label: string;
  matchState?: OrderMatchState;
}> = [
  { key: "all", label: "전체" },
  { key: "unmatched", label: "미매칭", matchState: "unmatched" },
  { key: "partial", label: "부분매칭", matchState: "partial" },
  { key: "fully", label: "완전매칭", matchState: "fully" },
];

interface DraftMap {
  [itemId: string]: {
    skuId: string | null;
    skuCode: string | null;
    skuName: string | null;
    outputQty: number;
  };
}

function OrderRow({
  order,
  active,
  onClick,
}: {
  order: OrderListItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      borderLeftWidth={3}
      borderLeftColor={active ? "blue.500" : "transparent"}
      bg={active ? "blue.50" : "white"}
      _hover={{ bg: active ? "blue.50" : "gray.50" }}
      px={3}
      py={2}
      borderBottomWidth={1}
      borderBottomColor="gray.100"
    >
      <Flex justify="space-between" align="center" mb={1}>
        <Text fontSize="sm" fontWeight="600" color="gray.800">
          {order.channelOrderId}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {order.channelId}
        </Text>
      </Flex>
      <Text fontSize="xs" color="gray.600" lineClamp={1}>
        {order.buyerName ?? "-"} · {order.receiverName ?? "-"}
      </Text>
      <Flex mt={1} gap={2}>
        {order.autoMatched === true && (
          <Box
            bg="green.100"
            color="green.700"
            px={1.5}
            fontSize="2xs"
            borderRadius="sm"
          >
            자동매칭
          </Box>
        )}
        {order.autoMatched === false && (
          <Box
            bg="orange.100"
            color="orange.700"
            px={1.5}
            fontSize="2xs"
            borderRadius="sm"
          >
            수동필요
          </Box>
        )}
        {order.matchedBy && (
          <Box
            bg="gray.100"
            color="gray.700"
            px={1.5}
            fontSize="2xs"
            borderRadius="sm"
          >
            {order.matchedBy}
          </Box>
        )}
      </Flex>
    </Box>
  );
}

function InlineSkuPicker({
  onPick,
  onClose,
}: {
  onPick: (sku: Sku) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSkus({
    search: search.trim() || undefined,
    pageSize: 15,
  });
  const items = data?.items ?? [];

  return (
    <Box
      mt={2}
      borderWidth={1}
      borderColor="gray.300"
      borderRadius="md"
      bg="white"
      p={2}
      maxH="320px"
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" gap={2} mb={2}>
        <Box color="gray.400">
          <Search size={14} />
        </Box>
        <Input
          size="sm"
          placeholder="SKU 코드 또는 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X size={14} />
        </Button>
      </Flex>
      <Box overflowY="auto" flex={1}>
        {isLoading ? (
          <Flex justify="center" py={4}>
            <Spinner size="sm" />
          </Flex>
        ) : items.length === 0 ? (
          <Text fontSize="xs" color="gray.500" textAlign="center" py={4}>
            검색 결과 없음
          </Text>
        ) : (
          <Stack gap={0}>
            {items.map((sku) => (
              <Flex
                key={sku.id}
                px={2}
                py={1.5}
                borderBottomWidth={1}
                borderBottomColor="gray.100"
                _hover={{ bg: "blue.50" }}
                cursor="pointer"
                onClick={() => onPick(sku)}
                align="center"
                gap={2}
              >
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color="gray.800"
                    lineClamp={1}
                  >
                    {sku.code}
                  </Text>
                  <Text fontSize="2xs" color="gray.600" lineClamp={1}>
                    {sku.name ?? "-"}
                  </Text>
                </Box>
                <Text fontSize="2xs" color="gray.500">
                  재고 {sku.stock}
                </Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function ItemRow({
  item,
  draft,
  onSetDraft,
  onClearDraft,
  onSaveOne,
  savingOne,
}: {
  item: OrderItemForMatching;
  draft: DraftMap[string] | undefined;
  onSetDraft: (
    skuId: string | null,
    skuCode: string | null,
    skuName: string | null,
    outputQty: number,
  ) => void;
  onClearDraft: () => void;
  onSaveOne: () => void;
  savingOne: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentSkuId = draft ? draft.skuId : item.skuId;
  const currentSkuCode = draft ? draft.skuCode : item.skuCode;
  const currentSkuName = draft ? draft.skuName : item.skuName;
  const currentOutputQty = draft ? draft.outputQty : item.outputQty;

  return (
    <Box
      borderWidth={1}
      borderColor={draft ? "blue.300" : "gray.200"}
      borderRadius="md"
      p={3}
      bg="white"
    >
      <Flex justify="space-between" align="flex-start" gap={3}>
        <Box flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="600" color="gray.800" lineClamp={2}>
            {item.channelItemTitle ?? "(상품명 없음)"}
          </Text>
          <HStack gap={3} mt={1} color="gray.600" fontSize="xs">
            {item.channelItemCode && <Text>코드: {item.channelItemCode}</Text>}
            {item.channelOption && <Text>옵션: {item.channelOption}</Text>}
            <Text>수량: {item.orderQty}</Text>
          </HStack>
        </Box>
      </Flex>

      <Box mt={3} borderTopWidth={1} borderTopColor="gray.100" pt={3}>
        <Flex align="center" gap={2}>
          <Box color="gray.400">
            <Link2 size={14} />
          </Box>
          <Text fontSize="xs" color="gray.600" fontWeight="600">
            매칭된 SKU
          </Text>
          {draft && (
            <Box
              bg="blue.100"
              color="blue.700"
              px={1.5}
              fontSize="2xs"
              borderRadius="sm"
            >
              변경됨
            </Box>
          )}
        </Flex>
        {currentSkuId ? (
          <Flex
            mt={2}
            align="center"
            gap={2}
            bg="gray.50"
            borderRadius="md"
            px={2}
            py={1.5}
          >
            <Box flex={1} minW={0}>
              <Text
                fontSize="xs"
                fontWeight="600"
                color="gray.800"
                lineClamp={1}
              >
                {currentSkuCode ?? "-"}
              </Text>
              <Text fontSize="2xs" color="gray.600" lineClamp={1}>
                {currentSkuName ?? "-"}
              </Text>
            </Box>
            <Flex align="center" gap={1}>
              <Text fontSize="2xs" color="gray.600">
                출고수량
              </Text>
              <Input
                size="xs"
                w="60px"
                type="number"
                min={0}
                value={currentOutputQty}
                onChange={(e) =>
                  onSetDraft(
                    currentSkuId,
                    currentSkuCode,
                    currentSkuName,
                    Number(e.target.value) || 0,
                  )
                }
              />
            </Flex>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => onSetDraft(null, null, null, 0)}
            >
              <X size={12} />
            </Button>
          </Flex>
        ) : (
          <Text fontSize="xs" color="gray.500" mt={2}>
            매칭 없음
          </Text>
        )}

        <Flex mt={2} gap={2}>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Search size={12} />
            <Box ml={1}>SKU 선택</Box>
          </Button>
          {draft && (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={onClearDraft}
                disabled={savingOne}
              >
                되돌리기
              </Button>
              <Button
                size="xs"
                colorPalette="blue"
                onClick={onSaveOne}
                loading={savingOne}
              >
                <Check size={12} />
                <Box ml={1}>저장</Box>
              </Button>
            </>
          )}
        </Flex>

        {pickerOpen && (
          <InlineSkuPicker
            onPick={(sku) => {
              onSetDraft(sku.id, sku.code, sku.name, item.orderQty);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </Box>
    </Box>
  );
}

export default function SkuMatchingPage() {
  const [tab, setTab] = useState<TabKey>("unmatched");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [draftMap, setDraftMap] = useState<DraftMap>({});

  const matchState = TABS.find((t) => t.key === tab)?.matchState;
  const {
    items: orders,
    total,
    isLoading: ordersLoading,
  } = useOrders({
    matchState,
    page: 1,
    pageSize: 100,
    sortBy: "orderedAt",
    sortDir: "desc",
  });

  const { data: itemsData, isLoading: itemsLoading } =
    useOrderItemsForMatching(selectedOrderId);
  const items = itemsData?.items ?? [];

  const matchOne = useMatchOrderItemSku();
  const matchBulk = useBulkMatchOrderItemSku();

  const draftCount = useMemo(
    () =>
      Object.keys(draftMap).filter((k) => items.some((i) => i.id === k)).length,
    [draftMap, items],
  );

  function setDraft(
    itemId: string,
    skuId: string | null,
    skuCode: string | null,
    skuName: string | null,
    outputQty: number,
  ) {
    setDraftMap((prev) => ({
      ...prev,
      [itemId]: { skuId, skuCode, skuName, outputQty },
    }));
  }

  function clearDraft(itemId: string) {
    setDraftMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  async function saveOne(itemId: string) {
    if (!selectedOrderId) return;
    const draft = draftMap[itemId];
    if (!draft) return;
    await matchOne.mutateAsync({
      orderId: selectedOrderId,
      itemId,
      skuId: draft.skuId,
      outputQty: draft.outputQty,
    });
    clearDraft(itemId);
  }

  async function saveAll() {
    if (!selectedOrderId) return;
    const drafts = Object.entries(draftMap).filter(([k]) =>
      items.some((i) => i.id === k),
    );
    if (drafts.length === 0) return;
    await matchBulk.mutateAsync({
      items: drafts.map(([itemId, d]) => ({
        orderId: selectedOrderId,
        itemId,
        skuId: d.skuId,
        outputQty: d.outputQty,
      })),
    });
    setDraftMap((prev) => {
      const next = { ...prev };
      for (const [k] of drafts) delete next[k];
      return next;
    });
  }

  return (
    <Flex direction="column" h="calc(100vh - 64px)" bg="gray.50">
      {/* Top tabs */}
      <Flex
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="gray.200"
        px={6}
        py={3}
        align="center"
        gap={6}
      >
        <Text fontSize="lg" fontWeight="700" color="gray.800">
          SKU 매칭
        </Text>
        <HStack gap={1}>
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "solid" : "ghost"}
              colorPalette={tab === t.key ? "blue" : "gray"}
              onClick={() => {
                setTab(t.key);
                setSelectedOrderId(null);
                setDraftMap({});
              }}
            >
              {t.label}
            </Button>
          ))}
        </HStack>
        <Box ml="auto">
          <Text fontSize="xs" color="gray.500">
            전체 {total}건
          </Text>
        </Box>
      </Flex>

      {/* Workspace */}
      <Flex flex={1} minH={0}>
        {/* Left: orders list */}
        <Flex
          direction="column"
          w="380px"
          borderRightWidth={1}
          borderRightColor="gray.200"
          bg="white"
          minH={0}
        >
          <Box
            px={3}
            py={2}
            borderBottomWidth={1}
            borderBottomColor="gray.100"
            bg="gray.50"
          >
            <Text fontSize="xs" color="gray.600" fontWeight="600">
              주문 목록 ({orders.length})
            </Text>
          </Box>
          <Box flex={1} overflowY="auto">
            {ordersLoading ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : orders.length === 0 ? (
              <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
                해당 탭에 주문이 없습니다
              </Text>
            ) : (
              orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  active={o.id === selectedOrderId}
                  onClick={() => {
                    setSelectedOrderId(o.id);
                    setDraftMap({});
                  }}
                />
              ))
            )}
          </Box>
        </Flex>

        {/* Right: items + sku picker */}
        <Flex direction="column" flex={1} minH={0}>
          {!selectedOrderId ? (
            <Flex
              flex={1}
              align="center"
              justify="center"
              color="gray.500"
              gap={2}
            >
              <Package size={18} />
              <Text fontSize="sm">왼쪽에서 주문을 선택하세요</Text>
            </Flex>
          ) : (
            <>
              <Flex
                px={6}
                py={3}
                borderBottomWidth={1}
                borderBottomColor="gray.200"
                bg="white"
                align="center"
                gap={3}
              >
                <Text fontSize="sm" fontWeight="600" color="gray.800">
                  라인아이템 {items.length}건
                </Text>
                <Box ml="auto">
                  {draftCount > 0 && (
                    <Button
                      size="sm"
                      colorPalette="blue"
                      onClick={saveAll}
                      loading={matchBulk.isPending}
                    >
                      <Check size={14} />
                      <Box ml={1}>변경된 {draftCount}건 일괄 저장</Box>
                    </Button>
                  )}
                </Box>
              </Flex>
              <Box flex={1} overflowY="auto" px={6} py={4}>
                {itemsLoading ? (
                  <Flex justify="center" py={8}>
                    <Spinner />
                  </Flex>
                ) : items.length === 0 ? (
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textAlign="center"
                    py={8}
                  >
                    라인아이템 없음
                  </Text>
                ) : (
                  <Stack gap={3}>
                    {items.map((it) => (
                      <ItemRow
                        key={it.id}
                        item={it}
                        draft={draftMap[it.id]}
                        onSetDraft={(skuId, skuCode, skuName, outputQty) =>
                          setDraft(it.id, skuId, skuCode, skuName, outputQty)
                        }
                        onClearDraft={() => clearDraft(it.id)}
                        onSaveOne={() => saveOne(it.id)}
                        savingOne={matchOne.isPending}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
