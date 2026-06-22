"use client";

import {
  Accordion,
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Plus, Trash2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
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
  type Qoo10ProductRaw,
} from "@/entities/channel";
import { brandQueries } from "@/entities/brand";
import { shippingTemplateQueries } from "@/entities/shipping-template";
import { categoryQueries } from "@/entities/category";
import { PLATFORM_DEFS, type PlatformDef } from "@/shared/config";
import {
  ShopifyFormLabel as Label,
  ShopifyFormHelperText as HelperText,
  ShopifyNativeSelect as Select,
  ShopifyHtmlEditor,
} from "@/shared/ui/ShopifyFormPrimitives";
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

type TFn = (key: string, values?: Record<string, string | number>) => string;

function parseOptionGroups(
  variants: ChannelProductVariant[],
  t: TFn,
): {
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
    groups.push({ name: t("variants.optionN", { n: i + 1 }), values });
  }

  const variantOptionValues = splitValues.map((parts) =>
    parts.map((value, i) => ({
      groupName: groups[i]?.name ?? t("variants.optionN", { n: i + 1 }),
      value,
    })),
  );

  return { groups, variantOptionValues };
}

function checkPlatformReadiness(
  def: PlatformDef,
  commonValues: Record<string, string>,
  platformValues: Record<string, string>,
  t: TFn,
): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  const platformDescriptionKey =
    def.key === "QOO10_JP"
      ? "qoo10.ItemDescription"
      : def.key === "SHOPIFY"
        ? "shopify.descriptionHtml"
        : null;
  for (const commonKey of def.requiredCommonFields) {
    const val = commonValues[commonKey] ?? "";
    if (commonKey === "images") {
      if (!val) missing.push(t("images.title"));
    } else if (!val.trim()) {
      if (
        commonKey === "descriptionHtml" &&
        platformDescriptionKey &&
        (platformValues[platformDescriptionKey] ?? "").trim()
      ) {
        continue;
      }
      const labelMap: Record<string, string> = {
        title: t("basicInfo.name"),
        weightG: t("basicInfo.weightG"),
        descriptionHtml: t("basicInfo.descriptionHtml"),
        brand: t("basicInfo.brand"),
        hsCode: t("basicInfo.hsCode"),
        countryOfOrigin: t("origin.label"),
      };
      missing.push(labelMap[commonKey] ?? commonKey);
    }
  }
  for (const field of def.fields) {
    const isRequired =
      field.required ||
      (field.conditionalRequired &&
        field.conditionalRequired.values.includes(
          platformValues[field.conditionalRequired.dependsOn] ?? "",
        ));
    if (!isRequired) continue;
    const val = platformValues[field.key] ?? "";
    if (!val.trim()) missing.push(field.label);
  }
  return { ready: missing.length === 0, missing };
}

export function CreateMasterFromChannelModal({
  channelId,
  channelProduct,
  onClose,
  onSuccess,
}: Props): React.JSX.Element {
  const t = useTranslations("pages.salesProducts.createMasterModal");
  const [step, setStep] = useState<Step>("fill-info");
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: channelDetail } = useChannelProduct(
    channelId,
    channelProduct.channelItemId,
  );

  const channelVariants: ChannelProductVariant[] = useMemo(
    () => channelDetail?.variants ?? channelProduct.variants ?? [],
    [channelDetail?.variants, channelProduct.variants],
  );

  const initialParse = useMemo(
    () => parseOptionGroups(channelVariants, t as TFn),
    [channelVariants, t],
  );

  const [code, setCode] = useState<string>(
    channelProduct.sellerCode || `MP-${Date.now()}`,
  );
  const [title, setTitle] = useState<string>(channelProduct.title || "");
  const [brand, setBrand] = useState<string>("");
  const [noBrand, setNoBrand] = useState<boolean>(false);
  const [hsCode, setHsCode] = useState<string>("");
  const [originType, setOriginType] = useState<
    "domestic" | "overseas" | "other"
  >("domestic");
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>("대한민국");
  const [material, setMaterial] = useState<string>("");
  const [weightG, setWeightG] = useState<string>("");
  const [retailPrice, setRetailPrice] = useState<string>(
    channelProduct.price ?? "",
  );
  const [tagsInput, setTagsInput] = useState<string>("");
  const [descriptionHtml, setDescriptionHtml] = useState<string>("");

  const [platformValues, setPlatformValues] = useState<Record<string, string>>(
    () => {
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
    },
  );

  const setPlatformValue = (key: string, value: string): void => {
    setPlatformValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const raw = channelDetail?.raw as Qoo10ProductRaw | undefined;
    if (!raw) return;

    const mapping: Array<[string, unknown]> = [
      ["qoo10.SecondSubCat", raw.SecondSubCatCd],
      ["qoo10.OuterSecondSubCat", raw.OuterSecondSubCatCd],
      ["qoo10.ItemTitle", raw.ItemTitle],
      ["qoo10.PromotionName", raw.PromotionName],
      ["qoo10.SellerCode", raw.SellerCode],
      ["qoo10.AdultYN", raw.AdultYN],
      ["qoo10.BrandNo", raw.BrandNo],
      ["qoo10.ItemPrice", raw.ItemPrice],
      ["qoo10.RetailPrice", raw.RetailPrice],
      ["qoo10.TaxRate", raw.TaxRate],
      ["qoo10.ItemQty", raw.ItemQty],
      ["qoo10.ExpireDate", raw.ExpireDate],
      ["qoo10.StandardImage", raw.ImageUrl],
      ["qoo10.VideoURL", raw.VideoURL],
      ["qoo10.ItemDescription", raw.ItemDetail],
      ["qoo10.ShippingNo", raw.ShippingNo],
      ["qoo10.AvailableDateType", raw.AvailableDateType],
      ["qoo10.AvailableDateValue", raw.AvailableDateValue],
      ["qoo10.ProductionPlaceType", raw.ProductionPlaceType],
      ["qoo10.ProductionPlace", raw.ProductionPlace],
      ["qoo10.ModelNM", raw.ModelNM],
      ["qoo10.ManufactureDate", raw.ManufactureDate ?? raw.ManufacturerDate],
      ["qoo10.Material", raw.Material],
      ["qoo10.Weight", raw.Weight],
      ["qoo10.ContactInfo", raw.ContactInfo],
    ];

    setPlatformValues((prev) => {
      const next = { ...prev };
      for (const [key, value] of mapping) {
        if (value === undefined || value === null) continue;
        const str = String(value).trim();
        if (!str) continue;
        if ((next[key] ?? "").trim()) continue;
        next[key] = str;
      }
      return next;
    });
  }, [channelDetail?.raw]);

  useEffect(() => {
    const raw = channelDetail?.raw as Qoo10ProductRaw | undefined;
    if (!raw) return;
    const realTitle = (raw.ItemTitle ?? raw.PromotionName ?? "")
      .toString()
      .trim();
    if (!realTitle) return;
    setTitle((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === channelProduct.channelItemId)
        return realTitle;
      return prev;
    });
  }, [channelDetail?.raw, channelProduct.channelItemId]);

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
    return PLATFORM_DEFS.filter(
      (def) => def.apiAvailable && map[def.channelId],
    );
  }, [qoo10Connected, shopifyConnected]);

  // ── Qoo10 카테고리 / 브랜드 / 배송 템플릿 ────────────────────────
  const categoryQuery = useQuery(categoryQueries.all());
  const categories = categoryQuery.data?.ResultObject ?? [];

  const [mainCatCd, setMainCatCd] = useState("");
  const [midCatCd, setMidCatCd] = useState("");

  const mainCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const item of categories) {
      if (!map.has(item.CATE_L_CD))
        map.set(item.CATE_L_CD, { code: item.CATE_L_CD, name: item.CATE_L_NM });
    }
    return Array.from(map.values());
  }, [categories]);

  const midCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const item of categories) {
      if (item.CATE_L_CD !== mainCatCd) continue;
      if (!map.has(item.CATE_M_CD))
        map.set(item.CATE_M_CD, { code: item.CATE_M_CD, name: item.CATE_M_NM });
    }
    return Array.from(map.values());
  }, [categories, mainCatCd]);

  const secondSubCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const item of categories) {
      if (item.CATE_M_CD !== midCatCd) continue;
      if (!map.has(item.CATE_S_CD))
        map.set(item.CATE_S_CD, { code: item.CATE_S_CD, name: item.CATE_S_NM });
    }
    return Array.from(map.values());
  }, [categories, midCatCd]);

  const [brandKeyword, setBrandKeyword] = useState("");
  const [debouncedBrandKeyword, setDebouncedBrandKeyword] = useState("");
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [selectedBrandLabel, setSelectedBrandLabel] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedBrandKeyword(brandKeyword.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [brandKeyword]);
  const brandQuery = useQuery(brandQueries.search(debouncedBrandKeyword));
  const brandResults = brandQuery.data?.ResultObject ?? [];

  const shippingTemplateQuery = useQuery(shippingTemplateQueries.list());
  const shippingTemplates = shippingTemplateQuery.data?.ResultObject ?? [];
  const [isShippingDropdownOpen, setIsShippingDropdownOpen] = useState(false);
  const [shippingKeyword, setShippingKeyword] = useState("");

  // 카테고리 역복원: 저장된 SecondSubCat에서 대분류/중분류 자동 선택
  useEffect(() => {
    const saved = platformValues["qoo10.SecondSubCat"];
    if (saved && categories.length > 0 && !mainCatCd) {
      const match = categories.find((c) => c.CATE_S_CD === saved);
      if (match) {
        setMainCatCd(match.CATE_L_CD);
        setMidCatCd(match.CATE_M_CD);
      }
    }
  }, [platformValues, categories, mainCatCd]);

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

  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>(
    initialParse.groups,
  );

  const [variants, setVariants] = useState<VariantDraft[]>(() => {
    if (channelVariants.length === 0) {
      return [
        {
          sku: channelProduct.sellerCode || `${code}-1`,
          optionLabel: t("variantDefaults.groupName"),
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

  // 변형 합계 / 첫 변형 가격 → ItemQty / ItemPrice 자동 동기화
  const totalVariantStock = useMemo(
    () => variants.reduce((s, v) => s + (Number(v.stock) || 0), 0),
    [variants],
  );
  const firstVariantPrice = useMemo(
    () =>
      variants[0]?.price ? String(Math.round(Number(variants[0].price))) : "",
    [variants],
  );

  useEffect(() => {
    setPlatformValues((prev) => {
      if (prev["qoo10.ItemQty"] === String(totalVariantStock)) return prev;
      return { ...prev, "qoo10.ItemQty": String(totalVariantStock) };
    });
  }, [totalVariantStock]);

  useEffect(() => {
    if (firstVariantPrice === "") return;
    setPlatformValues((prev) => {
      if (prev["qoo10.ItemPrice"] === firstVariantPrice) return prev;
      return { ...prev, "qoo10.ItemPrice": firstVariantPrice };
    });
  }, [firstVariantPrice]);

  // 공통 필드 (플랫폼 readiness 판정용)
  const commonValues = useMemo<Record<string, string>>(
    () => ({
      title,
      brand,
      hsCode,
      countryOfOrigin,
      material,
      weightG,
      retailPrice,
      descriptionHtml,
      images: images.length > 0 ? "1" : "",
    }),
    [
      title,
      brand,
      hsCode,
      countryOfOrigin,
      material,
      weightG,
      retailPrice,
      descriptionHtml,
      images,
    ],
  );

  const readiness = useMemo(() => {
    const map: Record<string, { ready: boolean; missing: string[] }> = {};
    for (const def of connectedPlatforms) {
      map[def.key] = checkPlatformReadiness(
        def,
        commonValues,
        platformValues,
        t as TFn,
      );
    }
    return map;
  }, [connectedPlatforms, commonValues, platformValues, t]);

  const { mutateAsync: createMaster } = useCreateMasterProduct();
  const { mutateAsync: linkProduct } = useLinkChannelProduct(
    channelId,
    channelProduct.channelItemId,
  );

  const canSubmit =
    code.trim().length > 0 &&
    title.trim().length > 0 &&
    variants.length > 0 &&
    variants.every((v) => v.sku.trim().length > 0);

  const handleAddOptionGroup = (): void => {
    setOptionGroups((prev) => [
      ...prev,
      { name: t("variants.optionN", { n: prev.length + 1 }), values: [] },
    ]);
  };

  const handleRemoveOptionGroup = (idx: number): void => {
    const removed = optionGroups[idx];
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        optionValues: v.optionValues.filter(
          (ov) => ov.groupName !== removed?.name,
        ),
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
        optionValues: optionGroups.map((g) => ({
          groupName: g.name,
          value: "",
        })),
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
          ? v.optionValues.map((ov) =>
              ov.groupName === groupName ? { ...ov, value } : ov,
            )
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
      appToaster.create({ title: t("toast.missingRequired"), type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const attributes = buildAttributes();

      const common: Record<string, unknown> = {};
      if (!noBrand && brand.trim()) common.brand = brand.trim();
      if (hsCode.trim()) common.hsCode = hsCode.trim();
      if (countryOfOrigin.trim())
        common.countryOfOrigin = countryOfOrigin.trim();
      if (material.trim()) common.material = material.trim();
      if (weightG.trim()) common.weightG = Number(weightG);
      if (retailPrice.trim()) common.retailPrice = retailPrice.trim();
      if (tags.length > 0) common.tags = tags;
      if (descriptionHtml.trim())
        common.descriptionHtml = descriptionHtml.trim();
      const imgArr = images
        .filter((img) => img.url)
        .map((img, i) => ({
          url: img.url,
          altText: img.altText || undefined,
          order: i,
        }));
      if (imgArr.length > 0) common.images = imgArr;

      const merged: Record<string, unknown> = { ...attributes };
      if (Object.keys(common).length > 0) merged.common = common;

      const input: CreateMasterProductInput = {
        code: code.trim(),
        title: title.trim(),
        attributes: Object.keys(merged).length > 0 ? merged : undefined,
      };

      const master = await createMaster(input);

      const finalGroups = collectFinalOptionGroups();
      if (finalGroups.length > 0) {
        await setOptionGroupsForMaster(master.id, finalGroups);
      }

      const createdVariants = await addVariantsForMaster(
        master.id,
        variants,
        finalGroups,
      );

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
      const msg = err instanceof Error ? err.message : t("toast.createFailed");
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
            {step === "fill-info" && t("header.fillInfo")}
            {step === "result" &&
              (resultData ? t("header.resultSuccess") : t("header.resultFail"))}
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
                  {t("info.banner1", { title: channelProduct.title })}{" "}
                  {t("info.banner2")}
                </Text>
              </Box>

              <Stack gap={3}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {t("basicInfo.title")}
                </Text>
                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.code")}{" "}
                      <Text as="span" color="red.500">
                        *
                      </Text>
                    </Text>
                    <Input
                      size="sm"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={t("basicInfo.codePlaceholder")}
                    />
                  </Box>
                  <Box flex="2">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.name")}{" "}
                      <Text as="span" color="red.500">
                        *
                      </Text>
                    </Text>
                    <Input
                      size="sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("basicInfo.namePlaceholder")}
                    />
                  </Box>
                </Flex>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {t("basicInfo.brand")}
                  </Text>
                  <Flex align="center" gap={2} mb={2}>
                    <Checkbox.Root
                      checked={noBrand}
                      onCheckedChange={(e) => setNoBrand(!!e.checked)}
                      size="sm"
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs" color="gray.600">
                        {t("basicInfo.noBrand")}
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
                      placeholder={t("basicInfo.brandInputPlaceholder")}
                    />
                  )}
                </Box>
                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.hsCode")}
                    </Text>
                    <Input
                      size="sm"
                      value={hsCode}
                      onChange={(e) => setHsCode(e.target.value)}
                      placeholder={t("basicInfo.hsCodePlaceholder")}
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.retailPrice")}
                    </Text>
                    <Input
                      size="sm"
                      type="number"
                      value={retailPrice}
                      onChange={(e) => {
                        setRetailPrice(e.target.value);
                        setPlatformValue("qoo10.ItemPrice", e.target.value);
                      }}
                      placeholder={t("basicInfo.retailPricePlaceholder")}
                    />
                  </Box>
                </Flex>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {t("origin.label")}
                  </Text>
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
                            v === "domestic"
                              ? "1"
                              : v === "overseas"
                                ? "2"
                                : "3",
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
                        <option value="domestic">{t("origin.domestic")}</option>
                        <option value="overseas">{t("origin.overseas")}</option>
                        <option value="other">{t("origin.other")}</option>
                      </select>
                    </Box>
                    <Box flex="1">
                      <Input
                        size="sm"
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                        placeholder={
                          originType === "domestic"
                            ? t("origin.placeholderDomestic")
                            : originType === "overseas"
                              ? t("origin.placeholderOverseas")
                              : t("origin.placeholderOther")
                        }
                      />
                    </Box>
                  </Flex>
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.material")}
                    </Text>
                    <Input
                      size="sm"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder={t("basicInfo.materialPlaceholder")}
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      {t("basicInfo.weightG")}
                    </Text>
                    <Input
                      size="sm"
                      type="number"
                      value={weightG}
                      onChange={(e) => setWeightG(e.target.value)}
                      placeholder={t("basicInfo.weightGPlaceholder")}
                    />
                  </Box>
                </Flex>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {t("basicInfo.tags")}
                  </Text>
                  <Input
                    size="sm"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t("basicInfo.tagsPlaceholder")}
                  />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {t("basicInfo.tagsHelper")}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {t("basicInfo.descriptionHtml")}
                  </Text>
                  <Textarea
                    size="sm"
                    rows={6}
                    value={descriptionHtml}
                    onChange={(e) => setDescriptionHtml(e.target.value)}
                    placeholder={t("basicInfo.descriptionPlaceholder")}
                    fontFamily="mono"
                    fontSize="xs"
                  />
                </Box>
              </Stack>

              <Stack gap={3}>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                  {t("images.title")}
                </Text>
                {images.length > 0 && (
                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    overflow="hidden"
                  >
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
                            (e.target as HTMLImageElement).style.display =
                              "none";
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
                <Box
                  p={3}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                >
                  <Text fontSize="xs" fontWeight="medium" mb={2}>
                    {t("images.add")}
                  </Text>
                  <Flex gap={2}>
                    <Box flex="2">
                      <Input
                        size="sm"
                        bg="white"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder={t("images.urlPlaceholder")}
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
                        placeholder={t("images.alt")}
                      />
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddImage}
                      disabled={!newImageUrl.trim()}
                    >
                      {t("images.addButton")}
                    </Button>
                  </Flex>
                </Box>
              </Stack>

              {connectedPlatforms.length > 0 && (
                <Stack gap={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    {t("platformAttrs.title")}
                  </Text>
                  <Box px={3} py={2} bg="amber.50" borderRadius="md">
                    <Text fontSize="xs" color="amber.800">
                      {t("platformAttrs.description")}
                    </Text>
                  </Box>
                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    bg="white"
                    overflow="hidden"
                  >
                    <Accordion.Root multiple defaultValue={[]}>
                      {connectedPlatforms.map((def) => {
                        const { ready, missing } = readiness[def.key] ?? {
                          ready: false,
                          missing: [],
                        };
                        const hasAnyInput = def.fields.some((f) =>
                          (platformValues[f.key] ?? "").trim(),
                        );

                        const statusBadge =
                          hasAnyInput || ready ? (
                            ready ? (
                              <Box
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="medium"
                                bg="green.50"
                                color="green.700"
                                border="1px solid"
                                borderColor="green.200"
                              >
                                {t("platformAttrs.ready")}
                              </Box>
                            ) : (
                              <Box
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="medium"
                                bg="orange.50"
                                color="orange.700"
                                border="1px solid"
                                borderColor="orange.200"
                              >
                                {t("platformAttrs.missingCount", {
                                  count: missing.length,
                                })}
                              </Box>
                            )
                          ) : (
                            <Box
                              px={2}
                              py={0.5}
                              borderRadius="full"
                              fontSize="xs"
                              color="gray.400"
                              border="1px solid"
                              borderColor="gray.200"
                            >
                              {t("platformAttrs.missingShort")}
                            </Box>
                          );

                        const platformColors: Record<
                          string,
                          { bg: string; color: string }
                        > = {
                          orange: { bg: "orange.100", color: "orange.700" },
                          green: { bg: "green.100", color: "green.700" },
                          red: { bg: "red.100", color: "red.700" },
                          blue: { bg: "blue.100", color: "blue.700" },
                        };
                        const pc = platformColors[def.color] ?? {
                          bg: "gray.100",
                          color: "gray.700",
                        };

                        return (
                          <Accordion.Item
                            key={def.key}
                            value={def.key}
                            borderTopWidth="1px"
                            borderColor="gray.100"
                            _first={{ borderTopWidth: 0 }}
                          >
                            <Accordion.ItemTrigger
                              px={4}
                              py={3}
                              _hover={{ bg: "gray.50" }}
                            >
                              <Flex align="center" gap={3} flex="1" minW={0}>
                                <Box
                                  px={2.5}
                                  py={0.5}
                                  borderRadius="md"
                                  fontSize="xs"
                                  fontWeight="bold"
                                  bg={pc.bg}
                                  color={pc.color}
                                  flexShrink={0}
                                >
                                  {def.label}
                                </Box>
                                {statusBadge}
                                {!ready &&
                                  hasAnyInput &&
                                  missing.length > 0 && (
                                    <Text
                                      fontSize="xs"
                                      color="gray.400"
                                      truncate
                                    >
                                      {t("platformAttrs.missingList", {
                                        fields: missing.join(" · "),
                                      })}
                                    </Text>
                                  )}
                              </Flex>
                              <Accordion.ItemIndicator />
                            </Accordion.ItemTrigger>

                            <Accordion.ItemContent>
                              <Box px={4} pb={5} pt={2}>
                                {hasAnyInput &&
                                  !ready &&
                                  missing.length > 0 && (
                                    <Box
                                      mb={4}
                                      px={4}
                                      py={3}
                                      bg="orange.50"
                                      borderWidth="1px"
                                      borderColor="orange.200"
                                      borderRadius="md"
                                    >
                                      <Text
                                        fontSize="sm"
                                        color="orange.700"
                                        fontWeight="medium"
                                      >
                                        {t("platformAttrs.missingHeader")}
                                      </Text>
                                      <Text
                                        fontSize="xs"
                                        color="orange.600"
                                        mt={1}
                                      >
                                        {missing.join(", ")}
                                      </Text>
                                    </Box>
                                  )}

                                <Stack gap={4}>
                                  {def.key === "QOO10_JP" && (
                                    <Box>
                                      <Box
                                        mt={2}
                                        mb={3}
                                        pb={2}
                                        borderBottomWidth="1px"
                                        borderColor="gray.200"
                                      >
                                        <Text
                                          fontSize="xs"
                                          fontWeight="semibold"
                                          color="gray.500"
                                          textTransform="uppercase"
                                          letterSpacing="wide"
                                        >
                                          {t("qoo10.category")}
                                        </Text>
                                      </Box>
                                      {categoryQuery.isLoading ? (
                                        <Stack gap={3}>
                                          <Skeleton height="32px" />
                                          <Skeleton height="32px" />
                                          <Skeleton height="32px" />
                                        </Stack>
                                      ) : (
                                        <Stack gap={3}>
                                          <Box>
                                            <Label required>
                                              {t("qoo10.mainCat")}
                                            </Label>
                                            <Select
                                              value={mainCatCd}
                                              onChange={(e) => {
                                                setMainCatCd(e.target.value);
                                                setMidCatCd("");
                                                setPlatformValue(
                                                  "qoo10.SecondSubCat",
                                                  "",
                                                );
                                              }}
                                            >
                                              <option value="">
                                                {t("qoo10.mainCatPlaceholder")}
                                              </option>
                                              {mainCatOptions.map((opt) => (
                                                <option
                                                  key={opt.code}
                                                  value={opt.code}
                                                >
                                                  {opt.name}
                                                </option>
                                              ))}
                                            </Select>
                                          </Box>
                                          <Box>
                                            <Label required>
                                              {t("qoo10.subCat")}
                                            </Label>
                                            <Select
                                              value={midCatCd}
                                              onChange={(e) => {
                                                setMidCatCd(e.target.value);
                                                setPlatformValue(
                                                  "qoo10.SecondSubCat",
                                                  "",
                                                );
                                              }}
                                              disabled={!mainCatCd}
                                            >
                                              <option value="">
                                                {t("qoo10.subCatPlaceholder")}
                                              </option>
                                              {midCatOptions.map((opt) => (
                                                <option
                                                  key={opt.code}
                                                  value={opt.code}
                                                >
                                                  {opt.name}
                                                </option>
                                              ))}
                                            </Select>
                                          </Box>
                                          <Box>
                                            <Label required>
                                              {t("qoo10.secondSubCat")}
                                            </Label>
                                            <Select
                                              value={
                                                platformValues[
                                                  "qoo10.SecondSubCat"
                                                ] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  "qoo10.SecondSubCat",
                                                  e.target.value,
                                                )
                                              }
                                              disabled={!midCatCd}
                                            >
                                              <option value="">
                                                {t(
                                                  "qoo10.secondSubCatPlaceholder",
                                                )}
                                              </option>
                                              {secondSubCatOptions.map(
                                                (opt) => (
                                                  <option
                                                    key={opt.code}
                                                    value={opt.code}
                                                  >
                                                    {opt.name}
                                                  </option>
                                                ),
                                              )}
                                            </Select>
                                            {platformValues[
                                              "qoo10.SecondSubCat"
                                            ] && (
                                              <HelperText>
                                                {t("qoo10.codeLine", {
                                                  code: platformValues[
                                                    "qoo10.SecondSubCat"
                                                  ],
                                                })}
                                              </HelperText>
                                            )}
                                          </Box>
                                        </Stack>
                                      )}
                                    </Box>
                                  )}

                                  {def.key === "QOO10_JP" && (
                                    <Box>
                                      <Box
                                        mt={2}
                                        mb={3}
                                        pb={2}
                                        borderBottomWidth="1px"
                                        borderColor="gray.200"
                                      >
                                        <Text
                                          fontSize="xs"
                                          fontWeight="semibold"
                                          color="gray.500"
                                          textTransform="uppercase"
                                          letterSpacing="wide"
                                        >
                                          {t("qoo10.brand")}
                                        </Text>
                                      </Box>
                                      <Label>{t("qoo10.brandSearch")}</Label>
                                      <Flex align="center" gap={2} mb={2}>
                                        <Checkbox.Root
                                          checked={
                                            platformValues["qoo10.NoBrand"] ===
                                            "true"
                                          }
                                          onCheckedChange={(e) => {
                                            if (e.checked) {
                                              setPlatformValue(
                                                "qoo10.NoBrand",
                                                "true",
                                              );
                                              setPlatformValue(
                                                "qoo10.BrandNo",
                                                "",
                                              );
                                              setBrandKeyword("");
                                              setSelectedBrandLabel("");
                                              setIsBrandDropdownOpen(false);
                                            } else {
                                              setPlatformValue(
                                                "qoo10.NoBrand",
                                                "",
                                              );
                                            }
                                          }}
                                          size="sm"
                                        >
                                          <Checkbox.HiddenInput />
                                          <Checkbox.Control />
                                          <Checkbox.Label
                                            fontSize="sm"
                                            color="gray.600"
                                          >
                                            {t("qoo10.brandNone")}
                                          </Checkbox.Label>
                                        </Checkbox.Root>
                                      </Flex>
                                      {platformValues["qoo10.NoBrand"] !==
                                        "true" && (
                                        <Box position="relative">
                                          <Input
                                            size="sm"
                                            value={brandKeyword}
                                            onChange={(e) => {
                                              setBrandKeyword(e.target.value);
                                              setIsBrandDropdownOpen(true);
                                              setPlatformValue(
                                                "qoo10.BrandNo",
                                                "",
                                              );
                                              setSelectedBrandLabel("");
                                            }}
                                            onFocus={() =>
                                              setIsBrandDropdownOpen(true)
                                            }
                                            placeholder={t(
                                              "qoo10.brandSearchPlaceholder",
                                            )}
                                            autoComplete="off"
                                          />
                                          {isBrandDropdownOpen &&
                                            debouncedBrandKeyword.length >=
                                              2 && (
                                              <Box
                                                position="absolute"
                                                top="100%"
                                                left={0}
                                                right={0}
                                                zIndex={10}
                                                mt={1}
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="md"
                                                bg="white"
                                                shadow="md"
                                                maxH="200px"
                                                overflowY="auto"
                                                p={2}
                                              >
                                                {brandQuery.isLoading ? (
                                                  <Stack gap={2}>
                                                    <Skeleton height="28px" />
                                                    <Skeleton height="28px" />
                                                  </Stack>
                                                ) : brandResults.length ===
                                                  0 ? (
                                                  <Text
                                                    fontSize="sm"
                                                    color="gray.500"
                                                    py={2}
                                                    textAlign="center"
                                                  >
                                                    {t("qoo10.brandNoResult")}
                                                  </Text>
                                                ) : (
                                                  <Stack gap={1}>
                                                    {brandResults.map((b) => {
                                                      const label = `${b.M_B_NM} (${b.M_B_NM_EN})`;
                                                      const isSelected =
                                                        platformValues[
                                                          "qoo10.BrandNo"
                                                        ] === b.M_B_NO;
                                                      return (
                                                        <Button
                                                          key={b.M_B_NO}
                                                          type="button"
                                                          variant="ghost"
                                                          justifyContent="flex-start"
                                                          px={2}
                                                          size="sm"
                                                          bg={
                                                            isSelected
                                                              ? "gray.100"
                                                              : "transparent"
                                                          }
                                                          onClick={() => {
                                                            setPlatformValue(
                                                              "qoo10.BrandNo",
                                                              b.M_B_NO,
                                                            );
                                                            setBrandKeyword(
                                                              label,
                                                            );
                                                            setSelectedBrandLabel(
                                                              label,
                                                            );
                                                            setIsBrandDropdownOpen(
                                                              false,
                                                            );
                                                          }}
                                                        >
                                                          <Text
                                                            fontSize="sm"
                                                            fontWeight={
                                                              isSelected
                                                                ? "semibold"
                                                                : "normal"
                                                            }
                                                          >
                                                            {label}
                                                          </Text>
                                                        </Button>
                                                      );
                                                    })}
                                                  </Stack>
                                                )}
                                              </Box>
                                            )}
                                          {platformValues["qoo10.BrandNo"] &&
                                            selectedBrandLabel && (
                                              <HelperText>
                                                {t("qoo10.brandSelected", {
                                                  label: selectedBrandLabel,
                                                })}
                                              </HelperText>
                                            )}
                                        </Box>
                                      )}
                                    </Box>
                                  )}

                                  {def.fields
                                    .filter((field) => {
                                      if (def.key !== "QOO10_JP") return true;
                                      const skipKeys = [
                                        "qoo10.SecondSubCat",
                                        "qoo10.BrandNo",
                                      ];
                                      return !skipKeys.includes(field.key);
                                    })
                                    .map((field) => {
                                      const isConditionallyRequired =
                                        !!field.conditionalRequired &&
                                        field.conditionalRequired.values.includes(
                                          platformValues[
                                            field.conditionalRequired.dependsOn
                                          ] ?? "",
                                        );

                                      if (
                                        field.key === "qoo10.AvailableDateType"
                                      ) {
                                        return (
                                          <Box key={field.key}>
                                            {field.sectionHeader && (
                                              <Box
                                                mt={2}
                                                mb={3}
                                                pb={2}
                                                borderBottomWidth="1px"
                                                borderColor="gray.200"
                                              >
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.500"
                                                  textTransform="uppercase"
                                                  letterSpacing="wide"
                                                >
                                                  {field.sectionHeader}
                                                </Text>
                                              </Box>
                                            )}
                                            <Label required>
                                              {t("qoo10.deliveryType")}
                                            </Label>
                                            <Select
                                              value={
                                                platformValues[
                                                  "qoo10.AvailableDateType"
                                                ] ?? "0"
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  "qoo10.AvailableDateType",
                                                  e.target.value,
                                                )
                                              }
                                            >
                                              <option value="0">
                                                {t("qoo10.deliveryNormal")}
                                              </option>
                                              <option value="1">
                                                {t("qoo10.deliveryPrep")}
                                              </option>
                                              <option value="2">
                                                {t("qoo10.deliveryRelease")}
                                              </option>
                                              <option value="3">
                                                {t("qoo10.deliverySameDay")}
                                              </option>
                                            </Select>
                                          </Box>
                                        );
                                      }

                                      if (
                                        field.key === "qoo10.AvailableDateValue"
                                      ) {
                                        const dateType =
                                          platformValues[
                                            "qoo10.AvailableDateType"
                                          ] ?? "0";
                                        const placeholder =
                                          dateType === "0"
                                            ? t("qoo10.deliveryHintNormal")
                                            : dateType === "1"
                                              ? t("qoo10.deliveryHintPrep")
                                              : dateType === "2"
                                                ? t("qoo10.deliveryHintRelease")
                                                : t(
                                                    "qoo10.deliveryHintSameDay",
                                                  );
                                        const isRequired = dateType !== "0";
                                        return (
                                          <Box key={field.key}>
                                            <Label required={isRequired}>
                                              {t("qoo10.deliveryValue")}
                                            </Label>
                                            <Input
                                              size="sm"
                                              value={
                                                platformValues[
                                                  "qoo10.AvailableDateValue"
                                                ] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  "qoo10.AvailableDateValue",
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={placeholder}
                                            />
                                            {dateType === "0" && (
                                              <HelperText>
                                                {t(
                                                  "qoo10.deliveryNormalHelper",
                                                )}
                                              </HelperText>
                                            )}
                                          </Box>
                                        );
                                      }

                                      if (field.key === "qoo10.ItemQty") {
                                        return (
                                          <Box key={field.key}>
                                            {field.sectionHeader && (
                                              <Box
                                                mt={2}
                                                mb={3}
                                                pb={2}
                                                borderBottomWidth="1px"
                                                borderColor="gray.200"
                                              >
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.500"
                                                  textTransform="uppercase"
                                                  letterSpacing="wide"
                                                >
                                                  {field.sectionHeader}
                                                </Text>
                                              </Box>
                                            )}
                                            <Label required>
                                              {t("qoo10.stock")}
                                            </Label>
                                            <Input
                                              size="sm"
                                              type="number"
                                              value={
                                                platformValues[
                                                  "qoo10.ItemQty"
                                                ] ?? "0"
                                              }
                                              readOnly
                                              bg="gray.50"
                                              color="gray.600"
                                              cursor="default"
                                            />
                                            <HelperText>
                                              {t("qoo10.stockAutoHint", {
                                                count: totalVariantStock,
                                              })}
                                            </HelperText>
                                          </Box>
                                        );
                                      }

                                      if (field.key === "qoo10.ItemPrice") {
                                        return (
                                          <Box key={field.key}>
                                            {field.sectionHeader && (
                                              <Box
                                                mt={2}
                                                mb={3}
                                                pb={2}
                                                borderBottomWidth="1px"
                                                borderColor="gray.200"
                                              >
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.500"
                                                  textTransform="uppercase"
                                                  letterSpacing="wide"
                                                >
                                                  {field.sectionHeader}
                                                </Text>
                                              </Box>
                                            )}
                                            <Label required>
                                              {t("qoo10.price")}
                                            </Label>
                                            <Input
                                              size="sm"
                                              type="number"
                                              value={
                                                platformValues[
                                                  "qoo10.ItemPrice"
                                                ] ?? ""
                                              }
                                              readOnly
                                              bg="gray.50"
                                              color="gray.600"
                                              cursor="default"
                                            />
                                            <HelperText>
                                              {t("qoo10.priceAutoHint")}
                                              {firstVariantPrice !== "" &&
                                                ` (¥${firstVariantPrice})`}
                                            </HelperText>
                                          </Box>
                                        );
                                      }

                                      if (field.key === "qoo10.ShippingNo") {
                                        const selectedNo =
                                          platformValues["qoo10.ShippingNo"] ??
                                          "";
                                        const shippingTypeLabel: Record<
                                          string,
                                          string
                                        > = {
                                          X: t("qoo10.shippingTypeX"),
                                          F: t("qoo10.shippingTypeF"),
                                          M: t("qoo10.shippingTypeM"),
                                          W: t("qoo10.shippingTypeW"),
                                          D: t("qoo10.shippingTypeD"),
                                          R: t("qoo10.shippingTypeR"),
                                        };
                                        const selectedTemplate =
                                          shippingTemplates.find(
                                            (tpl) =>
                                              String(tpl.ShippingNo) ===
                                              selectedNo,
                                          );
                                        const filteredTemplates =
                                          shippingKeyword.trim()
                                            ? shippingTemplates.filter(
                                                (tpl) =>
                                                  String(
                                                    tpl.ShippingNo,
                                                  ).includes(shippingKeyword) ||
                                                  (
                                                    tpl.transcName ?? ""
                                                  ).includes(shippingKeyword) ||
                                                  (
                                                    shippingTypeLabel[
                                                      tpl.ShippingType
                                                    ] ?? ""
                                                  ).includes(shippingKeyword),
                                              )
                                            : shippingTemplates;
                                        return (
                                          <Box key={field.key}>
                                            {field.sectionHeader && (
                                              <Box
                                                mt={2}
                                                mb={3}
                                                pb={2}
                                                borderBottomWidth="1px"
                                                borderColor="gray.200"
                                              >
                                                <Text
                                                  fontSize="xs"
                                                  fontWeight="semibold"
                                                  color="gray.500"
                                                  textTransform="uppercase"
                                                  letterSpacing="wide"
                                                >
                                                  {field.sectionHeader}
                                                </Text>
                                              </Box>
                                            )}
                                            <Label required>
                                              {t("qoo10.shippingTemplate")}
                                            </Label>
                                            <Box position="relative">
                                              <Input
                                                size="sm"
                                                placeholder={
                                                  shippingTemplateQuery.isLoading
                                                    ? t("qoo10.shippingLoading")
                                                    : shippingTemplateQuery.isError
                                                      ? t(
                                                          "qoo10.shippingManualPlaceholder",
                                                        )
                                                      : shippingTemplates.length ===
                                                          0
                                                        ? t(
                                                            "qoo10.shippingManualPlaceholder",
                                                          )
                                                        : t(
                                                            "qoo10.shippingSearchPlaceholder",
                                                          )
                                                }
                                                value={
                                                  shippingTemplates.length === 0
                                                    ? (selectedNo ?? "")
                                                    : isShippingDropdownOpen
                                                      ? shippingKeyword
                                                      : selectedTemplate
                                                        ? `No.${selectedTemplate.ShippingNo} · ${shippingTypeLabel[selectedTemplate.ShippingType] ?? selectedTemplate.ShippingType} · ${selectedTemplate.transcName}`
                                                        : selectedNo === "0"
                                                          ? t(
                                                              "qoo10.shippingFreeRow",
                                                            )
                                                          : selectedNo
                                                            ? `No. ${selectedNo}`
                                                            : ""
                                                }
                                                onFocus={() => {
                                                  if (
                                                    shippingTemplates.length > 0
                                                  ) {
                                                    setIsShippingDropdownOpen(
                                                      true,
                                                    );
                                                    setShippingKeyword("");
                                                  }
                                                }}
                                                onChange={(e) => {
                                                  if (
                                                    shippingTemplates.length ===
                                                    0
                                                  ) {
                                                    setPlatformValue(
                                                      "qoo10.ShippingNo",
                                                      e.target.value,
                                                    );
                                                    if (
                                                      !platformValues[
                                                        "qoo10.AvailableDateType"
                                                      ]
                                                    ) {
                                                      setPlatformValue(
                                                        "qoo10.AvailableDateType",
                                                        "0",
                                                      );
                                                    }
                                                  } else {
                                                    setShippingKeyword(
                                                      e.target.value,
                                                    );
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  if (
                                                    shippingTemplates.length ===
                                                      0 &&
                                                    e.target.value.trim()
                                                  ) {
                                                    setPlatformValue(
                                                      "qoo10.ShippingNo",
                                                      e.target.value.trim(),
                                                    );
                                                    if (
                                                      !platformValues[
                                                        "qoo10.AvailableDateType"
                                                      ]
                                                    ) {
                                                      setPlatformValue(
                                                        "qoo10.AvailableDateType",
                                                        "0",
                                                      );
                                                    }
                                                  }
                                                  window.setTimeout(
                                                    () =>
                                                      setIsShippingDropdownOpen(
                                                        false,
                                                      ),
                                                    150,
                                                  );
                                                }}
                                                readOnly={
                                                  shippingTemplateQuery.isLoading
                                                }
                                              />
                                              {isShippingDropdownOpen &&
                                                shippingTemplates.length >
                                                  0 && (
                                                  <Box
                                                    position="absolute"
                                                    top="100%"
                                                    left={0}
                                                    right={0}
                                                    zIndex={200}
                                                    bg="white"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    borderRadius="md"
                                                    boxShadow="md"
                                                    maxH="220px"
                                                    overflowY="auto"
                                                    mt={1}
                                                  >
                                                    <Box
                                                      px={3}
                                                      py={2}
                                                      cursor="pointer"
                                                      fontSize="sm"
                                                      _hover={{ bg: "gray.50" }}
                                                      bg={
                                                        selectedNo === "0"
                                                          ? "orange.50"
                                                          : "white"
                                                      }
                                                      onMouseDown={() => {
                                                        setPlatformValue(
                                                          "qoo10.ShippingNo",
                                                          "0",
                                                        );
                                                        setIsShippingDropdownOpen(
                                                          false,
                                                        );
                                                      }}
                                                    >
                                                      <Text fontWeight="medium">
                                                        {t(
                                                          "qoo10.shippingFreeRow",
                                                        )}
                                                      </Text>
                                                    </Box>
                                                    {filteredTemplates.length ===
                                                      0 && (
                                                      <Box
                                                        px={3}
                                                        py={2}
                                                        fontSize="sm"
                                                        color="gray.400"
                                                      >
                                                        {t(
                                                          "qoo10.shippingNoResult",
                                                        )}
                                                      </Box>
                                                    )}
                                                    {filteredTemplates.map(
                                                      (tpl) => (
                                                        <Box
                                                          key={tpl.ShippingNo}
                                                          px={3}
                                                          py={2}
                                                          cursor="pointer"
                                                          fontSize="sm"
                                                          _hover={{
                                                            bg: "gray.50",
                                                          }}
                                                          bg={
                                                            selectedNo ===
                                                            String(
                                                              tpl.ShippingNo,
                                                            )
                                                              ? "orange.50"
                                                              : "white"
                                                          }
                                                          onMouseDown={() => {
                                                            setPlatformValue(
                                                              "qoo10.ShippingNo",
                                                              String(
                                                                tpl.ShippingNo,
                                                              ),
                                                            );
                                                            if (
                                                              !platformValues[
                                                                "qoo10.AvailableDateType"
                                                              ]
                                                            ) {
                                                              setPlatformValue(
                                                                "qoo10.AvailableDateType",
                                                                "0",
                                                              );
                                                            }
                                                            setIsShippingDropdownOpen(
                                                              false,
                                                            );
                                                          }}
                                                        >
                                                          <Text fontWeight="medium">
                                                            No.{tpl.ShippingNo}{" "}
                                                            ·{" "}
                                                            {shippingTypeLabel[
                                                              tpl.ShippingType
                                                            ] ??
                                                              tpl.ShippingType}{" "}
                                                            · {tpl.transcName}
                                                          </Text>
                                                          <Text
                                                            fontSize="xs"
                                                            color="gray.500"
                                                          >
                                                            {t(
                                                              "qoo10.shippingFeeLine",
                                                              {
                                                                fee: tpl.ShippingFee,
                                                              },
                                                            )}
                                                            {tpl.ShippingType ===
                                                            "M"
                                                              ? ` · ${t("qoo10.shippingFreeCondition", { amount: tpl.FreeCondition })}`
                                                              : ""}
                                                          </Text>
                                                        </Box>
                                                      ),
                                                    )}
                                                  </Box>
                                                )}
                                            </Box>
                                            {selectedNo === "0" && (
                                              <HelperText>
                                                {t("qoo10.shippingFreeHelper")}
                                              </HelperText>
                                            )}
                                            {shippingTemplateQuery.isError && (
                                              <HelperText>
                                                {t("qoo10.shippingApiError")}
                                              </HelperText>
                                            )}
                                          </Box>
                                        );
                                      }

                                      return (
                                        <Box key={field.key}>
                                          {field.sectionHeader && (
                                            <Box
                                              mt={2}
                                              mb={3}
                                              pb={2}
                                              borderBottomWidth="1px"
                                              borderColor="gray.200"
                                            >
                                              <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                              >
                                                {field.sectionHeader}
                                              </Text>
                                            </Box>
                                          )}
                                          {field.type !== "checkbox" && (
                                            <Label
                                              required={
                                                field.required ||
                                                isConditionallyRequired
                                              }
                                            >
                                              {field.label}
                                            </Label>
                                          )}
                                          {field.type === "select" &&
                                          field.options ? (
                                            <Select
                                              value={
                                                platformValues[field.key] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  field.key,
                                                  e.target.value,
                                                )
                                              }
                                            >
                                              <option value="">
                                                {t("field.selectPlaceholder")}
                                              </option>
                                              {field.options.map((opt) => (
                                                <option
                                                  key={opt.value}
                                                  value={opt.value}
                                                >
                                                  {opt.label}
                                                </option>
                                              ))}
                                            </Select>
                                          ) : field.conditionalOptions &&
                                            field.conditionalOptions.values.includes(
                                              String(
                                                platformValues[
                                                  field.conditionalOptions
                                                    .dependsOn
                                                ] ?? "",
                                              ),
                                            ) ? (
                                            <Select
                                              value={
                                                platformValues[field.key] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  field.key,
                                                  e.target.value,
                                                )
                                              }
                                            >
                                              <option value="">
                                                {t("field.noneOption")}
                                              </option>
                                              {field.conditionalOptions.options.map(
                                                (opt) => (
                                                  <option
                                                    key={opt.value}
                                                    value={opt.value}
                                                  >
                                                    {opt.label}
                                                  </option>
                                                ),
                                              )}
                                            </Select>
                                          ) : field.type === "checkbox" ? (
                                            <Flex align="center" gap={2} mt={1}>
                                              <Checkbox.Root
                                                checked={
                                                  platformValues[field.key] ===
                                                  "true"
                                                }
                                                onCheckedChange={(e) =>
                                                  setPlatformValue(
                                                    field.key,
                                                    e.checked
                                                      ? "true"
                                                      : "false",
                                                  )
                                                }
                                                size="sm"
                                              >
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control />
                                                <Checkbox.Label
                                                  fontSize="sm"
                                                  color="gray.700"
                                                >
                                                  {field.label}
                                                </Checkbox.Label>
                                              </Checkbox.Root>
                                            </Flex>
                                          ) : field.type === "textarea" &&
                                            (field.key ===
                                              "qoo10.ItemDescription" ||
                                              field.key ===
                                                "shopify.descriptionHtml") ? (
                                            <ShopifyHtmlEditor
                                              value={
                                                platformValues[field.key] ?? ""
                                              }
                                              onChange={(v) =>
                                                setPlatformValue(field.key, v)
                                              }
                                            />
                                          ) : field.type === "textarea" ? (
                                            <Textarea
                                              size="sm"
                                              rows={3}
                                              value={
                                                platformValues[field.key] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  field.key,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={field.placeholder}
                                            />
                                          ) : (
                                            <Input
                                              size="sm"
                                              type={
                                                field.type === "number"
                                                  ? "number"
                                                  : "text"
                                              }
                                              value={
                                                platformValues[field.key] ?? ""
                                              }
                                              onChange={(e) =>
                                                setPlatformValue(
                                                  field.key,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={field.placeholder}
                                              maxLength={field.maxLength}
                                            />
                                          )}
                                          {field.note && (
                                            <HelperText>
                                              {field.note}
                                            </HelperText>
                                          )}
                                        </Box>
                                      );
                                    })}
                                </Stack>
                              </Box>
                            </Accordion.ItemContent>
                          </Accordion.Item>
                        );
                      })}
                    </Accordion.Root>
                  </Box>
                </Stack>
              )}

              <Stack gap={3}>
                <Flex align="center" justify="space-between">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    {t("optionGroups.title")}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleAddOptionGroup}
                  >
                    <Plus size={12} /> {t("optionGroups.add")}
                  </Button>
                </Flex>
                {optionGroups.length === 0 ? (
                  <Text fontSize="xs" color="gray.400">
                    {t("optionGroups.empty")}
                  </Text>
                ) : (
                  <Stack gap={2}>
                    {optionGroups.map((g, i) => (
                      <Flex key={i} gap={2} align="center">
                        <Input
                          size="sm"
                          flex="1"
                          value={g.name}
                          onChange={(e) =>
                            handleUpdateGroupName(i, e.target.value)
                          }
                          placeholder={t("optionGroups.namePlaceholder")}
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
                    {t("variants.title")}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleAddVariant}
                  >
                    <Plus size={12} /> {t("variants.add")}
                  </Button>
                </Flex>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>SKU *</Table.ColumnHeader>
                      {optionGroups.map((g, i) => (
                        <Table.ColumnHeader key={i}>
                          {g.name || t("variants.optionN", { n: i + 1 })}
                        </Table.ColumnHeader>
                      ))}
                      <Table.ColumnHeader>
                        {t("variants.price")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {t("variants.stock")}
                      </Table.ColumnHeader>
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
                            onChange={(e) =>
                              handleUpdateVariantField(i, "sku", e.target.value)
                            }
                          />
                        </Table.Cell>
                        {optionGroups.map((g, gi) => {
                          const ov = v.optionValues.find(
                            (o) => o.groupName === g.name,
                          );
                          return (
                            <Table.Cell key={gi}>
                              <Input
                                size="xs"
                                value={ov?.value ?? ""}
                                onChange={(e) =>
                                  handleUpdateVariantOptionValue(
                                    i,
                                    g.name,
                                    e.target.value,
                                  )
                                }
                              />
                            </Table.Cell>
                          );
                        })}
                        <Table.Cell>
                          <Input
                            size="xs"
                            value={v.price}
                            onChange={(e) =>
                              handleUpdateVariantField(
                                i,
                                "price",
                                e.target.value,
                              )
                            }
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Input
                            size="xs"
                            type="number"
                            value={v.stock}
                            onChange={(e) =>
                              handleUpdateVariantField(
                                i,
                                "stock",
                                Number(e.target.value) || 0,
                              )
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
                    {t("variants.channelMapHint", {
                      count: channelVariants.length,
                    })}
                  </Text>
                )}
              </Stack>
            </Stack>
          )}

          {step === "result" && resultData && (
            <Stack gap={3} align="center" py={6}>
              <CheckCircle size={48} color="var(--chakra-colors-green-500)" />
              <Text fontWeight="semibold" fontSize="lg">
                {t("result.successTitle")}
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                {t("result.successDescription", {
                  title: channelProduct.title,
                })}
              </Text>
              <Text fontSize="sm">
                {t("result.mapped", { count: resultData.linkedVariantCount })}
              </Text>
            </Stack>
          )}

          {step === "result" && !resultData && (
            <Stack gap={3} align="center" py={6}>
              <XCircle size={48} color="var(--chakra-colors-red-500)" />
              <Text fontWeight="semibold">{t("result.failTitle")}</Text>
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
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                {t("footer.cancel")}
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
                {t("footer.submit")}
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
              {t("footer.confirm")}
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
  await http.put(`/api/master-products/${masterProductId}/option-groups`, {
    groups,
  });
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
      .filter(
        (ov) => groupNames.has(ov.groupName) && ov.value.trim().length > 0,
      )
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
