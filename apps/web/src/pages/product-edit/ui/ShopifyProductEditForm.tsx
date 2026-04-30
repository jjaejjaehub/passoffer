"use client";

import {
  Box,
  Button,
  Flex,
  Image,
  Input,
  Skeleton,
  SkeletonText,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, type Resolver, type SubmitErrorHandler, useForm } from "react-hook-form";

import { useChannelApiKey, useChannelProduct } from "@/entities/channel";
import {
  useShopifyProductDetail,
  useShopifyUpdateProduct,
  type ShopifyProductDetail,
  type ShopifyUpdateProductInput,
} from "@/entities/product";
import { shopifyRegisterSchema } from "@/entities/product";
import type { ShopifyRegisterFormValues } from "@/entities/product";
import {
  EmptyState,
  PageHeader,
  ShopifyFormErrorMsg as ErrorMsg,
  ShopifyFormHelperText as HelperText,
  ShopifyFormLabel as Label,
  ShopifyFormSection as Section,
  RichHtmlEditor,
  ShopifyNativeSelect as Select,
} from "@/shared/ui";

// ─── 헬퍼: Shopify 상품 데이터 → 폼 기본값 매핑 ──────────────

function isDefaultVariant(product: ShopifyProductDetail): boolean {
  if (product.variants.nodes.length !== 1) return false;
  const v = product.variants.nodes[0]!;
  return (
    v.selectedOptions.length === 1 &&
    v.selectedOptions[0]?.name === "Title" &&
    v.selectedOptions[0]?.value === "Default Title"
  );
}

function buildFormDefaults(product: ShopifyProductDetail): ShopifyRegisterFormValues {
  const singleVariant = isDefaultVariant(product);

  const imageUrls = product.media.nodes
    .map((m) => m.preview?.image?.url)
    .filter((url): url is string => !!url)
    .join("\n");

  if (singleVariant) {
    const v = product.variants.nodes[0]!;
    return {
      title: product.title,
      descriptionHtml: product.descriptionHtml,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags.join(", "),
      status: product.status as "ACTIVE" | "DRAFT" | "ARCHIVED",
      hasOptions: false,
      options: [],
      price: parseFloat(v.price),
      compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
      sku: v.sku ?? "",
      inventoryQuantity: v.inventoryQuantity,
      trackInventory: v.inventoryItem.tracked,
      variantRows: [],
      imageUrls,
    };
  }

  // 다중 variant
  const optionNames =
    product.variants.nodes[0]?.selectedOptions.map((o) => o.name) ?? [];
  const optionValuesMap: Record<string, Set<string>> = {};
  for (const v of product.variants.nodes) {
    for (const opt of v.selectedOptions) {
      if (!optionValuesMap[opt.name]) optionValuesMap[opt.name] = new Set();
      optionValuesMap[opt.name]!.add(opt.value);
    }
  }

  return {
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    vendor: product.vendor,
    productType: product.productType,
    tags: product.tags.join(", "),
    status: product.status as "ACTIVE" | "DRAFT" | "ARCHIVED",
    hasOptions: true,
    options: optionNames.map((name) => ({
      name,
      values: Array.from(optionValuesMap[name] ?? []).join(", "),
    })),
    price: undefined,
    compareAtPrice: undefined,
    sku: "",
    inventoryQuantity: 0,
    trackInventory: product.variants.nodes[0]?.inventoryItem.tracked ?? true,
    variantRows: product.variants.nodes.map((v) => ({
      combination: v.selectedOptions.map((o) => o.value).join(" / "),
      price: parseFloat(v.price),
      compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
      sku: v.sku ?? "",
      inventoryQuantity: v.inventoryQuantity,
    })),
    imageUrls,
  };
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────────

function EditFormSkeleton(): React.JSX.Element {
  return (
    <Stack gap={6}>
      {[160, 200, 280, 160].map((h, i) => (
        <Box
          key={i}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          bg="white"
          p={5}
        >
          <Skeleton height="24px" width="140px" mb={4} />
          <Stack gap={3}>
            <Skeleton height={`${h}px`} />
            <SkeletonText noOfLines={2} rootProps={{ gap: "2" }} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

// ─── variant combination 생성 헬퍼 ────────────────────────────

function buildCombinations(options: Array<{ name: string; values: string }>): string[] {
  const parsed = options
    .map((o) =>
      o.values
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .filter((vals) => vals.length > 0);

  if (parsed.length === 0) return [];

  return parsed.reduce<string[]>(
    (acc, vals) => {
      if (acc.length === 0) return vals;
      return acc.flatMap((a) => vals.map((v) => `${a} / ${v}`));
    },
    [],
  );
}

// ─── 옵션 섹션 (편집 가능) ────────────────────────────────────

function EditOptionsSection({
  control,
  register,
  watch,
  errors,
  setValue,
  isMasterLinked,
}: {
  control: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["control"];
  register: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["register"];
  watch: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["watch"];
  errors: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["formState"]["errors"];
  setValue: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["setValue"];
  isMasterLinked: boolean;
}): React.JSX.Element {
  const options = watch("options");
  const variantRows = watch("variantRows");
  const trackInventory = watch("trackInventory");

  const { fields, append, remove } = useFieldArray({ control, name: "options" });

  const combinations = useMemo(() => buildCombinations(options), [options]);

  // options 변경 시 variantRows 자동 재계산 (기존 값 보존)
  useEffect(() => {
    const prev = variantRows ?? [];
    const next = combinations.map((combo) => {
      const existing = prev.find((r) => r.combination === combo);
      return existing ?? { combination: combo, price: 0, compareAtPrice: undefined, sku: "", inventoryQuantity: 0 };
    });
    setValue("variantRows", next, { shouldValidate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinations.join("|")]);

  return (
    <Section title="옵션 설정">
      <Stack gap={4}>
        {/* 옵션 목록 */}
        <Stack gap={3}>
          {fields.map((field, idx) => (
            <Box key={field.id} p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200" bg="white">
              <Flex gap={3} align="flex-start">
                <Stack flex="1" gap={3}>
                  <Box>
                    <Label required>옵션명</Label>
                    <Input
                      size="sm"
                      placeholder="예: 색상, 사이즈, 소재"
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      {...register(`options.${idx}.name`)}
                    />
                    <ErrorMsg>{errors.options?.[idx]?.name?.message}</ErrorMsg>
                  </Box>
                  <Box>
                    <Label required>옵션 값 (콤마 구분)</Label>
                    <Input
                      size="sm"
                      placeholder="예: 빨강, 파랑, 흰색"
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      {...register(`options.${idx}.values`)}
                    />
                    <HelperText>콤마(,)로 구분. 값 추가/삭제 시 variant 조합이 자동 갱신됩니다.</HelperText>
                    <ErrorMsg>{errors.options?.[idx]?.values?.message}</ErrorMsg>
                  </Box>
                </Stack>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    color="red.400"
                    _hover={{ bg: "red.50" }}
                    mt={5}
                    onClick={() => remove(idx)}
                    aria-label="옵션 삭제"
                    disabled={isMasterLinked}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </Flex>
            </Box>
          ))}

          {fields.length < 3 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              borderColor="gray.300"
              color="gray.600"
              onClick={() => append({ name: "", values: "" })}
              alignSelf="flex-start"
              disabled={isMasterLinked}
            >
              <Plus size={14} />
              옵션 추가 {fields.length > 0 ? `(${fields.length}/3)` : ""}
            </Button>
          )}
          {fields.length >= 3 && (
            <Text fontSize="xs" color="gray.400">Shopify는 옵션을 최대 3개까지 지원합니다.</Text>
          )}
        </Stack>

        {/* Variant 매트릭스 */}
        {(variantRows ?? []).length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
              옵션 조합별 가격 / 재고 ({variantRows?.length ?? 0}개 variant)
            </Text>
            <Box overflowX="auto" borderWidth="1px" borderRadius="md" borderColor="gray.200">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="gray.50">
                    <Table.ColumnHeader minW="160px">옵션 조합</Table.ColumnHeader>
                    <Table.ColumnHeader minW="120px">
                      판매가 <Text as="span" color="gray.400">*</Text>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader minW="120px">정가 (할인 전)</Table.ColumnHeader>
                    <Table.ColumnHeader minW="140px">SKU</Table.ColumnHeader>
                    {trackInventory && (
                      <Table.ColumnHeader minW="80px" textAlign="right">
                        재고
                      </Table.ColumnHeader>
                    )}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(variantRows ?? []).map((row, idx) => (
                    <Table.Row key={row.combination}>
                      <Table.Cell>
                        <Flex gap={1} flexWrap="wrap">
                          {row.combination.split(" / ").map((v) => (
                            <Box
                              key={v}
                              px={2}
                              py={0.5}
                              bg="gray.100"
                              borderRadius="sm"
                              fontSize="xs"
                              color="gray.700"
                              fontWeight="medium"
                            >
                              {v}
                            </Box>
                          ))}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="xs"
                          type="number"
                          step={0.01}
                          placeholder="0.00"
                          {...register(`variantRows.${idx}.price`, {
                            setValueAs: (v) => (v === "" ? 0 : Number(v)),
                          })}
                        />
                        <ErrorMsg>{errors.variantRows?.[idx]?.price?.message}</ErrorMsg>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="xs"
                          type="number"
                          step={0.01}
                          placeholder="0.00"
                          {...register(`variantRows.${idx}.compareAtPrice`, {
                            setValueAs: (v) => (v === "" ? undefined : Number(v)),
                          })}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="xs"
                          placeholder="SKU-001"
                          readOnly={isMasterLinked}
                          bg={isMasterLinked ? "gray.50" : undefined}
                          {...register(`variantRows.${idx}.sku`)}
                        />
                      </Table.Cell>
                      {trackInventory && (
                        <Table.Cell>
                          <Input
                            size="xs"
                            type="number"
                            step={1}
                            textAlign="right"
                            placeholder="0"
                            {...register(`variantRows.${idx}.inventoryQuantity`, {
                              setValueAs: (v) => (v === "" ? 0 : Number(v)),
                            })}
                          />
                        </Table.Cell>
                      )}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
            <HelperText>옵션 값을 수정하면 조합이 자동 갱신됩니다. 기존에 입력한 값은 유지됩니다.</HelperText>
          </Box>
        )}
      </Stack>
    </Section>
  );
}

// ─── 단일 Variant 섹션 ────────────────────────────────────────

function SingleVariantSection({
  register,
  errors,
  trackInventory,
  onTrackInventoryChange,
  isMasterLinked,
}: {
  register: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["register"];
  errors: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["formState"]["errors"];
  trackInventory: boolean;
  onTrackInventoryChange: (v: boolean) => void;
  isMasterLinked: boolean;
}): React.JSX.Element {
  return (
    <Section title="가격 / 재고">
      <Stack gap={4}>
        <Stack direction={{ base: "column", md: "row" }} gap={4}>
          <Box flex="1">
            <Label required>판매가 (Price)</Label>
            <Input
              size="sm"
              type="number"
              step={0.01}
              placeholder="예: 29.99"
              {...register("price", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
            <ErrorMsg>{errors.price?.message}</ErrorMsg>
          </Box>
          <Box flex="1">
            <Label>정가 (Compare At Price)</Label>
            <Input
              size="sm"
              type="number"
              step={0.01}
              placeholder="예: 39.99 (할인 전 가격)"
              {...register("compareAtPrice", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
            <ErrorMsg>{errors.compareAtPrice?.message}</ErrorMsg>
          </Box>
        </Stack>

        <Box>
          <Label>SKU</Label>
          <Input
            size="sm"
            placeholder="재고 관리 코드 (선택)"
            readOnly={isMasterLinked}
            bg={isMasterLinked ? "gray.50" : undefined}
            {...register("sku")}
          />
          <ErrorMsg>{errors.sku?.message}</ErrorMsg>
        </Box>

        <Flex align="center" gap={2}>
          <input
            type="checkbox"
            id="trackInventory"
            checked={trackInventory}
            onChange={(e) => onTrackInventoryChange(e.target.checked)}
          />
          <label
            htmlFor="trackInventory"
            style={{ fontSize: "14px", color: "#4A5568", cursor: "pointer" }}
          >
            재고 추적 사용
          </label>
        </Flex>

        {trackInventory && (
          <Box>
            <Label>재고 수량</Label>
            <Input
              size="sm"
              type="number"
              step={1}
              {...register("inventoryQuantity", {
                setValueAs: (v) => (v === "" ? 0 : Number(v)),
              })}
            />
            <HelperText>기본 위치(Location)의 재고로 설정됩니다.</HelperText>
            <ErrorMsg>{errors.inventoryQuantity?.message}</ErrorMsg>
          </Box>
        )}
      </Stack>
    </Section>
  );
}

// ─── 폼 본체 ──────────────────────────────────────────────────

function EditFormBody({
  product,
  variantIdMap,
  isMasterLinked,
}: {
  product: ShopifyProductDetail;
  variantIdMap: Record<string, string>;
  isMasterLinked: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const { mutateAsync, isPending } = useShopifyUpdateProduct();

  // 원본 option ID / optionValue ID 보관 (option 수정 시 Shopify API에 전달)
  const originalOptionsRef = useRef<Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
  }>>(
    (product.options ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      values: o.optionValues,
    })),
  );

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopifyRegisterFormValues>({
    resolver: zodResolver(shopifyRegisterSchema) as Resolver<ShopifyRegisterFormValues>,
    defaultValues: buildFormDefaults(product),
    mode: "onSubmit",
  });

  // 상품 데이터가 바뀌면 폼 리셋 + ref 동기화
  useEffect(() => {
    reset(buildFormDefaults(product));
    originalOptionsRef.current = (product.options ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      values: o.optionValues,
    }));
  }, [product.id, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = isSubmitting || isPending;
  const hasOptions = watch("hasOptions");
  const descriptionHtml = watch("descriptionHtml") ?? "";
  const trackInventory = watch("trackInventory");

  const onInvalid: SubmitErrorHandler<ShopifyRegisterFormValues> = (fieldErrors) => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;
    document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onValid = async (values: ShopifyRegisterFormValues): Promise<void> => {
    const input: ShopifyUpdateProductInput = {
      productId: product.id,
      title: values.title,
      descriptionHtml: values.descriptionHtml,
      vendor: values.vendor,
      productType: values.productType,
      tags: values.tags,
      status: values.status,
    };

    if (!values.hasOptions) {
      // 단일 variant
      const variantId = Object.values(variantIdMap)[0];
      if (variantId) {
        input.variants = [
          {
            id: variantId,
            price: String(values.price ?? 0),
            compareAtPrice:
              values.compareAtPrice !== undefined ? String(values.compareAtPrice) : null,
            sku: values.sku,
          },
        ];
      }
    } else {
      // 다중 variant — options 구조 업데이트 + 가격/SKU
      const originalOpts = originalOptionsRef.current;

      input.options = values.options
        .map((opt, idx) => {
          const original = originalOpts[idx];
          if (!original) return null;
          const newValues = opt.values
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          return {
            id: original.id,
            name: opt.name,
            values: newValues.map((v) => {
              const existing = original.values.find((ov) => ov.name === v);
              return existing ? { id: existing.id, name: v } : { name: v };
            }),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      input.variantPriceUpdates = (values.variantRows ?? []).map((row) => ({
        combination: row.combination,
        price: String(row.price),
        compareAtPrice:
          row.compareAtPrice !== undefined ? String(row.compareAtPrice) : null,
        sku: row.sku ?? "",
      }));
    }

    await mutateAsync(input);
    router.push("/sales-products");
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onValid, onInvalid)}>
      <Stack gap={6}>
        {isMasterLinked && (
          <Box
            p={3}
            borderWidth="1px"
            borderColor="blue.200"
            bg="blue.50"
            borderRadius="md"
          >
            <Text fontSize="sm" color="blue.800" fontWeight="medium">
              마스터 상품과 연결된 상품입니다
            </Text>
            <Text fontSize="xs" color="blue.700" mt={1}>
              마스터 상품에서 가져오는 항목은 수정할 수 없습니다. 가격/재고 등 채널 전용 항목만 수정할 수 있습니다.
            </Text>
          </Box>
        )}

        {/* ─ 섹션 1: 기본정보 ─────────────────────────────── */}
        <Section title="상품 기본정보">
          <Stack gap={4}>
            <Box>
              <Label required>상품명 (Title)</Label>
              <Input
                id="title"
                size="sm"
                placeholder="상품명을 입력해 주세요"
                readOnly={isMasterLinked}
                bg={isMasterLinked ? "gray.50" : undefined}
                {...register("title")}
              />
              <ErrorMsg>{errors.title?.message}</ErrorMsg>
            </Box>

            <Stack direction={{ base: "column", md: "row" }} gap={4}>
              <Box flex="1">
                <Label>브랜드 (Vendor)</Label>
                <Input
                  size="sm"
                  placeholder="브랜드명 (선택)"
                  readOnly={isMasterLinked}
                  bg={isMasterLinked ? "gray.50" : undefined}
                  {...register("vendor")}
                />
              </Box>
              <Box flex="1">
                <Label>상품 유형 (Product Type)</Label>
                <Input
                  size="sm"
                  placeholder="예: Apparel, Electronics (선택)"
                  readOnly={isMasterLinked}
                  bg={isMasterLinked ? "gray.50" : undefined}
                  {...register("productType")}
                />
              </Box>
            </Stack>

            <Box>
              <Label>태그 (Tags)</Label>
              <Input
                size="sm"
                placeholder="예: summer, sale, cotton (콤마로 구분)"
                readOnly={isMasterLinked}
                bg={isMasterLinked ? "gray.50" : undefined}
                {...register("tags")}
              />
              <HelperText>태그는 Shopify 검색 및 필터에서 활용됩니다.</HelperText>
            </Box>

            <Box>
              <Label required>판매 상태 (Status)</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value as "ACTIVE" | "DRAFT" | "ARCHIVED")
                    }
                  >
                    <option value="DRAFT">초안 (DRAFT) — 비공개</option>
                    <option value="ACTIVE">판매 중 (ACTIVE) — 공개</option>
                    <option value="ARCHIVED">보관됨 (ARCHIVED) — 비공개</option>
                  </Select>
                )}
              />
              <HelperText>
                DRAFT로 저장 후 검토 완료 시 ACTIVE로 변경하는 것을 권장합니다.
              </HelperText>
              <ErrorMsg>{errors.status?.message}</ErrorMsg>
            </Box>
          </Stack>
        </Section>

        {/* ─ 섹션 2: 상품 설명 ─────────────────────────────── */}
        <Section title="상품 설명">
          <RichHtmlEditor
            value={descriptionHtml}
            onChange={(v) => setValue("descriptionHtml", v, { shouldValidate: true })}
            isDisabled={isLoading || isMasterLinked}
            minHeight="320px"
          />
          <ErrorMsg>{errors.descriptionHtml?.message}</ErrorMsg>
        </Section>

        {/* ─ 섹션 3: 옵션 설정 ─────────────────────────────── */}
        {hasOptions ? (
          <EditOptionsSection
            control={control}
            register={register}
            watch={watch}
            errors={errors}
            setValue={setValue}
            isMasterLinked={isMasterLinked}
          />
        ) : (
          <SingleVariantSection
            register={register}
            errors={errors}
            trackInventory={trackInventory}
            onTrackInventoryChange={(v) => setValue("trackInventory", v)}
            isMasterLinked={isMasterLinked}
          />
        )}

        {/* ─ 섹션 4: 이미지 ────────────────────────────────── */}
        <Section title="이미지">
          {/* 현재 이미지 미리보기 */}
          {product.media.nodes.length > 0 && (
            <Box mb={4}>
              <Label>현재 이미지</Label>
              <Flex gap={2} flexWrap="wrap" mt={1}>
                {product.media.nodes
                  .map((m) => m.preview?.image?.url)
                  .filter((url): url is string => !!url)
                  .map((url, i) => (
                    <Box
                      key={url}
                      w="64px"
                      h="64px"
                      borderRadius="md"
                      overflow="hidden"
                      bg="gray.100"
                      borderWidth={i === 0 ? "2px" : "1px"}
                      borderColor={i === 0 ? "gray.700" : "gray.200"}
                      flexShrink={0}
                    >
                      <Image src={url} alt="" w="100%" h="100%" objectFit="cover" />
                    </Box>
                  ))}
              </Flex>
              <HelperText>이미지 수정 및 삭제는 Shopify 관리자 페이지에서 진행해 주세요.</HelperText>
            </Box>
          )}

          {/* 새 이미지 URL 추가 */}
          <Box>
            <Label>새 이미지 URL 추가</Label>
            <Textarea
              size="sm"
              rows={3}
              placeholder={"https://example.com/image.jpg\nhttps://example.com/image2.jpg"}
              readOnly={isMasterLinked}
              bg={isMasterLinked ? "gray.50" : undefined}
              {...register("imageUrls")}
            />
            <HelperText>
              줄바꿈 또는 콤마(,)로 구분. 공개 접근 가능한 URL이어야 합니다.
            </HelperText>
            <ErrorMsg>{errors.imageUrls?.message}</ErrorMsg>
          </Box>
        </Section>

        {/* ─ 하단 액션 ────────────────────────────────────── */}
        <Flex justify="flex-end" gap={3} pt={2}>
          <Button
            variant="ghost"
            onClick={() => router.push("/sales-products")}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="submit"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            disabled={isLoading}
            loading={isLoading}
          >
            저장
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────

export interface ShopifyProductEditFormProps {
  /** Shopify 상품 GID (gid://shopify/Product/12345) */
  productId: string;
}

export function ShopifyProductEditForm({
  productId,
}: ShopifyProductEditFormProps): React.JSX.Element {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopify");
  const { data: product, isLoading, error } = useShopifyProductDetail(productId);

  const numericProductId = productId.replace(/^gid:\/\/shopify\/Product\//, "");
  const { data: channelItem } = useChannelProduct("shopify", numericProductId, !!numericProductId);
  const isMasterLinked = channelItem?.linkStatus === "linked";

  // variant GID → combination string 맵 (편집 시 variant ID 참조용)
  const variantIdMapRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!product) return;
    const map: Record<string, string> = {};
    for (const v of product.variants.nodes) {
      const combo = v.selectedOptions.map((o) => o.value).join(" / ");
      map[combo] = v.id;
    }
    variantIdMapRef.current = map;
  }, [product]);

  if (!hasKey) {
    return (
      <EmptyState
        title="Shopify API 키가 없습니다"
        description="채널 설정에서 Shopify API 키를 등록해 주세요."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push("/settings/channels"),
        }}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title="상품 수정"
        description="Shopify 스토어의 상품 정보를 수정합니다."
        mb={6}
      />

      {isLoading && <EditFormSkeleton />}

      {!isLoading && error && (
        <EmptyState
          title={
            error.type === "AUTH_ERROR"
              ? "API 인증에 실패했습니다"
              : "상품을 불러올 수 없습니다"
          }
          description={
            error.type === "AUTH_ERROR"
              ? "Shopify API 키 또는 액세스 토큰이 유효하지 않습니다. 채널 설정에서 자격증명을 확인해 주세요."
              : error.message
          }
          action={
            error.type === "AUTH_ERROR"
              ? { label: "채널 설정으로 이동", onClick: () => router.push("/settings/channels") }
              : { label: "목록으로 돌아가기", onClick: () => router.push("/sales-products") }
          }
        />
      )}

      {!isLoading && !error && product && (
        <EditFormBody
          product={product}
          variantIdMap={variantIdMapRef.current}
          isMasterLinked={isMasterLinked}
        />
      )}
    </Box>
  );
}
