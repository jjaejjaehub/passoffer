"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { AlertTriangle, CheckCircle, Plus, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  useMasterProducts,
  useSyncProductInfoToChannel,
} from "@/entities/master-product";
import { useMasterProduct } from "@/entities/master-product";
import { useLinkChannelProduct, useChannelProduct } from "@/entities/channel";
import { useChannels } from "@/entities/channel";
import type {
  ChannelProductItem,
  ChannelProductVariant,
} from "@/entities/channel";
import {
  PLATFORM_DEFS,
  type PlatformDef,
} from "@/shared/config/platformFields";
import { ROUTES } from "@/shared/config/routes";
import { appToaster } from "@/shared/ui/app-toaster";
import { CreateMasterFromChannelModal } from "./CreateMasterFromChannelModal";

type Step =
  | "select-master"
  | "check-platform-fields"
  | "map-variants"
  | "confirm-seller-code"
  | "confirm-overwrite"
  | "result";

interface MissingPlatformField {
  key: string;
  label: string;
  type: "common" | "platform";
}

function computeMissingPlatformFields(
  def: PlatformDef,
  master: {
    title?: string;
    descriptionHtml?: string;
    images?: Array<unknown>;
    brand?: string;
    hsCode?: string;
    countryOfOrigin?: string;
    material?: string;
    weightG?: number;
    attributes?: Record<string, unknown>;
  },
): MissingPlatformField[] {
  const missing: MissingPlatformField[] = [];

  const commonMap: Record<string, string> = {
    title: master.title ?? "",
    descriptionHtml: master.descriptionHtml ?? "",
    images: master.images && master.images.length > 0 ? "yes" : "",
    brand: master.brand ?? "",
    hsCode: master.hsCode ?? "",
    countryOfOrigin: master.countryOfOrigin ?? "",
    material: master.material ?? "",
    weightG: master.weightG != null ? String(master.weightG) : "",
  };
  const nsValues =
    (master.attributes?.[def.channelId] as
      | Record<string, unknown>
      | undefined) ?? {};
  const platformValues: Record<string, string> = {};
  for (const [k, v] of Object.entries(nsValues)) {
    platformValues[`${def.channelId}.${k}`] = v != null ? String(v) : "";
  }

  const platformDescriptionKey =
    def.key === "QOO10_JP"
      ? "qoo10.ItemDescription"
      : def.key === "SHOPIFY"
        ? "shopify.descriptionHtml"
        : null;
  for (const commonKey of def.requiredCommonFields) {
    const val = (commonMap[commonKey] ?? "").trim();
    if (!val) {
      if (
        commonKey === "descriptionHtml" &&
        platformDescriptionKey &&
        (platformValues[platformDescriptionKey] ?? "").trim()
      ) {
        continue;
      }
      missing.push({
        key: commonKey,
        label: commonKey,
        type: "common",
      });
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
    const val = (platformValues[field.key] ?? "").trim();
    if (!val) {
      missing.push({ key: field.key, label: field.label, type: "platform" });
    }
  }
  return missing;
}

interface VariantMapping {
  masterVariantId: string;
  masterSku: string;
  masterLabel: string;
  channelVariantId: string;
  overrideSellerCode: boolean;
  channelCurrentSellerCode?: string;
}

interface ResultData {
  listedProductId: string;
  linkedVariantCount: number;
  sellerCodeUpdates: Array<{
    channelVariantId: string;
    status: string;
    error?: string;
  }>;
  stockPushStatus: string;
  syncInfoStatus: "OK" | "FAILED";
  syncInfoError?: string;
}

interface Props {
  channelId: string;
  channelProduct: ChannelProductItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkMasterProductModal({
  channelId,
  channelProduct,
  onClose,
  onSuccess,
}: Props): React.JSX.Element {
  const t = useTranslations("pages.salesProducts.linkModal");
  const [step, setStep] = useState<Step>("select-master");
  const [masterSearch, setMasterSearch] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [variantMappings, setVariantMappings] = useState<VariantMapping[]>([]);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const router = useRouter();
  const { data: channelsList } = useChannels();
  const channelRecord = channelsList?.find((c) => c.id === channelId);
  const vendorDef = useMemo<PlatformDef | undefined>(
    () => PLATFORM_DEFS.find((d) => d.key === channelRecord?.channelType),
    [channelRecord?.channelType],
  );

  const { data: masterList, isLoading: masterListLoading } = useMasterProducts({
    search: masterSearch,
    pageSize: 30,
  });
  const { data: masterDetail } = useMasterProduct(selectedMasterId);
  const {
    data: channelDetail,
    isLoading: channelDetailLoading,
    isError: channelDetailError,
  } = useChannelProduct(channelId, channelProduct.channelItemId);
  const { mutateAsync: linkProduct, isPending: linking } =
    useLinkChannelProduct(channelId, channelProduct.channelItemId);
  const { mutateAsync: syncInfo, isPending: syncing } =
    useSyncProductInfoToChannel();

  const channelVariants: ChannelProductVariant[] =
    channelDetail?.variants ?? channelProduct.variants ?? [];

  const missingFields = useMemo<MissingPlatformField[]>(
    () =>
      vendorDef && masterDetail
        ? computeMissingPlatformFields(vendorDef, masterDetail)
        : [],
    [vendorDef, masterDetail],
  );

  const proceedToVariantMapping = (): void => {
    if (!masterDetail) return;
    const masterVariants = masterDetail.variants ?? [];
    const effectiveChannelVariants =
      channelVariants.length > 0
        ? channelVariants
        : [
            {
              channelVariantId: channelProduct.channelItemId,
              optionCode: undefined,
            },
          ];

    const mappings: VariantMapping[] = masterVariants.map((mv, i) => {
      const attachedCodes = (mv.attachedSkus ?? [])
        .map((s) => s.code)
        .filter(Boolean);
      const primarySku = attachedCodes[0] ?? "";
      const skuLabel = attachedCodes.join(", ");
      const autoMatch = effectiveChannelVariants.find(
        (cv) => cv.optionCode && attachedCodes.includes(cv.optionCode),
      );
      const fallback =
        masterVariants.length === 1
          ? effectiveChannelVariants[0]
          : effectiveChannelVariants[i];
      const matched = autoMatch ?? fallback;
      return {
        masterVariantId: mv.id,
        masterSku: primarySku,
        masterLabel: mv.optionLabel || skuLabel || primarySku,
        channelVariantId: matched?.channelVariantId ?? "",
        overrideSellerCode: false,
        channelCurrentSellerCode: matched?.optionCode,
      };
    });

    setVariantMappings(mappings);
    setStep("map-variants");
  };

  const handleSelectMaster = (): void => {
    if (!selectedMasterId || !masterDetail) return;

    if (missingFields.length > 0) {
      setStep("check-platform-fields");
      return;
    }

    proceedToVariantMapping();
  };

  const handleVariantSelect = (
    masterVariantId: string,
    channelVariantId: string,
  ): void => {
    const cv = channelVariants.find(
      (v) => v.channelVariantId === channelVariantId,
    );
    setVariantMappings((prev) =>
      prev.map((m) =>
        m.masterVariantId === masterVariantId
          ? { ...m, channelVariantId, channelCurrentSellerCode: cv?.optionCode }
          : m,
      ),
    );
  };

  const handleNextFromVariants = (): void => {
    const conflicted = variantMappings.filter(
      (m) =>
        m.channelVariantId &&
        m.channelCurrentSellerCode &&
        m.channelCurrentSellerCode !== m.masterSku,
    );
    if (conflicted.length > 0) {
      setStep("confirm-seller-code");
    } else {
      setStep("confirm-overwrite");
    }
  };

  const handleSubmit = async (mappings: VariantMapping[]): Promise<void> => {
    try {
      const result = await linkProduct({
        masterProductId: selectedMasterId!,
        variantMappings: mappings
          .filter((m) => m.channelVariantId)
          .map((m) => ({
            masterVariantId: m.masterVariantId,
            channelVariantId: m.channelVariantId,
            overrideSellerCode: m.overrideSellerCode,
          })),
      });

      let syncInfoStatus: "OK" | "FAILED" = "OK";
      let syncInfoError: string | undefined;
      try {
        await syncInfo(result.listedProductId);
      } catch (err) {
        syncInfoStatus = "FAILED";
        syncInfoError =
          err instanceof Error ? err.message : t("retryToast.failFallback");
      }

      setResultData({ ...result, syncInfoStatus, syncInfoError });
      setStep("result");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("retryToast.linkFailFallback");
      appToaster.create({ title: msg, type: "error" });
    }
  };

  const handleRetrySync = async (): Promise<void> => {
    if (!resultData) return;
    try {
      await syncInfo(resultData.listedProductId);
      setResultData({
        ...resultData,
        syncInfoStatus: "OK",
        syncInfoError: undefined,
      });
      appToaster.create({ title: t("retryToast.success"), type: "success" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("retryToast.failFallback");
      setResultData({
        ...resultData,
        syncInfoStatus: "FAILED",
        syncInfoError: msg,
      });
      appToaster.create({ title: msg, type: "error" });
    }
  };

  const mappedCount = variantMappings.filter((m) => m.channelVariantId).length;
  const totalCount = variantMappings.length;

  return createPortal(
    <>
      {showCreateModal && (
        <CreateMasterFromChannelModal
          channelId={channelId}
          channelProduct={channelProduct}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            onSuccess();
            onClose();
          }}
        />
      )}
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
          w="560px"
          maxW="95vw"
          maxH="90vh"
          display="flex"
          flexDirection="column"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Flex
            align="center"
            justify="space-between"
            px={6}
            py={4}
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <Text fontWeight="semibold" fontSize="md">
              {step === "select-master" && t("header.selectMaster")}
              {step === "check-platform-fields" &&
                t("header.checkPlatformFields")}
              {step === "map-variants" && t("header.mapVariants")}
              {step === "confirm-seller-code" && t("header.confirmSellerCode")}
              {step === "confirm-overwrite" && t("header.confirmOverwrite")}
              {step === "result" &&
                (resultData
                  ? t("header.resultSuccess")
                  : t("header.resultFail"))}
            </Text>
            <Button size="xs" variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </Flex>

          {/* Body */}
          <Box flex="1" overflowY="auto" px={6} py={4}>
            {step === "select-master" && (
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.600">
                  {t("selectMaster.channelProductLabel")}{" "}
                  <b>{channelProduct.title}</b> ({channelProduct.channelItemId})
                </Text>
                {channelDetailError && (
                  <Box
                    px={3}
                    py={2}
                    bg="red.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="red.200"
                  >
                    <Text fontSize="xs" color="red.600">
                      {t("selectMaster.channelDetailError", {
                        code: channelProduct.channelItemId,
                      })}
                    </Text>
                  </Box>
                )}
                <Flex
                  px={3}
                  py={3}
                  bg="blue.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="blue.200"
                  align="center"
                  justify="space-between"
                  gap={3}
                >
                  <Stack gap={0} flex="1">
                    <Text fontSize="sm" fontWeight="medium" color="blue.800">
                      {t("selectMaster.noMasterTitle")}
                    </Text>
                    <Text fontSize="xs" color="blue.600">
                      {t("selectMaster.noMasterDescription")}
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    colorPalette="blue"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus size={12} /> {t("selectMaster.createMaster")}
                  </Button>
                </Flex>
                <Input
                  placeholder={t("selectMaster.searchPlaceholder")}
                  size="sm"
                  value={masterSearch}
                  onChange={(e) => setMasterSearch(e.target.value)}
                />
                {masterListLoading ? (
                  <Flex justify="center" py={6}>
                    <Spinner />
                  </Flex>
                ) : (
                  <Stack gap={1} maxH="300px" overflowY="auto">
                    {(masterList?.items ?? []).map((mp) => (
                      <Flex
                        key={mp.id}
                        px={3}
                        py={2}
                        borderRadius="md"
                        cursor="pointer"
                        align="center"
                        gap={3}
                        bg={selectedMasterId === mp.id ? "blue.50" : undefined}
                        borderWidth="1px"
                        borderColor={
                          selectedMasterId === mp.id ? "blue.300" : "gray.100"
                        }
                        _hover={{ bg: "gray.50" }}
                        onClick={() => setSelectedMasterId(mp.id)}
                      >
                        <Box
                          w={3}
                          h={3}
                          borderRadius="full"
                          borderWidth="2px"
                          borderColor={
                            selectedMasterId === mp.id ? "blue.500" : "gray.300"
                          }
                          bg={
                            selectedMasterId === mp.id
                              ? "blue.500"
                              : "transparent"
                          }
                          flexShrink={0}
                        />
                        <Stack gap={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {mp.title}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {t("selectMaster.optionCount", {
                              code: mp.code,
                              count: mp.variantCount,
                            })}
                          </Text>
                        </Stack>
                      </Flex>
                    ))}
                    {(masterList?.items ?? []).length === 0 && (
                      <Text
                        fontSize="sm"
                        color="gray.400"
                        textAlign="center"
                        py={6}
                      >
                        {t("selectMaster.emptyMasterList")}
                      </Text>
                    )}
                  </Stack>
                )}
              </Stack>
            )}

            {step === "check-platform-fields" && (
              <Stack gap={3}>
                <Flex
                  px={3}
                  py={3}
                  bg="orange.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="orange.300"
                  gap={3}
                  align="flex-start"
                >
                  <Box flexShrink={0} pt="2px">
                    <AlertTriangle
                      size={20}
                      color="var(--chakra-colors-orange-500)"
                    />
                  </Box>
                  <Stack gap={1} flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color="orange.800"
                    >
                      {t("missingFields.title", {
                        channelLabel:
                          vendorDef?.label ??
                          t("missingFields.channelFallback"),
                      })}
                    </Text>
                    <Text fontSize="xs" color="orange.700">
                      {t("missingFields.description")}
                    </Text>
                  </Stack>
                </Flex>

                <Stack gap={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                    {t("missingFields.masterLabel")}{" "}
                    <b>{masterDetail?.title}</b>
                  </Text>
                  <Box
                    px={3}
                    py={2}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Stack gap={1}>
                      {missingFields.map((f) => {
                        const displayLabel =
                          f.type === "common"
                            ? t(`missingFields.commonLabels.${f.key}` as never)
                            : f.label;
                        return (
                          <Flex key={f.key} align="center" gap={2}>
                            <XCircle
                              size={12}
                              color="var(--chakra-colors-red-500)"
                            />
                            <Text fontSize="xs" color="gray.700">
                              {displayLabel}{" "}
                              <Text as="span" fontSize="2xs" color="gray.400">
                                (
                                {f.type === "common"
                                  ? t("missingFields.typeCommon")
                                  : f.key}
                                )
                              </Text>
                            </Text>
                          </Flex>
                        );
                      })}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>
            )}

            {step === "map-variants" && (
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.600">
                  {t("mapVariants.description")}
                </Text>
                <Stack gap={2}>
                  {variantMappings.map((m) => {
                    const isAuto =
                      m.channelVariantId &&
                      channelVariants.find(
                        (cv) => cv.channelVariantId === m.channelVariantId,
                      )?.optionCode === m.masterSku;
                    return (
                      <Box
                        key={m.masterVariantId}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor="gray.200"
                      >
                        <Flex align="center" gap={2} mb={2}>
                          <Text fontSize="xs" color="gray.500" w="10px">
                            {m.channelVariantId ? (isAuto ? "✓" : "✓") : "⚠"}
                          </Text>
                          <Stack gap={0} flex="1">
                            <Text fontSize="sm" fontWeight="medium">
                              {m.masterSku}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {m.masterLabel}
                            </Text>
                          </Stack>
                          <Text fontSize="xs" color="gray.400">
                            →
                          </Text>
                          <Box flex="1">
                            <select
                              style={{
                                fontSize: "12px",
                                padding: "4px 8px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                width: "100%",
                                background: "white",
                              }}
                              value={m.channelVariantId}
                              onChange={(e) =>
                                handleVariantSelect(
                                  m.masterVariantId,
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">
                                {t("mapVariants.selectPlaceholder")}
                              </option>
                              {channelVariants.map((cv) => (
                                <option
                                  key={cv.channelVariantId}
                                  value={cv.channelVariantId}
                                >
                                  {cv.optionCode ?? cv.channelVariantId}
                                  {cv.optionValue ? ` (${cv.optionValue})` : ""}
                                </option>
                              ))}
                            </select>
                          </Box>
                          {isAuto && (
                            <Text
                              fontSize="xs"
                              color="green.600"
                              flexShrink={0}
                            >
                              {t("mapVariants.autoBadge")}
                            </Text>
                          )}
                        </Flex>
                      </Box>
                    );
                  })}
                </Stack>
                <Text fontSize="xs" color="gray.500">
                  {t("mapVariants.mappedCount", {
                    mapped: mappedCount,
                    total: totalCount,
                  })}
                </Text>
              </Stack>
            )}

            {step === "confirm-seller-code" && (
              <Stack gap={3}>
                <Text fontSize="sm" color="gray.600">
                  {t("sellerCode.description")}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {t("sellerCode.info")}
                </Text>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader w="40px" />
                      <Table.ColumnHeader>
                        {t("sellerCode.masterSku")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {t("sellerCode.channelSellerCode")}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>
                        {t("sellerCode.override")}
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {variantMappings
                      .filter(
                        (m) =>
                          m.channelVariantId &&
                          m.channelCurrentSellerCode &&
                          m.channelCurrentSellerCode !== m.masterSku,
                      )
                      .map((m) => (
                        <Table.Row key={m.masterVariantId}>
                          <Table.Cell>
                            <Checkbox.Root
                              checked={m.overrideSellerCode}
                              onCheckedChange={(details) => {
                                const checked = details.checked === true;
                                setVariantMappings((prev) =>
                                  prev.map((x) =>
                                    x.masterVariantId === m.masterVariantId
                                      ? { ...x, overrideSellerCode: checked }
                                      : x,
                                  ),
                                );
                              }}
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control />
                            </Checkbox.Root>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs">{m.masterSku}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" color="orange.600">
                              {m.channelCurrentSellerCode}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text
                              fontSize="xs"
                              color={
                                m.overrideSellerCode ? "green.600" : "gray.400"
                              }
                            >
                              {m.overrideSellerCode ? "✓" : "—"}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table.Root>
                <Flex gap={2}>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setVariantMappings((prev) =>
                        prev.map((m) => ({ ...m, overrideSellerCode: true })),
                      )
                    }
                  >
                    {t("sellerCode.selectAll")}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setVariantMappings((prev) =>
                        prev.map((m) => ({ ...m, overrideSellerCode: false })),
                      )
                    }
                  >
                    {t("sellerCode.deselectAll")}
                  </Button>
                </Flex>
              </Stack>
            )}

            {step === "confirm-overwrite" && (
              <Stack gap={3}>
                <Flex
                  px={3}
                  py={3}
                  bg="orange.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="orange.300"
                  gap={3}
                  align="flex-start"
                >
                  <Box flexShrink={0} pt="2px">
                    <AlertTriangle
                      size={20}
                      color="var(--chakra-colors-orange-500)"
                    />
                  </Box>
                  <Stack gap={1} flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color="orange.800"
                    >
                      {t("overwrite.title")}
                    </Text>
                    <Text fontSize="xs" color="orange.700">
                      {t("overwrite.description")}
                    </Text>
                  </Stack>
                </Flex>

                <Stack gap={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                    {t("overwrite.targetsHeader")}
                  </Text>
                  <Box
                    px={3}
                    py={2}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Stack gap={1}>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.title")}
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.images")}
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.description")}
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.price")}
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.brand")}
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {t("overwrite.targets.category")}
                      </Text>
                    </Stack>
                  </Box>
                </Stack>

                <Stack gap={1}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                    {t("overwrite.linkInfoHeader")}
                  </Text>
                  <Box
                    px={3}
                    py={2}
                    bg="blue.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="blue.200"
                  >
                    <Stack gap={1}>
                      <Text fontSize="xs" color="blue.800">
                        {t("overwrite.channelProductLabel")}{" "}
                        <b>{channelProduct.title}</b>
                      </Text>
                      <Text fontSize="xs" color="blue.800">
                        {t("overwrite.masterProductLabel")}{" "}
                        <b>{masterDetail?.title}</b>
                      </Text>
                      <Text fontSize="xs" color="blue.700">
                        {t("overwrite.mappedOptions", {
                          mapped: mappedCount,
                          total: totalCount,
                        })}
                      </Text>
                    </Stack>
                  </Box>
                </Stack>
              </Stack>
            )}

            {step === "result" && resultData && (
              <Stack gap={3} align="center" py={4}>
                <CheckCircle size={48} color="var(--chakra-colors-green-500)" />
                <Text fontWeight="semibold" fontSize="lg">
                  {t("result.linkedTitle")}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {t("result.linkedDescription", {
                    channel: channelProduct.title,
                    master: masterDetail?.title ?? "",
                  })}
                </Text>
                <Stack gap={1} w="100%">
                  <Text fontSize="sm">
                    {t("result.linkedVariants", {
                      count: resultData.linkedVariantCount,
                    })}
                  </Text>
                  {resultData.sellerCodeUpdates.length > 0 && (
                    <Text fontSize="sm">
                      {t("result.sellerCodeUpdates", {
                        success: resultData.sellerCodeUpdates.filter(
                          (u) => u.status === "OK",
                        ).length,
                        fail: resultData.sellerCodeUpdates.filter(
                          (u) => u.status !== "OK",
                        ).length,
                      })}
                    </Text>
                  )}
                  <Text fontSize="sm">
                    {t("result.stockSync", {
                      status: resultData.stockPushStatus,
                    })}
                  </Text>
                  <Text
                    fontSize="sm"
                    color={
                      resultData.syncInfoStatus === "OK"
                        ? "green.600"
                        : "red.600"
                    }
                  >
                    {resultData.syncInfoStatus === "OK"
                      ? t("result.infoSyncSuccess")
                      : resultData.syncInfoError
                        ? t("result.infoSyncFailWithError", {
                            error: resultData.syncInfoError,
                          })
                        : t("result.infoSyncFail")}
                  </Text>
                  {resultData.syncInfoStatus === "FAILED" && (
                    <Flex justify="center" pt={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        loading={syncing}
                        onClick={() => void handleRetrySync()}
                      >
                        {t("result.retrySync")}
                      </Button>
                    </Flex>
                  )}
                </Stack>
              </Stack>
            )}

            {step === "result" && !resultData && (
              <Stack gap={3} align="center" py={4}>
                <XCircle size={48} color="var(--chakra-colors-red-500)" />
                <Text fontWeight="semibold">{t("result.linkFailed")}</Text>
              </Stack>
            )}
          </Box>

          {/* Footer */}
          <Flex
            px={6}
            py={4}
            borderTopWidth="1px"
            borderColor="gray.100"
            justify="flex-end"
            gap={2}
          >
            {step === "select-master" && (
              <>
                <Button size="sm" variant="outline" onClick={onClose}>
                  {t("footer.cancel")}
                </Button>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  disabled={
                    !selectedMasterId || !masterDetail || channelDetailLoading
                  }
                  onClick={handleSelectMaster}
                >
                  {channelDetailLoading
                    ? t("footer.loading")
                    : t("footer.next")}
                </Button>
              </>
            )}
            {step === "check-platform-fields" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep("select-master")}
                >
                  {t("footer.back")}
                </Button>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  onClick={() => {
                    if (!selectedMasterId) return;
                    router.push(ROUTES.masterProductEdit(selectedMasterId));
                  }}
                >
                  {t("footer.editMaster")}
                </Button>
              </>
            )}
            {step === "map-variants" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep("select-master")}
                >
                  {t("footer.back")}
                </Button>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  disabled={mappedCount === 0}
                  onClick={handleNextFromVariants}
                >
                  {t("footer.next")}
                </Button>
              </>
            )}
            {step === "confirm-seller-code" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep("map-variants")}
                >
                  {t("footer.back")}
                </Button>
                <Button
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: "gray.800" }}
                  onClick={() => setStep("confirm-overwrite")}
                >
                  {t("footer.next")}
                </Button>
              </>
            )}
            {step === "confirm-overwrite" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={linking || syncing}
                  onClick={() => {
                    const conflicted = variantMappings.filter(
                      (m) =>
                        m.channelVariantId &&
                        m.channelCurrentSellerCode &&
                        m.channelCurrentSellerCode !== m.masterSku,
                    );
                    setStep(
                      conflicted.length > 0
                        ? "confirm-seller-code"
                        : "map-variants",
                    );
                  }}
                >
                  {t("footer.back")}
                </Button>
                <Button
                  size="sm"
                  bg="orange.600"
                  color="white"
                  _hover={{ bg: "orange.700" }}
                  loading={linking || syncing}
                  onClick={() => void handleSubmit(variantMappings)}
                >
                  {t("footer.linkAndOverwrite")}
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
      </Box>
    </>,
    document.body,
  );
}
