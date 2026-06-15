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
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMasterProducts, useSyncProductInfoToChannel } from "@/entities/master-product";
import { useMasterProduct } from "@/entities/master-product";
import { useLinkChannelProduct, useChannelProduct } from "@/entities/channel";
import { useChannels } from "@/entities/channel";
import type { ChannelProductItem, ChannelProductVariant } from "@/entities/channel";
import { PLATFORM_DEFS, type PlatformDef } from "@/shared/config/platformFields";
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

const COMMON_LABEL_MAP: Record<string, string> = {
  title: "상품명",
  descriptionHtml: "상품 설명",
  images: "이미지",
  brand: "브랜드",
  hsCode: "HS 코드",
  countryOfOrigin: "원산지",
  weightG: "무게(g)",
  material: "소재",
};

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
  const nsValues = (master.attributes?.[def.channelId] as Record<string, unknown> | undefined) ?? {};
  const platformValues: Record<string, string> = {};
  for (const [k, v] of Object.entries(nsValues)) {
    platformValues[`${def.channelId}.${k}`] = v != null ? String(v) : "";
  }

  const platformDescriptionKey =
    def.key === "QOO10_JP" ? "qoo10.ItemDescription" :
    def.key === "SHOPIFY" ? "shopify.descriptionHtml" : null;
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
        label: COMMON_LABEL_MAP[commonKey] ?? commonKey,
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
  sellerCodeUpdates: Array<{ channelVariantId: string; status: string; error?: string }>;
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
  const { data: channelDetail, isLoading: channelDetailLoading, isError: channelDetailError } = useChannelProduct(channelId, channelProduct.channelItemId);
  const { mutateAsync: linkProduct, isPending: linking } = useLinkChannelProduct(
    channelId,
    channelProduct.channelItemId,
  );
  const { mutateAsync: syncInfo, isPending: syncing } = useSyncProductInfoToChannel();

  const channelVariants: ChannelProductVariant[] =
    channelDetail?.variants ?? channelProduct.variants ?? [];

  const missingFields = useMemo<MissingPlatformField[]>(
    () => (vendorDef && masterDetail ? computeMissingPlatformFields(vendorDef, masterDetail) : []),
    [vendorDef, masterDetail],
  );

  const proceedToVariantMapping = (): void => {
    if (!masterDetail) return;
    const masterVariants = masterDetail.variants ?? [];
    const effectiveChannelVariants =
      channelVariants.length > 0
        ? channelVariants
        : [{ channelVariantId: channelProduct.channelItemId, optionCode: undefined }];

    const mappings: VariantMapping[] = masterVariants.map((mv, i) => {
      const attachedCodes = (mv.attachedSkus ?? []).map((s) => s.code).filter(Boolean);
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

  const handleVariantSelect = (masterVariantId: string, channelVariantId: string): void => {
    const cv = channelVariants.find((v) => v.channelVariantId === channelVariantId);
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
      (m) => m.channelVariantId && m.channelCurrentSellerCode && m.channelCurrentSellerCode !== m.masterSku,
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
        syncInfoError = err instanceof Error ? err.message : "동기화 실패";
      }

      setResultData({ ...result, syncInfoStatus, syncInfoError });
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "연결에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  const handleRetrySync = async (): Promise<void> => {
    if (!resultData) return;
    try {
      await syncInfo(resultData.listedProductId);
      setResultData({ ...resultData, syncInfoStatus: "OK", syncInfoError: undefined });
      appToaster.create({ title: "상품 정보 동기화 성공", type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "동기화 실패";
      setResultData({ ...resultData, syncInfoStatus: "FAILED", syncInfoError: msg });
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
        <Flex align="center" justify="space-between" px={6} py={4} borderBottomWidth="1px" borderColor="gray.100">
          <Text fontWeight="semibold" fontSize="md">
            {step === "select-master" && "마스터 상품 연결"}
            {step === "check-platform-fields" && "마스터 필수 정보 부족"}
            {step === "map-variants" && "옵션 매핑"}
            {step === "confirm-seller-code" && "SellerCode 덮어쓰기 확인"}
            {step === "confirm-overwrite" && "마스터 정보 덮어쓰기 확인"}
            {step === "result" && (resultData ? "연결 완료" : "연결 실패")}
          </Text>
          <Button size="xs" variant="ghost" onClick={onClose}>✕</Button>
        </Flex>

        {/* Body */}
        <Box flex="1" overflowY="auto" px={6} py={4}>
          {step === "select-master" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                채널 상품: <b>{channelProduct.title}</b> ({channelProduct.channelItemId})
              </Text>
              {channelDetailError && (
                <Box px={3} py={2} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                  <Text fontSize="xs" color="red.600">
                    채널 상품 옵션을 불러올 수 없습니다. Qoo10 API에서 해당 상품을 찾지 못했습니다. (ItemCode: {channelProduct.channelItemId})
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
                    마스터 상품이 없나요?
                  </Text>
                  <Text fontSize="xs" color="blue.600">
                    이 판매상품 정보로 새 마스터 상품을 만들 수 있습니다.
                  </Text>
                </Stack>
                <Button
                  size="xs"
                  colorPalette="blue"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={12} /> 새 마스터 생성
                </Button>
              </Flex>
              <Input
                placeholder="마스터 상품 검색..."
                size="sm"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
              />
              {masterListLoading ? (
                <Flex justify="center" py={6}><Spinner /></Flex>
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
                      borderColor={selectedMasterId === mp.id ? "blue.300" : "gray.100"}
                      _hover={{ bg: "gray.50" }}
                      onClick={() => setSelectedMasterId(mp.id)}
                    >
                      <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        borderWidth="2px"
                        borderColor={selectedMasterId === mp.id ? "blue.500" : "gray.300"}
                        bg={selectedMasterId === mp.id ? "blue.500" : "transparent"}
                        flexShrink={0}
                      />
                      <Stack gap={0}>
                        <Text fontSize="sm" fontWeight="medium">{mp.title}</Text>
                        <Text fontSize="xs" color="gray.500">{mp.code} · 옵션 {mp.variantCount}개</Text>
                      </Stack>
                    </Flex>
                  ))}
                  {(masterList?.items ?? []).length === 0 && (
                    <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>
                      마스터 상품이 없습니다.
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
                  <AlertTriangle size={20} color="var(--chakra-colors-orange-500)" />
                </Box>
                <Stack gap={1} flex="1">
                  <Text fontSize="sm" fontWeight="semibold" color="orange.800">
                    {vendorDef?.label ?? "채널"} 필수 정보가 마스터 상품에 입력되어 있지 않습니다.
                  </Text>
                  <Text fontSize="xs" color="orange.700">
                    아래 항목을 마스터 상품에 입력한 뒤 다시 연결을 진행해주세요. 누락된 상태로 연결하면 채널 동기화 시 오류가 발생할 수 있습니다.
                  </Text>
                </Stack>
              </Flex>

              <Stack gap={1}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                  마스터 상품: <b>{masterDetail?.title}</b>
                </Text>
                <Box px={3} py={2} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
                  <Stack gap={1}>
                    {missingFields.map((f) => (
                      <Flex key={f.key} align="center" gap={2}>
                        <XCircle size={12} color="var(--chakra-colors-red-500)" />
                        <Text fontSize="xs" color="gray.700">
                          {f.label}{" "}
                          <Text as="span" fontSize="2xs" color="gray.400">
                            ({f.type === "common" ? "공통" : f.key})
                          </Text>
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          )}

          {step === "map-variants" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                마스터 옵션을 채널 옵션에 매칭하세요. SKU가 같으면 자동으로 매칭됩니다.
              </Text>
              <Stack gap={2}>
                {variantMappings.map((m) => {
                  const isAuto =
                    m.channelVariantId &&
                    channelVariants.find((cv) => cv.channelVariantId === m.channelVariantId)?.optionCode ===
                      m.masterSku;
                  return (
                    <Box key={m.masterVariantId} p={3} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                      <Flex align="center" gap={2} mb={2}>
                        <Text fontSize="xs" color="gray.500" w="10px">
                          {m.channelVariantId ? (isAuto ? "✓" : "✓") : "⚠"}
                        </Text>
                        <Stack gap={0} flex="1">
                          <Text fontSize="sm" fontWeight="medium">{m.masterSku}</Text>
                          <Text fontSize="xs" color="gray.500">{m.masterLabel}</Text>
                        </Stack>
                        <Text fontSize="xs" color="gray.400">→</Text>
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
                            onChange={(e) => handleVariantSelect(m.masterVariantId, e.target.value)}
                          >
                            <option value="">선택하세요...</option>
                            {channelVariants.map((cv) => (
                              <option key={cv.channelVariantId} value={cv.channelVariantId}>
                                {cv.optionCode ?? cv.channelVariantId}
                                {cv.optionValue ? ` (${cv.optionValue})` : ""}
                              </option>
                            ))}
                          </select>
                        </Box>
                        {isAuto && (
                          <Text fontSize="xs" color="green.600" flexShrink={0}>자동</Text>
                        )}
                      </Flex>
                    </Box>
                  );
                })}
              </Stack>
              <Text fontSize="xs" color="gray.500">{mappedCount}/{totalCount} 매핑됨</Text>
            </Stack>
          )}

          {step === "confirm-seller-code" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                다음 채널 옵션에 이미 SellerCode가 설정되어 있습니다. 마스터 SKU로 덮어쓸 항목을 선택하세요.
              </Text>
              <Text fontSize="xs" color="gray.400">
                ⓘ 비어있는 SellerCode는 자동으로 마스터 SKU로 채워집니다.
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader w="40px" />
                    <Table.ColumnHeader>마스터 SKU</Table.ColumnHeader>
                    <Table.ColumnHeader>채널 현재 SellerCode</Table.ColumnHeader>
                    <Table.ColumnHeader>덮어쓰기</Table.ColumnHeader>
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
                        <Table.Cell><Text fontSize="xs">{m.masterSku}</Text></Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" color="orange.600">{m.channelCurrentSellerCode}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" color={m.overrideSellerCode ? "green.600" : "gray.400"}>
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
                    setVariantMappings((prev) => prev.map((m) => ({ ...m, overrideSellerCode: true })))
                  }
                >
                  모두 선택
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setVariantMappings((prev) => prev.map((m) => ({ ...m, overrideSellerCode: false })))
                  }
                >
                  모두 해제
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
                  <AlertTriangle size={20} color="var(--chakra-colors-orange-500)" />
                </Box>
                <Stack gap={1} flex="1">
                  <Text fontSize="sm" fontWeight="semibold" color="orange.800">
                    채널 상품 정보가 마스터 상품 정보로 덮어쓰여집니다.
                  </Text>
                  <Text fontSize="xs" color="orange.700">
                    연결 완료 시 채널(Qoo10 등)에 등록된 다음 항목들이 마스터 상품 기준으로 자동 수정됩니다. 이 작업은 되돌릴 수 없습니다.
                  </Text>
                </Stack>
              </Flex>

              <Stack gap={1}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                  덮어쓰기 대상 항목
                </Text>
                <Box px={3} py={2} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
                  <Stack gap={1}>
                    <Text fontSize="xs" color="gray.700">• 상품명 / 부제목</Text>
                    <Text fontSize="xs" color="gray.700">• 대표 이미지 및 추가 이미지</Text>
                    <Text fontSize="xs" color="gray.700">• 상품 설명 (HTML)</Text>
                    <Text fontSize="xs" color="gray.700">• 판매가 / 정가</Text>
                    <Text fontSize="xs" color="gray.700">• 브랜드 / 제조사 / 원산지</Text>
                    <Text fontSize="xs" color="gray.700">• 카테고리 정보 (지원 시)</Text>
                  </Stack>
                </Box>
              </Stack>

              <Stack gap={1}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                  연결 정보
                </Text>
                <Box px={3} py={2} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                  <Stack gap={1}>
                    <Text fontSize="xs" color="blue.800">
                      채널 상품: <b>{channelProduct.title}</b>
                    </Text>
                    <Text fontSize="xs" color="blue.800">
                      마스터 상품: <b>{masterDetail?.title}</b>
                    </Text>
                    <Text fontSize="xs" color="blue.700">
                      매핑된 옵션: {mappedCount} / {totalCount}
                    </Text>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          )}

          {step === "result" && resultData && (
            <Stack gap={3} align="center" py={4}>
              <CheckCircle size={48} color="var(--chakra-colors-green-500)" />
              <Text fontWeight="semibold" fontSize="lg">연결 완료</Text>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                &ldquo;{channelProduct.title}&rdquo; ↔ &ldquo;{masterDetail?.title}&rdquo; 연결됨
              </Text>
              <Stack gap={1} w="100%">
                <Text fontSize="sm">• 옵션 {resultData.linkedVariantCount}개 매핑 완료</Text>
                {resultData.sellerCodeUpdates.length > 0 && (
                  <Text fontSize="sm">
                    • SellerCode 업데이트:{" "}
                    {resultData.sellerCodeUpdates.filter((u) => u.status === "OK").length}건 성공,{" "}
                    {resultData.sellerCodeUpdates.filter((u) => u.status !== "OK").length}건 실패
                  </Text>
                )}
                <Text fontSize="sm">• 재고 동기화: {resultData.stockPushStatus}</Text>
                <Text
                  fontSize="sm"
                  color={resultData.syncInfoStatus === "OK" ? "green.600" : "red.600"}
                >
                  • 상품 정보 동기화: {resultData.syncInfoStatus === "OK" ? "성공" : "실패"}
                  {resultData.syncInfoError ? ` (${resultData.syncInfoError})` : ""}
                </Text>
                {resultData.syncInfoStatus === "FAILED" && (
                  <Flex justify="center" pt={2}>
                    <Button size="xs" variant="outline" loading={syncing} onClick={() => void handleRetrySync()}>
                      다시 동기화
                    </Button>
                  </Flex>
                )}
              </Stack>
            </Stack>
          )}

          {step === "result" && !resultData && (
            <Stack gap={3} align="center" py={4}>
              <XCircle size={48} color="var(--chakra-colors-red-500)" />
              <Text fontWeight="semibold">연결 실패</Text>
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
              <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={!selectedMasterId || !masterDetail || channelDetailLoading}
                onClick={handleSelectMaster}
              >
                {channelDetailLoading ? "로딩 중..." : "다음 →"}
              </Button>
            </>
          )}
          {step === "check-platform-fields" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStep("select-master")}>← 이전</Button>
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
                마스터 편집하기 →
              </Button>
            </>
          )}
          {step === "map-variants" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStep("select-master")}>← 이전</Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={mappedCount === 0}
                onClick={handleNextFromVariants}
              >
                다음 →
              </Button>
            </>
          )}
          {step === "confirm-seller-code" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStep("map-variants")}>← 이전</Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                onClick={() => setStep("confirm-overwrite")}
              >
                다음 →
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
                  setStep(conflicted.length > 0 ? "confirm-seller-code" : "map-variants");
                }}
              >
                ← 이전
              </Button>
              <Button
                size="sm"
                bg="orange.600"
                color="white"
                _hover={{ bg: "orange.700" }}
                loading={linking || syncing}
                onClick={() => void handleSubmit(variantMappings)}
              >
                연결 + 덮어쓰기
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
      </Box>
    </>,
    document.body
  );
}
