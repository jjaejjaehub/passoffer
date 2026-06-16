"use client";

import {
  Accordion,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { brandQueries } from "@/entities/brand";
import { shippingTemplateQueries } from "@/entities/shipping-template";
import { categoryQueries } from "@/entities/category";
import {
  masterProductQueries,
  masterProductsQueryRoot,
  useAddVariant,
  useCreateMasterProduct,
  useDeleteVariant,
  useMasterProduct,
  useUpdateMasterProduct,
  useUpdateVariant,
  usePushMasterStockToAllChannels,
  usePullSalesFromAllChannels,
  usePushStockToChannel,
  useSyncProductInfoToChannel,
  usePullSalesFromChannel,
} from "@/entities/master-product";
import type { OptionAxisState } from "@/entities/product";
import { SkuPickerCell } from "@/entities/sku";
import { ListToChannelModal } from "@/features/list-to-channel";
import { SyncConfirmModal } from "@/features/sync-listed-products";
import { OptionAxisForm } from "@/features/product-edit";
import { http } from "@/shared/api";
import { PLATFORM_DEFS, type PlatformDef, ROUTES } from "@/shared/config";
import { useChannelApiKey } from "@/shared/lib/useChannelApiKey";
import { PageHeader } from "@/shared/ui";
import {
  ShopifyFormSection as Section,
  ShopifyFormLabel as Label,
  ShopifyFormHelperText as HelperText,
  ShopifyFormErrorMsg as ErrorMsg,
  ShopifyNativeSelect as Select,
  ShopifyHtmlEditor,
} from "@/shared/ui/ShopifyFormPrimitives";
import { appToaster } from "@/shared/ui/app-toaster";

// ── 타입 ──────────────────────────────────────────────────────────

interface ImageRow {
  url: string;
  altText: string;
}

const MASTER_MAX_AXES = 3;

interface VariantOptionCell {
  groupName: string;
  value: string;
}

interface DraftAttachedSku {
  skuId: string;
  code: string;
  qty: number;
}

interface MasterVariantRow {
  /** 테이블 표시용 임시 key (저장 전) */
  _key: string;
  options: VariantOptionCell[];
  price: string;
  attachedSkus: DraftAttachedSku[];
}

interface Props {
  id?: string;
}

// ── 유틸 ──────────────────────────────────────────────────────────

function genKey(): string {
  return `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function cartesian(axes: OptionAxisState[]): MasterVariantRow[] {
  if (axes.length === 0) return [];
  if (axes.some((a) => a.values.length === 0)) return [];

  // N축 데카르트 곱
  let combos: VariantOptionCell[][] = [[]];
  for (const ax of axes) {
    const next: VariantOptionCell[][] = [];
    for (const prefix of combos) {
      for (const v of ax.values) {
        next.push([...prefix, { groupName: ax.name, value: v }]);
      }
    }
    combos = next;
  }
  return combos.map((options) => ({
    _key: genKey(),
    options,
    price: "",
    attachedSkus: [],
  }));
}

function optionsToLabel(options: VariantOptionCell[]): string {
  return options.map((o) => `${o.groupName}: ${o.value}`).join(" / ");
}

// ── 플랫폼 등록 가능 여부 ─────────────────────────────────────────

function checkPlatformReadiness(
  def: PlatformDef,
  commonValues: Record<string, string>,
  platformValues: Record<string, string>,
): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  const platformDescriptionKey =
    def.key === "QOO10_JP" ? "qoo10.ItemDescription" :
    def.key === "SHOPIFY" ? "shopify.descriptionHtml" : null;
  for (const commonKey of def.requiredCommonFields) {
    const val = commonValues[commonKey] ?? "";
    if (commonKey === "images") {
      if (!val) missing.push("images");
    } else if (!val.trim()) {
      if (
        commonKey === "descriptionHtml" &&
        platformDescriptionKey &&
        (platformValues[platformDescriptionKey] ?? "").trim()
      ) {
        continue;
      }
      missing.push(commonKey);
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

// ── 컴포넌트 ──────────────────────────────────────────────────────

export function MasterProductFormPage({ id }: Props): React.JSX.Element {
  const t = useTranslations("pages.masterProductForm");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: detail, isLoading } = useMasterProduct(id ?? null);
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateMasterProduct();
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateMasterProduct(id ?? "");
  const { mutateAsync: addVariant } = useAddVariant(id ?? "");
  const { mutateAsync: updateVariant } = useUpdateVariant(id ?? "");
  const { mutateAsync: deleteVariant } = useDeleteVariant(id ?? "");
  const { mutateAsync: pushMasterStock, isPending: isPushingStock } = usePushMasterStockToAllChannels();
  const { mutateAsync: pullAllSales, isPending: isPullingAllSales } = usePullSalesFromAllChannels();
  const { mutateAsync: pushStockToChannel, isPending: isPushingChannelStock } = usePushStockToChannel();
  const { mutateAsync: syncInfoToChannel } = useSyncProductInfoToChannel();
  const { mutateAsync: pullSalesFromChannel, isPending: isPullingChannelSales } = usePullSalesFromChannel();

  // ── 공통 필드 ────────────────────────────────────────────────────
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [noBrand, setNoBrand] = useState(false);
  const [brand, setBrand] = useState("");
  const [hsCode, setHsCode] = useState("");

  // 원산지: 유형(domestic/overseas/other) + 상세 텍스트
  const [originType, setOriginType] = useState<"domestic" | "overseas" | "other">("domestic");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");

  const [material, setMaterial] = useState("");
  const [weightG, setWeightG] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [formError, setFormError] = useState("");

  // ── 이미지 ───────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageRow[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");

  // ── 플랫폼별 필드 ────────────────────────────────────────────────
  const [platformValues, setPlatformValues] = useState<Record<string, string>>({});

  // ── 조합형 옵션 (신규 등록 시) ───────────────────────────────────
  const [optionAxes, setOptionAxes] = useState<OptionAxisState[]>([]);
  const [draftVariants, setDraftVariants] = useState<MasterVariantRow[]>([]);
  const draftApplied = useRef(false);

  // ── 단일 상품 SKU/재고 (신규 등록, 옵션 없음) ─────────────────────
  const [singleAttachedSkus, setSingleAttachedSkus] = useState<DraftAttachedSku[]>([]);
  const [singlePrice, setSinglePrice] = useState("");

  // ── 편집 모드 변형 ────────────────────────────────────────────────
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<{
    /** groupName -> value */
    optionValues: Record<string, string>;
    price: string;
    attachedSkus: DraftAttachedSku[];
  }>({ optionValues: {}, price: "", attachedSkus: [] });

  // 단일 변형 추가 폼 (편집 모드)
  /** groupName -> value */
  const [newVariantOptionValues, setNewVariantOptionValues] = useState<Record<string, string>>({});
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newVariantAttachedSkus, setNewVariantAttachedSkus] = useState<DraftAttachedSku[]>([]);

  // ── Qoo10 브랜드 autocomplete ────────────────────────────────────
  const [brandKeyword, setBrandKeyword] = useState("");
  const [debouncedBrandKeyword, setDebouncedBrandKeyword] = useState("");
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [selectedBrandLabel, setSelectedBrandLabel] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedBrandKeyword(brandKeyword.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [brandKeyword]);

  const brandQuery = useQuery(brandQueries.search(debouncedBrandKeyword));
  const brandResults = brandQuery.data?.ResultObject ?? [];

  // ── Qoo10 배송 템플릿 ────────────────────────────────────────────
  const shippingTemplateQuery = useQuery(shippingTemplateQueries.list());
  const shippingTemplates = shippingTemplateQuery.data?.ResultObject ?? [];
  const [isShippingDropdownOpen, setIsShippingDropdownOpen] = useState(false);
  const [shippingKeyword, setShippingKeyword] = useState("");

  // ── Qoo10 카테고리 ───────────────────────────────────────────────
  const categoryQuery = useQuery(categoryQueries.all());
  const categories = categoryQuery.data?.ResultObject ?? [];

  // 선택된 대/중분류 코드 (소분류는 platformValues["qoo10.SecondSubCat"]에 저장)
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

  // ── 채널 연결 상태 ───────────────────────────────────────────────
  const { hasKey: qoo10Connected } = useChannelApiKey("qoo10");
  const { hasKey: shopifyConnected } = useChannelApiKey("shopify");

  const connectedPlatformKeys = useMemo(() => {
    const map: Record<string, boolean> = {
      qoo10: qoo10Connected,
      shopify: shopifyConnected,
    };
    const apiAvailable = PLATFORM_DEFS.filter(
      (def) => def.apiAvailable && map[def.channelId],
    );
    if (!isEdit) return apiAvailable;
    const linkedKeys = new Set(
      (detail?.listedProducts ?? []).map((lp) => lp.channelType),
    );
    return apiAvailable.filter((def) => linkedKeys.has(def.key));
  }, [qoo10Connected, shopifyConnected, isEdit, detail?.listedProducts]);

  const [listModalOpen, setListModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTargets, setSyncTargets] = useState<Array<{ id: string; title?: string; channelName: string; channelType: string }>>([]);

  // ── hydrate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!detail) return;
    setCode(detail.code);
    setTitle(detail.title);

    const attrs = detail.attributes as Record<string, unknown>;
    const common = (attrs?.common as Record<string, unknown> | undefined) ?? {};
    const commonStr = (k: string) => (typeof common[k] === "string" ? (common[k] as string) : "");
    const commonNum = (k: string) => (typeof common[k] === "number" ? (common[k] as number) : undefined);
    const commonArr = <T,>(k: string) => (Array.isArray(common[k]) ? (common[k] as T[]) : []);

    const b = commonStr("brand");
    if (!b) { setNoBrand(true); setBrand(""); }
    else { setNoBrand(false); setBrand(b); }
    setHsCode(commonStr("hsCode"));

    const origin = commonStr("countryOfOrigin");
    setCountryOfOrigin(origin);
    if (!origin || origin === "대한민국" || origin === "국내") setOriginType("domestic");
    else if (origin === "기타" || origin === "기타(ETC)") setOriginType("other");
    else setOriginType("overseas");

    setMaterial(commonStr("material"));
    const w = commonNum("weightG");
    setWeightG(w != null ? String(w) : "");
    setRetailPrice(commonStr("retailPrice"));
    setTagsInput(commonArr<string>("tags").join(", "));
    setDescriptionHtml(commonStr("descriptionHtml"));
    setImages(
      commonArr<{ url: string; altText?: string }>("images").map((img) => ({
        url: img.url,
        altText: img.altText ?? "",
      })),
    );

    const restored: Record<string, string> = {};
    for (const [ns, obj] of Object.entries(attrs)) {
      if (typeof obj === "object" && obj !== null) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          restored[`${ns}.${k}`] = v != null ? String(v) : "";
        }
      }
    }
    if (!restored["qoo10.AvailableDateType"]) {
      restored["qoo10.AvailableDateType"] = "0";
    }
    setPlatformValues(restored);

    // Qoo10 BrandNo 복원: 저장된 BrandNo가 있으면 autocomplete 표시용 레이블 설정
    const savedBrandNo = restored["qoo10.BrandNo"] ?? "";
    if (savedBrandNo && savedBrandNo !== "0") {
      setBrandKeyword(`BrandNo: ${savedBrandNo}`);
      setSelectedBrandLabel(`BrandNo: ${savedBrandNo}`);
    }

    // Qoo10 카테고리 역방향 복원: SecondSubCat 코드로 대/중분류 코드를 찾아 셀렉트 초기화
    const savedSecondSubCat = restored["qoo10.SecondSubCat"] ?? "";
    if (savedSecondSubCat && categories.length > 0) {
      const match = categories.find((c) => c.CATE_S_CD === savedSecondSubCat);
      if (match) {
        setMainCatCd(match.CATE_L_CD);
        setMidCatCd(match.CATE_M_CD);
      }
    }
  }, [detail, categories]);

  // ── 공통 값 맵 ────────────────────────────────────────────────────
  const commonValues: Record<string, string> = useMemo(
    () => ({
      title,
      brand: noBrand ? "NO_BRAND" : brand,
      hsCode,
      countryOfOrigin,
      material,
      weightG,
      descriptionHtml,
      images: images.length > 0 ? "yes" : "",
    }),
    [title, brand, noBrand, hsCode, countryOfOrigin, material, weightG, descriptionHtml, images],
  );

  const readiness = useMemo(
    () =>
      Object.fromEntries(
        PLATFORM_DEFS.map((def) => [
          def.key,
          checkPlatformReadiness(def, commonValues, platformValues),
        ]),
      ),
    [commonValues, platformValues],
  );

  // ── Qoo10 ItemQty / ItemPrice 자동 동기화 ────────────────────────
  // 변형별 가용재고 = min(floor(sku.stock / bom.qty)) over attachedSkus
  const totalVariantStock = useMemo(() => {
    if (isEdit) {
      const vs = detail?.variants ?? [];
      return vs.reduce((sum, v) => {
        const attached = v.attachedSkus ?? [];
        if (attached.length === 0) return sum;
        const avail = Math.min(
          ...attached.map((s) => Math.floor((Number(s.stock) || 0) / Math.max(1, Number(s.qty) || 1))),
        );
        return sum + Math.max(0, avail);
      }, 0);
    }
    if (draftVariants.length > 0) {
      return draftVariants.reduce((sum, r) => {
        // 신규 등록 시 SKU 재고 정보를 즉시 알기 어려우므로 0 처리 (저장 후 재조회 시 반영)
        if (r.attachedSkus.length === 0) return sum;
        return sum;
      }, 0);
    }
    return 0;
  }, [isEdit, detail?.variants, draftVariants]);

  const firstVariantPrice = useMemo(() => {
    if (isEdit) {
      const vs = detail?.variants ?? [];
      return vs[0]?.price != null ? String(Math.round(Number(vs[0].price))) : "";
    }
    if (draftVariants.length > 0) {
      const p = draftVariants[0]?.price;
      return p != null && p !== "" ? String(Math.round(Number(p))) : "";
    }
    return singlePrice.trim() ? String(Math.round(Number(singlePrice))) : "";
  }, [isEdit, detail?.variants, draftVariants, singlePrice]);

  useEffect(() => {
    setPlatformValues((prev) => ({ ...prev, "qoo10.ItemQty": String(totalVariantStock) }));
  }, [totalVariantStock]);

  useEffect(() => {
    if (firstVariantPrice !== "") {
      setPlatformValues((prev) => ({ ...prev, "qoo10.ItemPrice": firstVariantPrice }));
    }
  }, [firstVariantPrice]);

  useEffect(() => {
    setPlatformValues((prev) => {
      if (prev["qoo10.AvailableDateType"]) return prev;
      return { ...prev, "qoo10.AvailableDateType": "0" };
    });
  }, []);

  // ── 핸들러 ───────────────────────────────────────────────────────

  const setPlatformValue = (key: string, value: string): void => {
    setPlatformValues((prev) => ({ ...prev, [key]: value }));
  };

  const buildOriginValue = (): string | undefined => {
    if (originType === "domestic") return countryOfOrigin.trim() || "대한민국";
    return countryOfOrigin.trim() || undefined;
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

    const common: Record<string, unknown> = {};
    if (!noBrand && brand.trim()) common.brand = brand.trim();
    if (hsCode.trim()) common.hsCode = hsCode.trim();
    const origin = buildOriginValue();
    if (origin) common.countryOfOrigin = origin;
    if (material.trim()) common.material = material.trim();
    if (weightG.trim()) common.weightG = Number(weightG.trim());
    if (retailPrice.trim()) common.retailPrice = retailPrice.trim();
    if (descriptionHtml.trim()) common.descriptionHtml = descriptionHtml.trim();
    const tagArr = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagArr.length > 0) common.tags = tagArr;
    const imgArr = images
      .filter((img) => img.url)
      .map((img, i) => ({
        url: img.url,
        altText: img.altText || undefined,
        order: i,
      }));
    if (imgArr.length > 0) common.images = imgArr;
    if (Object.keys(common).length > 0) result.common = common;

    return result;
  };

  const buildPayload = () => ({
    code: code.trim(),
    title: title.trim(),
    attributes: buildAttributes(),
  });

  const handleSubmit = async (): Promise<void> => {
    setFormError("");
    if (!code.trim() || !title.trim()) {
      setFormError(t("toasts.requiredCodeName"));
      return;
    }
    try {
      if (isEdit) {
        const result = await updateProduct(buildPayload());
        appToaster.create({ title: t("toasts.saveSuccess"), type: "success" });
        if (result.linkedCount > 0 && detail?.listedProducts?.length) {
          setSyncTargets(
            detail.listedProducts.map((lp) => ({
              id: lp.id,
              title: lp.title,
              channelName: lp.channelName,
              channelType: lp.channelType,
            }))
          );
          setSyncModalOpen(true);
        }
      } else {
        const created = await createProduct(buildPayload());
        const variantsUrl = `/api/master-products/${created.id}/variants`;

        const attachSkus = async (
          variantId: string,
          attached: DraftAttachedSku[],
        ): Promise<void> => {
          for (let i = 0; i < attached.length; i++) {
            const a = attached[i];
            try {
              await http.post(`/api/skus/${a.skuId}/master-variants`, {
                masterVariantId: variantId,
                qty: Math.max(1, Number(a.qty) || 1),
                position: i,
              });
            } catch {
              // 개별 attach 실패는 계속
            }
          }
        };

        if (draftVariants.length > 0) {
          if (optionAxes.length > 0) {
            try {
              await http.put(`/api/master-products/${created.id}/option-groups`, {
                groups: optionAxes.map((a) => ({ name: a.name, values: a.values })),
              });
            } catch {
              appToaster.create({ title: t("toasts.optionGroupSaveFailed"), type: "error" });
            }
          }
          for (const row of draftVariants) {
            if (row.attachedSkus.length === 0) continue;
            try {
              const createdVariant = await http.post<{ id: string }>(variantsUrl, {
                optionValues: row.options,
                price: row.price.trim() || undefined,
              });
              await attachSkus(createdVariant.id, row.attachedSkus);
            } catch {
              // 개별 실패는 계속
            }
          }
        } else if (singleAttachedSkus.length > 0) {
          try {
            const createdVariant = await http.post<{ id: string }>(variantsUrl, {
              price: singlePrice.trim() || undefined,
            });
            await attachSkus(createdVariant.id, singleAttachedSkus);
          } catch {
            appToaster.create({ title: t("toasts.singleVariantSaveFailed"), type: "error" });
          }
        }

        await queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });

        appToaster.create({ title: t("toasts.createSuccess"), type: "success" });
        router.push(ROUTES.masterProductEdit(created.id));
        return;
      }
    } catch {
      appToaster.create({ title: t(isEdit ? "toasts.updateFailed" : "toasts.createFailed"), type: "error" });
    }
  };

  const handleAddImage = (): void => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, { url: newImageUrl.trim(), altText: newImageAlt.trim() }]);
    setNewImageUrl("");
    setNewImageAlt("");
  };

  const handleRemoveImage = (idx: number): void => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── 옵션 적용 (신규 등록 모드) ───────────────────────────────────
  const handleOptionApply = (confirmedAxes: OptionAxisState[]): void => {
    const rows = cartesian(confirmedAxes);
    setDraftVariants(rows);
    draftApplied.current = true;
  };

  const updateDraftRow = (key: string, field: keyof MasterVariantRow, value: string): void => {
    setDraftVariants((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  };

  const removeDraftRow = (key: string): void => {
    setDraftVariants((prev) => prev.filter((r) => r._key !== key));
  };

  // ── 편집 모드 변형 핸들러 ────────────────────────────────────────

  const handleAddVariant = async (): Promise<void> => {
    if (newVariantAttachedSkus.length === 0) {
      appToaster.create({ title: t("toasts.skuRequired"), type: "error" });
      return;
    }
    const groups = detail?.optionGroups ?? [];
    const optionValues: VariantOptionCell[] = groups
      .map((g) => ({ groupName: g.name, value: (newVariantOptionValues[g.name] ?? "").trim() }))
      .filter((c) => c.value.length > 0);
    try {
      const variant = await addVariant({
        optionValues: optionValues.length > 0 ? optionValues : undefined,
        price: newVariantPrice.trim() || undefined,
      });
      for (let i = 0; i < newVariantAttachedSkus.length; i++) {
        const a = newVariantAttachedSkus[i];
        try {
          await http.post(`/api/skus/${a.skuId}/master-variants`, {
            masterVariantId: variant.id,
            qty: Math.max(1, Number(a.qty) || 1),
            position: i,
          });
        } catch {
          // skip
        }
      }
      await queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
      setNewVariantOptionValues({});
      setNewVariantPrice("");
      setNewVariantAttachedSkus([]);
      appToaster.create({ title: t("toasts.variantAddSuccess"), type: "success" });
    } catch {
      appToaster.create({ title: t("toasts.variantAddFailed"), type: "error" });
    }
  };

  const handleSaveVariant = async (variantId: string): Promise<void> => {
    const groups = detail?.optionGroups ?? [];
    const optionValues: VariantOptionCell[] = groups
      .map((g) => ({ groupName: g.name, value: (editingVariant.optionValues[g.name] ?? "").trim() }))
      .filter((c) => c.value.length > 0);
    try {
      await updateVariant({
        variantId,
        input: {
          optionValues: optionValues.length > 0 ? optionValues : undefined,
          price: editingVariant.price.trim() || undefined,
        },
      });

      // 기존 BOM과 비교하여 detach/attach diff 적용
      const original = (detail?.variants ?? []).find((v) => v.id === variantId);
      const originalMap = new Map((original?.attachedSkus ?? []).map((s) => [s.skuId, s]));
      const nextMap = new Map(editingVariant.attachedSkus.map((s) => [s.skuId, s]));

      // detach: 기존에 있었지만 새 목록에 없는 것
      for (const [skuId] of originalMap) {
        if (!nextMap.has(skuId)) {
          try {
            await http.delete(`/api/skus/${skuId}/master-variants/${variantId}`);
          } catch {
            // skip
          }
        }
      }
      // attach: 새로 추가됐거나 qty/position이 바뀐 것
      // (BOM 갱신은 백엔드가 upsert 시맨틱을 가졌다고 가정하지 않고 detach 후 attach)
      for (let i = 0; i < editingVariant.attachedSkus.length; i++) {
        const a = editingVariant.attachedSkus[i];
        const prev = originalMap.get(a.skuId);
        const changed =
          !prev ||
          Number(prev.qty) !== Number(a.qty || 1) ||
          Number(prev.position) !== i;
        if (!changed) continue;
        try {
          if (prev) {
            await http.delete(`/api/skus/${a.skuId}/master-variants/${variantId}`);
          }
          await http.post(`/api/skus/${a.skuId}/master-variants`, {
            masterVariantId: variantId,
            qty: Math.max(1, Number(a.qty) || 1),
            position: i,
          });
        } catch {
          // skip
        }
      }
      await queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });
      setEditingVariantId(null);
      appToaster.create({ title: t("toasts.variantUpdateSuccess"), type: "success" });
    } catch {
      appToaster.create({ title: t("toasts.variantUpdateFailed"), type: "error" });
    }
  };

  const handleDeleteVariant = async (variantId: string): Promise<void> => {
    try {
      await deleteVariant(variantId);
      appToaster.create({ title: t("toasts.variantDeleteSuccess"), type: "success" });
    } catch {
      appToaster.create({ title: t("toasts.variantDeleteFailed"), type: "error" });
    }
  };

  // ── 로딩 스켈레톤 ─────────────────────────────────────────────────
  if (isEdit && isLoading) {
    return (
      <Box>
        <Skeleton height="36px" mb={6} maxW="300px" />
        <Stack gap={6} >
          {[1, 2, 3].map((i) => (
            <Box key={i} borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={5}>
              <Skeleton height="24px" mb={4} maxW="160px" />
              <Stack gap={4}>
                <Skeleton height="36px" />
                <Skeleton height="36px" />
                <Skeleton height="36px" />
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  const variants = detail?.variants ?? [];
  const isSaving = isCreating || isUpdating;

  return (
    <Box as="form" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      {/* ── 헤더 ── */}
      <Flex align="flex-start" justify="space-between" mb={6}>
        <PageHeader
          title={isEdit ? t("header.editTitle") : t("header.createTitle")}
          description={
            isEdit
              ? t("header.editDescription")
              : t("header.createDescription")
          }
        />
        <Flex gap={2} mt={1} flexShrink={0}>
          <Button size="sm" variant="ghost" onClick={() => router.push(ROUTES.masterProducts)}>
            {t("actions.cancel")}
          </Button>
          {isEdit && (
            <Button size="sm" variant="outline" colorPalette="blue" onClick={() => setListModalOpen(true)}>
              {t("actions.listToChannels")}
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            loading={isSaving}
            disabled={isSaving}
          >
            {isEdit ? t("actions.save") : t("actions.create")}
          </Button>
        </Flex>
      </Flex>

      {formError && (
        <Box mb={4} px={4} py={3} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md" >
          <Text fontSize="sm" color="red.600">{formError}</Text>
        </Box>
      )}

      <Stack gap={6} >
        {/* ── 기본 정보 ── */}
        <Section title={t("basicInfo.section")}>
          <Stack gap={4}>
            {/* 코드 + 상품명 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label required>{t("basicInfo.productCode")}</Label>
                <Input size="sm" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("basicInfo.productCodePlaceholder")} />
                <HelperText>{t("basicInfo.productCodeHelper")}</HelperText>
              </Box>
              <Box flex="2">
                <Label required>{t("basicInfo.title")}</Label>
                <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("basicInfo.titlePlaceholder")} />
              </Box>
            </Flex>

            {/* 브랜드 (Shopee 패턴: 브랜드 없음 체크박스) */}
            <Box>
              <Label>{t("basicInfo.brand")}</Label>
              <Flex align="center" gap={2} mb={2}>
                <Checkbox.Root
                  checked={noBrand}
                  onCheckedChange={(e) => setNoBrand(!!e.checked)}
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontSize="sm" color="gray.600">{t("basicInfo.noBrand")}</Checkbox.Label>
                </Checkbox.Root>
              </Flex>
              {!noBrand && (
                <Input
                  size="sm"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={t("basicInfo.brandPlaceholder")}
                />
              )}
            </Box>

            {/* HS코드 + 소비자가 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label>{t("basicInfo.hsCode")}</Label>
                <Input size="sm" value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder={t("basicInfo.hsCodePlaceholder")} />
              </Box>
              <Box flex="1">
                <Label>{t("basicInfo.retailPrice")}</Label>
                <Input size="sm" type="number" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} placeholder={t("basicInfo.retailPricePlaceholder")} />
              </Box>
            </Flex>

            {/* 원산지: 유형 + 상세 */}
            <Box>
              <Label>{t("basicInfo.originCountry")}</Label>
              <Flex gap={3} direction={{ base: "column", md: "row" }}>
                <Box flexShrink={0} minW="140px">
                  <Select
                    value={originType}
                    onChange={(e) => {
                      const v = e.target.value as typeof originType;
                      setOriginType(v);
                      if (v === "domestic") setCountryOfOrigin("대한민국");
                      else setCountryOfOrigin("");
                    }}
                  >
                    <option value="domestic">{t("basicInfo.originDomestic")}</option>
                    <option value="overseas">{t("basicInfo.originForeign")}</option>
                    <option value="other">{t("basicInfo.originOther")}</option>
                  </Select>
                </Box>
                <Box flex="1">
                  <Input
                    size="sm"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder={
                      originType === "domestic"
                        ? t("basicInfo.originDomesticPlaceholder")
                        : originType === "overseas"
                          ? t("basicInfo.originForeignPlaceholder")
                          : t("basicInfo.originOtherPlaceholder")
                    }
                  />
                </Box>
              </Flex>
            </Box>

            {/* 소재 + 무게 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label>{t("basicInfo.material")}</Label>
                <Input size="sm" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t("basicInfo.materialPlaceholder")} />
              </Box>
              <Box flex="1">
                <Label>{t("basicInfo.weight")}</Label>
                <Input size="sm" type="number" value={weightG} onChange={(e) => setWeightG(e.target.value)} placeholder={t("basicInfo.weightPlaceholder")} />
              </Box>
            </Flex>

            {/* 태그 */}
            <Box>
              <Label>{t("basicInfo.tags")}</Label>
              <Input size="sm" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t("basicInfo.tagsPlaceholder")} />
              <HelperText>{t("basicInfo.tagsHelper")}</HelperText>
            </Box>
          </Stack>
        </Section>

        {/* ── 상품 설명 ── */}
        <Section title={t("description.section")}>
          <ShopifyHtmlEditor value={descriptionHtml} onChange={setDescriptionHtml} />
        </Section>

        {/* ── 이미지 ── */}
        <Section title={t("images.section")}>
          {images.length > 0 && (
            <Box mb={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              {images.map((img, idx) => (
                <Flex
                  key={idx}
                  align="center"
                  gap={3}
                  px={4}
                  py={2.5}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  _last={{ borderBottomWidth: 0 }}
                  _hover={{ bg: "gray.50" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText}
                    style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, flexShrink: 0, background: "#f7fafc" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <Box flex="1" minW={0}>
                    <Text fontSize="xs" color="gray.700" truncate>{img.url}</Text>
                    {img.altText && <Text fontSize="xs" color="gray.400">{img.altText}</Text>}
                  </Box>
                  <Text fontSize="xs" color="gray.400" flexShrink={0}>#{idx + 1}</Text>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemoveImage(idx)} flexShrink={0}>
                    {t("images.delete")}
                  </Button>
                </Flex>
              ))}
            </Box>
          )}
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
            <Text fontSize="sm" fontWeight="medium" mb={3}>{t("images.add")}</Text>
            <Flex gap={3} direction={{ base: "column", md: "row" }}>
              <Box flex="2">
                <Label>{t("images.url")}</Label>
                <Input
                  size="sm"
                  bg="white"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder={t("images.urlPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImage(); } }}
                />
              </Box>
              <Box flex="1">
                <Label>{t("images.altLabel")}</Label>
                <Input size="sm" bg="white" value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)} placeholder={t("images.alt")} />
              </Box>
              <Box pt={{ base: 0, md: "22px" }}>
                <Button size="sm" variant="outline" onClick={handleAddImage} disabled={!newImageUrl.trim()}>
                  {t("images.addButton")}
                </Button>
              </Box>
            </Flex>
          </Box>
        </Section>

        {/* ── 조합형 옵션 (신규 등록 모드) ── */}
        {!isEdit && (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" overflow="hidden">
            <Box px={5} py={4} borderBottomWidth="1px" borderColor="gray.200">
              <Text fontSize="md" fontWeight="semibold">{t("options.section")}</Text>
            </Box>
            <Box px={5} pt={5} pb={3}>
              <OptionAxisForm
                axes={optionAxes}
                maxAxes={MASTER_MAX_AXES}
                maxValues={20}
                onAxesChange={setOptionAxes}
                onApply={handleOptionApply}
                applyLabel={t("options.generateCombinations")}
              />
            </Box>

            {draftVariants.length > 0 && (
              <Box px={5} pb={5}>
                <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.700">
                  {t("options.listHeading", { count: draftVariants.length })}
                </Text>
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        {optionAxes.map((ax) => (
                          <Table.ColumnHeader key={ax.id} fontWeight="medium" color="gray.600" w="24">
                            {ax.name || t("options.thOption")}
                          </Table.ColumnHeader>
                        ))}
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="60">{t("options.thSku")}</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="20">{t("options.thPrice")}</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="16">{t("options.thStock")}</Table.ColumnHeader>
                        <Table.ColumnHeader w="8" />
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {draftVariants.map((row) => (
                        <Table.Row key={row._key} _hover={{ bg: "gray.50" }}>
                          {optionAxes.map((ax, axIdx) => (
                            <Table.Cell key={ax.id}>
                              <Text fontSize="xs" fontWeight="medium">
                                {row.options[axIdx]?.value ?? "-"}
                              </Text>
                            </Table.Cell>
                          ))}
                          <Table.Cell>
                            <SkuPickerCell
                              attached={row.attachedSkus}
                              onChange={(next) =>
                                setDraftVariants((prev) =>
                                  prev.map((r) => (r._key === row._key ? { ...r, attachedSkus: next } : r)),
                                )
                              }
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              size="xs"
                              type="number"
                              value={row.price}
                              onChange={(e) => updateDraftRow(row._key, "price", e.target.value)}
                              placeholder="0"
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" color="gray.400">{t("options.afterSave")}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeDraftRow(row._key)}>
                              ✕
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {t("options.skuNote")}
                </Text>
              </Box>
            )}

            {draftVariants.length === 0 && optionAxes.length === 0 && (
              <Box px={5} pb={5}>
                <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.700">
                  {t("options.singleHeading")}
                </Text>
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="60">{t("options.thSku")}</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="28">{t("options.thPrice")}</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="20">{t("options.thStock")}</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell>
                          <SkuPickerCell
                            attached={singleAttachedSkus}
                            onChange={setSingleAttachedSkus}
                            placeholder={t("variants.skuSearchRequired")}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Input
                            size="xs"
                            type="number"
                            value={singlePrice}
                            onChange={(e) => setSinglePrice(e.target.value)}
                            placeholder="0"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" color="gray.400">{t("options.afterSave")}</Text>
                        </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {t("options.singleNote")}
                </Text>
              </Box>
            )}
          </Box>
        )}

        {/* ── 변형 목록 (편집 모드) ── */}
        {isEdit && (() => {
          const detailGroups = detail?.optionGroups ?? [];
          const totalCols = 1 + detailGroups.length + 3; // SKU + groups + price + stock + actions
          return (
          <Section title={t("variants.section")}>
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader fontWeight="medium" color="gray.600" minW="80">{t("variants.thSku")}</Table.ColumnHeader>
                    {detailGroups.map((g) => (
                      <Table.ColumnHeader key={g.id} fontWeight="medium" color="gray.600">
                        {g.name}
                      </Table.ColumnHeader>
                    ))}
                    <Table.ColumnHeader fontWeight="medium" color="gray.600">{t("variants.thPrice")}</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="medium" color="gray.600">{t("variants.thStock")}</Table.ColumnHeader>
                    <Table.ColumnHeader />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {variants.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={totalCols}>
                        <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                          {t("variants.empty")}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                  {variants.map((v) => {
                    const valueByGroup: Record<string, string> = {};
                    for (const opt of v.options) valueByGroup[opt.groupName] = opt.value;
                    const availableStock = v.attachedSkus.length === 0
                      ? 0
                      : Math.min(...v.attachedSkus.map((s) => Math.floor((s.stock ?? 0) / Math.max(1, s.qty))));
                    return editingVariantId === v.id ? (
                      <Table.Row key={v.id} bg="blue.50">
                        <Table.Cell>
                          <SkuPickerCell
                            attached={editingVariant.attachedSkus}
                            onChange={(next) => setEditingVariant((p) => ({ ...p, attachedSkus: next }))}
                          />
                        </Table.Cell>
                        {detailGroups.map((g) => (
                          <Table.Cell key={g.id}>
                            <Input
                              size="xs"
                              list={`mp-vals-${g.id}`}
                              value={editingVariant.optionValues[g.name] ?? ""}
                              onChange={(e) =>
                                setEditingVariant((p) => ({
                                  ...p,
                                  optionValues: { ...p.optionValues, [g.name]: e.target.value },
                                }))
                              }
                              placeholder={g.values.map((vv) => vv.value).join(", ").slice(0, 30)}
                            />
                            <datalist id={`mp-vals-${g.id}`}>
                              {g.values.map((vv) => (
                                <option key={vv.id} value={vv.value} />
                              ))}
                            </datalist>
                          </Table.Cell>
                        ))}
                        <Table.Cell><Input size="xs" value={editingVariant.price} onChange={(e) => setEditingVariant((p) => ({ ...p, price: e.target.value }))} /></Table.Cell>
                        <Table.Cell><Text fontSize="xs" color="gray.400">{t("variants.afterSave")}</Text></Table.Cell>
                        <Table.Cell>
                          <Flex gap={1}>
                            <Button size="xs" bg="gray.900" color="white" _hover={{ bg: "gray.800" }} onClick={() => void handleSaveVariant(v.id)}>{t("variants.save")}</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingVariantId(null)}>{t("variants.cancel")}</Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      <Table.Row key={v.id} _hover={{ bg: "gray.50" }}>
                        <Table.Cell>
                          {v.attachedSkus.length === 0 ? (
                            <Text fontSize="xs" color="gray.400">{t("variants.unlinked")}</Text>
                          ) : (
                            <Flex gap={1} wrap="wrap">
                              {v.attachedSkus.map((s) => (
                                <Text key={s.skuId} fontSize="xs" px={1.5} py={0.5} bg="gray.100" borderRadius="sm">
                                  {s.code} × {s.qty}
                                </Text>
                              ))}
                            </Flex>
                          )}
                        </Table.Cell>
                        {detailGroups.map((g) => (
                          <Table.Cell key={g.id}>
                            <Text fontSize="sm" color="gray.600">{valueByGroup[g.name] ?? "-"}</Text>
                          </Table.Cell>
                        ))}
                        <Table.Cell><Text fontSize="sm">{v.price ?? "-"}</Text></Table.Cell>
                        <Table.Cell><Text fontSize="sm">{availableStock}</Text></Table.Cell>
                        <Table.Cell>
                          <Flex gap={1}>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setEditingVariantId(v.id);
                                const initialValues: Record<string, string> = {};
                                for (const opt of v.options) initialValues[opt.groupName] = opt.value;
                                setEditingVariant({
                                  optionValues: initialValues,
                                  price: v.price ?? "",
                                  attachedSkus: v.attachedSkus.map((s) => ({
                                    skuId: s.skuId,
                                    code: s.code,
                                    qty: s.qty,
                                  })),
                                });
                              }}
                            >
                              {t("variants.edit")}
                            </Button>
                            <Button size="xs" variant="outline" colorPalette="red" onClick={() => void handleDeleteVariant(v.id)}>{t("variants.delete")}</Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}

                  {/* 신규 변형 입력 행 */}
                  <Table.Row bg="gray.50">
                    <Table.Cell>
                      <SkuPickerCell
                        attached={newVariantAttachedSkus}
                        onChange={setNewVariantAttachedSkus}
                        placeholder={t("variants.skuSearchRequired")}
                      />
                    </Table.Cell>
                    {detailGroups.map((g) => (
                      <Table.Cell key={g.id}>
                        <Input
                          size="xs"
                          list={`mp-newvals-${g.id}`}
                          value={newVariantOptionValues[g.name] ?? ""}
                          onChange={(e) =>
                            setNewVariantOptionValues((prev) => ({ ...prev, [g.name]: e.target.value }))
                          }
                          placeholder={g.name}
                        />
                        <datalist id={`mp-newvals-${g.id}`}>
                          {g.values.map((vv) => (
                            <option key={vv.id} value={vv.value} />
                          ))}
                        </datalist>
                      </Table.Cell>
                    ))}
                    <Table.Cell><Input size="xs" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} placeholder={t("variants.price")} /></Table.Cell>
                    <Table.Cell><Text fontSize="xs" color="gray.400">{t("variants.afterSave")}</Text></Table.Cell>
                    <Table.Cell>
                      <Button size="xs" bg="gray.900" color="white" _hover={{ bg: "gray.800" }} onClick={() => void handleAddVariant()}>{t("variants.add")}</Button>
                    </Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Box>
          </Section>
          );
        })()}

        {/* ── 플랫폼별 추가 정보 ── */}
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" overflow="hidden">
          <Box px={5} py={4} borderBottomWidth="1px" borderColor="gray.200">
            <Text fontSize="md" fontWeight="semibold">{t("platform.section")}</Text>
            <Text fontSize="sm" color="gray.500" mt={0.5}>
              {t("platform.description")}
            </Text>
          </Box>

          {connectedPlatformKeys.length === 0 ? (
            <Box px={5} py={10} textAlign="center">
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                {isEdit ? t("platform.noLinkedChannels") : t("platform.noLinkedPlatforms")}
              </Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                {isEdit
                  ? t("platform.noLinkedHint")
                  : t("platform.noPlatformHint")}
              </Text>
            </Box>
          ) : (
            <Accordion.Root multiple defaultValue={[]}>
              {connectedPlatformKeys.map((def) => {
                const { ready, missing } = readiness[def.key] ?? { ready: false, missing: [] };
                const hasAnyInput = def.fields.some((f) => (platformValues[f.key] ?? "").trim());

                const statusBadge = hasAnyInput || ready ? (
                  ready ? (
                    <Box px={2} py={0.5} borderRadius="full" fontSize="xs" fontWeight="medium" bg="green.50" color="green.700" border="1px solid" borderColor="green.200">
                      {t("platform.ready")}
                    </Box>
                  ) : (
                    <Box px={2} py={0.5} borderRadius="full" fontSize="xs" fontWeight="medium" bg="orange.50" color="orange.700" border="1px solid" borderColor="orange.200">
                      {t("platform.missingRequired", { count: missing.length })}
                    </Box>
                  )
                ) : (
                  <Box px={2} py={0.5} borderRadius="full" fontSize="xs" color="gray.400" border="1px solid" borderColor="gray.200">
                    {t("platform.notFilled")}
                  </Box>
                );

                const platformColors: Record<string, { bg: string; color: string }> = {
                  orange: { bg: "orange.100", color: "orange.700" },
                  green: { bg: "green.100", color: "green.700" },
                  red: { bg: "red.100", color: "red.700" },
                  blue: { bg: "blue.100", color: "blue.700" },
                };
                const pc = platformColors[def.color] ?? { bg: "gray.100", color: "gray.700" };

                return (
                  <Accordion.Item
                    key={def.key}
                    value={def.key}
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    _first={{ borderTopWidth: 0 }}
                  >
                    <Accordion.ItemTrigger px={5} py={3.5} _hover={{ bg: "gray.50" }}>
                      <Flex align="center" gap={3} flex="1" minW={0}>
                        <Box px={2.5} py={0.5} borderRadius="md" fontSize="xs" fontWeight="bold" bg={pc.bg} color={pc.color} flexShrink={0}>
                          {def.label}
                        </Box>
                        {statusBadge}
                        {!ready && hasAnyInput && missing.length > 0 && (
                          <Text fontSize="xs" color="gray.400" truncate>
                            {t("platform.missingInline", { fields: missing.map((k) => t(`labelMap.${k}`)).join(" · ") })}
                          </Text>
                        )}
                      </Flex>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>

                    <Accordion.ItemContent>
                      <Box px={5} pb={6} pt={2}>
                        {hasAnyInput && !ready && missing.length > 0 && (
                          <Box mb={4} px={4} py={3} bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md">
                            <Text fontSize="sm" color="orange.700" fontWeight="medium">
                              {t("platform.fixBefore")}
                            </Text>
                            <Text fontSize="xs" color="orange.600" mt={1}>
                              {missing.map((k) => t(`labelMap.${k}`)).join(", ")}
                            </Text>
                          </Box>
                        )}

                        <Stack gap={4}>
                          {/* Qoo10 카테고리: SecondSubCat / OuterSecondSubCat 필드를 3단계 셀렉트로 교체 */}
                          {def.key === "QOO10_JP" && (
                            <Box>
                              <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                  {t("platform.categoryHeader")}
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
                                    <Label required>{t("platform.categoryMain")}</Label>
                                    <Select
                                      value={mainCatCd}
                                      onChange={(e) => {
                                        setMainCatCd(e.target.value);
                                        setMidCatCd("");
                                        setPlatformValue("qoo10.SecondSubCat", "");
                                      }}
                                    >
                                      <option value="">{t("platform.categoryMainPlaceholder")}</option>
                                      {mainCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                  </Box>
                                  <Box>
                                    <Label required>{t("platform.categoryMid")}</Label>
                                    <Select
                                      value={midCatCd}
                                      onChange={(e) => {
                                        setMidCatCd(e.target.value);
                                        setPlatformValue("qoo10.SecondSubCat", "");
                                      }}
                                      disabled={!mainCatCd}
                                    >
                                      <option value="">{t("platform.categoryMidPlaceholder")}</option>
                                      {midCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                  </Box>
                                  <Box>
                                    <Label required>{t("platform.categorySub")}</Label>
                                    <Select
                                      value={platformValues["qoo10.SecondSubCat"] ?? ""}
                                      onChange={(e) => setPlatformValue("qoo10.SecondSubCat", e.target.value)}
                                      disabled={!midCatCd}
                                    >
                                      <option value="">{t("platform.categorySubPlaceholder")}</option>
                                      {secondSubCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                    {platformValues["qoo10.SecondSubCat"] && (
                                      <HelperText>{t("platform.categoryCode", { code: platformValues["qoo10.SecondSubCat"] })}</HelperText>
                                    )}
                                  </Box>
                                </Stack>
                              )}
                            </Box>
                          )}

                          {/* Qoo10 브랜드 autocomplete */}
                          {def.key === "QOO10_JP" && (
                            <Box>
                              <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                  {t("platform.brandHeader")}
                                </Text>
                              </Box>
                              <Label>{t("platform.brandSearch")}</Label>
                              <Flex align="center" gap={2} mb={2}>
                                <Checkbox.Root
                                  checked={platformValues["qoo10.NoBrand"] === "true"}
                                  onCheckedChange={(e) => {
                                    if (e.checked) {
                                      setPlatformValue("qoo10.NoBrand", "true");
                                      setPlatformValue("qoo10.BrandNo", "");
                                      setBrandKeyword("");
                                      setSelectedBrandLabel("");
                                      setIsBrandDropdownOpen(false);
                                    } else {
                                      setPlatformValue("qoo10.NoBrand", "");
                                    }
                                  }}
                                  size="sm"
                                >
                                  <Checkbox.HiddenInput />
                                  <Checkbox.Control />
                                  <Checkbox.Label fontSize="sm" color="gray.600">{t("platform.brandSkip")}</Checkbox.Label>
                                </Checkbox.Root>
                              </Flex>
                              {platformValues["qoo10.NoBrand"] !== "true" && (
                                <Box position="relative">
                                  <Input
                                    size="sm"
                                    value={brandKeyword}
                                    onChange={(e) => {
                                      setBrandKeyword(e.target.value);
                                      setIsBrandDropdownOpen(true);
                                      setPlatformValue("qoo10.BrandNo", "");
                                      setSelectedBrandLabel("");
                                    }}
                                    onFocus={() => setIsBrandDropdownOpen(true)}
                                    placeholder={t("platform.brandSearchPlaceholder")}
                                    autoComplete="off"
                                  />
                                  {isBrandDropdownOpen && debouncedBrandKeyword.length >= 2 && (
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
                                      ) : brandResults.length === 0 ? (
                                        <Text fontSize="sm" color="gray.500" py={2} textAlign="center">{t("platform.brandNoResult")}</Text>
                                      ) : (
                                        <Stack gap={1}>
                                          {brandResults.map((brand) => {
                                            const label = `${brand.M_B_NM} (${brand.M_B_NM_EN})`;
                                            const isSelected = platformValues["qoo10.BrandNo"] === brand.M_B_NO;
                                            return (
                                              <Button
                                                key={brand.M_B_NO}
                                                type="button"
                                                variant="ghost"
                                                justifyContent="flex-start"
                                                px={2}
                                                size="sm"
                                                bg={isSelected ? "gray.100" : "transparent"}
                                                onClick={() => {
                                                  setPlatformValue("qoo10.BrandNo", brand.M_B_NO);
                                                  setBrandKeyword(label);
                                                  setSelectedBrandLabel(label);
                                                  setIsBrandDropdownOpen(false);
                                                }}
                                              >
                                                <Text fontSize="sm" fontWeight={isSelected ? "semibold" : "normal"}>{label}</Text>
                                              </Button>
                                            );
                                          })}
                                        </Stack>
                                      )}
                                    </Box>
                                  )}
                                  {platformValues["qoo10.BrandNo"] && selectedBrandLabel && (
                                    <HelperText>{t("platform.brandSelected", { name: selectedBrandLabel })}</HelperText>
                                  )}
                                </Box>
                              )}
                            </Box>
                          )}

                          {def.fields
                            // Qoo10: 카테고리 필드는 위 3단계 셀렉트로, BrandNo는 위 autocomplete로 대체
                            .filter((field) => {
                              if (def.key !== "QOO10_JP") return true;
                              const skipKeys = ["qoo10.SecondSubCat", "qoo10.BrandNo"];
                              return !skipKeys.includes(field.key);
                            })
                            .map((field) => {
                            const isConditionallyRequired =
                              !!field.conditionalRequired &&
                              field.conditionalRequired.values.includes(
                                platformValues[field.conditionalRequired.dependsOn] ?? "",
                              );

                            // AvailableDateType: 올바른 옵션으로 대체
                            if (field.key === "qoo10.AvailableDateType") {
                              return (
                                <Box key={field.key}>
                                  {field.sectionHeader && (
                                    <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                        {field.sectionHeader}
                                      </Text>
                                    </Box>
                                  )}
                                  <Label required>{t("platform.availableDateTypeLabel")}</Label>
                                  <Select
                                    value={platformValues["qoo10.AvailableDateType"] ?? "0"}
                                    onChange={(e) => setPlatformValue("qoo10.AvailableDateType", e.target.value)}
                                  >
                                    <option value="0">{t("platform.availableDateType0")}</option>
                                    <option value="1">{t("platform.availableDateType1")}</option>
                                    <option value="2">{t("platform.availableDateType2")}</option>
                                    <option value="3">{t("platform.availableDateType3")}</option>
                                  </Select>
                                </Box>
                              );
                            }

                            // AvailableDateValue: type에 따라 동적 placeholder
                            if (field.key === "qoo10.AvailableDateValue") {
                              const dateType = platformValues["qoo10.AvailableDateType"] ?? "0";
                              const placeholder =
                                dateType === "0" ? t("platform.availableDateValuePlaceholder0") :
                                dateType === "1" ? t("platform.availableDateValuePlaceholder1") :
                                dateType === "2" ? t("platform.availableDateValuePlaceholder2") :
                                t("platform.availableDateValuePlaceholder3");
                              const isRequired = dateType !== "0";
                              return (
                                <Box key={field.key}>
                                  <Label required={isRequired}>{t("platform.availableDateValueLabel")}</Label>
                                  <Input
                                    size="sm"
                                    value={platformValues["qoo10.AvailableDateValue"] ?? ""}
                                    onChange={(e) => setPlatformValue("qoo10.AvailableDateValue", e.target.value)}
                                    placeholder={placeholder}
                                  />
                                  {dateType === "0" && (
                                    <HelperText>{t("platform.availableDateValueHelper")}</HelperText>
                                  )}
                                </Box>
                              );
                            }

                            // ItemQty: 변형 재고 합계로 자동 동기화 (읽기 전용 표시)
                            if (field.key === "qoo10.ItemQty") {
                              return (
                                <Box key={field.key}>
                                  {field.sectionHeader && (
                                    <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                        {field.sectionHeader}
                                      </Text>
                                    </Box>
                                  )}
                                  <Label required>{t("platform.itemQtyLabel")}</Label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={platformValues["qoo10.ItemQty"] ?? "0"}
                                    readOnly
                                    bg="gray.50"
                                    color="gray.600"
                                    cursor="default"
                                  />
                                  <HelperText>
                                    {t("platform.itemQtyHelper", { total: totalVariantStock })}
                                  </HelperText>
                                </Box>
                              );
                            }

                            // ItemPrice: 첫 번째 변형 가격으로 자동 동기화 (읽기 전용 표시)
                            if (field.key === "qoo10.ItemPrice") {
                              return (
                                <Box key={field.key}>
                                  {field.sectionHeader && (
                                    <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                        {field.sectionHeader}
                                      </Text>
                                    </Box>
                                  )}
                                  <Label required>{t("platform.itemPriceLabel")}</Label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={platformValues["qoo10.ItemPrice"] ?? ""}
                                    readOnly
                                    bg="gray.50"
                                    color="gray.600"
                                    cursor="default"
                                  />
                                  <HelperText>
                                    {firstVariantPrice !== ""
                                      ? t("platform.itemPriceHelperWithValue", { price: firstVariantPrice })
                                      : t("platform.itemPriceHelper")}
                                  </HelperText>
                                </Box>
                              );
                            }

                            // ShippingNo: Qoo10 GetSellerDeliveryGroupInfo API로 배송 그룹 조회 후 선택
                            if (field.key === "qoo10.ShippingNo") {
                              const selectedNo = platformValues["qoo10.ShippingNo"] ?? "";
                              const shippingTypeLabel: Record<string, string> = {
                                X: t("platform.shippingFreeLabel"),
                                F: t("platform.shippingPaidLabel"),
                                M: t("platform.shippingConditionalLabel"),
                                W: t("platform.shippingPickupLabel"),
                                D: t("platform.shippingCodNoPrepayLabel"),
                                R: t("platform.shippingCodPrepayLabel"),
                              };
                              const selectedTemplate = shippingTemplates.find(
                                (t) => String(t.ShippingNo) === selectedNo,
                              );
                              const filteredTemplates = shippingKeyword.trim()
                                ? shippingTemplates.filter(
                                    (t) =>
                                      String(t.ShippingNo).includes(shippingKeyword) ||
                                      (t.transcName ?? "").includes(shippingKeyword) ||
                                      (shippingTypeLabel[t.ShippingType] ?? "").includes(shippingKeyword),
                                  )
                                : shippingTemplates;
                              return (
                                <Box key={field.key}>
                                  {field.sectionHeader && (
                                    <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                        {field.sectionHeader}
                                      </Text>
                                    </Box>
                                  )}
                                  <Label required>{t("platform.shippingTemplate")}</Label>
                                  <Box position="relative">
                                    <Input
                                      size="sm"
                                      placeholder={
                                        shippingTemplateQuery.isLoading
                                          ? t("platform.shippingTemplateLoading")
                                          : shippingTemplateQuery.isError
                                            ? t("platform.shippingTemplateDirectInput")
                                            : shippingTemplates.length === 0
                                              ? t("platform.shippingTemplateDirectInput")
                                              : t("platform.shippingTemplateSearch")
                                      }
                                      value={
                                        shippingTemplates.length === 0
                                          ? selectedNo ?? ""
                                          : isShippingDropdownOpen
                                            ? shippingKeyword
                                            : selectedTemplate
                                              ? `No.${selectedTemplate.ShippingNo} · ${shippingTypeLabel[selectedTemplate.ShippingType] ?? selectedTemplate.ShippingType} · ${selectedTemplate.transcName}`
                                              : selectedNo === "0"
                                                ? t("platform.shippingFree")
                                                : selectedNo
                                                  ? t("platform.shippingNoPrefix", { no: selectedNo })
                                                  : ""
                                      }
                                      onFocus={() => {
                                        if (shippingTemplates.length > 0) {
                                          setIsShippingDropdownOpen(true);
                                          setShippingKeyword("");
                                        }
                                      }}
                                      onChange={(e) => {
                                        if (shippingTemplates.length === 0) {
                                          setPlatformValue("qoo10.ShippingNo", e.target.value);
                                          if (!platformValues["qoo10.AvailableDateType"]) {
                                            setPlatformValue("qoo10.AvailableDateType", "0");
                                          }
                                        } else {
                                          setShippingKeyword(e.target.value);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        if (shippingTemplates.length === 0 && e.target.value.trim()) {
                                          setPlatformValue("qoo10.ShippingNo", e.target.value.trim());
                                          if (!platformValues["qoo10.AvailableDateType"]) {
                                            setPlatformValue("qoo10.AvailableDateType", "0");
                                          }
                                        }
                                        window.setTimeout(() => setIsShippingDropdownOpen(false), 150);
                                      }}
                                      readOnly={shippingTemplateQuery.isLoading}
                                    />
                                    {isShippingDropdownOpen && shippingTemplates.length > 0 && (
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
                                        {/* 무료배송 고정 옵션 */}
                                        <Box
                                          px={3}
                                          py={2}
                                          cursor="pointer"
                                          fontSize="sm"
                                          _hover={{ bg: "gray.50" }}
                                          bg={selectedNo === "0" ? "orange.50" : "white"}
                                          onMouseDown={() => {
                                            setPlatformValue("qoo10.ShippingNo", "0");
                                            setIsShippingDropdownOpen(false);
                                          }}
                                        >
                                          <Text fontWeight="medium">{t("platform.shippingFree")}</Text>
                                        </Box>
                                        {filteredTemplates.length === 0 && (
                                          <Box px={3} py={2} fontSize="sm" color="gray.400">
                                            {t("platform.shippingNoResult")}
                                          </Box>
                                        )}
                                        {filteredTemplates.map((tpl) => (
                                          <Box
                                            key={tpl.ShippingNo}
                                            px={3}
                                            py={2}
                                            cursor="pointer"
                                            fontSize="sm"
                                            _hover={{ bg: "gray.50" }}
                                            bg={selectedNo === String(tpl.ShippingNo) ? "orange.50" : "white"}
                                            onMouseDown={() => {
                                              setPlatformValue("qoo10.ShippingNo", String(tpl.ShippingNo));
                                              if (!platformValues["qoo10.AvailableDateType"]) {
                                                setPlatformValue("qoo10.AvailableDateType", "0");
                                              }
                                              setIsShippingDropdownOpen(false);
                                            }}
                                          >
                                            <Text fontWeight="medium">
                                              {t("platform.shippingNoPrefix", { no: tpl.ShippingNo })} · {shippingTypeLabel[tpl.ShippingType] ?? tpl.ShippingType} · {tpl.transcName}
                                            </Text>
                                            <Text fontSize="xs" color="gray.500">
                                              {t("platform.shippingFeeLine", { fee: tpl.ShippingFee })}
                                              {tpl.ShippingType === 'M' && ` · ${t("platform.shippingConditional", { threshold: tpl.FreeCondition })}`}
                                            </Text>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                  {selectedNo === "0" && (
                                    <HelperText>{t("platform.shippingFreeHelper")}</HelperText>
                                  )}
                                  {shippingTemplateQuery.isError && (
                                    <HelperText>{t("platform.shippingError")}</HelperText>
                                  )}
                                </Box>
                              );
                            }

                            return (
                              <Box key={field.key}>
                                {field.sectionHeader && (
                                  <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                      {field.sectionHeader}
                                    </Text>
                                  </Box>
                                )}
                                {field.type !== "checkbox" && (
                                  <Label required={field.required || isConditionallyRequired}>
                                    {field.label}
                                  </Label>
                                )}
                                {field.type === "select" && field.options ? (
                                  <Select
                                    value={platformValues[field.key] ?? ""}
                                    onChange={(e) => setPlatformValue(field.key, e.target.value)}
                                  >
                                    <option value="">{t("platform.selectPlaceholder")}</option>
                                    {field.options.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </Select>
                                ) : field.conditionalOptions &&
                                  field.conditionalOptions.values.includes(
                                    String(platformValues[field.conditionalOptions.dependsOn] ?? "")
                                  ) ? (
                                  <Select
                                    value={platformValues[field.key] ?? ""}
                                    onChange={(e) => setPlatformValue(field.key, e.target.value)}
                                  >
                                    <option value="">{t("platform.conditionalSelectNone")}</option>
                                    {field.conditionalOptions.options.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </Select>
                                ) : field.type === "checkbox" ? (
                                  <Flex align="center" gap={2} mt={1}>
                                    <Checkbox.Root
                                      checked={platformValues[field.key] === "true"}
                                      onCheckedChange={(e) => setPlatformValue(field.key, e.checked ? "true" : "false")}
                                      size="sm"
                                    >
                                      <Checkbox.HiddenInput />
                                      <Checkbox.Control />
                                      <Checkbox.Label fontSize="sm" color="gray.700">{field.label}</Checkbox.Label>
                                    </Checkbox.Root>
                                  </Flex>
                                ) : field.type === "textarea" && (field.key === "qoo10.ItemDescription" || field.key === "shopify.descriptionHtml") ? (
                                  <ShopifyHtmlEditor
                                    value={platformValues[field.key] ?? ""}
                                    onChange={(v) => setPlatformValue(field.key, v)}
                                  />
                                ) : field.type === "textarea" ? (
                                  <textarea
                                    value={platformValues[field.key] ?? ""}
                                    onChange={(e) => setPlatformValue(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={3}
                                    style={{
                                      width: "100%",
                                      border: "1px solid #E2E8F0",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontSize: "14px",
                                      outline: "none",
                                      resize: "vertical",
                                    }}
                                  />
                                ) : (
                                  <Input
                                    size="sm"
                                    type={field.type === "number" ? "number" : "text"}
                                    value={platformValues[field.key] ?? ""}
                                    onChange={(e) => setPlatformValue(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    maxLength={field.maxLength}
                                  />
                                )}
                                {field.note && <HelperText>{field.note}</HelperText>}
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
          )}
        </Box>

        {/* ── 등록된 채널 (편집 모드) ── */}
        {isEdit && (detail?.listedProducts ?? []).length > 0 && (
          <Section title={t("listedChannels.section")}>
            <Stack gap={0} borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              {detail!.listedProducts.map((lp) => (
                <Flex
                  key={lp.id}
                  align="center"
                  justify="space-between"
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  _last={{ borderBottomWidth: 0 }}
                  _hover={{ bg: "gray.50" }}
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">{lp.channelName}</Text>
                    <Text fontSize="xs" color="gray.400" mt={0.5}>
                      {lp.channelType}{lp.title && ` · ${lp.title}`}
                    </Text>
                  </Box>
                  <Flex align="center" gap={3}>
                    {lp.lastSyncedAt && (
                      <Text fontSize="xs" color="gray.400">
                        {new Date(lp.lastSyncedAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "ko-KR")}
                      </Text>
                    )}
                    <Box
                      px={2.5} py={0.5} borderRadius="full" fontSize="xs" fontWeight="medium"
                      bg={lp.syncStatus === "SYNCED" ? "green.100" : lp.syncStatus === "ERROR" ? "red.100" : "orange.100"}
                      color={lp.syncStatus === "SYNCED" ? "green.700" : lp.syncStatus === "ERROR" ? "red.700" : "orange.700"}
                    >
                      {lp.syncStatus === "SYNCED" ? t("listedChannels.statusSynced") : lp.syncStatus === "ERROR" ? t("listedChannels.statusError") : t("listedChannels.statusPending")}
                    </Box>
                  </Flex>
                </Flex>
              ))}
            </Stack>
          </Section>
        )}

        {/* ── 하단 버튼 ── */}
        <Flex justify="flex-end" gap={3} pb={8}>
          <Button size="sm" variant="ghost" onClick={() => router.push(ROUTES.masterProducts)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            loading={isSaving}
            disabled={isSaving}
          >
            {isEdit ? t("actions.save") : t("actions.create")}
          </Button>
        </Flex>
      </Stack>

      {isEdit && id && (
        <ListToChannelModal
          masterProductId={id}
          variants={variants}
          listedProducts={detail?.listedProducts ?? []}
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: masterProductQueries.detail(id) });
          }}
        />
      )}

      <SyncConfirmModal
        open={syncModalOpen}
        linkedProducts={syncTargets}
        onClose={() => {
          setSyncModalOpen(false);
          setSyncTargets([]);
        }}
      />
    </Box>
  );
}
