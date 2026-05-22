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

interface MasterVariantRow {
  /** 테이블 표시용 임시 key (저장 전) */
  _key: string;
  sku: string;
  options: VariantOptionCell[];
  price: string;
  stock: string;
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
    sku: "",
    options,
    price: "",
    stock: "0",
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
      if (!val) missing.push("이미지");
    } else if (!val.trim()) {
      if (
        commonKey === "descriptionHtml" &&
        platformDescriptionKey &&
        (platformValues[platformDescriptionKey] ?? "").trim()
      ) {
        continue;
      }
      const labelMap: Record<string, string> = {
        title: "상품명",
        weightG: "무게(g)",
        descriptionHtml: "상품 설명",
        brand: "브랜드",
        hsCode: "HS 코드",
        countryOfOrigin: "원산지",
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

// ── 컴포넌트 ──────────────────────────────────────────────────────

export function MasterProductFormPage({ id }: Props): React.JSX.Element {
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
  const [singleSku, setSingleSku] = useState("");
  const [singlePrice, setSinglePrice] = useState("");
  const [singleStock, setSingleStock] = useState("0");

  // ── 편집 모드 변형 ────────────────────────────────────────────────
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<{
    sku: string;
    /** groupName -> value */
    optionValues: Record<string, string>;
    price: string;
    stock: string;
  }>({ sku: "", optionValues: {}, price: "", stock: "" });

  // 단일 변형 추가 폼 (편집 모드)
  const [newVariantSku, setNewVariantSku] = useState("");
  /** groupName -> value */
  const [newVariantOptionValues, setNewVariantOptionValues] = useState<Record<string, string>>({});
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [newVariantStock, setNewVariantStock] = useState("");

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
    return PLATFORM_DEFS.filter((def) => def.apiAvailable && map[def.channelId]);
  }, [qoo10Connected, shopifyConnected]);

  const [listModalOpen, setListModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTargets, setSyncTargets] = useState<Array<{ id: string; title?: string; channelName: string; channelType: string }>>([]);

  // ── hydrate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!detail) return;
    setCode(detail.code);
    setTitle(detail.title);
    const b = detail.brand ?? "";
    if (!b) { setNoBrand(true); setBrand(""); }
    else { setNoBrand(false); setBrand(b); }
    setHsCode(detail.hsCode ?? "");

    const origin = detail.countryOfOrigin ?? "";
    setCountryOfOrigin(origin);
    if (!origin || origin === "대한민국" || origin === "국내") setOriginType("domestic");
    else if (origin === "기타" || origin === "기타(ETC)") setOriginType("other");
    else setOriginType("overseas");

    setMaterial(detail.material ?? "");
    setWeightG(detail.weightG != null ? String(detail.weightG) : "");
    setRetailPrice(detail.retailPrice ?? "");
    setTagsInput(detail.tags.join(", "));
    setDescriptionHtml(detail.descriptionHtml ?? "");
    setImages(detail.images.map((img) => ({ url: img.url, altText: img.altText ?? "" })));

    const restored: Record<string, string> = {};
    const attrs = detail.attributes as Record<string, unknown>;
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
  const totalVariantStock = useMemo(() => {
    if (isEdit) {
      const vs = detail?.variants ?? [];
      return vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
    if (draftVariants.length > 0) {
      return draftVariants.reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
    }
    return Number(singleStock) || 0;
  }, [isEdit, detail?.variants, draftVariants, singleStock]);

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

  const buildOriginValue = (): string | undefined => {
    if (originType === "domestic") return countryOfOrigin.trim() || "대한민국";
    return countryOfOrigin.trim() || undefined;
  };

  const buildPayload = () => ({
    code: code.trim(),
    title: title.trim(),
    brand: noBrand ? undefined : (brand.trim() || undefined),
    hsCode: hsCode.trim() || undefined,
    countryOfOrigin: buildOriginValue(),
    material: material.trim() || undefined,
    weightG: weightG.trim() ? Number(weightG.trim()) : undefined,
    retailPrice: retailPrice.trim() || undefined,
    tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    descriptionHtml: descriptionHtml.trim() || undefined,
    images: images.map((img, i) => ({
      url: img.url,
      altText: img.altText || undefined,
      order: i,
    })),
    attributes: buildAttributes(),
  });

  const handleSubmit = async (): Promise<void> => {
    setFormError("");
    if (!code.trim() || !title.trim()) {
      setFormError("상품 코드와 상품명은 필수입니다.");
      return;
    }
    try {
      if (isEdit) {
        const result = await updateProduct(buildPayload());
        appToaster.create({ title: "저장 완료", type: "success" });
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
        // useAddVariant 훅은 마스터 상품 ID를 hook 초기화 시점에 캡처하므로,
        // 신규 등록 직후에는 created.id로 직접 POST해야 한다.
        const variantsUrl = `/api/master-products/${created.id}/variants`;

        if (draftVariants.length > 0) {
          // 옵션 그룹 먼저 저장 (서버에서 옵션값 정합성 검증)
          if (optionAxes.length > 0) {
            try {
              await http.put(`/api/master-products/${created.id}/option-groups`, {
                groups: optionAxes.map((a) => ({ name: a.name, values: a.values })),
              });
            } catch {
              appToaster.create({ title: "옵션 그룹 저장 실패", type: "error" });
            }
          }
          // 옵션 조합으로 생성된 변형들을 일괄 저장
          for (const row of draftVariants) {
            if (!row.sku.trim()) continue;
            try {
              await http.post(variantsUrl, {
                sku: row.sku.trim(),
                optionValues: row.options,
                price: row.price.trim() || undefined,
                stock: Number(row.stock) || 0,
              });
            } catch {
              // 개별 실패는 계속 진행
            }
          }
        } else {
          // 옵션 없는 단일 상품: 단일 SKU/재고 변형을 1개 자동 생성
          const sku = singleSku.trim() || code.trim();
          if (sku) {
            try {
              await http.post(variantsUrl, {
                sku,
                price: singlePrice.trim() || undefined,
                stock: Number(singleStock) || 0,
              });
            } catch {
              // 등록은 이미 완료되었으므로 변형 실패만 토스트로 안내
              appToaster.create({ title: "단일 변형 저장 실패", type: "error" });
            }
          }
        }

        await queryClient.invalidateQueries({ queryKey: masterProductsQueryRoot });

        appToaster.create({ title: "등록 완료", type: "success" });
        router.push(ROUTES.masterProductEdit(created.id));
        return;
      }
    } catch {
      appToaster.create({ title: isEdit ? "수정 실패" : "등록 실패", type: "error" });
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
    if (!newVariantSku.trim()) {
      appToaster.create({ title: "SKU는 필수입니다.", type: "error" });
      return;
    }
    const groups = detail?.optionGroups ?? [];
    const optionValues: VariantOptionCell[] = groups
      .map((g) => ({ groupName: g.name, value: (newVariantOptionValues[g.name] ?? "").trim() }))
      .filter((c) => c.value.length > 0);
    try {
      await addVariant({
        sku: newVariantSku.trim(),
        optionValues: optionValues.length > 0 ? optionValues : undefined,
        price: newVariantPrice.trim() || undefined,
        stock: Number(newVariantStock) || 0,
      });
      setNewVariantSku("");
      setNewVariantOptionValues({});
      setNewVariantPrice(""); setNewVariantStock("");
      appToaster.create({ title: "변형 추가 완료", type: "success" });
    } catch {
      appToaster.create({ title: "변형 추가 실패", type: "error" });
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
          sku: editingVariant.sku.trim(),
          optionValues: optionValues.length > 0 ? optionValues : undefined,
          price: editingVariant.price.trim() || undefined,
          stock: Number(editingVariant.stock) || 0,
        },
      });
      setEditingVariantId(null);
      appToaster.create({ title: "변형 수정 완료", type: "success" });
    } catch {
      appToaster.create({ title: "변형 수정 실패", type: "error" });
    }
  };

  const handleDeleteVariant = async (variantId: string): Promise<void> => {
    try {
      await deleteVariant(variantId);
      appToaster.create({ title: "변형 삭제 완료", type: "success" });
    } catch {
      appToaster.create({ title: "변형 삭제 실패", type: "error" });
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
          title={isEdit ? "마스터 상품 편집" : "마스터 상품 등록"}
          description={
            isEdit
              ? "마스터 상품 정보를 수정합니다."
              : "새 마스터 상품을 등록합니다. 등록 후 각 채널에 개별 등록할 수 있습니다."
          }
        />
        <Flex gap={2} mt={1} flexShrink={0}>
          <Button size="sm" variant="ghost" onClick={() => router.push(ROUTES.masterProducts)}>
            취소
          </Button>
          {isEdit && (
            <Button size="sm" variant="outline" colorPalette="blue" onClick={() => setListModalOpen(true)}>
              채널 등록
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
            {isEdit ? "저장" : "등록"}
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
        <Section title="기본 정보">
          <Stack gap={4}>
            {/* 코드 + 상품명 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label required>상품 코드</Label>
                <Input size="sm" value={code} onChange={(e) => setCode(e.target.value)} placeholder="예: PROD-001" />
                <HelperText>Passoffer 내부 관리 코드</HelperText>
              </Box>
              <Box flex="2">
                <Label required>상품명</Label>
                <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="상품명 입력" />
              </Box>
            </Flex>

            {/* 브랜드 (Shopee 패턴: 브랜드 없음 체크박스) */}
            <Box>
              <Label>브랜드</Label>
              <Flex align="center" gap={2} mb={2}>
                <Checkbox.Root
                  checked={noBrand}
                  onCheckedChange={(e) => setNoBrand(!!e.checked)}
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontSize="sm" color="gray.600">브랜드 없음 (No Brand)</Checkbox.Label>
                </Checkbox.Root>
              </Flex>
              {!noBrand && (
                <Input
                  size="sm"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="브랜드명 입력"
                />
              )}
            </Box>

            {/* HS코드 + 소비자가 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label>HS 코드</Label>
                <Input size="sm" value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="예: 6109.10" />
              </Box>
              <Box flex="1">
                <Label>소비자가</Label>
                <Input size="sm" type="number" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} placeholder="예: 29000" />
              </Box>
            </Flex>

            {/* 원산지: 유형 + 상세 */}
            <Box>
              <Label>원산지</Label>
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
                    <option value="domestic">국내 (대한민국)</option>
                    <option value="overseas">해외</option>
                    <option value="other">기타</option>
                  </Select>
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
              <HelperText>
                {originType === "domestic" && "국내 제조 상품. 지역 입력 시 더 상세한 정보 제공 가능."}
                {originType === "overseas" && "해외 제조 국가를 입력하세요 (한글 또는 영문)."}
                {originType === "other" && "국가 구분이 어렵거나 복합 원산지인 경우 자유 입력하세요."}
              </HelperText>
            </Box>

            {/* 소재 + 무게 */}
            <Flex gap={4} direction={{ base: "column", md: "row" }}>
              <Box flex="1">
                <Label>소재</Label>
                <Input size="sm" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="예: 면 100%" />
              </Box>
              <Box flex="1">
                <Label>무게 (g)</Label>
                <Input size="sm" type="number" value={weightG} onChange={(e) => setWeightG(e.target.value)} placeholder="예: 300" />
              </Box>
            </Flex>

            {/* 태그 */}
            <Box>
              <Label>태그</Label>
              <Input size="sm" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="예: 의류, 여성, 반팔" />
              <HelperText>쉼표로 구분하여 입력하세요</HelperText>
            </Box>
          </Stack>
        </Section>

        {/* ── 상품 설명 ── */}
        <Section title="상품 설명">
          <ShopifyHtmlEditor value={descriptionHtml} onChange={setDescriptionHtml} />
        </Section>

        {/* ── 이미지 ── */}
        <Section title="이미지">
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
                    삭제
                  </Button>
                </Flex>
              ))}
            </Box>
          )}
          <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
            <Text fontSize="sm" fontWeight="medium" mb={3}>이미지 추가</Text>
            <Flex gap={3} direction={{ base: "column", md: "row" }}>
              <Box flex="2">
                <Label>이미지 URL</Label>
                <Input
                  size="sm"
                  bg="white"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImage(); } }}
                />
              </Box>
              <Box flex="1">
                <Label>대체 텍스트</Label>
                <Input size="sm" bg="white" value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)} placeholder="이미지 설명" />
              </Box>
              <Box pt={{ base: 0, md: "22px" }}>
                <Button size="sm" variant="outline" onClick={handleAddImage} disabled={!newImageUrl.trim()}>
                  추가
                </Button>
              </Box>
            </Flex>
          </Box>
        </Section>

        {/* ── 조합형 옵션 (신규 등록 모드) ── */}
        {!isEdit && (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" overflow="hidden">
            <Box px={5} py={4} borderBottomWidth="1px" borderColor="gray.200">
              <Text fontSize="md" fontWeight="semibold">옵션 (Variants)</Text>
            </Box>
            <Box px={5} pt={5} pb={3}>
              <OptionAxisForm
                axes={optionAxes}
                maxAxes={MASTER_MAX_AXES}
                maxValues={20}
                onAxesChange={setOptionAxes}
                onApply={handleOptionApply}
                applyLabel="↓ 옵션 조합 생성"
              />
            </Box>

            {draftVariants.length > 0 && (
              <Box px={5} pb={5}>
                <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.700">
                  옵션 목록 ({draftVariants.length}개) — SKU와 가격/재고를 입력하세요
                </Text>
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        {optionAxes.map((ax) => (
                          <Table.ColumnHeader key={ax.id} fontWeight="medium" color="gray.600" w="24">
                            {ax.name || "옵션"}
                          </Table.ColumnHeader>
                        ))}
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="28">SKU</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="20">가격 (₩)</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="16">재고</Table.ColumnHeader>
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
                            <Input
                              size="xs"
                              value={row.sku}
                              onChange={(e) => updateDraftRow(row._key, "sku", e.target.value)}
                              placeholder="SKU"
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
                            <Input
                              size="xs"
                              type="number"
                              value={row.stock}
                              onChange={(e) => updateDraftRow(row._key, "stock", e.target.value)}
                              placeholder="0"
                            />
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
                  * SKU 미입력 행은 등록 시 건너뜁니다. 등록 버튼 클릭 시 마스터 상품과 함께 저장됩니다.
                </Text>
              </Box>
            )}

            {draftVariants.length === 0 && optionAxes.length === 0 && (
              <Box px={5} pb={5}>
                <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.700">
                  단일 상품 — SKU와 가격/재고를 입력하세요
                </Text>
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="40">SKU</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="28">가격 (₩)</Table.ColumnHeader>
                        <Table.ColumnHeader fontWeight="medium" color="gray.600" w="20">재고</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell>
                          <Input
                            size="xs"
                            value={singleSku}
                            onChange={(e) => setSingleSku(e.target.value)}
                            placeholder={code.trim() ? `(공란 시 ${code.trim()} 사용)` : "SKU"}
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
                          <Input
                            size="xs"
                            type="number"
                            value={singleStock}
                            onChange={(e) => setSingleStock(e.target.value)}
                            placeholder="0"
                          />
                        </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table.Root>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  * 위에서 옵션을 추가하면 옵션 조합별 SKU/재고 입력으로 전환됩니다.
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
          <Section title="변형 (Variants)">
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader fontWeight="medium" color="gray.600">SKU</Table.ColumnHeader>
                    {detailGroups.map((g) => (
                      <Table.ColumnHeader key={g.id} fontWeight="medium" color="gray.600">
                        {g.name}
                      </Table.ColumnHeader>
                    ))}
                    <Table.ColumnHeader fontWeight="medium" color="gray.600">가격</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="medium" color="gray.600">재고</Table.ColumnHeader>
                    <Table.ColumnHeader />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {variants.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={totalCols}>
                        <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                          등록된 변형이 없습니다. 아래에서 추가하세요.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                  {variants.map((v) => {
                    const valueByGroup: Record<string, string> = {};
                    for (const opt of v.options) valueByGroup[opt.groupName] = opt.value;
                    return editingVariantId === v.id ? (
                      <Table.Row key={v.id} bg="blue.50">
                        <Table.Cell><Input size="xs" value={editingVariant.sku} onChange={(e) => setEditingVariant((p) => ({ ...p, sku: e.target.value }))} /></Table.Cell>
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
                        <Table.Cell><Input size="xs" type="number" value={editingVariant.stock} onChange={(e) => setEditingVariant((p) => ({ ...p, stock: e.target.value }))} /></Table.Cell>
                        <Table.Cell>
                          <Flex gap={1}>
                            <Button size="xs" bg="gray.900" color="white" _hover={{ bg: "gray.800" }} onClick={() => void handleSaveVariant(v.id)}>저장</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingVariantId(null)}>취소</Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      <Table.Row key={v.id} _hover={{ bg: "gray.50" }}>
                        <Table.Cell><Text fontSize="sm" fontWeight="medium">{v.sku}</Text></Table.Cell>
                        {detailGroups.map((g) => (
                          <Table.Cell key={g.id}>
                            <Text fontSize="sm" color="gray.600">{valueByGroup[g.name] ?? "-"}</Text>
                          </Table.Cell>
                        ))}
                        <Table.Cell><Text fontSize="sm">{v.price ?? "-"}</Text></Table.Cell>
                        <Table.Cell><Text fontSize="sm">{v.stock}</Text></Table.Cell>
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
                                  sku: v.sku,
                                  optionValues: initialValues,
                                  price: v.price ?? "",
                                  stock: String(v.stock),
                                });
                              }}
                            >
                              편집
                            </Button>
                            <Button size="xs" variant="outline" colorPalette="red" onClick={() => void handleDeleteVariant(v.id)}>삭제</Button>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}

                  {/* 신규 변형 입력 행 */}
                  <Table.Row bg="gray.50">
                    <Table.Cell><Input size="xs" value={newVariantSku} onChange={(e) => setNewVariantSku(e.target.value)} placeholder="SKU *" /></Table.Cell>
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
                    <Table.Cell><Input size="xs" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} placeholder="가격" /></Table.Cell>
                    <Table.Cell><Input size="xs" type="number" value={newVariantStock} onChange={(e) => setNewVariantStock(e.target.value)} placeholder="재고" /></Table.Cell>
                    <Table.Cell>
                      <Button size="xs" bg="gray.900" color="white" _hover={{ bg: "gray.800" }} onClick={() => void handleAddVariant()}>추가</Button>
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
            <Text fontSize="md" fontWeight="semibold">플랫폼별 추가 정보</Text>
            <Text fontSize="sm" color="gray.500" mt={0.5}>
              각 채널에 등록할 때 필요한 플랫폼 전용 필드를 입력하세요.
            </Text>
          </Box>

          {connectedPlatformKeys.length === 0 ? (
            <Box px={5} py={10} textAlign="center">
              <Text fontSize="sm" color="gray.500" fontWeight="medium">연결된 플랫폼이 없습니다</Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                설정 &gt; 채널 연결에서 API 키를 등록하면 여기에 표시됩니다.
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
                      ✓ 등록 가능
                    </Box>
                  ) : (
                    <Box px={2} py={0.5} borderRadius="full" fontSize="xs" fontWeight="medium" bg="orange.50" color="orange.700" border="1px solid" borderColor="orange.200">
                      필수값 미입력 ({missing.length}개)
                    </Box>
                  )
                ) : (
                  <Box px={2} py={0.5} borderRadius="full" fontSize="xs" color="gray.400" border="1px solid" borderColor="gray.200">
                    미입력
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
                            미입력: {missing.join(" · ")}
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
                              채널 등록 전 아래 항목을 입력해 주세요
                            </Text>
                            <Text fontSize="xs" color="orange.600" mt={1}>
                              {missing.join(", ")}
                            </Text>
                          </Box>
                        )}

                        <Stack gap={4}>
                          {/* Qoo10 카테고리: SecondSubCat / OuterSecondSubCat 필드를 3단계 셀렉트로 교체 */}
                          {def.key === "QOO10_JP" && (
                            <Box>
                              <Box mt={2} mb={3} pb={2} borderBottomWidth="1px" borderColor="gray.200">
                                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                  카테고리
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
                                    <Label required>대분류</Label>
                                    <Select
                                      value={mainCatCd}
                                      onChange={(e) => {
                                        setMainCatCd(e.target.value);
                                        setMidCatCd("");
                                        setPlatformValue("qoo10.SecondSubCat", "");
                                      }}
                                    >
                                      <option value="">대분류 선택</option>
                                      {mainCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                  </Box>
                                  <Box>
                                    <Label required>중분류</Label>
                                    <Select
                                      value={midCatCd}
                                      onChange={(e) => {
                                        setMidCatCd(e.target.value);
                                        setPlatformValue("qoo10.SecondSubCat", "");
                                      }}
                                      disabled={!mainCatCd}
                                    >
                                      <option value="">중분류 선택</option>
                                      {midCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                  </Box>
                                  <Box>
                                    <Label required>소분류</Label>
                                    <Select
                                      value={platformValues["qoo10.SecondSubCat"] ?? ""}
                                      onChange={(e) => setPlatformValue("qoo10.SecondSubCat", e.target.value)}
                                      disabled={!midCatCd}
                                    >
                                      <option value="">소분류 선택</option>
                                      {secondSubCatOptions.map((opt) => (
                                        <option key={opt.code} value={opt.code}>{opt.name}</option>
                                      ))}
                                    </Select>
                                    {platformValues["qoo10.SecondSubCat"] && (
                                      <HelperText>코드: {platformValues["qoo10.SecondSubCat"]}</HelperText>
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
                                  브랜드
                                </Text>
                              </Box>
                              <Label>브랜드 검색</Label>
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
                                  <Checkbox.Label fontSize="sm" color="gray.600">입력하지 않음</Checkbox.Label>
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
                                    placeholder="브랜드명을 입력해 주세요 (2글자 이상)"
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
                                        <Text fontSize="sm" color="gray.500" py={2} textAlign="center">검색 결과가 없습니다.</Text>
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
                                    <HelperText>선택됨: {selectedBrandLabel}</HelperText>
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
                                  <Label required>발송가능일 타입</Label>
                                  <Select
                                    value={platformValues["qoo10.AvailableDateType"] ?? "0"}
                                    onChange={(e) => setPlatformValue("qoo10.AvailableDateType", e.target.value)}
                                  >
                                    <option value="0">일반발송 (3영업일)</option>
                                    <option value="1">상품준비일</option>
                                    <option value="2">출시일</option>
                                    <option value="3">당일발송</option>
                                  </Select>
                                </Box>
                              );
                            }

                            // AvailableDateValue: type에 따라 동적 placeholder
                            if (field.key === "qoo10.AvailableDateValue") {
                              const dateType = platformValues["qoo10.AvailableDateType"] ?? "0";
                              const placeholder =
                                dateType === "0" ? "1~3 (일반발송일)" :
                                dateType === "1" ? "4~14 (준비일 수)" :
                                dateType === "2" ? "2025/09/26 (출시일)" :
                                "14:30 (당일발송 마감시간)";
                              const isRequired = dateType !== "0";
                              return (
                                <Box key={field.key}>
                                  <Label required={isRequired}>발송가능일 값</Label>
                                  <Input
                                    size="sm"
                                    value={platformValues["qoo10.AvailableDateValue"] ?? ""}
                                    onChange={(e) => setPlatformValue("qoo10.AvailableDateValue", e.target.value)}
                                    placeholder={placeholder}
                                  />
                                  {dateType === "0" && (
                                    <HelperText>일반발송 선택 시 미입력이면 1(영업일)로 자동 처리됩니다.</HelperText>
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
                                  <Label required>재고 수량</Label>
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
                                    변형(Variants) 재고 합계에서 자동 계산됩니다. (현재: {totalVariantStock}개)
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
                                  <Label required>판매 가격 (JPY)</Label>
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
                                    첫 번째 변형(Variant) 가격에서 자동 계산됩니다.{firstVariantPrice !== "" && ` (현재: ¥${firstVariantPrice})`}
                                  </HelperText>
                                </Box>
                              );
                            }

                            // ShippingNo: Qoo10 GetSellerDeliveryGroupInfo API로 배송 그룹 조회 후 선택
                            if (field.key === "qoo10.ShippingNo") {
                              const selectedNo = platformValues["qoo10.ShippingNo"] ?? "";
                              const shippingTypeLabel: Record<string, string> = {
                                X: "무료",
                                F: "유료",
                                M: "조건부무료",
                                W: "방문수령",
                                D: "착불(선결제불가)",
                                R: "착불(선결제가능)",
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
                                  <Label required>배송 템플릿</Label>
                                  <Box position="relative">
                                    <Input
                                      size="sm"
                                      placeholder={
                                        shippingTemplateQuery.isLoading
                                          ? "배송 템플릿 불러오는 중..."
                                          : shippingTemplateQuery.isError
                                            ? "배송 번호 직접 입력 (예: 12345)"
                                            : shippingTemplates.length === 0
                                              ? "배송 번호 직접 입력 (예: 12345)"
                                              : "템플릿 번호 또는 배송사로 검색"
                                      }
                                      value={
                                        shippingTemplates.length === 0
                                          ? selectedNo ?? ""
                                          : isShippingDropdownOpen
                                            ? shippingKeyword
                                            : selectedTemplate
                                              ? `No.${selectedTemplate.ShippingNo} · ${shippingTypeLabel[selectedTemplate.ShippingType] ?? selectedTemplate.ShippingType} · ${selectedTemplate.transcName}`
                                              : selectedNo === "0"
                                                ? "0 — 무료배송"
                                                : selectedNo
                                                  ? `No. ${selectedNo}`
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
                                          <Text fontWeight="medium">0 — 무료배송</Text>
                                        </Box>
                                        {filteredTemplates.length === 0 && (
                                          <Box px={3} py={2} fontSize="sm" color="gray.400">
                                            검색 결과 없음
                                          </Box>
                                        )}
                                        {filteredTemplates.map((t) => (
                                          <Box
                                            key={t.ShippingNo}
                                            px={3}
                                            py={2}
                                            cursor="pointer"
                                            fontSize="sm"
                                            _hover={{ bg: "gray.50" }}
                                            bg={selectedNo === String(t.ShippingNo) ? "orange.50" : "white"}
                                            onMouseDown={() => {
                                              setPlatformValue("qoo10.ShippingNo", String(t.ShippingNo));
                                              if (!platformValues["qoo10.AvailableDateType"]) {
                                                setPlatformValue("qoo10.AvailableDateType", "0");
                                              }
                                              setIsShippingDropdownOpen(false);
                                            }}
                                          >
                                            <Text fontWeight="medium">
                                              No.{t.ShippingNo} · {shippingTypeLabel[t.ShippingType] ?? t.ShippingType} · {t.transcName}
                                            </Text>
                                            <Text fontSize="xs" color="gray.500">
                                              배송비 {t.ShippingFee}円 · {t.ShippingType === 'M' ? `${t.FreeCondition}円 이상 무료` : ''}
                                            </Text>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                  {selectedNo === "0" && (
                                    <HelperText>무료배송으로 처리됩니다.</HelperText>
                                  )}
                                  {shippingTemplateQuery.isError && (
                                    <HelperText>템플릿 조회 실패. Qoo10 API 키를 확인하거나 직접 번호를 입력하세요.</HelperText>
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
                                    <option value="">선택하세요</option>
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
                                    <option value="">선택안함</option>
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
          <Section title="등록된 채널">
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
                        {new Date(lp.lastSyncedAt).toLocaleDateString("ko-KR")}
                      </Text>
                    )}
                    <Box
                      px={2.5} py={0.5} borderRadius="full" fontSize="xs" fontWeight="medium"
                      bg={lp.syncStatus === "SYNCED" ? "green.100" : lp.syncStatus === "FAILED" ? "red.100" : "orange.100"}
                      color={lp.syncStatus === "SYNCED" ? "green.700" : lp.syncStatus === "FAILED" ? "red.700" : "orange.700"}
                    >
                      {lp.syncStatus === "SYNCED" ? "동기화됨" : lp.syncStatus === "FAILED" ? "실패" : "대기중"}
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
            취소
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
            {isEdit ? "저장" : "등록"}
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
