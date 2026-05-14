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
import { CheckCircle, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  type ChannelProductItem,
  type ChannelProductVariant,
  useChannelProduct,
  useChannelProducts,
  useChannels,
  useLinkChannelProduct,
} from "@/entities/channel";
import { useMasterProduct } from "@/entities/master-product";
import { appToaster } from "@/shared/ui/app-toaster";

type Step =
  | "select-channel"
  | "select-channel-product"
  | "map-variants"
  | "confirm-seller-code"
  | "result";

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
}

interface Props {
  masterProductId: string;
  /** 이미 연결된 채널 ID 목록 (선택지에서 회색 처리) */
  linkedChannelIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkExistingChannelProductModal({
  masterProductId,
  linkedChannelIds,
  onClose,
  onSuccess,
}: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>("select-channel");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [productSearch, setProductSearch] = useState("");
  const [selectedChannelProduct, setSelectedChannelProduct] =
    useState<ChannelProductItem | null>(null);
  const [variantMappings, setVariantMappings] = useState<VariantMapping[]>([]);
  const [resultData, setResultData] = useState<ResultData | null>(null);

  const { data: channels, isLoading: channelsLoading } = useChannels();
  const { data: masterDetail } = useMasterProduct(masterProductId);

  const { data: channelProducts, isLoading: channelProductsLoading } =
    useChannelProducts(selectedChannelId ?? "", {
      linkStatus: "unlinked",
      search: productSearch,
      pageSize: 30,
      enabled: !!selectedChannelId && step === "select-channel-product",
    });

  const { data: channelProductDetail } = useChannelProduct(
    selectedChannelId ?? "",
    selectedChannelProduct?.channelItemId ?? "",
    !!selectedChannelId && !!selectedChannelProduct,
  );

  const { mutateAsync: linkProduct, isPending: linking } =
    useLinkChannelProduct(
      selectedChannelId ?? "",
      selectedChannelProduct?.channelItemId ?? "",
    );

  const channelVariants: ChannelProductVariant[] = useMemo(
    () =>
      channelProductDetail?.variants ?? selectedChannelProduct?.variants ?? [],
    [channelProductDetail, selectedChannelProduct],
  );

  const linkedSet = useMemo(
    () => new Set(linkedChannelIds),
    [linkedChannelIds],
  );

  const handleSelectChannel = (): void => {
    if (!selectedChannelId) return;
    setSelectedChannelProduct(null);
    setProductSearch("");
    setStep("select-channel-product");
  };

  const handleSelectChannelProduct = (): void => {
    if (!selectedChannelProduct || !masterDetail) return;

    const masterVariants = masterDetail.variants ?? [];
    const effectiveChannelVariants =
      channelVariants.length > 0
        ? channelVariants
        : [
            {
              channelVariantId: selectedChannelProduct.channelItemId,
              optionCode: undefined,
            } as ChannelProductVariant,
          ];

    const mappings: VariantMapping[] = masterVariants.map((mv, i) => {
      const autoMatch = effectiveChannelVariants.find(
        (cv) => cv.optionCode && cv.optionCode === mv.sku,
      );
      const fallback =
        masterVariants.length === 1
          ? effectiveChannelVariants[0]
          : effectiveChannelVariants[i];
      const matched = autoMatch ?? fallback;
      return {
        masterVariantId: mv.id,
        masterSku: mv.sku,
        masterLabel: mv.optionLabel || mv.sku,
        channelVariantId: matched?.channelVariantId ?? "",
        overrideSellerCode: false,
        channelCurrentSellerCode: matched?.optionCode,
      };
    });

    setVariantMappings(mappings);
    setStep("map-variants");
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
      void handleSubmit(variantMappings);
    }
  };

  const handleSubmit = async (mappings: VariantMapping[]): Promise<void> => {
    try {
      const result = await linkProduct({
        masterProductId,
        variantMappings: mappings
          .filter((m) => m.channelVariantId)
          .map((m) => ({
            masterVariantId: m.masterVariantId,
            channelVariantId: m.channelVariantId,
            overrideSellerCode: m.overrideSellerCode,
          })),
      });
      setResultData(result);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "연결에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  const mappedCount = variantMappings.filter((m) => m.channelVariantId).length;
  const totalCount = variantMappings.length;

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
        w="600px"
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
            {step === "select-channel" && "기존 채널 상품에 연결 — 채널 선택"}
            {step === "select-channel-product" && "채널 상품 선택"}
            {step === "map-variants" && "옵션 매핑"}
            {step === "confirm-seller-code" && "SellerCode 덮어쓰기 확인"}
            {step === "result" && (resultData ? "연결 완료" : "연결 실패")}
          </Text>
          <Button size="xs" variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </Flex>

        {/* Body */}
        <Box flex="1" overflowY="auto" px={6} py={4}>
          {step === "select-channel" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                마스터 상품: <b>{masterDetail?.title ?? "..."}</b>
              </Text>
              <Text fontSize="xs" color="gray.500">
                연결할 채널을 선택하세요. 이미 연결된 채널은 비활성화됩니다.
              </Text>
              {channelsLoading ? (
                <Flex justify="center" py={6}>
                  <Spinner />
                </Flex>
              ) : (
                <Stack gap={1}>
                  {(channels ?? []).map((ch) => {
                    const alreadyLinked = linkedSet.has(ch.id);
                    return (
                      <Flex
                        key={ch.id}
                        px={3}
                        py={2}
                        borderRadius="md"
                        cursor={alreadyLinked ? "not-allowed" : "pointer"}
                        opacity={alreadyLinked ? 0.5 : 1}
                        align="center"
                        gap={3}
                        bg={selectedChannelId === ch.id ? "blue.50" : undefined}
                        borderWidth="1px"
                        borderColor={
                          selectedChannelId === ch.id ? "blue.300" : "gray.100"
                        }
                        _hover={alreadyLinked ? undefined : { bg: "gray.50" }}
                        onClick={() => {
                          if (alreadyLinked) return;
                          setSelectedChannelId(ch.id);
                        }}
                      >
                        <Box
                          w={3}
                          h={3}
                          borderRadius="full"
                          borderWidth="2px"
                          borderColor={
                            selectedChannelId === ch.id
                              ? "blue.500"
                              : "gray.300"
                          }
                          bg={
                            selectedChannelId === ch.id
                              ? "blue.500"
                              : "transparent"
                          }
                          flexShrink={0}
                        />
                        <Stack gap={0} flex="1">
                          <Text fontSize="sm" fontWeight="medium">
                            {ch.name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {ch.channelType} · {ch.status}
                          </Text>
                        </Stack>
                        {alreadyLinked && (
                          <Text fontSize="xs" color="gray.400">
                            이미 연결됨
                          </Text>
                        )}
                      </Flex>
                    );
                  })}
                  {(channels ?? []).length === 0 && (
                    <Text
                      fontSize="sm"
                      color="gray.400"
                      textAlign="center"
                      py={6}
                    >
                      등록된 채널이 없습니다.
                    </Text>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {step === "select-channel-product" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                미연결 채널 상품 중에서 선택하세요.
              </Text>
              <Input
                placeholder="상품명 또는 SellerCode 검색..."
                size="sm"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {channelProductsLoading ? (
                <Flex justify="center" py={6}>
                  <Spinner />
                </Flex>
              ) : (
                <Stack gap={1} maxH="320px" overflowY="auto">
                  {(channelProducts?.items ?? []).map((cp) => (
                    <Flex
                      key={cp.channelItemId}
                      px={3}
                      py={2}
                      borderRadius="md"
                      cursor="pointer"
                      align="center"
                      gap={3}
                      bg={
                        selectedChannelProduct?.channelItemId ===
                        cp.channelItemId
                          ? "blue.50"
                          : undefined
                      }
                      borderWidth="1px"
                      borderColor={
                        selectedChannelProduct?.channelItemId ===
                        cp.channelItemId
                          ? "blue.300"
                          : "gray.100"
                      }
                      _hover={{ bg: "gray.50" }}
                      onClick={() => setSelectedChannelProduct(cp)}
                    >
                      <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        borderWidth="2px"
                        borderColor={
                          selectedChannelProduct?.channelItemId ===
                          cp.channelItemId
                            ? "blue.500"
                            : "gray.300"
                        }
                        bg={
                          selectedChannelProduct?.channelItemId ===
                          cp.channelItemId
                            ? "blue.500"
                            : "transparent"
                        }
                        flexShrink={0}
                      />
                      <Stack gap={0} flex="1" minW={0}>
                        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                          {cp.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {cp.channelItemId}
                          {cp.sellerCode && ` · ${cp.sellerCode}`}
                          {` · 옵션 ${cp.variants.length}개`}
                        </Text>
                      </Stack>
                    </Flex>
                  ))}
                  {(channelProducts?.items ?? []).length === 0 && (
                    <Text
                      fontSize="sm"
                      color="gray.400"
                      textAlign="center"
                      py={6}
                    >
                      미연결 채널 상품이 없습니다.
                    </Text>
                  )}
                </Stack>
              )}
            </Stack>
          )}

          {step === "map-variants" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                마스터 옵션을 채널 옵션에 매칭하세요. SKU가 같으면 자동으로
                매칭됩니다.
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
                            <option value="">선택하세요...</option>
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
                          <Text fontSize="xs" color="green.600" flexShrink={0}>
                            자동
                          </Text>
                        )}
                      </Flex>
                    </Box>
                  );
                })}
              </Stack>
              <Text fontSize="xs" color="gray.500">
                {mappedCount}/{totalCount} 매핑됨
              </Text>
            </Stack>
          )}

          {step === "confirm-seller-code" && (
            <Stack gap={3}>
              <Text fontSize="sm" color="gray.600">
                다음 채널 옵션에 이미 SellerCode가 설정되어 있습니다. 마스터
                SKU로 덮어쓸 항목을 선택하세요.
              </Text>
              <Text fontSize="xs" color="gray.400">
                ⓘ 비어있는 SellerCode는 자동으로 마스터 SKU로 채워집니다.
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader w="40px" />
                    <Table.ColumnHeader>마스터 SKU</Table.ColumnHeader>
                    <Table.ColumnHeader>
                      채널 현재 SellerCode
                    </Table.ColumnHeader>
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
                  모두 선택
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
                  모두 해제
                </Button>
              </Flex>
            </Stack>
          )}

          {step === "result" && resultData && (
            <Stack gap={3} align="center" py={4}>
              <CheckCircle size={48} color="var(--chakra-colors-green-500)" />
              <Text fontWeight="semibold" fontSize="lg">
                연결 완료
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                &ldquo;{masterDetail?.title}&rdquo; ↔ &ldquo;
                {selectedChannelProduct?.title}
                &rdquo; 연결됨
              </Text>
              <Stack gap={1} w="100%">
                <Text fontSize="sm">
                  • 옵션 {resultData.linkedVariantCount}개 매핑 완료
                </Text>
                {resultData.sellerCodeUpdates.length > 0 && (
                  <Text fontSize="sm">
                    • SellerCode 업데이트:{" "}
                    {
                      resultData.sellerCodeUpdates.filter(
                        (u) => u.status === "OK",
                      ).length
                    }
                    건 성공,{" "}
                    {
                      resultData.sellerCodeUpdates.filter(
                        (u) => u.status !== "OK",
                      ).length
                    }
                    건 실패
                  </Text>
                )}
                <Text fontSize="sm">
                  • 재고 동기화: {resultData.stockPushStatus}
                </Text>
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
          {step === "select-channel" && (
            <>
              <Button size="sm" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={!selectedChannelId}
                onClick={handleSelectChannel}
              >
                다음 →
              </Button>
            </>
          )}
          {step === "select-channel-product" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep("select-channel")}
              >
                ← 이전
              </Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={!selectedChannelProduct || !masterDetail}
                onClick={handleSelectChannelProduct}
              >
                다음 →
              </Button>
            </>
          )}
          {step === "map-variants" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep("select-channel-product")}
              >
                ← 이전
              </Button>
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep("map-variants")}
              >
                ← 이전
              </Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                loading={linking}
                onClick={() => void handleSubmit(variantMappings)}
              >
                연결 완료
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
