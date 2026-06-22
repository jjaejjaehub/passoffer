"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  Controller,
  useFieldArray,
  type Resolver,
  type SubmitErrorHandler,
  useForm,
} from "react-hook-form";

import { useChannelApiKey } from "@/entities/channel";
import {
  useShopifyRegisterProductMutation,
  shopifyRegisterSchema,
} from "@/entities/product";
import type { ShopifyRegisterFormValues } from "@/entities/product";
import {
  EmptyState,
  PageHeader,
  RichHtmlEditor,
  ShopifyFormErrorMsg as ErrorMsg,
  ShopifyFormHelperText as HelperText,
  ShopifyFormLabel as Label,
  ShopifyFormSection as Section,
  ShopifyNativeSelect as Select,
} from "@/shared/ui";

// ─── 옵션 설정 섹션 ───────────────────────────────────────────

/** 옵션 배열에서 variant combination 목록 생성 */
function buildCombinations(
  options: Array<{ name: string; values: string }>,
): string[] {
  const parsed = options
    .map((o) =>
      o.values
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .filter((vals) => vals.length > 0);

  if (parsed.length === 0) return [];

  return parsed.reduce<string[]>((acc, vals) => {
    if (acc.length === 0) return vals;
    return acc.flatMap((a) => vals.map((v) => `${a} / ${v}`));
  }, []);
}

function OptionsSection({
  control,
  register,
  watch,
  errors,
  setValue,
}: {
  control: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["control"];
  register: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["register"];
  watch: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["watch"];
  errors: ReturnType<
    typeof useForm<ShopifyRegisterFormValues>
  >["formState"]["errors"];
  setValue: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["setValue"];
}): React.JSX.Element {
  const hasOptions = watch("hasOptions");
  const options = watch("options");
  const variantRows = watch("variantRows");
  const trackInventory = watch("trackInventory");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  // options가 바뀔 때마다 variantRows 자동 재생성
  const combinations = useMemo(() => buildCombinations(options), [options]);

  useEffect(() => {
    if (!hasOptions) return;
    const prev = variantRows ?? [];
    const next = combinations.map((combo) => {
      const existing = prev.find((r) => r.combination === combo);
      return (
        existing ?? {
          combination: combo,
          price: 0,
          compareAtPrice: undefined,
          sku: "",
          inventoryQuantity: 0,
        }
      );
    });
    setValue("variantRows", next, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinations.join("|"), hasOptions]);

  return (
    <Section title="옵션 설정">
      <Stack gap={4}>
        {/* 옵션 사용 여부 토글 */}
        <Flex align="center" gap={3}>
          <Controller
            name="hasOptions"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="hasOptions"
                checked={field.value}
                onChange={(e) => {
                  field.onChange(e.target.checked);
                  if (!e.target.checked) setValue("options", []);
                }}
              />
            )}
          />
          <label
            htmlFor="hasOptions"
            style={{ fontSize: "14px", color: "#4A5568", cursor: "pointer" }}
          >
            옵션 사용 (색상, 사이즈 등 여러 옵션이 있는 상품)
          </label>
        </Flex>

        {hasOptions && (
          <>
            {/* 옵션 목록 */}
            <Stack gap={3}>
              {fields.map((field, idx) => (
                <Box
                  key={field.id}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200"
                  bg="gray.50"
                >
                  <Flex gap={3} align="flex-start">
                    <Stack flex="1" gap={3}>
                      <Box>
                        <Label required>옵션명</Label>
                        <Input
                          size="sm"
                          placeholder="예: 색상, 사이즈, 소재"
                          {...register(`options.${idx}.name`)}
                        />
                        <ErrorMsg>
                          {errors.options?.[idx]?.name?.message}
                        </ErrorMsg>
                      </Box>
                      <Box>
                        <Label required>옵션 값 (콤마 구분)</Label>
                        <Input
                          size="sm"
                          placeholder="예: 빨강, 파랑, 흰색"
                          {...register(`options.${idx}.values`)}
                        />
                        <HelperText>
                          콤마(,)로 구분하여 입력하세요. 공백은 자동 제거됩니다.
                        </HelperText>
                        <ErrorMsg>
                          {errors.options?.[idx]?.values?.message}
                        </ErrorMsg>
                      </Box>
                    </Stack>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      color="red.400"
                      _hover={{ bg: "red.50" }}
                      mt={5}
                      onClick={() => remove(idx)}
                      aria-label="옵션 삭제"
                    >
                      <Trash2 size={16} />
                    </Button>
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
                >
                  <Plus size={14} />
                  옵션 추가 {fields.length > 0 ? `(${fields.length}/3)` : ""}
                </Button>
              )}
              {fields.length >= 3 && (
                <Text fontSize="xs" color="gray.400">
                  Shopify는 옵션을 최대 3개까지 지원합니다.
                </Text>
              )}
            </Stack>

            {/* Variant 매트릭스 */}
            {combinations.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                  옵션 조합별 가격 / 재고 ({combinations.length}개 variant)
                </Text>
                <Box
                  overflowX="auto"
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200"
                >
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row bg="gray.50">
                        <Table.ColumnHeader minW="160px">
                          옵션 조합
                        </Table.ColumnHeader>
                        <Table.ColumnHeader minW="120px">
                          판매가{" "}
                          <Text as="span" color="gray.400">
                            *
                          </Text>
                        </Table.ColumnHeader>
                        <Table.ColumnHeader minW="120px">
                          정가 (할인 전)
                        </Table.ColumnHeader>
                        <Table.ColumnHeader minW="140px">
                          SKU
                        </Table.ColumnHeader>
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
                            <ErrorMsg>
                              {errors.variantRows?.[idx]?.price?.message}
                            </ErrorMsg>
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              size="xs"
                              type="number"
                              step={0.01}
                              placeholder="0.00"
                              {...register(
                                `variantRows.${idx}.compareAtPrice`,
                                {
                                  setValueAs: (v) =>
                                    v === "" ? undefined : Number(v),
                                },
                              )}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <Input
                              size="xs"
                              placeholder="SKU-001"
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
                                {...register(
                                  `variantRows.${idx}.inventoryQuantity`,
                                  {
                                    setValueAs: (v) =>
                                      v === "" ? 0 : Number(v),
                                  },
                                )}
                              />
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
                <HelperText>
                  옵션 값을 수정하면 조합이 자동으로 갱신됩니다. 기존에 입력한
                  값은 유지됩니다.
                </HelperText>
              </Box>
            )}

            {/* 재고 추적 */}
            <Flex align="center" gap={2}>
              <input
                type="checkbox"
                id="trackInventory"
                {...register("trackInventory")}
              />
              <label
                htmlFor="trackInventory"
                style={{
                  fontSize: "14px",
                  color: "#4A5568",
                  cursor: "pointer",
                }}
              >
                재고 추적 사용
              </label>
            </Flex>
          </>
        )}
      </Stack>
    </Section>
  );
}

// ─── 단일 Variant (옵션 없음) ─────────────────────────────────

function SingleVariantSection({
  register,
  watch,
  setValue,
  errors,
}: {
  register: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["register"];
  watch: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<ShopifyRegisterFormValues>>["setValue"];
  errors: ReturnType<
    typeof useForm<ShopifyRegisterFormValues>
  >["formState"]["errors"];
}): React.JSX.Element {
  const trackInventory = watch("trackInventory");

  return (
    <Section title="가격 / 재고">
      <Stack gap={4}>
        <Stack direction={{ base: "column", md: "row" }} gap={4}>
          <Box flex="1">
            <Label required>판매가 (Price)</Label>
            <Input
              id="price"
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
              id="compareAtPrice"
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
            id="sku"
            size="sm"
            placeholder="재고 관리 코드 (선택)"
            {...register("sku")}
          />
          <ErrorMsg>{errors.sku?.message}</ErrorMsg>
        </Box>

        <Flex align="center" gap={2}>
          <input
            type="checkbox"
            id="trackInventory"
            checked={trackInventory}
            onChange={(e) => setValue("trackInventory", e.target.checked)}
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
              id="inventoryQuantity"
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

// ─── 메인 폼 ──────────────────────────────────────────────────

export function ShopifyProductNewForm(): React.JSX.Element {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopify");
  const { mutateAsync, isPending } = useShopifyRegisterProductMutation();

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShopifyRegisterFormValues>({
    resolver: zodResolver(
      shopifyRegisterSchema,
    ) as Resolver<ShopifyRegisterFormValues>,
    defaultValues: {
      title: "",
      descriptionHtml: "",
      vendor: "",
      productType: "",
      tags: "",
      status: "DRAFT",
      hasOptions: false,
      options: [],
      price: undefined,
      compareAtPrice: undefined,
      sku: "",
      inventoryQuantity: 0,
      trackInventory: true,
      variantRows: [],
      imageUrls: "",
    },
    mode: "onSubmit",
  });

  const isLoading = isSubmitting || isPending;
  const hasOptions = watch("hasOptions");
  const descriptionHtml = watch("descriptionHtml") ?? ""; // RichHtmlEditor 초기값용

  const onInvalid: SubmitErrorHandler<ShopifyRegisterFormValues> = (
    fieldErrors,
  ) => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;
    document
      .getElementById(firstKey)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onValid = async (values: ShopifyRegisterFormValues): Promise<void> => {
    try {
      await mutateAsync(values);
    } catch {
      // onError 처리
    }
  };

  if (!hasKey) {
    return (
      <EmptyState
        title="Shopify API 키가 없습니다"
        description="채널 설정에서 Shopify API 키를 등록하면 상품을 등록할 수 있습니다."
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
        title="상품 등록"
        description="Shopify 스토어에 새 상품을 등록합니다."
        mb={6}
      />

      <Box as="form" onSubmit={handleSubmit(onValid, onInvalid)}>
        <Stack gap={6}>
          {/* ─ 섹션 1: 기본정보 ─────────────────────────── */}
          <Section title="상품 기본정보">
            <Stack gap={4}>
              <Box>
                <Label required>상품명 (Title)</Label>
                <Input
                  id="title"
                  size="sm"
                  placeholder="상품명을 입력해 주세요"
                  {...register("title")}
                />
                <ErrorMsg>{errors.title?.message}</ErrorMsg>
              </Box>

              <Stack direction={{ base: "column", md: "row" }} gap={4}>
                <Box flex="1">
                  <Label>브랜드 (Vendor)</Label>
                  <Input
                    id="vendor"
                    size="sm"
                    placeholder="브랜드명 (선택)"
                    {...register("vendor")}
                  />
                  <ErrorMsg>{errors.vendor?.message}</ErrorMsg>
                </Box>
                <Box flex="1">
                  <Label>상품 유형 (Product Type)</Label>
                  <Input
                    id="productType"
                    size="sm"
                    placeholder="예: Apparel, Electronics (선택)"
                    {...register("productType")}
                  />
                  <ErrorMsg>{errors.productType?.message}</ErrorMsg>
                </Box>
              </Stack>

              <Box>
                <Label>태그 (Tags)</Label>
                <Input
                  id="tags"
                  size="sm"
                  placeholder="예: summer, sale, cotton (콤마로 구분)"
                  {...register("tags")}
                />
                <HelperText>
                  태그는 Shopify 검색 및 필터에서 활용됩니다.
                </HelperText>
                <ErrorMsg>{errors.tags?.message}</ErrorMsg>
              </Box>

              <Box>
                <Label required>판매 상태 (Status)</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="status"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value as "ACTIVE" | "DRAFT" | "ARCHIVED",
                        )
                      }
                    >
                      <option value="DRAFT">초안 (DRAFT) — 비공개</option>
                      <option value="ACTIVE">판매 중 (ACTIVE) — 공개</option>
                      <option value="ARCHIVED">
                        보관됨 (ARCHIVED) — 비공개
                      </option>
                    </Select>
                  )}
                />
                <HelperText>
                  DRAFT로 등록 후 검토 완료 시 ACTIVE로 변경하는 것을
                  권장합니다.
                </HelperText>
                <ErrorMsg>{errors.status?.message}</ErrorMsg>
              </Box>
            </Stack>
          </Section>

          {/* ─ 섹션 2: 상품 설명 ────────────────────────── */}
          <Section title="상품 설명">
            <RichHtmlEditor
              value={descriptionHtml}
              onChange={(v) =>
                setValue("descriptionHtml", v, { shouldValidate: true })
              }
              isDisabled={isLoading}
              minHeight="320px"
            />
            <ErrorMsg>{errors.descriptionHtml?.message}</ErrorMsg>
          </Section>

          {/* ─ 섹션 3: 옵션 설정 ────────────────────────── */}
          <OptionsSection
            control={control}
            register={register}
            watch={watch}
            errors={errors}
            setValue={setValue}
          />

          {/* ─ 섹션 4: 가격/재고 (옵션 없을 때만) ─────── */}
          {!hasOptions && (
            <SingleVariantSection
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />
          )}

          {/* ─ 섹션 5: 이미지 ───────────────────────────── */}
          <Section title="이미지">
            <Box>
              <Label>이미지 URL 목록</Label>
              <Textarea
                id="imageUrls"
                size="sm"
                rows={4}
                placeholder={
                  "https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
                }
                {...register("imageUrls")}
              />
              <HelperText>
                이미지 URL을 줄바꿈 또는 콤마(,)로 구분하여 입력해 주세요. 공개
                접근 가능한 URL이어야 합니다.
              </HelperText>
              <ErrorMsg>{errors.imageUrls?.message}</ErrorMsg>
            </Box>
          </Section>

          {/* ─ 하단 액션 ─────────────────────────────────── */}
          <Flex justify="flex-end" gap={3} pt={2}>
            <Button
              variant="ghost"
              onClick={() => router.back()}
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
              등록
            </Button>
          </Flex>
        </Stack>
      </Box>
    </Box>
  );
}
