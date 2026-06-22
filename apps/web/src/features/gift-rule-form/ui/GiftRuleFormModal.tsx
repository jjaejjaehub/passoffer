"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Check, Search, X } from "lucide-react";

import { useChannels } from "@/entities/channel";
import { useSkus } from "@/entities/sku/api/skuQueries";
import type { Sku } from "@/entities/sku/model/types";
import {
  GIFT_CURRENCIES,
  type GiftConditionType,
  type GiftCurrency,
  type GiftDistributionMode,
  type GiftRule,
  type GiftRuleCreateInput,
} from "@/entities/gift-rule";

export interface GiftRuleDraft {
  id: string | null;
  name: string;
  distributionMode: GiftDistributionMode;
  channelIds: string[];
  conditionType: GiftConditionType;
  conditionCurrency: GiftCurrency | "";
  conditionMinAmount: string;
  conditionMinQty: string;
  conditionSkuIds: string[];
  conditionSkuLabels: Record<string, string>;
  conditionCategoryIds: string;
  giftSkuId: string;
  giftSkuCode: string;
  giftSkuName: string;
  giftQty: number;
  maxApplyCount: string;
  priority: number;
  isActive: boolean;
  activeFrom: string;
  activeTo: string;
  note: string;
}

export function emptyGiftDraft(): GiftRuleDraft {
  return {
    id: null,
    name: "",
    distributionMode: "auto",
    channelIds: [],
    conditionType: "all",
    conditionCurrency: "",
    conditionMinAmount: "",
    conditionMinQty: "",
    conditionSkuIds: [],
    conditionSkuLabels: {},
    conditionCategoryIds: "",
    giftSkuId: "",
    giftSkuCode: "",
    giftSkuName: "",
    giftQty: 1,
    maxApplyCount: "",
    priority: 100,
    isActive: true,
    activeFrom: "",
    activeTo: "",
    note: "",
  };
}

export function giftRuleToDraft(rule: GiftRule): GiftRuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    distributionMode: rule.distributionMode,
    channelIds: rule.channelFilter?.channelIds ?? [],
    conditionType: rule.conditionType,
    conditionCurrency: rule.conditionCurrency ?? "",
    conditionMinAmount:
      rule.conditionMinAmount == null ? "" : String(rule.conditionMinAmount),
    conditionMinQty:
      rule.conditionMinQty == null ? "" : String(rule.conditionMinQty),
    conditionSkuIds: rule.conditionPayload?.skuIds ?? [],
    conditionSkuLabels: {},
    conditionCategoryIds: (rule.conditionPayload?.categoryIds ?? []).join(","),
    giftSkuId: rule.giftSkuId,
    giftSkuCode: rule.giftSkuCode ?? "",
    giftSkuName: rule.giftSkuName ?? "",
    giftQty: rule.giftQty,
    maxApplyCount: rule.maxApplyCount == null ? "" : String(rule.maxApplyCount),
    priority: rule.priority,
    isActive: rule.isActive,
    activeFrom: rule.activeFrom ? rule.activeFrom.slice(0, 10) : "",
    activeTo: rule.activeTo ? rule.activeTo.slice(0, 10) : "",
    note: rule.note ?? "",
  };
}

export function draftToCreateInput(d: GiftRuleDraft): GiftRuleCreateInput {
  const conditionPayload =
    d.conditionType === "sku"
      ? { skuIds: d.conditionSkuIds }
      : d.conditionType === "category"
        ? {
            categoryIds: d.conditionCategoryIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {};

  return {
    name: d.name.trim(),
    distributionMode: d.distributionMode,
    channelFilter:
      d.channelIds.length > 0 ? { channelIds: d.channelIds } : null,
    conditionType: d.conditionType,
    conditionCurrency:
      d.conditionType === "amount" && d.conditionCurrency
        ? (d.conditionCurrency as GiftCurrency)
        : null,
    conditionMinAmount:
      d.conditionType === "amount" && d.conditionMinAmount
        ? Number(d.conditionMinAmount)
        : null,
    conditionMinQty:
      d.conditionType === "qty" && d.conditionMinQty
        ? Number(d.conditionMinQty)
        : null,
    conditionPayload,
    giftSkuId: d.giftSkuId,
    giftQty: d.giftQty,
    maxApplyCount: d.maxApplyCount ? Number(d.maxApplyCount) : null,
    priority: d.priority,
    isActive: d.isActive,
    activeFrom: d.activeFrom || null,
    activeTo: d.activeTo || null,
    note: d.note.trim() || null,
  };
}

function SkuPickerInline({
  onPick,
  onClose,
  excludeIds = [],
}: {
  onPick: (sku: Sku) => void;
  onClose: () => void;
  excludeIds?: string[];
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSkus({
    search: search.trim() || undefined,
    pageSize: 15,
  });
  const items = (data?.items ?? []).filter((s) => !excludeIds.includes(s.id));

  return (
    <Box
      mt={2}
      borderWidth={1}
      borderColor="gray.300"
      borderRadius="md"
      bg="white"
      p={2}
      maxH="280px"
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" gap={2} mb={2}>
        <Box color="gray.400">
          <Search size={14} />
        </Box>
        <Input
          size="sm"
          placeholder="SKU 코드 / 이름 검색"
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

interface Props {
  draft: GiftRuleDraft;
  onChange: (next: GiftRuleDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}

export function GiftRuleFormModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  saving,
}: Props): React.JSX.Element {
  const { data: channelsData } = useChannels();
  const channels = useMemo(
    () => (channelsData ?? []).map((c) => ({ id: c.id, name: c.name })),
    [channelsData],
  );

  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [condPickerOpen, setCondPickerOpen] = useState(false);

  useEffect(() => {
    if (draft.conditionType !== "sku" && condPickerOpen) {
      setCondPickerOpen(false);
    }
  }, [draft.conditionType, condPickerOpen]);

  const isEdit = !!draft.id;

  const canSubmit =
    draft.name.trim().length > 0 &&
    !!draft.giftSkuId &&
    draft.giftQty > 0 &&
    (draft.conditionType !== "sku" || draft.conditionSkuIds.length > 0) &&
    (draft.conditionType !== "amount" ||
      (!!draft.conditionCurrency && Number(draft.conditionMinAmount) > 0)) &&
    (draft.conditionType !== "qty" || Number(draft.conditionMinQty) > 0);

  function toggleChannel(id: string) {
    onChange({
      ...draft,
      channelIds: draft.channelIds.includes(id)
        ? draft.channelIds.filter((x) => x !== id)
        : [...draft.channelIds, id],
    });
  }

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
        w="760px"
        maxH="92vh"
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
            {isEdit ? "사은품규칙 수정" : "사은품규칙 추가"}
          </Text>
          <Box ml="auto">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={16} />
            </Button>
          </Box>
        </Flex>

        <Box px={6} py={5}>
          <Stack gap={5}>
            <Box borderWidth={1} borderColor="gray.200" borderRadius="md" p={4}>
              <Text fontSize="sm" fontWeight="700" color="gray.800" mb={3}>
                ① 기본설정
              </Text>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    규칙명 *
                  </Text>
                  <Input
                    size="sm"
                    value={draft.name}
                    onChange={(e) =>
                      onChange({ ...draft, name: e.target.value })
                    }
                    placeholder="예: 1만엔 이상 구매 시 사은품"
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    분배방법 *
                  </Text>
                  <HStack gap={2}>
                    {(["auto", "manual"] as GiftDistributionMode[]).map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={
                          draft.distributionMode === m ? "solid" : "outline"
                        }
                        colorPalette={
                          draft.distributionMode === m ? "blue" : "gray"
                        }
                        onClick={() =>
                          onChange({ ...draft, distributionMode: m })
                        }
                      >
                        {m === "auto" ? "자동 적용" : "수동 적용"}
                      </Button>
                    ))}
                  </HStack>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    적용 채널 (미선택 시 전체)
                  </Text>
                  <Flex gap={2} wrap="wrap">
                    {channels.length === 0 ? (
                      <Text fontSize="xs" color="gray.400">
                        채널이 없습니다.
                      </Text>
                    ) : (
                      channels.map((c) => {
                        const checked = draft.channelIds.includes(c.id);
                        return (
                          <Button
                            key={c.id}
                            size="xs"
                            variant={checked ? "solid" : "outline"}
                            colorPalette={checked ? "blue" : "gray"}
                            onClick={() => toggleChannel(c.id)}
                          >
                            {c.name}
                          </Button>
                        );
                      })
                    )}
                  </Flex>
                </Box>

                <Flex gap={3}>
                  <Box flex={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
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
                  <Box flex={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
                      최대 적용 횟수 (비우면 무제한)
                    </Text>
                    <Input
                      size="sm"
                      type="number"
                      value={draft.maxApplyCount}
                      onChange={(e) =>
                        onChange({ ...draft, maxApplyCount: e.target.value })
                      }
                    />
                  </Box>
                </Flex>

                <Flex gap={3}>
                  <Box flex={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
                      활성 시작일
                    </Text>
                    <Input
                      size="sm"
                      type="date"
                      value={draft.activeFrom}
                      onChange={(e) =>
                        onChange({ ...draft, activeFrom: e.target.value })
                      }
                    />
                  </Box>
                  <Box flex={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
                      활성 종료일
                    </Text>
                    <Input
                      size="sm"
                      type="date"
                      value={draft.activeTo}
                      onChange={(e) =>
                        onChange({ ...draft, activeTo: e.target.value })
                      }
                    />
                  </Box>
                </Flex>

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

            <Box borderWidth={1} borderColor="gray.200" borderRadius="md" p={4}>
              <Text fontSize="sm" fontWeight="700" color="gray.800" mb={3}>
                ② 조건
              </Text>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    조건 유형 *
                  </Text>
                  <HStack gap={1} wrap="wrap">
                    {(
                      [
                        "all",
                        "sku",
                        "category",
                        "amount",
                        "qty",
                      ] as GiftConditionType[]
                    ).map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={
                          draft.conditionType === t ? "solid" : "outline"
                        }
                        colorPalette={
                          draft.conditionType === t ? "purple" : "gray"
                        }
                        onClick={() => onChange({ ...draft, conditionType: t })}
                      >
                        {t === "all"
                          ? "전체주문"
                          : t === "sku"
                            ? "SKU 포함"
                            : t === "category"
                              ? "카테고리"
                              : t === "amount"
                                ? "주문금액"
                                : "주문수량"}
                      </Button>
                    ))}
                  </HStack>
                </Box>

                {draft.conditionType === "amount" && (
                  <Flex gap={3}>
                    <Box w="140px">
                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color="gray.700"
                        mb={1}
                      >
                        통화 *
                      </Text>
                      <select
                        value={draft.conditionCurrency}
                        onChange={(e) =>
                          onChange({
                            ...draft,
                            conditionCurrency: e.target.value as
                              | GiftCurrency
                              | "",
                          })
                        }
                        style={{
                          width: "100%",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "#cbd5e0",
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 14,
                          background: "white",
                        }}
                      >
                        <option value="">선택</option>
                        {GIFT_CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Box>
                    <Box flex={1}>
                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color="gray.700"
                        mb={1}
                      >
                        최소 주문금액 *
                      </Text>
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        value={draft.conditionMinAmount}
                        onChange={(e) =>
                          onChange({
                            ...draft,
                            conditionMinAmount: e.target.value,
                          })
                        }
                      />
                    </Box>
                  </Flex>
                )}

                {draft.conditionType === "qty" && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
                      최소 주문수량 *
                    </Text>
                    <Input
                      size="sm"
                      type="number"
                      min={1}
                      value={draft.conditionMinQty}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          conditionMinQty: e.target.value,
                        })
                      }
                    />
                  </Box>
                )}

                {draft.conditionType === "category" && (
                  <Box>
                    <Text
                      fontSize="xs"
                      fontWeight="600"
                      color="gray.700"
                      mb={1}
                    >
                      카테고리 ID (콤마로 구분)
                    </Text>
                    <Input
                      size="sm"
                      value={draft.conditionCategoryIds}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          conditionCategoryIds: e.target.value,
                        })
                      }
                      placeholder="예: cat-001,cat-002"
                    />
                  </Box>
                )}

                {draft.conditionType === "all" && (
                  <Text fontSize="xs" color="gray.500">
                    조건 없이 모든 주문에 적용됩니다.
                  </Text>
                )}
              </Stack>
            </Box>

            {draft.conditionType === "sku" && (
              <Box
                borderWidth={1}
                borderColor="gray.200"
                borderRadius="md"
                p={4}
              >
                <Text fontSize="sm" fontWeight="700" color="gray.800" mb={3}>
                  ③ 대상 SKU
                </Text>
                <Stack gap={2}>
                  {draft.conditionSkuIds.length > 0 && (
                    <Stack gap={1}>
                      {draft.conditionSkuIds.map((id) => (
                        <Flex
                          key={id}
                          align="center"
                          gap={2}
                          bg="gray.50"
                          borderRadius="md"
                          px={2}
                          py={1.5}
                          borderWidth={1}
                          borderColor="gray.200"
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="600"
                            color="gray.800"
                            flex={1}
                            lineClamp={1}
                          >
                            {draft.conditionSkuLabels[id] ?? id}
                          </Text>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              const nextLabels = {
                                ...draft.conditionSkuLabels,
                              };
                              delete nextLabels[id];
                              onChange({
                                ...draft,
                                conditionSkuIds: draft.conditionSkuIds.filter(
                                  (x) => x !== id,
                                ),
                                conditionSkuLabels: nextLabels,
                              });
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </Flex>
                      ))}
                    </Stack>
                  )}
                  <Box>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCondPickerOpen(true)}
                    >
                      <Search size={12} />
                      <Box ml={1}>SKU 추가</Box>
                    </Button>
                  </Box>
                  {condPickerOpen && (
                    <SkuPickerInline
                      excludeIds={draft.conditionSkuIds}
                      onPick={(sku) => {
                        onChange({
                          ...draft,
                          conditionSkuIds: [...draft.conditionSkuIds, sku.id],
                          conditionSkuLabels: {
                            ...draft.conditionSkuLabels,
                            [sku.id]: `${sku.code}${sku.name ? ` · ${sku.name}` : ""}`,
                          },
                        });
                      }}
                      onClose={() => setCondPickerOpen(false)}
                    />
                  )}
                </Stack>
              </Box>
            )}

            <Box borderWidth={1} borderColor="gray.200" borderRadius="md" p={4}>
              <Text fontSize="sm" fontWeight="700" color="gray.800" mb={3}>
                {draft.conditionType === "sku" ? "④" : "③"} 사은품
              </Text>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    사은품 SKU *
                  </Text>
                  {draft.giftSkuId ? (
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
                        <Text
                          fontSize="xs"
                          fontWeight="600"
                          color="gray.800"
                          lineClamp={1}
                        >
                          {draft.giftSkuCode || "-"}
                        </Text>
                        <Text fontSize="2xs" color="gray.600" lineClamp={1}>
                          {draft.giftSkuName || "-"}
                        </Text>
                      </Box>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          onChange({
                            ...draft,
                            giftSkuId: "",
                            giftSkuCode: "",
                            giftSkuName: "",
                          })
                        }
                      >
                        <X size={12} />
                      </Button>
                    </Flex>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setGiftPickerOpen(true)}
                    >
                      <Search size={12} />
                      <Box ml={1}>사은품 SKU 선택</Box>
                    </Button>
                  )}
                  {giftPickerOpen && (
                    <SkuPickerInline
                      onPick={(sku) => {
                        onChange({
                          ...draft,
                          giftSkuId: sku.id,
                          giftSkuCode: sku.code,
                          giftSkuName: sku.name ?? "",
                        });
                        setGiftPickerOpen(false);
                      }}
                      onClose={() => setGiftPickerOpen(false)}
                    />
                  )}
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    사은품 수량 *
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    value={draft.giftQty}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        giftQty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    w="120px"
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="600" color="gray.700" mb={1}>
                    메모
                  </Text>
                  <Textarea
                    size="sm"
                    rows={2}
                    value={draft.note}
                    onChange={(e) =>
                      onChange({ ...draft, note: e.target.value })
                    }
                  />
                </Box>
              </Stack>
            </Box>
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
