"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Skeleton,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  type CreateSkuInput,
  useAdjustSkuStock,
  useBulkCreateSkus,
  useCreateSku,
  useDeleteSku,
  useSku,
  useUpdateSku,
} from "@/entities/sku";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { ShopifyFormErrorMsg as ErrorMsg } from "@/shared/ui/ShopifyFormPrimitives";
import { appToaster } from "@/shared/ui/app-toaster";
import {
  type AxisRow,
  defaultState,
  type FormState,
  type Mode,
} from "../model/formState";
import { buildPayload, cartesian } from "../model/payload";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { BulkOptionsSection } from "./sections/BulkOptionsSection";
import { ExtraInfoSection } from "./sections/ExtraInfoSection";
import { MappingStockSection } from "./sections/MappingStockSection";
import { SpecPriceSection } from "./sections/SpecPriceSection";

interface Props {
  id?: string;
}

export function SkuFormPage({ id }: Props): React.JSX.Element {
  const router = useRouter();
  const t = useTranslations("pages.skus");
  const isEdit = !!id;

  const { data: detail, isLoading } = useSku(id ?? null);
  const { mutateAsync: createSku, isPending: isCreating } = useCreateSku();
  const { mutateAsync: bulkCreateSkus, isPending: isBulkCreating } =
    useBulkCreateSkus();
  const { mutateAsync: updateSku, isPending: isUpdating } = useUpdateSku(
    id ?? "",
  );
  const { mutateAsync: deleteSku, isPending: isDeleting } = useDeleteSku();
  const { mutateAsync: adjustStock, isPending: isAdjusting } =
    useAdjustSkuStock(id ?? "");

  const [mode, setMode] = useState<Mode>("single");
  const [state, setState] = useState<FormState>(defaultState);
  const [formError, setFormError] = useState("");

  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  // Bulk 모드용: 코드 prefix + 속성 축
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [axes, setAxes] = useState<AxisRow[]>([{ name: "color", values: "" }]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  useEffect(() => {
    if (!detail) return;
    setState({
      code: detail.code,
      name: detail.name ?? "",
      barcode: detail.barcode ?? "",
      warehouseText: detail.warehouseText ?? "",
      isPrimaryWarehouse: detail.isPrimaryWarehouse ?? false,
      vendorText: detail.vendorText ?? "",
      leadTimeDays:
        detail.leadTimeDays == null ? "" : String(detail.leadTimeDays),
      safetyStock: String(detail.safetyStock ?? 0),
      modelName: detail.modelName ?? "",
      inventoryCode: detail.inventoryCode ?? "",
      image: detail.image ?? "",
      standardCode: detail.standardCode ?? "",
      hsCode: detail.hsCode ?? "",
      isbn: detail.isbn ?? "",
      isBundlable: detail.isBundlable ?? true,
      widthCm: detail.widthCm ?? "",
      heightCm: detail.heightCm ?? "",
      depthCm: detail.depthCm ?? "",
      weightKg: detail.weightKg ?? "",
      inboundUnit: detail.inboundUnit ?? "",
      inboundUnitType: detail.inboundUnitType ?? "EA",
      purchaseCost: detail.purchaseCost ?? "0",
      purchaseFreight: detail.purchaseFreight ?? "0",
      deliveryFee: detail.deliveryFee ?? "0",
      adCost: detail.adCost ?? "0",
      etcCost: detail.etcCost ?? "0",
      supplyPrice: detail.supplyPrice ?? "",
      salePrice: detail.salePrice ?? "",
      currency: detail.currency ?? "KRW",
      originCountry: detail.originCountry ?? "",
      requiresCaution: detail.requiresCaution ?? false,
      taxType: (detail.taxType as FormState["taxType"]) ?? "GENERAL",
      brand: detail.brand ?? "",
      manufacturer: detail.manufacturer ?? "",
      manufacturerEn: detail.manufacturerEn ?? "",
      ageGroup: detail.ageGroup ?? "",
      mainImage: detail.mainImage ?? "",
      descriptionHtml: detail.descriptionHtml ?? "",
      initialStock: "0",
      attributesJson:
        detail.attributes && Object.keys(detail.attributes).length > 0
          ? JSON.stringify(detail.attributes, null, 2)
          : "",
    });
  }, [detail]);

  function parseAttributes(): Record<string, unknown> | null {
    const raw = state.attributesJson.trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      setFormError(t("form.errors.attrsNotObject"));
      return null;
    } catch {
      setFormError(t("form.errors.attrsInvalidJson"));
      return null;
    }
  }

  const bulkPreview = useMemo(() => {
    const cleanAxes = axes
      .map((a) => ({
        name: a.name.trim(),
        values: a.values
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((a) => a.name && a.values.length > 0);
    if (cleanAxes.length === 0) return [];
    const combos = cartesian(cleanAxes.map((a) => a.values));
    return combos.map((combo) => {
      const attrs: Record<string, string> = {};
      cleanAxes.forEach((a, idx) => {
        attrs[a.name] = combo[idx]!;
      });
      const suffix = combo.join("-").toUpperCase().replace(/\s+/g, "_");
      const code = bulkPrefix.trim()
        ? `${bulkPrefix.trim()}-${suffix}`
        : suffix;
      return { code, attrs };
    });
  }, [axes, bulkPrefix]);

  async function handleSubmit(): Promise<void> {
    setFormError("");
    if (!state.code.trim()) {
      setFormError(t("form.errors.codeRequired"));
      return;
    }
    const attributes = parseAttributes();
    if (attributes === null) return;

    try {
      const payload = buildPayload(state, attributes);
      if (isEdit) {
        const { ...rest } = payload;
        await updateSku(rest);
        appToaster.create({
          title: t("form.toasts.updateSuccess"),
          type: "success",
        });
      } else {
        const stockNum = Number(state.initialStock);
        const created = await createSku({
          ...payload,
          stock: Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : 0,
        });
        appToaster.create({
          title: t("form.toasts.createSuccess"),
          type: "success",
        });
        router.push(ROUTES.skuEdit(created.id));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("form.toasts.saveFailed");
      setFormError(message);
      appToaster.create({
        title: t("form.toasts.saveFailed"),
        description: message,
        type: "error",
      });
    }
  }

  async function handleBulkSubmit(): Promise<void> {
    setFormError("");
    if (bulkPreview.length === 0) {
      setFormError(t("form.errors.axisRequired"));
      return;
    }
    const baseAttrs = parseAttributes();
    if (baseAttrs === null) return;
    const base = buildPayload(state, baseAttrs);
    const stockNum = Number(state.initialStock);
    const stock = Number.isFinite(stockNum) && stockNum >= 0 ? stockNum : 0;

    const items: CreateSkuInput[] = bulkPreview.map((row) => ({
      ...base,
      code: row.code,
      stock,
      attributes: { ...baseAttrs, ...row.attrs },
    }));

    try {
      const res = await bulkCreateSkus({ items });
      appToaster.create({
        title: t("form.toasts.bulkCreateSuccess", { count: res.items.length }),
        type: "success",
      });
      router.push(ROUTES.skus);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("form.toasts.bulkCreateFailed");
      setFormError(message);
      appToaster.create({
        title: t("form.toasts.bulkCreateFailed"),
        description: message,
        type: "error",
      });
    }
  }

  async function handleAdjust(): Promise<void> {
    const delta = Number(adjustQty);
    if (!Number.isFinite(delta) || delta === 0) {
      appToaster.create({
        title: t("form.toasts.emptyAdjustQty"),
        type: "warning",
      });
      return;
    }
    try {
      await adjustStock({
        qtyDelta: delta,
        note: adjustNote.trim() || undefined,
      });
      setAdjustQty("");
      setAdjustNote("");
      appToaster.create({
        title: t("form.toasts.adjustSuccess"),
        type: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("form.toasts.adjustFailed");
      appToaster.create({
        title: t("form.toasts.adjustFailed"),
        description: message,
        type: "error",
      });
    }
  }

  async function handleDelete(): Promise<void> {
    if (!id) return;
    try {
      await deleteSku(id);
      appToaster.create({
        title: t("form.toasts.deleteSuccess"),
        type: "success",
      });
      router.push(ROUTES.skus);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("form.toasts.deleteFailed");
      appToaster.create({
        title: t("form.toasts.deleteFailed"),
        description: message,
        type: "error",
      });
    }
  }

  if (isEdit && isLoading) {
    return (
      <Box p={6}>
        <Skeleton h="40px" mb={4} />
        <Skeleton h="200px" />
      </Box>
    );
  }

  const canDelete =
    isEdit &&
    (detail?.masterVariants?.length ?? 0) === 0 &&
    (detail?.listedSkus?.length ?? 0) === 0;

  const isBusy = isCreating || isUpdating || isBulkCreating;

  return (
    <Box maxW="1100px" mx="auto" pb={10}>
      <Flex align="flex-start" justify="space-between" mb={4}>
        <PageHeader
          title={isEdit ? t("form.titleEdit") : t("form.titleNew")}
          description={t("form.description")}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(ROUTES.skus)}
        >
          {t("form.backToList")}
        </Button>
      </Flex>

      {!isEdit && (
        <Flex gap={2} mb={4} align="center">
          <Text fontSize="sm" color="gray.600" mr={2}>
            {t("form.modeLabel")}
          </Text>
          <Button
            size="sm"
            variant={mode === "single" ? "solid" : "outline"}
            bg={mode === "single" ? "gray.900" : undefined}
            color={mode === "single" ? "white" : undefined}
            _hover={mode === "single" ? { bg: "gray.800" } : undefined}
            onClick={() => setMode("single")}
          >
            {t("form.modeSingle")}
          </Button>
          <Button
            size="sm"
            variant={mode === "bulk" ? "solid" : "outline"}
            bg={mode === "bulk" ? "gray.900" : undefined}
            color={mode === "bulk" ? "white" : undefined}
            _hover={mode === "bulk" ? { bg: "gray.800" } : undefined}
            onClick={() => setMode("bulk")}
          >
            {t("form.modeBulk")}
          </Button>
          {mode === "bulk" && (
            <Badge colorPalette="blue" ml={2}>
              {t("form.bulkPreviewCount", { count: bulkPreview.length })}
            </Badge>
          )}
        </Flex>
      )}

      <Tabs.Root defaultValue="basic" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="basic">{t("form.tabs.basic")}</Tabs.Trigger>
          <Tabs.Trigger value="spec">{t("form.tabs.spec")}</Tabs.Trigger>
          <Tabs.Trigger value="extra">{t("form.tabs.extra")}</Tabs.Trigger>
          {!isEdit && mode === "bulk" && (
            <Tabs.Trigger value="bulk">{t("form.tabs.bulk")}</Tabs.Trigger>
          )}
          {isEdit && (
            <Tabs.Trigger value="mapping">
              {t("form.tabs.mapping")}
            </Tabs.Trigger>
          )}
        </Tabs.List>

        {/* ─── 기본정보 ─── */}
        <Tabs.Content value="basic">
          <BasicInfoSection
            state={state}
            update={update}
            mode={mode}
            isEdit={isEdit}
          />
        </Tabs.Content>

        {/* ─── 규격/가격 ─── */}
        <Tabs.Content value="spec">
          <SpecPriceSection state={state} update={update} />
        </Tabs.Content>

        {/* ─── 추가정보 ─── */}
        <Tabs.Content value="extra">
          <ExtraInfoSection state={state} update={update} />
        </Tabs.Content>

        {/* ─── 대량 옵션 ─── */}
        {!isEdit && mode === "bulk" && (
          <Tabs.Content value="bulk">
            <BulkOptionsSection
              bulkPrefix={bulkPrefix}
              setBulkPrefix={setBulkPrefix}
              axes={axes}
              setAxes={setAxes}
              bulkPreview={bulkPreview}
            />
          </Tabs.Content>
        )}

        {/* ─── 매핑 / 재고 (편집 전용) ─── */}
        {isEdit && detail && (
          <Tabs.Content value="mapping">
            <MappingStockSection
              detail={detail}
              adjustQty={adjustQty}
              setAdjustQty={setAdjustQty}
              adjustNote={adjustNote}
              setAdjustNote={setAdjustNote}
              handleAdjust={handleAdjust}
              isAdjusting={isAdjusting}
            />
          </Tabs.Content>
        )}
      </Tabs.Root>

      <ErrorMsg>{formError}</ErrorMsg>

      <Flex justify="space-between" align="center" mt={6}>
        <Box>
          {isEdit && (
            <Button
              size="sm"
              variant="outline"
              colorPalette="red"
              onClick={() => void handleDelete()}
              loading={isDeleting}
              disabled={!canDelete}
            >
              {t("form.actions.delete")}
            </Button>
          )}
          {isEdit && !canDelete && (
            <Text fontSize="xs" color="gray.500" mt={1}>
              {t("form.deleteBlocked")}
            </Text>
          )}
        </Box>
        <Flex gap={2}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(ROUTES.skus)}
          >
            {t("form.actions.cancel")}
          </Button>
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={() =>
              mode === "bulk" ? void handleBulkSubmit() : void handleSubmit()
            }
            loading={isBusy}
          >
            {isEdit
              ? t("form.actions.save")
              : mode === "bulk"
                ? t("form.actions.bulkCreate", { count: bulkPreview.length })
                : t("form.actions.create")}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
