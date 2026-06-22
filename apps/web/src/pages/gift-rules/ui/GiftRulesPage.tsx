"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Gift, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";

import { useChannels } from "@/entities/channel";
import {
  useCreateGiftRule,
  useDeleteGiftRule,
  useDeleteManyGiftRules,
  useDistributeGiftsManually,
  useGiftRules,
  useToggleGiftRule,
  useUpdateGiftRule,
  type GiftConditionType,
  type GiftDistributionMode,
} from "@/entities/gift-rule";
import {
  GiftRuleFormModal,
  draftToCreateInput,
  emptyGiftDraft,
  giftRuleToDraft,
  type GiftRuleDraft,
} from "@/features/gift-rule-form";

type ActiveFilter = "all" | "active" | "inactive";
type DistFilter = "all" | GiftDistributionMode;
type CondFilter = "all" | GiftConditionType;

function conditionLabel(t: GiftConditionType): string {
  return t === "all"
    ? "전체주문"
    : t === "sku"
      ? "SKU 포함"
      : t === "category"
        ? "카테고리"
        : t === "amount"
          ? "주문금액"
          : "주문수량";
}

function conditionSummary(rule: {
  conditionType: GiftConditionType;
  conditionCurrency: string | null;
  conditionMinAmount: string | number | null;
  conditionMinQty: number | null;
  conditionPayload: { skuIds?: string[]; categoryIds?: string[] };
}): string {
  switch (rule.conditionType) {
    case "all":
      return "전체주문";
    case "sku":
      return `SKU ${rule.conditionPayload?.skuIds?.length ?? 0}개`;
    case "category":
      return `카테고리 ${rule.conditionPayload?.categoryIds?.length ?? 0}개`;
    case "amount":
      return `${rule.conditionCurrency ?? ""} ${rule.conditionMinAmount ?? 0} 이상`;
    case "qty":
      return `${rule.conditionMinQty ?? 0}개 이상`;
    default:
      return "-";
  }
}

export default function GiftRulesPage(): React.JSX.Element {
  const { data: channelsData } = useChannels();
  const channels = useMemo(
    () => (channelsData ?? []).map((c) => ({ id: c.id, name: c.name })),
    [channelsData],
  );
  const channelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of channels) m.set(c.id, c.name);
    return m;
  }, [channels]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [distFilter, setDistFilter] = useState<DistFilter>("all");
  const [condFilter, setCondFilter] = useState<CondFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<GiftRuleDraft | null>(null);

  const { data, isLoading } = useGiftRules({
    search: search.trim() || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    distributionMode: distFilter === "all" ? undefined : distFilter,
    conditionType: condFilter === "all" ? undefined : condFilter,
    page,
    pageSize,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const createMut = useCreateGiftRule();
  const updateMut = useUpdateGiftRule(draft?.id ?? "");
  const toggleMut = useToggleGiftRule();
  const deleteMut = useDeleteGiftRule();
  const deleteManyMut = useDeleteManyGiftRules();
  const distributeMut = useDistributeGiftsManually();

  const allChecked =
    items.length > 0 && items.every((r) => selectedIds.has(r.id));
  const someChecked = items.some((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of items) next.delete(r.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of items) next.add(r.id);
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!draft) return;
    const input = draftToCreateInput(draft);
    if (draft.id) {
      await updateMut.mutateAsync(input);
    } else {
      await createMut.mutateAsync(input);
    }
    setDraft(null);
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds).filter((id) =>
      items.some((r) => r.id === id),
    );
    if (ids.length === 0) return;
    if (!confirm(`선택된 ${ids.length}개 규칙을 삭제하시겠습니까?`)) return;
    await deleteManyMut.mutateAsync(ids);
    setSelectedIds(new Set());
  }

  async function handleDeleteOne(id: string) {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;
    await deleteMut.mutateAsync(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleDistributeAll() {
    if (
      !confirm(
        "신규주문 상태의 모든 주문에 활성 사은품규칙을 적용하시겠습니까?",
      )
    )
      return;
    const result = await distributeMut.mutateAsync([]);
    alert(
      `사은품 분배 완료: ${result.appliedOrders}건 주문 / 총 ${result.totalGifts}개 사은품`,
    );
  }

  function channelLabels(ids: string[] | undefined): string {
    if (!ids || ids.length === 0) return "전체";
    return ids.map((id) => channelMap.get(id) ?? id).join(", ");
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Flex direction="column" h="calc(100vh - 64px)" bg="gray.50">
      <Flex
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="gray.200"
        px={6}
        py={3}
        align="center"
        gap={4}
      >
        <Flex align="center" gap={2}>
          <Gift size={18} color="#db2777" />
          <Text fontSize="lg" fontWeight="700" color="gray.800">
            사은품규칙
          </Text>
        </Flex>
        <Box ml="auto">
          <Text fontSize="xs" color="gray.500">
            전체 {total}건
          </Text>
        </Box>
      </Flex>

      <Box
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="gray.100"
        px={6}
        py={3}
      >
        <Flex gap={3} wrap="wrap" align="center">
          <Flex align="center" gap={1}>
            <Box color="gray.400">
              <Search size={14} />
            </Box>
            <Input
              size="sm"
              placeholder="규칙명 검색"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              w="240px"
            />
          </Flex>

          <HStack gap={1}>
            {(["all", "active", "inactive"] as ActiveFilter[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={activeFilter === k ? "solid" : "ghost"}
                colorPalette={activeFilter === k ? "blue" : "gray"}
                onClick={() => {
                  setActiveFilter(k);
                  setPage(1);
                }}
              >
                {k === "all" ? "전체" : k === "active" ? "활성" : "비활성"}
              </Button>
            ))}
          </HStack>

          <HStack gap={1}>
            {(["all", "auto", "manual"] as DistFilter[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={distFilter === k ? "solid" : "ghost"}
                colorPalette={distFilter === k ? "purple" : "gray"}
                onClick={() => {
                  setDistFilter(k);
                  setPage(1);
                }}
              >
                {k === "all" ? "전체분배" : k === "auto" ? "자동" : "수동"}
              </Button>
            ))}
          </HStack>

          <HStack gap={1}>
            {(["all", "sku", "category", "amount", "qty"] as CondFilter[]).map(
              (k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={condFilter === k ? "solid" : "ghost"}
                  colorPalette={condFilter === k ? "pink" : "gray"}
                  onClick={() => {
                    setCondFilter(k);
                    setPage(1);
                  }}
                >
                  {k === "all" ? "전체조건" : conditionLabel(k)}
                </Button>
              ),
            )}
          </HStack>

          <Box ml="auto">
            <HStack gap={2}>
              <Button
                size="sm"
                variant="outline"
                colorPalette="pink"
                onClick={handleDistributeAll}
                loading={distributeMut.isPending}
              >
                <Play size={14} />
                <Box ml={1}>수동 분배 실행</Box>
              </Button>
              {someChecked && (
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="red"
                  onClick={handleDeleteSelected}
                  loading={deleteManyMut.isPending}
                >
                  <Trash2 size={14} />
                  <Box ml={1}>선택 삭제</Box>
                </Button>
              )}
              <Button
                size="sm"
                colorPalette="blue"
                onClick={() => setDraft(emptyGiftDraft())}
              >
                <Plus size={14} />
                <Box ml={1}>규칙 추가</Box>
              </Button>
            </HStack>
          </Box>
        </Flex>
      </Box>

      <Box flex={1} overflowY="auto" px={6} py={4}>
        {isLoading ? (
          <Flex justify="center" py={8}>
            <Spinner />
          </Flex>
        ) : items.length === 0 ? (
          <Box
            bg="white"
            borderWidth={1}
            borderColor="gray.200"
            borderRadius="md"
            py={12}
            textAlign="center"
          >
            <Stack gap={2} align="center">
              <Gift size={32} color="#cbd5e0" />
              <Text fontSize="sm" color="gray.500">
                사은품규칙이 없습니다. 우측 상단에서 추가하세요.
              </Text>
            </Stack>
          </Box>
        ) : (
          <Box
            bg="white"
            borderWidth={1}
            borderColor="gray.200"
            borderRadius="md"
            overflowX="auto"
          >
            <Box as="table" w="100%" fontSize="xs">
              <Box as="thead" bg="gray.50">
                <Box as="tr">
                  <Box as="th" px={3} py={2} textAlign="left" w="40px">
                    <Checkbox.Root
                      checked={allChecked}
                      onCheckedChange={() => toggleAll()}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="left">
                    규칙명
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="center">
                    분배
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="left">
                    조건
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="left">
                    적용 채널
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="left">
                    사은품 SKU
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="right">
                    수량
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="right">
                    적용/최대
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="center">
                    우선순위
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="center">
                    활성
                  </Box>
                  <Box as="th" px={3} py={2} textAlign="right" w="120px">
                    액션
                  </Box>
                </Box>
              </Box>
              <Box as="tbody">
                {items.map((rule) => (
                  <Box
                    as="tr"
                    key={rule.id}
                    borderTopWidth={1}
                    borderTopColor="gray.100"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Box as="td" px={3} py={2}>
                      <Checkbox.Root
                        checked={selectedIds.has(rule.id)}
                        onCheckedChange={() => toggleOne(rule.id)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Box>
                    <Box as="td" px={3} py={2}>
                      <Text fontWeight="600" color="gray.800" lineClamp={1}>
                        {rule.name}
                      </Text>
                      {rule.note && (
                        <Text fontSize="2xs" color="gray.500" lineClamp={1}>
                          {rule.note}
                        </Text>
                      )}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="center">
                      <Box
                        display="inline-block"
                        bg={
                          rule.distributionMode === "auto"
                            ? "purple.100"
                            : "blue.100"
                        }
                        color={
                          rule.distributionMode === "auto"
                            ? "purple.700"
                            : "blue.700"
                        }
                        px={1.5}
                        fontSize="2xs"
                        borderRadius="sm"
                      >
                        {rule.distributionMode === "auto" ? "자동" : "수동"}
                      </Box>
                    </Box>
                    <Box as="td" px={3} py={2} maxW="200px">
                      <Text lineClamp={1}>{conditionSummary(rule)}</Text>
                    </Box>
                    <Box as="td" px={3} py={2} maxW="180px">
                      <Text lineClamp={1} color="gray.600">
                        {channelLabels(rule.channelFilter?.channelIds)}
                      </Text>
                    </Box>
                    <Box as="td" px={3} py={2} maxW="200px">
                      <Text fontWeight="600" color="gray.800" lineClamp={1}>
                        {rule.giftSkuCode ?? "-"}
                      </Text>
                      <Text fontSize="2xs" color="gray.500" lineClamp={1}>
                        {rule.giftSkuName ?? "-"}
                      </Text>
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="right">
                      {rule.giftQty}
                    </Box>
                    <Box
                      as="td"
                      px={3}
                      py={2}
                      textAlign="right"
                      color="gray.600"
                    >
                      {rule.appliedCount} / {rule.maxApplyCount ?? "∞"}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="center">
                      {rule.priority}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="center">
                      <Checkbox.Root
                        checked={rule.isActive}
                        onCheckedChange={(d) =>
                          toggleMut.mutate({
                            id: rule.id,
                            isActive: !!d.checked,
                          })
                        }
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="right">
                      <HStack gap={1} justify="flex-end">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDraft(giftRuleToDraft(rule))}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleDeleteOne(rule.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {totalPages > 1 && (
          <Flex justify="center" mt={4} gap={2} align="center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              이전
            </Button>
            <Text fontSize="sm" color="gray.600">
              {page} / {totalPages}
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              다음
            </Button>
          </Flex>
        )}
      </Box>

      {draft && (
        <GiftRuleFormModal
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </Flex>
  );
}
