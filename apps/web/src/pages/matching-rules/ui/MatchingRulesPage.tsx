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
  Textarea,
} from "@chakra-ui/react";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { useChannels } from "@/entities/channel";
import { useSkus } from "@/entities/sku/api/skuQueries";
import type { Sku } from "@/entities/sku/model/types";
import {
  useCreateMatchingRule,
  useDeleteManyMatchingRules,
  useDeleteMatchingRule,
  useMatchingRules,
  useToggleMatchingRule,
  useUpdateMatchingRule,
  type CreateMatchingRuleInput,
  type MatchRule,
} from "@/entities/matching-rule";

type AutoLearnedFilter = "all" | "auto" | "manual";
type ActiveFilter = "all" | "active" | "inactive";

interface DraftRule {
  id: string | null;
  channelId: string;
  channelItemCode: string;
  channelItemTitle: string;
  optionCode: string;
  optionName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  outputQty: number;
  priority: number;
  isActive: boolean;
  note: string;
}

function emptyDraft(channelId: string): DraftRule {
  return {
    id: null,
    channelId,
    channelItemCode: "",
    channelItemTitle: "",
    optionCode: "",
    optionName: "",
    skuId: "",
    skuCode: "",
    skuName: "",
    outputQty: 1,
    priority: 100,
    isActive: true,
    note: "",
  };
}

function ruleToDraft(rule: MatchRule): DraftRule {
  return {
    id: rule.id,
    channelId: rule.channelId,
    channelItemCode: rule.channelItemCode,
    channelItemTitle: rule.channelItemTitle ?? "",
    optionCode: rule.optionCode ?? "",
    optionName: rule.optionName ?? "",
    skuId: rule.skuId,
    skuCode: rule.skuCode ?? "",
    skuName: rule.skuName ?? "",
    outputQty: rule.outputQty,
    priority: rule.priority,
    isActive: rule.isActive,
    note: rule.note ?? "",
  };
}

function SkuPickerInline({
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
                  <Text fontSize="xs" fontWeight="600" color="gray.800" lineClamp={1}>
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

function RuleEditorModal({
  draft,
  channels,
  onChange,
  onClose,
  onSubmit,
  saving,
}: {
  draft: DraftRule;
  channels: Array<{ id: string; name: string }>;
  onChange: (draft: DraftRule) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isEdit = !!draft.id;

  const canSubmit = !!draft.channelId && !!draft.channelItemCode && !!draft.skuId;

  return (
    <Flex
      position="fixed"
      inset={0}
      bg="blackAlpha.500"
      align="center"
      justify="center"
      zIndex={1000}
      p={4}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="2xl"
        w="640px"
        maxH="90vh"
        overflowY="auto"
      >
        <Flex
          px={6}
          py={4}
          borderBottomWidth={1}
          borderBottomColor="gray.200"
          align="center"
        >
          <Text fontSize="md" fontWeight="700" color="gray.800">
            {isEdit ? "매칭규칙 수정" : "매칭규칙 추가"}
          </Text>
          <Box ml="auto">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={16} />
            </Button>
          </Box>
        </Flex>

        <Box px={6} py={5}>
          <Stack gap={4}>
            <Box>
              <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                채널 *
              </Text>
              <select
                value={draft.channelId}
                onChange={(e) =>
                  onChange({ ...draft, channelId: e.target.value })
                }
                disabled={isEdit}
                style={{
                  width: "100%",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#cbd5e0",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 14,
                  background: isEdit ? "#f7fafc" : "white",
                }}
              >
                <option value="">채널 선택</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Box>

            <Flex gap={3}>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  쇼핑몰 상품코드 *
                </Text>
                <Input
                  size="sm"
                  value={draft.channelItemCode}
                  onChange={(e) =>
                    onChange({ ...draft, channelItemCode: e.target.value })
                  }
                  disabled={isEdit}
                  bg={isEdit ? "gray.50" : "white"}
                />
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  쇼핑몰 상품명
                </Text>
                <Input
                  size="sm"
                  value={draft.channelItemTitle}
                  onChange={(e) =>
                    onChange({ ...draft, channelItemTitle: e.target.value })
                  }
                />
              </Box>
            </Flex>

            <Flex gap={3}>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  옵션코드
                </Text>
                <Input
                  size="sm"
                  value={draft.optionCode}
                  onChange={(e) =>
                    onChange({ ...draft, optionCode: e.target.value })
                  }
                />
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  옵션명
                </Text>
                <Input
                  size="sm"
                  value={draft.optionName}
                  onChange={(e) =>
                    onChange({ ...draft, optionName: e.target.value })
                  }
                />
              </Box>
            </Flex>

            <Box>
              <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                매칭 SKU *
              </Text>
              {draft.skuId ? (
                <Flex
                  align="center"
                  gap={2}
                  bg="gray.50"
                  borderRadius="md"
                  px={2}
                  py={1.5}
                  borderWidth={1}
                  borderColor="gray.200"
                >
                  <Box flex={1} minW={0}>
                    <Text fontSize="xs" fontWeight="600" color="gray.800" lineClamp={1}>
                      {draft.skuCode || "-"}
                    </Text>
                    <Text fontSize="2xs" color="gray.600" lineClamp={1}>
                      {draft.skuName || "-"}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      onChange({ ...draft, skuId: "", skuCode: "", skuName: "" })
                    }
                  >
                    <X size={12} />
                  </Button>
                </Flex>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                  <Search size={12} />
                  <Box ml={1}>SKU 선택</Box>
                </Button>
              )}
              {pickerOpen && (
                <SkuPickerInline
                  onPick={(sku) => {
                    onChange({
                      ...draft,
                      skuId: sku.id,
                      skuCode: sku.code,
                      skuName: sku.name ?? "",
                    });
                    setPickerOpen(false);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </Box>

            <Flex gap={3}>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  출고수량
                </Text>
                <Input
                  size="sm"
                  type="number"
                  min={0}
                  value={draft.outputQty}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      outputQty: Number(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                  우선순위 (낮을수록 먼저)
                </Text>
                <Input
                  size="sm"
                  type="number"
                  value={draft.priority}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      priority: Number(e.target.value) || 0,
                    })
                  }
                />
              </Box>
            </Flex>

            <Box>
              <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                메모
              </Text>
              <Textarea
                size="sm"
                rows={2}
                value={draft.note}
                onChange={(e) => onChange({ ...draft, note: e.target.value })}
              />
            </Box>

            <Checkbox.Root
              checked={draft.isActive}
              onCheckedChange={(d) =>
                onChange({ ...draft, isActive: !!d.checked })
              }
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text fontSize="sm">활성화</Text>
              </Checkbox.Label>
            </Checkbox.Root>
          </Stack>
        </Box>

        <Flex
          px={6}
          py={4}
          borderTopWidth={1}
          borderTopColor="gray.200"
          gap={2}
          justify="flex-end"
        >
          <Button size="sm" variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            size="sm"
            colorPalette="blue"
            onClick={onSubmit}
            loading={saving}
            disabled={!canSubmit}
          >
            <Check size={14} />
            <Box ml={1}>{isEdit ? "수정" : "추가"}</Box>
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}

export default function MatchingRulesPage() {
  const { data: channelsData } = useChannels();
  const channels = useMemo(
    () => (channelsData ?? []).map((c) => ({ id: c.id, name: c.name })),
    [channelsData],
  );

  const [filterChannelId, setFilterChannelId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [autoLearnedFilter, setAutoLearnedFilter] = useState<AutoLearnedFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftRule | null>(null);

  const { data, isLoading } = useMatchingRules({
    channelId: filterChannelId || undefined,
    search: search.trim() || undefined,
    isActive:
      activeFilter === "all" ? undefined : activeFilter === "active",
    autoLearned:
      autoLearnedFilter === "all" ? undefined : autoLearnedFilter === "auto",
    page,
    pageSize,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const createMut = useCreateMatchingRule();
  const updateMut = useUpdateMatchingRule(draft?.id ?? "");
  const toggleMut = useToggleMatchingRule();
  const deleteMut = useDeleteMatchingRule();
  const deleteManyMut = useDeleteManyMatchingRules();

  const allChecked = items.length > 0 && items.every((r) => selectedIds.has(r.id));
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
    if (draft.id) {
      await updateMut.mutateAsync({
        channelItemTitle: draft.channelItemTitle || null,
        optionCode: draft.optionCode || null,
        optionName: draft.optionName || null,
        skuId: draft.skuId,
        outputQty: draft.outputQty,
        priority: draft.priority,
        isActive: draft.isActive,
        note: draft.note || null,
      });
    } else {
      const input: CreateMatchingRuleInput = {
        channelId: draft.channelId,
        channelItemCode: draft.channelItemCode,
        channelItemTitle: draft.channelItemTitle || null,
        optionCode: draft.optionCode || null,
        optionName: draft.optionName || null,
        skuId: draft.skuId,
        outputQty: draft.outputQty,
        priority: draft.priority,
        isActive: draft.isActive,
        note: draft.note || null,
      };
      await createMut.mutateAsync(input);
    }
    setDraft(null);
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds).filter((id) => items.some((r) => r.id === id));
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

  function channelLabel(channelId: string): string {
    return channels.find((c) => c.id === channelId)?.name ?? channelId;
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
          <Sparkles size={18} color="#9333ea" />
          <Text fontSize="lg" fontWeight="700" color="gray.800">
            매칭규칙
          </Text>
        </Flex>
        <Box ml="auto">
          <Text fontSize="xs" color="gray.500">
            전체 {total}건
          </Text>
        </Box>
      </Flex>

      <Box bg="white" borderBottomWidth={1} borderBottomColor="gray.100" px={6} py={3}>
        <Flex gap={3} wrap="wrap" align="center">
          <select
            value={filterChannelId}
            onChange={(e) => {
              setFilterChannelId(e.target.value);
              setPage(1);
            }}
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#cbd5e0",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 14,
              background: "white",
            }}
          >
            <option value="">전체 채널</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Flex align="center" gap={1}>
            <Box color="gray.400">
              <Search size={14} />
            </Box>
            <Input
              size="sm"
              placeholder="상품코드 / 상품명 / 옵션 검색"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              w="280px"
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
            {(["all", "manual", "auto"] as AutoLearnedFilter[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={autoLearnedFilter === k ? "solid" : "ghost"}
                colorPalette={autoLearnedFilter === k ? "purple" : "gray"}
                onClick={() => {
                  setAutoLearnedFilter(k);
                  setPage(1);
                }}
              >
                {k === "all" ? "전체출처" : k === "manual" ? "수동" : "자동학습"}
              </Button>
            ))}
          </HStack>

          <Box ml="auto">
            <HStack gap={2}>
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
                onClick={() =>
                  setDraft(emptyDraft(filterChannelId || channels[0]?.id || ""))
                }
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
            <Text fontSize="sm" color="gray.500">
              매칭규칙이 없습니다. 우측 상단에서 추가하세요.
            </Text>
          </Box>
        ) : (
          <Box bg="white" borderWidth={1} borderColor="gray.200" borderRadius="md" overflowX="auto">
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
                  <Box as="th" px={3} py={2} textAlign="left">채널</Box>
                  <Box as="th" px={3} py={2} textAlign="left">쇼핑몰 상품코드</Box>
                  <Box as="th" px={3} py={2} textAlign="left">상품명</Box>
                  <Box as="th" px={3} py={2} textAlign="left">옵션</Box>
                  <Box as="th" px={3} py={2} textAlign="left">매칭 SKU</Box>
                  <Box as="th" px={3} py={2} textAlign="right">출고수량</Box>
                  <Box as="th" px={3} py={2} textAlign="center">우선순위</Box>
                  <Box as="th" px={3} py={2} textAlign="center">자동학습</Box>
                  <Box as="th" px={3} py={2} textAlign="center">활성</Box>
                  <Box as="th" px={3} py={2} textAlign="right">매칭 횟수</Box>
                  <Box as="th" px={3} py={2} textAlign="right" w="120px">액션</Box>
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
                      {channelLabel(rule.channelId)}
                    </Box>
                    <Box as="td" px={3} py={2} fontFamily="mono">
                      {rule.channelItemCode}
                    </Box>
                    <Box as="td" px={3} py={2} maxW="240px">
                      <Text lineClamp={1}>{rule.channelItemTitle ?? "-"}</Text>
                    </Box>
                    <Box as="td" px={3} py={2} maxW="200px">
                      <Text lineClamp={1} color="gray.600">
                        {rule.optionName ?? rule.optionCode ?? "-"}
                      </Text>
                    </Box>
                    <Box as="td" px={3} py={2} maxW="200px">
                      <Text fontWeight="600" color="gray.800" lineClamp={1}>
                        {rule.skuCode ?? "-"}
                      </Text>
                      <Text fontSize="2xs" color="gray.500" lineClamp={1}>
                        {rule.skuName ?? "-"}
                      </Text>
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="right">
                      {rule.outputQty}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="center">
                      {rule.priority}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="center">
                      {rule.autoLearned ? (
                        <Box
                          display="inline-block"
                          bg="purple.100"
                          color="purple.700"
                          px={1.5}
                          fontSize="2xs"
                          borderRadius="sm"
                        >
                          자동학습
                        </Box>
                      ) : (
                        <Text color="gray.400">-</Text>
                      )}
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
                    <Box as="td" px={3} py={2} textAlign="right" color="gray.600">
                      {rule.matchHitCount}
                    </Box>
                    <Box as="td" px={3} py={2} textAlign="right">
                      <HStack gap={1} justify="flex-end">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDraft(ruleToDraft(rule))}
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
        <RuleEditorModal
          draft={draft}
          channels={channels}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </Flex>
  );
}
