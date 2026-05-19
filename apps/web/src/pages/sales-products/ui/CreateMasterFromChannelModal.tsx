"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { CheckCircle, Plus, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  useCreateMasterProduct,
  type CreateMasterProductInput,
} from "@/entities/master-product";
import { http } from "@/shared/api";
import {
  useChannelApiKey,
  useChannelProduct,
  useLinkChannelProduct,
  type ChannelProductItem,
  type ChannelProductVariant,
} from "@/entities/channel";
import {
  PLATFORM_DEFS,
  type PlatformDef,
  type PlatformField,
} from "@/shared/config";
import { appToaster } from "@/shared/ui/app-toaster";

type Step = "fill-info" | "result";

interface OptionGroupDraft {
  name: string;
  values: string[];
}

interface VariantDraft {
  sku: string;
  optionLabel: string;
  optionValues: Array<{ groupName: string; value: string }>;
  price: string;
  stock: number;
  channelVariantId: string;
}

interface ResultData {
  masterProductId: string;
  listedProductId: string;
  linkedVariantCount: number;
}

interface Props {
  channelId: string;
  channelProduct: ChannelProductItem;
  onClose: () => void;
  onSuccess: () => void;
}

function parseOptionGroups(variants: ChannelProductVariant[]): {
  groups: OptionGroupDraft[];
  variantOptionValues: Array<Array<{ groupName: string; value: string }>>;
} {
  if (variants.length === 0) {
    return { groups: [], variantOptionValues: [] };
  }

  const splitValues = variants.map((v) =>
    (v.optionValue ?? "")
      .split(/[\/|,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const maxParts = Math.max(0, ...splitValues.map((p) => p.length));

  if (maxParts === 0) {
    return { groups: [], variantOptionValues: variants.map(() => []) };
  }

  const groups: OptionGroupDraft[] = [];
  for (let i = 0; i < maxParts; i += 1) {
    const seen = new Set<string>();
    const values: string[] = [];
    splitValues.forEach((parts) => {
      const v = parts[i];
      if (v && !seen.has(v)) {
        seen.add(v);
        values.push(v);
      }
    });
    groups.push({ name: `옵션${i + 1}`, values });
  }

  const variantOptionValues = splitValues.map((parts) =>
    parts.map((value, i) => ({ groupName: groups[i]?.name ?? `옵션${i + 1}`, value })),
  );

  return { groups, variantOptionValues };
}

export function CreateMasterFromChannelModal({
  channelId,
  channelProduct,
  onClose,
  onSuccess,
}: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>("fill-info");
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: channelDetail } = useChannelProduct(channelId, channelProduct.channelItemId);

  const channelVariants: ChannelProductVariant[] = useMemo(
    () => channelDetail?.variants ?? channelProduct.variants ?? [],
    [channelDetail?.variants, channelProduct.variants],
  );

  const initialParse = useMemo(() => parseOptionGroups(channelVariants), [channelVariants]);

  const [code, setCode] = useState<string>(
    channelProduct.sellerCode || `MP-${Date.now()}`,
  );
  const [title, setTitle] = useState<string>(channelProduct.title || "");
  const [brand, setBrand] = useState<string>("");
  const [noBrand, setNoBrand] = useState<boolean>(false);
  const [hsCode, setHsCode] = useState<string>("");
  const [originType, setOriginType] = useState<"domestic" | "overseas" | "other">("domestic");
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>("대한민국");
  const [material, setMaterial] = useState<string>("");
  const [weightG, setWeightG] = useState<string>("");
  const [retailPrice, setRetailPrice] = useState<string>(channelProduct.price ?? "");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [descriptionHtml, setDescriptionHtml] = useState<string>("");

  const [platformValues, setPlatformValues] = useState<Record<string, string>>(() => {
    const productionPlaceType =
      originType === "domestic" ? "1" : originType === "overseas" ? "2" : "3";
    return {
      "qoo10.ItemPrice": channelProduct.price ?? "",
      "qoo10.ItemQty": "0",
      "qoo10.AvailableDateType": "0",
      "qoo10.AdultYN": "N",
      "qoo10.TaxRate": "10",
      "qoo10.ProductionPlaceType": productionPlaceType,
      "shopify.status": "DRAFT",
    };
  });

  const setPlatformValue = (key: string, value: string): void => {
    setPlatformValues((prev) => ({ ...prev, [key]: value }));
  };

  const buildAttributes = (): Record<string, unknown> => {
    const result: Record<string, Record<string, unknown>> = {};
    for (const [flatKey, value] of Object.entries(platformValues)) {
      if (value === "") continue;
      const dotIdx = flatKey.indexOf(".");
      if (dotIdx === -1) continue;
      const ns = flatKey.slice(0, dotIdx);
      const field = flatKey.slice(dotIdx + 1);
      if (!result[ns]) result[ns] = {};
      result[ns][field] = value;
    }
    return result;
  };

  const { hasKey: qoo10Connected } = useChannelApiKey("qoo10");
  const { hasKey: shopifyConnected } = useChannelApiKey("shopify");

  const connectedPlatforms = useMemo<PlatformDef[]>(() => {
    const map: Record<string, boolean> = {
      qoo10: qoo10Connected,
      shopify: shopifyConnected,
    };
    return PLATFORM_DEFS.filter((def) => def.apiAvailable && map[def.channelId]);
  }, [qoo10Connected, shopifyConnected]);

  const isFieldRequired = (field: PlatformField): boolean => {
    if (field.required) return true;
    if (field.conditionalRequired) {
      const depVal = platformValues[field.conditionalRequired.dependsOn] ?? "";
      return field.conditionalRequired.values.includes(depVal);
    }
    return false;
  };

  const [images, setImages] = useState<Array<{ url: string; altText: string }>>(
    () => channelProduct.images.map((url) => ({ url, altText: "" })),
  );
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [newImageAlt, setNewImageAlt] = useState<string>("");

  const handleAddImage = (): void => {
    const url = newImageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, { url, altText: newImageAlt.trim() }]);
    setNewImageUrl("");
    setNewImageAlt("");
  };

  const handleRemoveImage = (idx: number): void => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>(initialParse.groups);

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    if (channelVariants.length === 0) {
      return [
        {
          sku: channelProduct.sellerCode || `${code}-1`,
          optionLabel: "기본",
          optionValues: [],
          price: channelProduct.price ?? "",
          stock: 0,
          channelVariantId: channelProduct.channelItemId,
        },
      ];
    }
    return channelVariants.map((cv, i) => ({
      sku: cv.optionCode || `${code}-${i + 1}`,
      optionLabel: cv.optionValue ?? "",
      optionValues: initialParse.variantOptionValues[i] ?? [],
      price: cv.price ?? "",
      stock: cv.stock ?? 0,
      channelVariantId: cv.channelVariantId,
    }));
  });

  const { mutateAsync: createMaster } = useCreateMasterProduct();
  const { mutateAsync: linkProduct } = useLinkChannelProduct(
    channelId,
    channelProduct.channelItemId,
  );

  const canSubmit = code.trim().length > 0 && title.trim().length > 0 &&
    variants.length > 0 && variants.every((v) => v.sku.trim().length > 0);

  const handleAddOptionGroup = (): void => {
    setOptionGroups((prev) => [
      ...prev,
      { name: `옵션${prev.length + 1}`, values: [] },
    ]);
  };

  const handleRemoveOptionGroup = (idx: number): void => {
    const removed = optionGroups[idx];
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        optionValues: v.optionValues.filter((ov) => ov.groupName !== removed?.name),
      })),
    );
  };

  const handleUpdateGroupName = (idx: number, newName: string): void => {
    const oldName = optionGroups[idx]?.name;
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, name: newName } : g)),
    );
    if (oldName) {
      setVariants((prev) =>
        prev.map((v) => ({
          ...v,
          optionValues: v.optionValues.map((ov) =>
            ov.groupName === oldName ? { ...ov, groupName: newName } : ov,
          ),
        })),
      );
    }
  };

  const handleAddVariant = (): void => {
    setVariants((prev) => [
      ...prev,
      {
        sku: `${code}-${prev.length + 1}`,
        optionLabel: "",
        optionValues: optionGroups.map((g) => ({ groupName: g.name, value: "" })),
        price: "",
        stock: 0,
        channelVariantId: "",
      },
    ]);
  };

  const handleRemoveVariant = (idx: number): void => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateVariantField = <K extends keyof VariantDraft>(
    idx: number,
    field: K,
    value: VariantDraft[K],
  ): void => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
    );
  };

  const handleUpdateVariantOptionValue = (
    variantIdx: number,
    groupName: string,
    value: string,
  ): void => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIdx) return v;
        const exists = v.optionValues.some((ov) => ov.groupName === groupName);
        const newValues = exists
          ? v.optionValues.map((ov) => (ov.groupName === groupName ? { ...ov, value } : ov))
          : [...v.optionValues, { groupName, value }];
        return { ...v, optionValues: newValues };
      }),
    );
  };

  const collectFinalOptionGroups = (): OptionGroupDraft[] => {
    return optionGroups
      .filter((g) => g.name.trim().length > 0)
      .map((g) => {
        const seen = new Set<string>();
        const values: string[] = [];
        variants.forEach((v) => {
          const ov = v.optionValues.find((o) => o.groupName === g.name);
          if (ov && ov.value.trim().length > 0 && !seen.has(ov.value)) {
            seen.add(ov.value);
            values.push(ov.value);
          }
        });
        g.values.forEach((v) => {
          if (v.trim().length > 0 && !seen.has(v)) {
            seen.add(v);
            values.push(v);
          }
        });
        return { name: g.name, values };
      })
      .filter((g) => g.values.length > 0);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) {
      appToaster.create({ title: "필수 항목을 모두 입력하세요.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const attributes = buildAttributes();

      const input: CreateMasterProductInput = {
        code: code.trim(),
        title: title.trim(),
        brand: noBrand ? undefined : brand.trim() || undefined,
        hsCode: hsCode.trim() || undefined,
        countryOfOrigin: countryOfOrigin.trim() || undefined,
        material: material.trim() || undefined,
        weightG: weightG.trim() ? Number(weightG) : undefined,
        retailPrice: retailPrice.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        descriptionHtml: descriptionHtml.trim() || undefined,
        images: images.map((img, i) => ({
          url: img.url,
          altText: img.altText || undefined,
          order: i,
        })),
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      };

      const master = await createMaster(input);

      const finalGroups = collectFinalOptionGroups();
      if (finalGroups.length > 0) {
        await setOptionGroupsForMaster(master.id, finalGroups);
      }

      const createdVariants = await addVariantsForMaster(master.id, variants, finalGroups);

      const mappings = variants
        .map((v, i) => {
          const created = createdVariants[i];
          if (!created || !v.channelVariantId) return null;
          return {
            masterVariantId: created.id,
            channelVariantId: v.channelVariantId,
            overrideSellerCode: true,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      const linkResult = await linkProduct({
        masterProductId: master.id,
        variantMappings: mappings,
      });

      setResultData({
        masterProductId: master.id,
        listedProductId: linkResult.listedProductId,
        linkedVariantCount: linkResult.linkedVariantCount,
      });
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "마스터 상품 생성에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <Box
      position="fixed"
      inset={0}
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="blackAlpha.500"
      onClick={onClose}
    >
      <Box
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        w="720px"
        maxW="95vw"
        maxH="90vh"
        display="flex"
        flexDirection="column"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex
          align="center"
          justify="space-between"
          px={6}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.100"
        >
          <Text fontWeight="semibold" fontSize="md">
            {step === "fill-info" && "판매상품으로 마스터 생성"}
            {step === "result" && (resultData ? "생성 완료" : "생성 실패")}
          </Text>
          <Button size="xs" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </Flex>

        <Box flex="1" overflowY="auto" px={6} py={4}>
          {step === "fill-info" && (
            <Stack gap={5}>
              <Box px={3} py={2} bg="blue.50" borderRadius="md">
                <Text fontSize="xs" color="blue.700">
                  판매상품 &quot;{channelProduct.title}&quot;의 정보를 기반으로 자동 채워졌습니다.
                  필요한 정보를 확인/수정한 뒤 생성하세요.
                </Text>
              </Box>

              <Stack gap={3}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  기본 정보
                </Text>
                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      마스터 코드 <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Input
                      size="sm"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="고유 코드 (예: MP-001)"
                    />
                  </Box>
                  <Box flex="2">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      상품명 <Text as="span" color="red.500">*</Text>
                    </Text>
                    <Input
                      size="sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="상품명"
                    />
                  </Box>
                </Flex>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>브랜드</Text>
                  <Flex align="center" gap={2} mb={2}>
                    <Checkbox.Root
                      checked={noBrand}
                      onCheckedChange={(e) => setNoBrand(!!e.checked)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs" color="gray.600">
                        브랜드 없음 (No Brand)
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Flex>
                  {!noBrand && (
                    <Input
                      size="sm"
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setPlatformValue("shopify.vendor", e.target.value);
                      }}
                      placeholder="브랜드명 입력"
                    />
                  )}
                </Box>
                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>HS 코드</Text>
                    <Input
                      size="sm"
                      value={hsCode}
                      onChange={(e) => setHsCode(e.target.value)}
                      placeholder="예: 6109.10"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>판매가</Text>
                    <Input
                      size="sm"
                      type="number"
                      value={retailPrice}
                      onChange={(e) => {
                        setRetailPrice(e.target.value);
                        setPlatformValue("qoo10.ItemPrice", e.target.value);
                      }}
                      placeholder="예: 29000"
                    />
                  </Box>
                </Flex>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>원산지</Text>
                  <Flex gap={2}>
                    <Box flexShrink={0} minW="130px">
                      <select
                        value={originType}
                        onChange={(e) => {
                          const v = e.target.value as typeof originType;
                          setOriginType(v);
                          if (v === "domestic") setCountryOfOrigin("대한민국");
                          else setCountryOfOrigin("");
                          setPlatformValue(
                            "qoo10.ProductionPlaceType",
                            v === "domestic" ? "1" : v === "overseas" ? "2" : "3",
                          );
                        }}
                        style={{
                          width: "100%",
                          height: "32px",
                          padding: "0 8px",
                          fontSize: "14px",
                          borderRadius: "6px",
                          borderWidth: "1px",
                          borderColor: "var(--chakra-colors-gray-200)",
                          background: "white",
                        }}
                      >
                        <option value="domestic">국내 (대한민국)</option>
                        <option value="overseas">해외</option>
                        <option value="other">기타</option>
                      </select>
                    </Box>
                    <Box flex="1">
                      <Input
                        size="sm"
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                        placeholder={
                          originType === "domestic"
                            ? "예: 서울특별시"
                            : originType === "overseas"
                              ? "예: 중국, China"
                              : "자유 입력"
                        }
                      />
                    </Box>
                  </Flex>
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>소재</Text>
                    <Input
                      size="sm"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="예: 면 100%"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>무게(g)</Text>
                    <Input
                      size="sm"
                      type="number"
                      value={weightG}
                      onChange={(e) => setWeightG(e.target.value)}
                      placeholder="예: 300"
                    />
                  </Box>
                </Flex>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>태그</Text>
                  <Input
                    size="sm"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="예: 의류, 여성, 반팔"
                  />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    쉼표로 구분하여 입력하세요
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>상품 설명 (HTML 허용)</Text>
                  <Textarea
                    size="sm"
                    rows={6}
                    value={descriptionHtml}
                    onChange={(e) => setDescriptionHtml(e.target.value)}
                    placeholder="<p>상품 설명을 입력하세요...</p>"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                </Box>
              </Stack>

              <Stack gap={3}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  이미지
                </Text>
                {images.length > 0 && (
                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
                    {images.map((img, idx) => (
                      <Flex
                        key={idx}
                        align="center"
                        gap={3}
                        px={3}
                        py={2}
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                        _last={{ borderBottomWidth: 0 }}
                        _hover={{ bg: "gray.50" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.altText}
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: 4,
                            flexShrink: 0,
                            background: "#f7fafc",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <Box flex="1" minW={0}>
                          <Text fontSize="xs" color="gray.700" truncate>
                            {img.url}
                          </Text>
                          {img.altText && (
                            <Text fontSize="xs" color="gray.400">
                              {img.altText}
                            </Text>
                          )}
                        </Box>
                        <Text fontSize="xs" color="gray.400" flexShrink={0}>
                          #{idx + 1}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleRemoveImage(idx)}
                          flexShrink={0}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </Flex>
                    ))}
                  </Box>
                )}
                <Box p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
                  <Text fontSize="xs" fontWeight="medium" mb={2}>이미지 추가</Text>
                  <Flex gap={2}>
                    <Box flex="2">
                      <Input
                        size="sm"
                        bg="white"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddImage();
                          }
                        }}
                      />
                    </Box>
                    <Box flex="1">
                      <Input
                        size="sm"
                        bg="white"
                        value={newImageAlt}
                        onChange={(e) => setNewImageAlt(e.target.value)}
                        placeholder="대체 텍스트"
                      />
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddImage}
                      disabled={!newImageUrl.trim()}
                    >
                      추가
                    </Button>
                  </Flex>
                </Box>
              </Stack>

              {connectedPlatforms.length > 0 && (
                <Stack gap={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    플랫폼별 속성
                  </Text>
                  <Box px={3} py={2} bg="amber.50" borderRadius="md">
                    <Text fontSize="xs" color="amber.800">
                      연결된 채널의 필수 속성입니다. 추출된 값으로 자동 채워졌으며,
                      비어있는 필수 항목은 직접 입력해 주세요.
                    </Text>
                  </Box>
                  {connectedPlatforms.map((def) => {
                    const requiredFields = def.fields.filter((f) => isFieldRequired(f));
                    const missingCount = requiredFields.filter(
                      (f) => !(platformValues[f.key] ?? "").trim(),
                    ).length;
                    return (
                      <Box
                        key={def.key}
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="md"
                        overflow="hidden"
                      >
                        <Flex
                          align="center"
                          justify="space-between"
                          px={3}
                          py={2}
                          bg={`${def.color}.50`}
                          borderBottomWidth="1px"
                          borderColor="gray.200"
                        >
                          <Text fontSize="xs" fontWeight="semibold" color={`${def.color}.800`}>
                            {def.label} 필수 속성
                          </Text>
                          {missingCount > 0 ? (
                            <Text fontSize="xs" color="red.600" fontWeight="medium">
                              필수 {missingCount}개 미입력
                            </Text>
                          ) : (
                            <Text fontSize="xs" color="green.600" fontWeight="medium">
                              필수 입력 완료
                            </Text>
                          )}
                        </Flex>
                        <Stack gap={2} p={3}>
                          {requiredFields.length === 0 ? (
                            <Text fontSize="xs" color="gray.400">
                              이 플랫폼은 추가 필수 속성이 없습니다.
                            </Text>
                          ) : (
                            requiredFields.map((field) => {
                              const value = platformValues[field.key] ?? "";
                              const isEmpty = !value.trim();
                              return (
                                <Box key={field.key}>
                                  <Text fontSize="xs" color="gray.700" mb={1}>
                                    {field.label}{" "}
                                    <Text as="span" color="red.500">*</Text>
                                  </Text>
                                  {field.type === "select" && field.options ? (
                                    <select
                                      value={value}
                                      onChange={(e) =>
                                        setPlatformValue(field.key, e.target.value)
                                      }
                                      style={{
                                        width: "100%",
                                        height: "32px",
                                        padding: "0 8px",
                                        fontSize: "14px",
                                        borderRadius: "6px",
                                        borderWidth: "1px",
                                        borderColor: isEmpty
                                          ? "var(--chakra-colors-red-300)"
                                          : "var(--chakra-colors-gray-200)",
                                        background: "white",
                                      }}
                                    >
                                      <option value="">선택하세요</option>
                                      {field.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.type === "textarea" ? (
                                    <Textarea
                                      size="sm"
                                      rows={3}
                                      value={value}
                                      onChange={(e) =>
                                        setPlatformValue(field.key, e.target.value)
                                      }
                                      placeholder={field.placeholder}
                                      borderColor={isEmpty ? "red.300" : undefined}
                                    />
                                  ) : (
                                    <Input
                                      size="sm"
                                      type={field.type === "number" ? "number" : "text"}
                                      value={value}
                                      onChange={(e) =>
                                        setPlatformValue(field.key, e.target.value)
                                      }
                                      placeholder={field.placeholder}
                                      borderColor={isEmpty ? "red.300" : undefined}
                                    />
                                  )}
                                  {field.note && (
                                    <Text fontSize="xs" color="gray.400" mt={1}>
                                      {field.note}
                                    </Text>
                                  )}
                                </Box>
                              );
                            })
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}

              <Stack gap={3}>
                <Flex align="center" justify="space-between">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    옵션 그룹
                  </Text>
                  <Button size="xs" variant="outline" onClick={handleAddOptionGroup}>
                    <Plus size={12} /> 그룹 추가
                  </Button>
                </Flex>
                {optionGroups.length === 0 ? (
                  <Text fontSize="xs" color="gray.400">
                    옵션이 없는 단일 상품으로 생성됩니다.
                  </Text>
                ) : (
                  <Stack gap={2}>
                    {optionGroups.map((g, i) => (
                      <Flex key={i} gap={2} align="center">
                        <Input
                          size="sm"
                          flex="1"
                          value={g.name}
                          onChange={(e) => handleUpdateGroupName(i, e.target.value)}
                          placeholder="옵션 그룹명 (예: 사이즈)"
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleRemoveOptionGroup(i)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Stack gap={3}>
                <Flex align="center" justify="space-between">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    옵션 (Variants)
                  </Text>
                  <Button size="xs" variant="outline" onClick={handleAddVariant}>
                    <Plus size={12} /> 옵션 추가
                  </Button>
                </Flex>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>SKU *</Table.ColumnHeader>
                      {optionGroups.map((g, i) => (
                        <Table.ColumnHeader key={i}>{g.name || `옵션${i + 1}`}</Table.ColumnHeader>
                      ))}
                      <Table.ColumnHeader>가격</Table.ColumnHeader>
                      <Table.ColumnHeader>재고</Table.ColumnHeader>
                      <Table.ColumnHeader w="40px" />
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {variants.map((v, i) => (
                      <Table.Row key={i}>
                        <Table.Cell>
                          <Input
                            size="xs"
                            value={v.sku}
                            onChange={(e) => handleUpdateVariantField(i, "sku", e.target.value)}
                          />
                        </Table.Cell>
                        {optionGroups.map((g, gi) => {
                          const ov = v.optionValues.find((o) => o.groupName === g.name);
                          return (
                            <Table.Cell key={gi}>
                              <Input
                                size="xs"
                                value={ov?.value ?? ""}
                                onChange={(e) =>
                                  handleUpdateVariantOptionValue(i, g.name, e.target.value)
                                }
                              />
                            </Table.Cell>
                          );
                        })}
                        <Table.Cell>
                          <Input
                            size="xs"
                            value={v.price}
                            onChange={(e) => handleUpdateVariantField(i, "price", e.target.value)}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Input
                            size="xs"
                            type="number"
                            value={v.stock}
                            onChange={(e) =>
                              handleUpdateVariantField(i, "stock", Number(e.target.value) || 0)
                            }
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => handleRemoveVariant(i)}
                            disabled={variants.length <= 1}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                {channelVariants.length > 0 && (
                  <Text fontSize="xs" color="gray.500">
                    채널 옵션 {channelVariants.length}개와 자동 매핑되어 생성 후 즉시 연결됩니다.
                  </Text>
                )}
              </Stack>
            </Stack>
          )}

          {step === "result" && resultData && (
            <Stack gap={3} align="center" py={6}>
              <CheckCircle size={48} color="var(--chakra-colors-green-500)" />
              <Text fontWeight="semibold" fontSize="lg">생성 및 연결 완료</Text>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                마스터 상품이 생성되고 &quot;{channelProduct.title}&quot;과(와) 연결되었습니다.
              </Text>
              <Text fontSize="sm">옵션 {resultData.linkedVariantCount}개 매핑됨</Text>
            </Stack>
          )}

          {step === "result" && !resultData && (
            <Stack gap={3} align="center" py={6}>
              <XCircle size={48} color="var(--chakra-colors-red-500)" />
              <Text fontWeight="semibold">생성 실패</Text>
            </Stack>
          )}
        </Box>

        <Flex
          px={6}
          py={4}
          borderTopWidth="1px"
          borderColor="gray.100"
          justify="flex-end"
          gap={2}
        >
          {step === "fill-info" && (
            <>
              <Button size="sm" variant="outline" onClick={onClose} disabled={submitting}>
                취소
              </Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={!canSubmit || submitting}
                loading={submitting}
                onClick={() => void handleSubmit()}
              >
                생성 및 연결
              </Button>
            </>
          )}
          {step === "result" && (
            <Button
              size="sm"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              확인
            </Button>
          )}
        </Flex>
      </Box>
    </Box>,
    document.body,
  );
}

async function setOptionGroupsForMaster(
  masterProductId: string,
  groups: OptionGroupDraft[],
): Promise<void> {
  await http.put(`/api/master-products/${masterProductId}/option-groups`, { groups });
}

async function addVariantsForMaster(
  masterProductId: string,
  variants: VariantDraft[],
  finalGroups: OptionGroupDraft[],
): Promise<Array<{ id: string }>> {
  const groupNames = new Set(finalGroups.map((g) => g.name));
  const created: Array<{ id: string }> = [];
  for (const v of variants) {
    const optionValues = v.optionValues
      .filter((ov) => groupNames.has(ov.groupName) && ov.value.trim().length > 0)
      .map((ov) => ({ groupName: ov.groupName, value: ov.value }));
    const result = await http.post<{ id: string }>(
      `/api/master-products/${masterProductId}/variants`,
      {
        sku: v.sku,
        optionValues: optionValues.length > 0 ? optionValues : undefined,
        price: v.price.trim() || undefined,
        stock: v.stock,
      },
    );
    created.push(result);
  }
  return created;
}
