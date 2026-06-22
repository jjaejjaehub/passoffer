"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { Controller, type SubmitErrorHandler, useForm } from "react-hook-form";

import { useChannelApiKey } from "@/entities/channel";
import {
  useShopeeRegisterProductMutation,
  shopeeRegisterSchema,
} from "@/entities/product";
import type { ShopeeRegisterFormValues } from "@/entities/product";
import { EmptyState, PageHeader } from "@/shared/ui";

// ── 로컬 Select 컴포넌트 ──────────────────────────────────────────────

type LocalSelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "size"
> & {
  placeholder?: string;
  size?: "sm" | "md";
  isDisabled?: boolean;
};

function Select({
  placeholder,
  size = "sm",
  isDisabled,
  style,
  children,
  ...rest
}: LocalSelectProps): React.JSX.Element {
  const mergedStyle: CSSProperties = {
    width: "100%",
    border: "1px solid",
    borderColor: "#E2E8F0",
    borderRadius: "6px",
    padding: size === "sm" ? "6px 10px" : "8px 12px",
    backgroundColor: "white",
    color: "#1A202C",
    fontSize: size === "sm" ? "14px" : "15px",
    outline: "none",
    ...style,
  };
  return (
    <select {...rest} disabled={isDisabled} style={mergedStyle}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  );
}

// ── FormControl / FormErrorMessage ───────────────────────────────────

function FormControl({
  children,
}: {
  isInvalid?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return <Box>{children}</Box>;
}

function FormErrorMessage({
  children,
}: {
  children?: React.ReactNode;
}): React.JSX.Element | null {
  if (!children) return null;
  return (
    <Text fontSize="xs" color="red.500" mt={1}>
      {children}
    </Text>
  );
}

// ── 섹션 래퍼 ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="white"
      p={5}
    >
      <Heading as="h2" size="md" mb={4}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

// ── 폼 레이블 ────────────────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}): React.JSX.Element {
  return (
    <Text fontSize="sm" fontWeight="medium" mb={1}>
      {children}{" "}
      {required && (
        <Text as="span" color="gray.400">
          *
        </Text>
      )}
    </Text>
  );
}

// ── ShopeeProductNewForm ──────────────────────────────────────────────

export function ShopeeProductNewForm(): React.JSX.Element {
  const router = useRouter();
  const { hasKey } = useChannelApiKey("shopee");
  const { mutateAsync, isPending } = useShopeeRegisterProductMutation();

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShopeeRegisterFormValues>({
    resolver: zodResolver(shopeeRegisterSchema),
    defaultValues: {
      item_name: "",
      description: "",
      item_sku: "",
      condition: "NEW",
      item_status: "UNLIST",
      category_id: undefined,
      original_price: undefined,
      stock: 0,
      image_id_list: "",
      weight: undefined,
      package_height: undefined,
      package_length: undefined,
      package_width: undefined,
      logistic_id: undefined,
      logistic_is_free: true,
      logistic_shipping_fee: undefined,
      no_brand: true,
      brand_name: "",
      is_pre_order: false,
      days_to_ship: undefined,
    },
    mode: "onSubmit",
  });

  const isLoading = isSubmitting || isPending;
  const noBrand = watch("no_brand");
  const isPreOrder = watch("is_pre_order");
  const logisticIsFree = watch("logistic_is_free");
  const itemName = watch("item_name");
  const titleRemaining = 120 - itemName.length;

  const onInvalid: SubmitErrorHandler<ShopeeRegisterFormValues> = (
    fieldErrors,
  ) => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;
    document
      .getElementById(firstKey)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onValid = async (values: ShopeeRegisterFormValues): Promise<void> => {
    try {
      await mutateAsync(values);
    } catch {
      // onError에서 처리
    }
  };

  if (!hasKey) {
    return (
      <EmptyState
        title="Shopee API 키가 없습니다"
        description="채널 설정에서 Shopee API 키를 등록하면 상품을 등록할 수 있습니다."
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
        description="Shopee 상품 등록을 위한 기본 정보를 입력합니다."
        mb={6}
      />

      <Box as="form" onSubmit={handleSubmit(onValid, onInvalid)}>
        <Stack gap={6}>
          {/* ── 섹션 1: 상품 기본정보 ─────────────────────── */}
          <Section title="상품 기본정보">
            <Stack gap={4}>
              <FormControl isInvalid={Boolean(errors.item_name)}>
                <Label required>상품명</Label>
                <Input
                  id="item_name"
                  size="sm"
                  maxLength={120}
                  placeholder="상품명을 입력해 주세요"
                  value={itemName}
                  onChange={(e) =>
                    setValue("item_name", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                />
                <Flex justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.400">
                    최대 120자
                  </Text>
                  <Text
                    fontSize="xs"
                    color={titleRemaining < 10 ? "red.500" : "gray.400"}
                  >
                    잔여 {Math.max(0, titleRemaining)}자
                  </Text>
                </Flex>
                <FormErrorMessage>{errors.item_name?.message}</FormErrorMessage>
              </FormControl>

              <Stack direction={{ base: "column", md: "row" }} gap={4}>
                <FormControl isInvalid={Boolean(errors.item_sku)}>
                  <Label>상품 SKU</Label>
                  <Input
                    id="item_sku"
                    size="sm"
                    placeholder="선택"
                    {...register("item_sku")}
                  />
                  <FormErrorMessage>
                    {errors.item_sku?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.condition)}>
                  <Label required>상품 상태</Label>
                  <Controller
                    name="condition"
                    control={control}
                    render={({ field }) => (
                      <Select
                        id="condition"
                        size="sm"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value as "NEW" | "USED")
                        }
                      >
                        <option value="NEW">새 상품</option>
                        <option value="USED">중고 상품</option>
                      </Select>
                    )}
                  />
                  <FormErrorMessage>
                    {errors.condition?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>

              <FormControl isInvalid={Boolean(errors.item_status)}>
                <Label required>판매 상태</Label>
                <Controller
                  name="item_status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="item_status"
                      size="sm"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value as "NORMAL" | "UNLIST")
                      }
                    >
                      <option value="UNLIST">판매 중지 (UNLIST)</option>
                      <option value="NORMAL">판매 중 (NORMAL)</option>
                    </Select>
                  )}
                />
                <Text fontSize="xs" color="gray.400" mt={1}>
                  UNLIST로 등록 후 검토 완료 시 NORMAL로 변경하는 것을
                  권장합니다.
                </Text>
                <FormErrorMessage>
                  {errors.item_status?.message}
                </FormErrorMessage>
              </FormControl>
            </Stack>
          </Section>

          {/* ── 섹션 2: 카테고리 ──────────────────────────── */}
          <Section title="카테고리">
            <FormControl isInvalid={Boolean(errors.category_id)}>
              <Label required>카테고리 ID</Label>
              <Input
                id="category_id"
                size="sm"
                type="number"
                step={1}
                placeholder="예: 14695"
                {...register("category_id", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
              <Text fontSize="xs" color="gray.400" mt={1}>
                Shopee 셀러 센터 또는 category.get_category API에서 확인할 수
                있습니다.
              </Text>
              <FormErrorMessage>{errors.category_id?.message}</FormErrorMessage>
            </FormControl>
          </Section>

          {/* ── 섹션 3: 가격 / 재고 ───────────────────────── */}
          <Section title="가격 / 재고">
            <Stack gap={4}>
              <Stack direction={{ base: "column", md: "row" }} gap={4}>
                <FormControl isInvalid={Boolean(errors.original_price)}>
                  <Label required>판매가 (USD)</Label>
                  <Input
                    id="original_price"
                    size="sm"
                    type="number"
                    step={0.01}
                    placeholder="예: 29.99"
                    {...register("original_price", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <FormErrorMessage>
                    {errors.original_price?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.stock)}>
                  <Label required>재고 수량</Label>
                  <Input
                    id="stock"
                    size="sm"
                    type="number"
                    step={1}
                    {...register("stock", {
                      setValueAs: (v) => (v === "" ? 0 : Number(v)),
                    })}
                  />
                  <FormErrorMessage>{errors.stock?.message}</FormErrorMessage>
                </FormControl>
              </Stack>
            </Stack>
          </Section>

          {/* ── 섹션 4: 이미지 ────────────────────────────── */}
          <Section title="이미지">
            <FormControl isInvalid={Boolean(errors.image_id_list)}>
              <Label required>이미지 ID 목록</Label>
              <Input
                id="image_id_list"
                size="sm"
                placeholder="예: abc123, def456 (콤마로 구분)"
                {...register("image_id_list")}
              />
              <Text fontSize="xs" color="gray.400" mt={1}>
                Shopee 미디어 업로드 API(media.upload_image)로 이미지를 먼저
                업로드한 후 반환된 image_id를 콤마(,)로 구분하여 입력해 주세요.
              </Text>
              <FormErrorMessage>
                {errors.image_id_list?.message}
              </FormErrorMessage>
            </FormControl>
          </Section>

          {/* ── 섹션 5: 상품 설명 ─────────────────────────── */}
          <Section title="상품 설명">
            <FormControl isInvalid={Boolean(errors.description)}>
              <Label required>설명</Label>
              <Textarea
                id="description"
                size="sm"
                rows={8}
                placeholder="상품에 대한 설명을 입력해 주세요"
                {...register("description")}
              />
              <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
            </FormControl>
          </Section>

          {/* ── 섹션 6: 무게 / 포장 크기 ──────────────────── */}
          <Section title="무게 / 포장 크기">
            <Stack gap={4}>
              <FormControl isInvalid={Boolean(errors.weight)}>
                <Label required>무게 (kg)</Label>
                <Input
                  id="weight"
                  size="sm"
                  type="number"
                  step={0.01}
                  placeholder="예: 0.5"
                  {...register("weight", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                />
                <FormErrorMessage>{errors.weight?.message}</FormErrorMessage>
              </FormControl>

              <Stack direction={{ base: "column", md: "row" }} gap={4}>
                <FormControl isInvalid={Boolean(errors.package_length)}>
                  <Label>길이 (cm)</Label>
                  <Input
                    id="package_length"
                    size="sm"
                    type="number"
                    step={1}
                    placeholder="선택"
                    {...register("package_length", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <FormErrorMessage>
                    {errors.package_length?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.package_width)}>
                  <Label>너비 (cm)</Label>
                  <Input
                    id="package_width"
                    size="sm"
                    type="number"
                    step={1}
                    placeholder="선택"
                    {...register("package_width", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <FormErrorMessage>
                    {errors.package_width?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.package_height)}>
                  <Label>높이 (cm)</Label>
                  <Input
                    id="package_height"
                    size="sm"
                    type="number"
                    step={1}
                    placeholder="선택"
                    {...register("package_height", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <FormErrorMessage>
                    {errors.package_height?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>
            </Stack>
          </Section>

          {/* ── 섹션 7: 배송 채널 ──────────────────────────── */}
          <Section title="배송 채널">
            <Stack gap={4}>
              <FormControl isInvalid={Boolean(errors.logistic_id)}>
                <Label required>배송 채널 ID (logistic_id)</Label>
                <Input
                  id="logistic_id"
                  size="sm"
                  type="number"
                  step={1}
                  placeholder="예: 80101"
                  {...register("logistic_id", {
                    setValueAs: (v) => (v === "" ? undefined : Number(v)),
                  })}
                />
                <Text fontSize="xs" color="gray.400" mt={1}>
                  logistics.get_channel_list API에서 확인할 수 있습니다.
                </Text>
                <FormErrorMessage>
                  {errors.logistic_id?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl>
                <Flex align="center" gap={2}>
                  <input
                    type="checkbox"
                    id="logistic_is_free"
                    checked={logisticIsFree}
                    onChange={(e) =>
                      setValue("logistic_is_free", e.target.checked)
                    }
                  />
                  <Text fontSize="sm" color="gray.700">
                    무료 배송
                  </Text>
                </Flex>
              </FormControl>

              {!logisticIsFree && (
                <FormControl isInvalid={Boolean(errors.logistic_shipping_fee)}>
                  <Label>배송비 (USD)</Label>
                  <Input
                    id="logistic_shipping_fee"
                    size="sm"
                    type="number"
                    step={0.01}
                    placeholder="예: 5.00"
                    {...register("logistic_shipping_fee", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <FormErrorMessage>
                    {errors.logistic_shipping_fee?.message}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Stack>
          </Section>

          {/* ── 섹션 8: 브랜드 ────────────────────────────── */}
          <Section title="브랜드">
            <Stack gap={3}>
              <Flex align="center" gap={2}>
                <input
                  type="checkbox"
                  id="no_brand"
                  checked={noBrand}
                  onChange={(e) => {
                    setValue("no_brand", e.target.checked);
                    if (e.target.checked) setValue("brand_name", "");
                  }}
                />
                <Text fontSize="sm" color="gray.700">
                  브랜드 없음 (No Brand)
                </Text>
              </Flex>

              {!noBrand && (
                <FormControl isInvalid={Boolean(errors.brand_name)}>
                  <Label required>브랜드명</Label>
                  <Input
                    id="brand_name"
                    size="sm"
                    placeholder="브랜드명을 입력해 주세요"
                    {...register("brand_name")}
                  />
                  <FormErrorMessage>
                    {errors.brand_name?.message}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Stack>
          </Section>

          {/* ── 섹션 9: 예약 구매 (선택) ──────────────────── */}
          <Section title="예약 구매">
            <Stack gap={3}>
              <Flex align="center" gap={2}>
                <input
                  type="checkbox"
                  id="is_pre_order"
                  checked={isPreOrder}
                  onChange={(e) => {
                    setValue("is_pre_order", e.target.checked);
                    if (!e.target.checked) setValue("days_to_ship", undefined);
                  }}
                />
                <Text fontSize="sm" color="gray.700">
                  예약 구매 상품
                </Text>
              </Flex>

              {isPreOrder && (
                <FormControl isInvalid={Boolean(errors.days_to_ship)}>
                  <Label required>배송 소요일</Label>
                  <Input
                    id="days_to_ship"
                    size="sm"
                    type="number"
                    step={1}
                    placeholder="예: 7"
                    {...register("days_to_ship", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    get_dts_limit API에서 카테고리별 허용 범위를 확인하세요.
                  </Text>
                  <FormErrorMessage>
                    {errors.days_to_ship?.message}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Stack>
          </Section>

          {/* ── 하단 액션 버튼 ───────────────────────────── */}
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
