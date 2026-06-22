"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import {
  Children,
  createContext,
  isValidElement,
  Suspense,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FieldErrors } from "react-hook-form";
import { Controller, type SubmitErrorHandler, useForm } from "react-hook-form";
import { brandQueries } from "@/entities/brand";
import { categoryQueries } from "@/entities/category";
import { useChannelApiKey, useChannelProduct } from "@/entities/channel";
import { useEditGoodsContents, useEditGoodsImage } from "@/entities/item";
import {
  type UpdateProductFormValues,
  updateProductSchema,
  useProductDetail,
  useQoo10SetPriceQty,
} from "@/entities/product";
import {
  InventoryOptionSection,
  SimpleOptionSection,
} from "@/features/product-edit";
import { appToaster } from "@/shared/ui/app-toaster";
import {
  EmptyState,
  PageHeader,
  RichHtmlEditor,
  ShipDateCell,
} from "@/shared/ui";
import {
  itemEditContentsSchema,
  itemEditImageSchema,
} from "../model/itemEditSchemas";
import { mapProductToUpdateFormValues } from "../lib/mapProductToUpdateForm";

const TAX_RATE_OPTIONS: Array<{
  id: UpdateProductFormValues["TaxRate"];
  label: string;
}> = [
  { id: "S", label: "판매점기본(S)" },
  { id: "10", label: "10%" },
  { id: "8", label: "8%" },
  { id: "0", label: "0%" },
];

const AVAILABLE_DATE_TYPE_OPTIONS: Array<{
  id: UpdateProductFormValues["AvailableDateType"];
  label: string;
}> = [
  { id: "0", label: "일반발송 (3영업일)" },
  { id: "1", label: "상품준비일" },
  { id: "2", label: "출시일" },
  { id: "3", label: "당일발송" },
];

type LocalSelectProps = Omit<ComponentPropsWithoutRef<"select">, "size"> & {
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

  const placeholderOption = placeholder ? (
    <option value="" disabled>
      {placeholder}
    </option>
  ) : null;

  return (
    <select {...rest} disabled={isDisabled} style={mergedStyle}>
      {placeholderOption}
      {children}
    </select>
  );
}

const PRODUCTION_PLACE_TYPE_OPTIONS: Array<{
  id: UpdateProductFormValues["ProductionPlaceType"];
  label: string;
}> = [
  { id: "1", label: "국내" },
  { id: "2", label: "해외" },
  { id: "3", label: "기타" },
];

const JAPAN_PREFECTURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "선택안함" },
  { value: "HOKKAIDO", label: "北海道(HOKKAIDO)" },
  { value: "AOMORI", label: "青森県(AOMORI)" },
  { value: "IWATE", label: "岩手県(IWATE)" },
  { value: "MIYAGI", label: "宮城県(MIYAGI)" },
  { value: "AKITA", label: "秋田県(AKITA)" },
  { value: "YAMAGATA", label: "山形県(YAMAGATA)" },
  { value: "FUKUSHIMA", label: "福島県(FUKUSHIMA)" },
  { value: "IBARAKI", label: "茨城県(IBARAKI)" },
  { value: "TOCHIGI", label: "栃木県(TOCHIGI)" },
  { value: "GUMMA", label: "群馬県(GUMMA)" },
  { value: "SAITAMA", label: "埼玉県(SAITAMA)" },
  { value: "CHIBA", label: "千葉県(CHIBA)" },
  { value: "TOKYO", label: "東京都(TOKYO)" },
  { value: "KANAGAWA", label: "神奈川県(KANAGAWA)" },
  { value: "NIIGATA", label: "新潟県(NIIGATA)" },
  { value: "TOYAMA", label: "富山県(TOYAMA)" },
  { value: "ISHIKAWA", label: "石川県(ISHIKAWA)" },
  { value: "FUKUI", label: "福井県(FUKUI)" },
  { value: "YAMANASHI", label: "山梨県(YAMANASHI)" },
  { value: "NAGANO", label: "長野県(NAGANO)" },
  { value: "GIFU", label: "岐阜県(GIFU)" },
  { value: "SHIZUOKA", label: "静岡県(SHIZUOKA)" },
  { value: "AICHI", label: "愛知県(AICHI)" },
  { value: "MIE", label: "三重県(MIE)" },
  { value: "SHIGA", label: "滋賀県(SHIGA)" },
  { value: "KYOTO", label: "京都府(KYOTO)" },
  { value: "OSAKA", label: "大阪府(OSAKA)" },
  { value: "HYOGO", label: "兵庫県(HYOGO)" },
  { value: "NARA", label: "奈良県(NARA)" },
  { value: "WAKAYAMA", label: "和歌山県(WAKAYAMA)" },
  { value: "TOTTORI", label: "鳥取県(TOTTORI)" },
  { value: "SHIMANE", label: "島根県(SHIMANE)" },
  { value: "OKAYAMA", label: "岡山県(OKAYAMA)" },
  { value: "HIROSHIMA", label: "広島県(HIROSHIMA)" },
  { value: "YAMAGUCHI", label: "山口県(YAMAGUCHI)" },
  { value: "TOKUSHIMA", label: "徳島県(TOKUSHIMA)" },
  { value: "KAGAWA", label: "香川県(KAGAWA)" },
  { value: "EHIME", label: "愛媛県(EHIME)" },
  { value: "KOCHI", label: "高知県(KOCHI)" },
  { value: "FUKUOKA", label: "福岡県(FUKUOKA)" },
  { value: "SAGA", label: "佐賀県(SAGA)" },
  { value: "NAGASAKI", label: "長崎県(NAGASAKI)" },
  { value: "KUMAMOTO", label: "熊本県(KUMAMOTO)" },
  { value: "OITA", label: "大分県(OITA)" },
  { value: "MIYAZAKI", label: "宮崎県(MIYAZAKI)" },
  { value: "KAGOSHIMA", label: "鹿児島県(KAGOSHIMA)" },
  { value: "OKINAWA", label: "沖縄県(OKINAWA)" },
];

function getAvailableDateValuePlaceholder(
  type: UpdateProductFormValues["AvailableDateType"],
): string {
  if (type === "0") return "1~3 (일반발송일)";
  if (type === "1") return "4~14 (준비일 수)";
  if (type === "2") return "2025/09/26 (출시일)";
  return "14:30 (당일발송 마감시간)";
}

function normalizeIndustrialCodeType(
  value: string,
): UpdateProductFormValues["IndustrialCodeType"] {
  if (value === "") return "";
  if (value === "J") return "J";
  if (value === "K") return "K";
  if (value === "I") return "I";
  if (value === "U") return "U";
  if (value === "E") return "E";
  if (value === "H") return "H";
  return "";
}

function safeImageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return trimmed;
  } catch {
    return null;
  }
}

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
  children: React.ReactNode;
}): React.JSX.Element | null {
  if (!children) return null;
  return (
    <Text fontSize="xs" color="red.500" mt={1}>
      {children}
    </Text>
  );
}

type AccordionContextValue = {
  openIndices: Set<number>;
  toggleIndex: (index: number) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemIndexContext = createContext<number | null>(null);

function Accordion({
  children,
  allowToggle,
  defaultIndex,
}: {
  children: React.ReactNode;
  allowToggle?: boolean;
  defaultIndex?: number[];
}): React.JSX.Element {
  const [openIndices, setOpenIndices] = useState<Set<number>>(
    () => new Set(defaultIndex ?? []),
  );

  const toggleIndex = (index: number): void => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (allowToggle) {
          next.delete(index);
        }
        return next;
      }

      next.clear();
      next.add(index);
      return next;
    });
  };

  const enhancedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    return (
      <AccordionItemIndexContext.Provider value={index}>
        {child}
      </AccordionItemIndexContext.Provider>
    );
  });

  return (
    <AccordionContext.Provider value={{ openIndices, toggleIndex }}>
      {enhancedChildren}
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  children,
  ..._rest
}: {
  children: React.ReactNode;
} & Record<string, unknown>): React.JSX.Element {
  return <>{children}</>;
}

function AccordionButton({
  children,
}: {
  children: React.ReactNode;
} & Record<string, unknown>): React.JSX.Element {
  const accordion = useContext(AccordionContext);
  const index = useContext(AccordionItemIndexContext);
  const isOpen = index !== null ? accordion?.openIndices.has(index) : false;

  return (
    <Box
      cursor="pointer"
      as="button"
      onClick={() => {
        if (index === null) return;
        accordion?.toggleIndex(index);
      }}
      aria-expanded={isOpen}
    >
      {children}
    </Box>
  );
}

function AccordionIcon({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._rest
}: Record<string, unknown>): React.JSX.Element {
  const accordion = useContext(AccordionContext);
  const index = useContext(AccordionItemIndexContext);
  const isOpen = index !== null ? accordion?.openIndices.has(index) : false;

  return <Text fontSize="sm">{isOpen ? "−" : "＋"}</Text>;
}

function AccordionPanel({
  children,
}: {
  children: React.ReactNode;
} & Record<string, unknown>): React.JSX.Element | null {
  const accordion = useContext(AccordionContext);
  const index = useContext(AccordionItemIndexContext);
  const isOpen = index !== null ? accordion?.openIndices.has(index) : false;

  if (!isOpen) return null;
  return <Box>{children}</Box>;
}

function ItemEditPageContent(): React.JSX.Element {
  const idPrefix = useId();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const itemCodeParam = params?.itemCode;
  const itemCode =
    typeof itemCodeParam === "string"
      ? itemCodeParam
      : Array.isArray(itemCodeParam)
        ? (itemCodeParam[0] ?? "")
        : "";
  const sp = searchParams ?? new URLSearchParams();
  const sellerCodeFromQuery =
    sp.get("sellerCode") ?? sp.get("SellerCode") ?? "";
  const secondSubCatHint = sp.get("secondSubCat");

  const { hasKey } = useChannelApiKey("qoo10");

  const { data: channelItem } = useChannelProduct(
    "qoo10",
    itemCode,
    itemCode.trim().length > 0,
  );
  const isMasterLinked = channelItem?.linkStatus === "linked";

  const defaultValues = useMemo<UpdateProductFormValues>(
    () => ({
      mainCatCd: "",
      midCatCd: "",
      SecondSubCat: "",
      ItemCode: itemCode,
      BrandNo: "",
      NoBrandInput: false,
      ItemTitle: "",
      PromotionName: "",
      SellerCode: sellerCodeFromQuery,
      ExpireDate: "",
      ItemPrice: 0,
      RetailPrice: undefined,
      TaxRate: "10",
      ItemQty: 0,
      StandardImage: "",
      ItemDescription: "",
      ShippingNo: 0,
      OptionShippingNo1: "",
      OptionShippingNo2: "",
      AvailableDateType: "0",
      AvailableDateValue: "",
      AdultYN: "N",
      ProductionPlaceType: "1",
      ProductionPlace: "",
      IndustrialCodeType: "",
      IndustrialCode: "",
      ModelNm: "",
      ManufactureDate: undefined,
      Weight: "",
      Material: "",
      ContactInfo: "",
      VideoURL: "",
      Keyword: "",
      Drugtype: "",
      DesiredShippingDate: "",
      ItemType: "",
      AdditionalOption: "",
    }),
    [itemCode, sellerCodeFromQuery],
  );

  const {
    control,
    register,
    setValue,
    setError,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProductFormValues>({
    resolver: zodResolver(updateProductSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const editGoodsImage = useEditGoodsImage();
  const editGoodsContents = useEditGoodsContents();
  const setPriceQty = useQoo10SetPriceQty();
  const isSavePending =
    editGoodsImage.isPending ||
    editGoodsContents.isPending ||
    setPriceQty.isPending;

  const {
    product,
    isLoading: isDetailLoading,
    error: detailError,
  } = useProductDetail(
    itemCode.trim().length > 0 ? itemCode : null,
    sellerCodeFromQuery,
  );

  useEffect(() => {
    if (!product) {
      return;
    }
    const next = mapProductToUpdateFormValues(product, secondSubCatHint);
    reset(next);
  }, [product, secondSubCatHint, reset]);

  const [brandKeyword, setBrandKeyword] = useState<string>("");
  const [debouncedBrandKeyword, setDebouncedBrandKeyword] =
    useState<string>("");
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] =
    useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedBrandKeyword(brandKeyword.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [brandKeyword]);

  const categoryQuery = useQuery(categoryQueries.all());

  const brandQuery = useQuery(brandQueries.search(debouncedBrandKeyword));

  const categories = categoryQuery.data?.ResultObject ?? [];
  const brandResults = brandQuery.data?.ResultObject ?? [];
  const brandErrorMessage =
    brandQuery.error instanceof Error
      ? brandQuery.error.message
      : "브랜드 검색에 실패했습니다.";

  const selectedMainCatCd = watch("mainCatCd");
  const selectedMidCatCd = watch("midCatCd");

  const selectedBrandNo = watch("BrandNo");
  const noBrandInput = watch("NoBrandInput");
  const [selectedBrandLabel, setSelectedBrandLabel] = useState<string>("");

  const itemTitle = watch("ItemTitle");
  const titleRemaining = 100 - itemTitle.length;

  const standardImageUrl = watch("StandardImage") ?? "";
  const previewUrl = safeImageUrl(standardImageUrl);
  const [previewFailed, setPreviewFailed] = useState<boolean>(false);

  const availableDateType = watch("AvailableDateType");
  const productionPlaceType = watch("ProductionPlaceType");
  const shippingNo = watch("ShippingNo");

  const mainCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    categories.forEach((item) => {
      if (!map.has(item.CATE_L_CD)) {
        map.set(item.CATE_L_CD, { code: item.CATE_L_CD, name: item.CATE_L_NM });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  const midCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    categories.forEach((item) => {
      if (item.CATE_L_CD !== selectedMainCatCd) return;
      if (!map.has(item.CATE_M_CD)) {
        map.set(item.CATE_M_CD, { code: item.CATE_M_CD, name: item.CATE_M_NM });
      }
    });
    return Array.from(map.values());
  }, [categories, selectedMainCatCd]);

  const secondSubCatOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    categories.forEach((item) => {
      if (item.CATE_M_CD !== selectedMidCatCd) return;
      if (!map.has(item.CATE_S_CD)) {
        map.set(item.CATE_S_CD, { code: item.CATE_S_CD, name: item.CATE_S_NM });
      }
    });
    return Array.from(map.values());
  }, [categories, selectedMidCatCd]);

  useEffect(() => {
    // dropdown 외부 클릭 시 닫기
    const onMouseDown = (event: MouseEvent): void => {
      if (!containerRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!containerRef.current.contains(target)) {
        setIsBrandDropdownOpen(false);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  const onInvalid: SubmitErrorHandler<UpdateProductFormValues> = (
    fieldErrors: FieldErrors<UpdateProductFormValues>,
  ): void => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;

    const el = document.getElementById(firstKey);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onValid = async (values: UpdateProductFormValues): Promise<void> => {
    const imageValidation = itemEditImageSchema.safeParse({
      standardImage: values.StandardImage ?? "",
      videoURL: values.VideoURL ?? "",
    });
    if (!imageValidation.success) {
      const imageErrors = imageValidation.error.flatten().fieldErrors;
      const standardImageError = imageErrors.standardImage?.[0];
      if (standardImageError) {
        setError("StandardImage", { message: standardImageError });
      }

      const videoError = imageErrors.videoURL?.[0];
      if (videoError) {
        setError("VideoURL", { message: videoError });
      }

      return;
    }

    const contentsValidation = itemEditContentsSchema.safeParse({
      contents: values.ItemDescription ?? "",
    });
    if (!contentsValidation.success) {
      const contentsError =
        contentsValidation.error.flatten().fieldErrors.contents?.[0];
      if (contentsError) {
        setError("ItemDescription", { message: contentsError });
      }
      return;
    }

    const settled = await Promise.allSettled([
      editGoodsImage.mutateAsync({
        itemCode: values.ItemCode,
        sellerCode: values.SellerCode?.trim() || undefined,
        standardImage: imageValidation.data.standardImage,
        videoURL: imageValidation.data.videoURL || undefined,
      }),
      editGoodsContents.mutateAsync({
        itemCode: values.ItemCode,
        sellerCode: values.SellerCode?.trim() || undefined,
        contents: contentsValidation.data.contents,
      }),
      setPriceQty.mutateAsync({
        itemCode: values.ItemCode,
        sellerCode: values.SellerCode?.trim() || undefined,
        itemPrice: values.ItemPrice ?? 0,
        itemQty: values.ItemQty ?? 0,
        taxRate: values.TaxRate,
        retailPrice: values.RetailPrice,
      }),
    ]);

    const hasFailure = settled.some((result) => result.status === "rejected");
    if (!hasFailure) {
      appToaster.create({
        title: "수정이 완료되었습니다",
        type: "success",
      });
      router.push("/sales-products");
    }
  };

  const adYn = watch("AdultYN");
  const adultLabel = adYn === "Y" ? "성인상품" : "일반상품";
  const isFormDisabled = isSubmitting || isSavePending;

  if (!hasKey) {
    return (
      <EmptyState
        title="Qoo10 API 키가 없습니다"
        description="채널 설정에서 Qoo10 API 키를 등록하면 상품을 수정할 수 있습니다."
        action={{
          label: "채널 설정으로 이동",
          onClick: () => router.push("/settings/channels"),
        }}
      />
    );
  }

  if (!itemCode.trim()) {
    return (
      <EmptyState
        title="잘못된 경로입니다"
        description="상품 코드가 URL에 없습니다. 상품 목록에서 다시 열어 주세요."
        action={{
          label: "상품 목록으로 이동",
          onClick: () => router.push("/sales-products"),
        }}
      />
    );
  }

  if (isDetailLoading) {
    return (
      <Box>
        <PageHeader
          title="상품 수정"
          description="상품 정보를 불러오는 중입니다."
          mb={6}
        />
        <Stack gap={4}>
          <Skeleton height="40px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </Stack>
      </Box>
    );
  }

  if (detailError) {
    const isStatusRestricted = detailError.type === "STATUS_RESTRICTED";
    return (
      <Box>
        <PageHeader
          title="상품 수정"
          description={
            isStatusRestricted
              ? "해당 상품은 현재 상태에서 상세 조회가 불가합니다."
              : "상품 정보를 불러오지 못했습니다."
          }
          mb={6}
        />
        <Box
          borderWidth="1px"
          borderColor={isStatusRestricted ? "orange.200" : "red.200"}
          borderRadius="md"
          bg={isStatusRestricted ? "orange.50" : "red.50"}
          p={4}
        >
          <Text
            fontSize="sm"
            color={isStatusRestricted ? "orange.700" : "red.700"}
            fontWeight="medium"
          >
            {isStatusRestricted ? "⚠ " : "✕ "}
            {detailError.message}
          </Text>
          {isStatusRestricted && (
            <Text fontSize="xs" color="orange.600" mt={1}>
              상품 목록에서 거래중지 상태를 확인하거나, 상태를 변경한 뒤 다시
              시도해 주세요.
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (!product) {
    return (
      <EmptyState
        title="상품을 찾을 수 없습니다"
        description="상품 상세를 불러올 수 없습니다. 목록에서 다시 선택해 주세요."
        action={{
          label: "상품 목록으로 이동",
          onClick: () => router.push("/sales-products"),
        }}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title="상품 수정"
        description="Qoo10 상품 정보를 수정합니다. (가격·재고·이미지 등 일부 항목은 이 화면에서 조회만 가능합니다)"
        mb={6}
      />

      {isMasterLinked && (
        <Box
          mb={4}
          borderWidth="1px"
          borderColor="blue.200"
          borderRadius="md"
          bg="blue.50"
          p={3}
        >
          <Text fontSize="sm" color="blue.800">
            이 상품은 마스터 상품과 연결되어 있어 일부 항목은 마스터 상품의 값을
            따릅니다. 가격·재고·배송 등 채널 전용 항목만 수정할 수 있습니다.
          </Text>
        </Box>
      )}

      <Box
        as="form"
        key={product.id}
        onSubmit={handleSubmit(onValid, onInvalid)}
      >
        <fieldset
          disabled={isFormDisabled}
          style={{ margin: 0, padding: 0, border: "none", minWidth: 0 }}
        >
          <Stack gap={6}>
            {/* ── 섹션 1: 카테고리 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Heading as="h2" size="md">
                  카테고리
                </Heading>
                {categoryQuery.isLoading && (
                  <Text fontSize="xs" color="gray.500">
                    불러오는 중…
                  </Text>
                )}
              </Flex>

              {categoryQuery.isLoading ? (
                <Stack gap={4}>
                  <Skeleton height="40px" />
                  <Skeleton height="40px" />
                  <Skeleton height="40px" />
                </Stack>
              ) : (
                <Stack gap={4}>
                  <Controller
                    name="mainCatCd"
                    control={control}
                    render={({ field }) => (
                      <FormControl isInvalid={Boolean(errors.mainCatCd)}>
                        <Stack gap={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            대분류{" "}
                            <Text as="span" color="gray.400">
                              *
                            </Text>
                          </Text>
                          <Select
                            id={`${idPrefix}-mainCatCd`}
                            placeholder="대분류 선택"
                            size="sm"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setValue("midCatCd", "");
                              setValue("SecondSubCat", "");
                            }}
                            isDisabled={isMasterLinked}
                          >
                            {mainCatOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.name}
                              </option>
                            ))}
                          </Select>
                        </Stack>
                        <FormErrorMessage>
                          {errors.mainCatCd?.message}
                        </FormErrorMessage>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name="midCatCd"
                    control={control}
                    render={({ field }) => (
                      <FormControl isInvalid={Boolean(errors.midCatCd)}>
                        <Stack gap={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            중분류{" "}
                            <Text as="span" color="gray.400">
                              *
                            </Text>
                          </Text>
                          <Select
                            id={`${idPrefix}-midCatCd`}
                            placeholder="중분류 선택"
                            size="sm"
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setValue("SecondSubCat", "");
                            }}
                            isDisabled={isMasterLinked || !selectedMainCatCd}
                          >
                            {midCatOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.name}
                              </option>
                            ))}
                          </Select>
                        </Stack>
                        <FormErrorMessage>
                          {errors.midCatCd?.message}
                        </FormErrorMessage>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name="SecondSubCat"
                    control={control}
                    render={({ field }) => (
                      <FormControl isInvalid={Boolean(errors.SecondSubCat)}>
                        <Stack gap={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            소분류{" "}
                            <Text as="span" color="gray.400">
                              *
                            </Text>
                          </Text>
                          <Select
                            id={`${idPrefix}-SecondSubCat`}
                            placeholder="소분류 선택"
                            size="sm"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            isDisabled={isMasterLinked || !selectedMidCatCd}
                          >
                            {secondSubCatOptions.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.name}
                              </option>
                            ))}
                          </Select>
                        </Stack>
                        <FormErrorMessage>
                          {errors.SecondSubCat?.message}
                        </FormErrorMessage>
                      </FormControl>
                    )}
                  />
                </Stack>
              )}
            </Box>

            {/* ── 섹션 2: 브랜드 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                브랜드
              </Heading>

              <Stack gap={2} ref={containerRef}>
                <Box id={`${idPrefix}-BrandNo`}>
                  <FormControl isInvalid={Boolean(errors.BrandNo)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      브랜드 검색{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Input
                      id={`${idPrefix}-BrandSearch`}
                      size="sm"
                      value={brandKeyword}
                      disabled={noBrandInput || isMasterLinked}
                      onChange={(e) => {
                        setBrandKeyword(e.target.value);
                        setIsBrandDropdownOpen(true);
                        setValue("BrandNo", "");
                        setSelectedBrandLabel("");
                      }}
                      onFocus={() => {
                        if (noBrandInput || isMasterLinked) return;
                        setIsBrandDropdownOpen(true);
                      }}
                      placeholder="브랜드명을 입력해 주세요"
                      autoComplete="off"
                    />

                    <FormErrorMessage>
                      {errors.BrandNo?.message}
                    </FormErrorMessage>

                    <Flex mt={2} align="center" gap={2}>
                      <input
                        type="checkbox"
                        checked={noBrandInput}
                        disabled={isMasterLinked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setValue("NoBrandInput", checked, {
                            shouldValidate: true,
                          });

                          if (checked) {
                            setBrandKeyword("");
                            setSelectedBrandLabel("");
                            setIsBrandDropdownOpen(false);
                            setValue("BrandNo", "", { shouldValidate: true });
                          } else {
                            setValue("BrandNo", "", { shouldValidate: false });
                          }
                        }}
                      />
                      <Text fontSize="sm" color="gray.600">
                        입력하지 않음
                      </Text>
                    </Flex>
                  </FormControl>
                </Box>

                {noBrandInput
                  ? null
                  : isBrandDropdownOpen &&
                    brandKeyword.trim().length >= 2 && (
                      <Box position="relative">
                        <Box
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="white"
                          mt={2}
                          p={2}
                          maxH="240px"
                          overflowY="auto"
                          shadow="sm"
                        >
                          {brandQuery.error ? (
                            <Text
                              fontSize="sm"
                              color="red.500"
                              py={3}
                              textAlign="center"
                            >
                              {brandErrorMessage}
                            </Text>
                          ) : brandQuery.isLoading ? (
                            <Stack gap={2}>
                              <Skeleton height="32px" />
                              <Skeleton height="32px" />
                              <Skeleton height="32px" />
                            </Stack>
                          ) : brandResults.length === 0 ? (
                            <Text
                              fontSize="sm"
                              color="gray.500"
                              py={3}
                              textAlign="center"
                            >
                              검색 결과가 없습니다.
                            </Text>
                          ) : (
                            <Stack gap={1}>
                              {brandResults.map((brand) => {
                                const label = `${brand.M_B_NM} (${brand.M_B_NM_EN})`;
                                const isSelected =
                                  brand.M_B_NO === selectedBrandNo;
                                return (
                                  <Button
                                    key={brand.M_B_NO}
                                    type="button"
                                    variant="ghost"
                                    justifyContent="flex-start"
                                    px={2}
                                    borderRadius="md"
                                    bg={isSelected ? "gray.100" : "transparent"}
                                    onClick={() => {
                                      setValue("BrandNo", brand.M_B_NO, {
                                        shouldValidate: true,
                                      });
                                      setBrandKeyword(label);
                                      setSelectedBrandLabel(label);
                                      setIsBrandDropdownOpen(false);
                                    }}
                                  >
                                    <Text
                                      fontSize="sm"
                                      fontWeight={
                                        isSelected ? "semibold" : "normal"
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
                      </Box>
                    )}

                {selectedBrandNo && selectedBrandLabel && (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    선택됨: {selectedBrandLabel}
                  </Text>
                )}
              </Stack>
            </Box>

            {/* ── 섹션 3: 상품 기본정보 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                상품 기본정보
              </Heading>

              <Stack gap={4}>
                <FormControl isInvalid={Boolean(errors.ItemCode)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Qoo10 상품코드{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Input
                    id={`${idPrefix}-ItemCode`}
                    size="sm"
                    readOnly
                    bg="gray.50"
                    {...register("ItemCode")}
                  />
                  <FormErrorMessage>
                    {errors.ItemCode?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.ItemTitle)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    상품명{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Input
                    id={`${idPrefix}-ItemTitle`}
                    size="sm"
                    value={itemTitle}
                    onChange={(e) => {
                      const next = e.target.value;
                      setValue("ItemTitle", next, { shouldValidate: true });
                    }}
                    placeholder="상품명을 입력해 주세요"
                    maxLength={100}
                    readOnly={isMasterLinked}
                    bg={isMasterLinked ? "gray.50" : undefined}
                  />
                  <Flex justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.400">
                      최대 100자
                    </Text>
                    <Text
                      fontSize="xs"
                      color={titleRemaining < 10 ? "red.500" : "gray.400"}
                    >
                      잔여 {Math.max(0, titleRemaining)}자
                    </Text>
                  </Flex>
                  <FormErrorMessage>
                    {errors.ItemTitle?.message}
                  </FormErrorMessage>
                </FormControl>

                <Stack direction={{ base: "column", md: "row" }} gap={4}>
                  <FormControl isInvalid={Boolean(errors.PromotionName)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      홍보용 상품명
                    </Text>
                    <Input
                      id={`${idPrefix}-PromotionName`}
                      size="sm"
                      placeholder="선택"
                      maxLength={20}
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      {...register("PromotionName")}
                    />
                    <FormErrorMessage>
                      {errors.PromotionName?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={Boolean(errors.SellerCode)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      판매자상품코드
                    </Text>
                    <Input
                      id={`${idPrefix}-SellerCode`}
                      size="sm"
                      placeholder="선택"
                      maxLength={100}
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      {...register("SellerCode")}
                    />
                    <FormErrorMessage>
                      {errors.SellerCode?.message}
                    </FormErrorMessage>
                  </FormControl>
                </Stack>

                <FormControl isInvalid={Boolean(errors.AdultYN)}>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    성인상품 여부{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Box id={`${idPrefix}-AdultYN`}>
                    <Select
                      size="sm"
                      isDisabled={isMasterLinked}
                      value={adYn}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const nextAdultYN = raw === "Y" ? "Y" : "N";
                        setValue("AdultYN", nextAdultYN, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <option value="N">일반상품</option>
                      <option value="Y">성인상품</option>
                    </Select>
                  </Box>
                  <Text fontSize="xs" color="gray.400" mt={2}>
                    현재: {adultLabel}
                  </Text>
                  <FormErrorMessage>{errors.AdultYN?.message}</FormErrorMessage>
                </FormControl>
              </Stack>
            </Box>

            {/* ── 섹션 4: 판매기간 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                판매기간
              </Heading>

              <Stack gap={4}>
                <FormControl isInvalid={Boolean(errors.ExpireDate)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    판매종료일{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Controller
                    name="ExpireDate"
                    control={control}
                    render={({ field }) => (
                      <Box id={`${idPrefix}-ExpireDate`}>
                        <ShipDateCell
                          orderId="expireDate"
                          value={field.value ?? null}
                          isDisabled
                          onChange={(next) => {
                            const normalized = next ?? "";
                            field.onChange(normalized);
                          }}
                        />
                      </Box>
                    )}
                  />
                  <FormErrorMessage>
                    {errors.ExpireDate?.message}
                  </FormErrorMessage>
                </FormControl>
                <Text fontSize="xs" color="gray.500">
                  UpdateGoods API에서는 변경되지 않습니다. 조회 전용입니다.
                </Text>
              </Stack>
            </Box>

            {/* ── 섹션 5: 가격 / 재고 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                가격 / 재고
              </Heading>

              <Stack gap={4}>
                <Stack direction={{ base: "column", md: "row" }} gap={4}>
                  <FormControl isInvalid={Boolean(errors.ItemPrice)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      판매가격{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Input
                      id={`${idPrefix}-ItemPrice`}
                      size="sm"
                      type="number"
                      step={1}
                      {...register("ItemPrice", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      단위: 円
                    </Text>
                    <FormErrorMessage>
                      {errors.ItemPrice?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={Boolean(errors.RetailPrice)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      공급원가
                    </Text>
                    <Input
                      id={`${idPrefix}-RetailPrice`}
                      size="sm"
                      type="number"
                      step={1}
                      {...register("RetailPrice", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                      placeholder="선택"
                    />
                    <FormErrorMessage>
                      {errors.RetailPrice?.message}
                    </FormErrorMessage>
                  </FormControl>
                </Stack>

                <Stack direction={{ base: "column", md: "row" }} gap={4}>
                  <FormControl isInvalid={Boolean(errors.TaxRate)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      소비세율{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Select
                      id={`${idPrefix}-TaxRate`}
                      size="sm"
                      isDisabled
                      value={watch("TaxRate")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const nextTaxRate =
                          raw === "S"
                            ? "S"
                            : raw === "8"
                              ? "8"
                              : raw === "0"
                                ? "0"
                                : "10";
                        setValue("TaxRate", nextTaxRate, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      {TAX_RATE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    <FormErrorMessage>
                      {errors.TaxRate?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={Boolean(errors.ItemQty)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      재고수량{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Input
                      id={`${idPrefix}-ItemQty`}
                      size="sm"
                      type="number"
                      step={1}
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      {...register("ItemQty", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                    {isMasterLinked && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        마스터 상품과 연결된 상품의 재고는 마스터 상품에서
                        관리됩니다.
                      </Text>
                    )}
                    <FormErrorMessage>
                      {errors.ItemQty?.message}
                    </FormErrorMessage>
                  </FormControl>
                </Stack>
              </Stack>
            </Box>

            {/* ── 섹션 6: 대표이미지 / 동영상 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                대표이미지
              </Heading>

              <Stack gap={4}>
                <FormControl isInvalid={Boolean(errors.StandardImage)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    이미지 URL{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Input
                    id={`${idPrefix}-StandardImage`}
                    size="sm"
                    disabled={isFormDisabled || isMasterLinked}
                    value={standardImageUrl}
                    onChange={(e) => {
                      setPreviewFailed(false);
                      setValue("StandardImage", e.target.value, {
                        shouldValidate: true,
                      });
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                  {previewUrl && !previewFailed ? (
                    <Box mt={3}>
                      <Image
                        src={previewUrl}
                        alt="미리보기"
                        width={160}
                        height={120}
                        style={{
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                        onError={() => setPreviewFailed(true)}
                      />
                    </Box>
                  ) : (
                    <Box
                      mt={3}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg="gray.50"
                      height="120px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize="sm" color="gray.500">
                        이미지 미리보기
                      </Text>
                    </Box>
                  )}
                  <FormErrorMessage>
                    {errors.StandardImage?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.VideoURL)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    동영상 URL
                  </Text>
                  <Input
                    id={`${idPrefix}-VideoURL`}
                    size="sm"
                    disabled={isFormDisabled || isMasterLinked}
                    placeholder="선택 (유튜브 등)"
                    {...register("VideoURL")}
                  />
                  <FormErrorMessage>
                    {errors.VideoURL?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>
            </Box>

            {/* ── 섹션 7: 상품상세 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                상품상세
              </Heading>

              <Stack gap={3}>
                <FormControl isInvalid={Boolean(errors.ItemDescription)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    상품상세 HTML{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Box id={`${idPrefix}-ItemDescription`}>
                    <RichHtmlEditor
                      value={watch("ItemDescription") ?? ""}
                      onChange={(nextHtml) =>
                        setValue("ItemDescription", nextHtml, {
                          shouldValidate: true,
                        })
                      }
                      isDisabled={isFormDisabled || isMasterLinked}
                      minHeight="220px"
                    />
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    UpdateGoods로는 변경되지 않습니다. 화면에서 편집 후 저장 시
                    별도 상세수정 API로 반영됩니다.
                  </Text>
                  <FormErrorMessage>
                    {errors.ItemDescription?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>
            </Box>

            {/* ── 섹션 8: 배송비 / 발송가능일 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                배송비 / 발송가능일
              </Heading>

              <Stack gap={4}>
                <Stack direction={{ base: "column", md: "row" }} gap={4}>
                  <FormControl isInvalid={Boolean(errors.ShippingNo)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      배송비코드{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Input
                      id={`${idPrefix}-ShippingNo`}
                      size="sm"
                      type="number"
                      step={1}
                      {...register("ShippingNo", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                    />
                    {shippingNo === 0 && (
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        0 입력 시 무료배송으로 처리됩니다.
                      </Text>
                    )}
                    <FormErrorMessage>
                      {errors.ShippingNo?.message}
                    </FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={Boolean(errors.AvailableDateType)}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      발송가능일 타입{" "}
                      <Text as="span" color="gray.400">
                        *
                      </Text>
                    </Text>
                    <Controller
                      name="AvailableDateType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          id={`${idPrefix}-AvailableDateType`}
                          size="sm"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          {AVAILABLE_DATE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    <FormErrorMessage>
                      {errors.AvailableDateType?.message}
                    </FormErrorMessage>
                  </FormControl>
                </Stack>

                <FormControl isInvalid={Boolean(errors.AvailableDateValue)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    발송가능일 값{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Input
                    id={`${idPrefix}-AvailableDateValue`}
                    size="sm"
                    value={watch("AvailableDateValue")}
                    onChange={(e) =>
                      setValue("AvailableDateValue", e.target.value, {
                        shouldValidate: true,
                      })
                    }
                    placeholder={getAvailableDateValuePlaceholder(
                      availableDateType,
                    )}
                  />
                  <FormErrorMessage>
                    {errors.AvailableDateValue?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.DesiredShippingDate)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    희망 배송일 (DesiredShippingDate)
                  </Text>
                  <Input
                    id={`${idPrefix}-DesiredShippingDate`}
                    size="sm"
                    placeholder="선택"
                    {...register("DesiredShippingDate")}
                  />
                  <FormErrorMessage>
                    {errors.DesiredShippingDate?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>
            </Box>

            {/* ── 섹션 9: 원산지 ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={4}>
                원산지
              </Heading>

              <Stack gap={4}>
                <FormControl isInvalid={Boolean(errors.ProductionPlaceType)}>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    원산지 타입{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  <Controller
                    name="ProductionPlaceType"
                    control={control}
                    render={({ field }) => (
                      <Box id={`${idPrefix}-ProductionPlaceType`}>
                        <Select
                          size="sm"
                          isDisabled={isMasterLinked}
                          value={field.value}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const next =
                              raw === "1" || raw === "2" || raw === "3"
                                ? raw
                                : "1";
                            field.onChange(next);
                            setValue("ProductionPlace", "", {
                              shouldValidate: false,
                            });
                          }}
                        >
                          {PRODUCTION_PLACE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </Box>
                    )}
                  />
                  <FormErrorMessage>
                    {errors.ProductionPlaceType?.message}
                  </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.ProductionPlace)}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    원산지{" "}
                    <Text as="span" color="gray.400">
                      *
                    </Text>
                  </Text>
                  {productionPlaceType === "1" ? (
                    <Select
                      id={`${idPrefix}-ProductionPlace`}
                      size="sm"
                      isDisabled={isMasterLinked}
                      value={watch("ProductionPlace")}
                      onChange={(e) => {
                        const val =
                          e.target.value === "0" ? "" : e.target.value;
                        setValue("ProductionPlace", val, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      {JAPAN_PREFECTURE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`${idPrefix}-ProductionPlace-alt`}
                      size="sm"
                      readOnly={isMasterLinked}
                      bg={isMasterLinked ? "gray.50" : undefined}
                      value={watch("ProductionPlace")}
                      onChange={(e) =>
                        setValue("ProductionPlace", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                      placeholder={
                        productionPlaceType === "2"
                          ? "국가코드 (예: KR)"
                          : "자유입력"
                      }
                    />
                  )}
                  <FormErrorMessage>
                    {errors.ProductionPlace?.message}
                  </FormErrorMessage>
                </FormControl>
              </Stack>
            </Box>

            {/* ── 섹션 10: 추가 정보 (Accordion) ───────────────────────── */}
            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="white"
              p={5}
            >
              <Heading as="h2" size="md" mb={2}>
                추가 정보
              </Heading>

              <Accordion allowToggle defaultIndex={[0]}>
                <AccordionItem border="none">
                  <AccordionButton px={0}>
                    <Box flex="1" textAlign="left">
                      필드 입력 (전부 선택)
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel px={0} pt={3}>
                    <Stack gap={4}>
                      <FormControl isInvalid={Boolean(errors.Drugtype)}>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          의약품 구분 (Drugtype)
                        </Text>
                        <Input
                          id={`${idPrefix}-Drugtype`}
                          size="sm"
                          placeholder="선택"
                          readOnly={isMasterLinked}
                          bg={isMasterLinked ? "gray.50" : undefined}
                          {...register("Drugtype")}
                        />
                        <FormErrorMessage>
                          {errors.Drugtype?.message}
                        </FormErrorMessage>
                      </FormControl>

                      <Stack direction={{ base: "column", md: "row" }} gap={4}>
                        <FormControl isInvalid={Boolean(errors.ModelNm)}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            모델번호 (ModelNm)
                          </Text>
                          <Input
                            id={`${idPrefix}-ModelNm`}
                            size="sm"
                            placeholder="선택"
                            readOnly={isMasterLinked}
                            bg={isMasterLinked ? "gray.50" : undefined}
                            {...register("ModelNm")}
                          />
                          <FormErrorMessage>
                            {errors.ModelNm?.message}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl
                          isInvalid={Boolean(errors.ManufactureDate)}
                        >
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            제조일자 (ManufactureDate)
                          </Text>
                          <Input
                            id={`${idPrefix}-ManufactureDate`}
                            size="sm"
                            placeholder="선택"
                            readOnly={isMasterLinked}
                            bg={isMasterLinked ? "gray.50" : undefined}
                            {...register("ManufactureDate")}
                          />
                          <FormErrorMessage>
                            {errors.ManufactureDate?.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Stack>

                      <Stack direction={{ base: "column", md: "row" }} gap={4}>
                        <FormControl isInvalid={Boolean(errors.Material)}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            소재 (Material)
                          </Text>
                          <Input
                            id={`${idPrefix}-Material`}
                            size="sm"
                            placeholder="선택"
                            readOnly={isMasterLinked}
                            bg={isMasterLinked ? "gray.50" : undefined}
                            {...register("Material")}
                          />
                          <FormErrorMessage>
                            {errors.Material?.message}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={Boolean(errors.Weight)}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            상품무게 (Weight)
                          </Text>
                          <Input
                            id={`${idPrefix}-Weight`}
                            size="sm"
                            placeholder="선택"
                            readOnly={isMasterLinked}
                            bg={isMasterLinked ? "gray.50" : undefined}
                            {...register("Weight")}
                          />
                          <FormErrorMessage>
                            {errors.Weight?.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Stack>

                      <Stack direction={{ base: "column", md: "row" }} gap={4}>
                        <FormControl isInvalid={Boolean(errors.ContactInfo)}>
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            서비스담당자 (ContactInfo)
                          </Text>
                          <Input
                            id={`${idPrefix}-ContactInfo`}
                            size="sm"
                            placeholder="선택"
                            readOnly={isMasterLinked}
                            bg={isMasterLinked ? "gray.50" : undefined}
                            {...register("ContactInfo")}
                          />
                          <FormErrorMessage>
                            {errors.ContactInfo?.message}
                          </FormErrorMessage>
                        </FormControl>

                        <FormControl
                          isInvalid={Boolean(errors.IndustrialCodeType)}
                        >
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            산업코드타입 (IndustrialCodeType)
                          </Text>
                          <Select
                            id={`${idPrefix}-IndustrialCodeType`}
                            size="sm"
                            isDisabled={isMasterLinked}
                            value={watch("IndustrialCodeType")}
                            onChange={(e) =>
                              setValue(
                                "IndustrialCodeType",
                                normalizeIndustrialCodeType(e.target.value),
                              )
                            }
                          >
                            <option value="">미선택</option>
                            <option value="J">J</option>
                            <option value="K">K</option>
                            <option value="I">I</option>
                            <option value="U">U</option>
                            <option value="E">E</option>
                            <option value="H">H</option>
                          </Select>
                          <FormErrorMessage>
                            {errors.IndustrialCodeType?.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Stack>

                      <Stack direction={{ base: "column", md: "row" }} gap={4}>
                        <FormControl
                          isInvalid={Boolean(errors.OptionShippingNo1)}
                        >
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            옵션배송비 1 (OptionShippingNo1)
                          </Text>
                          <Input
                            id={`${idPrefix}-OptionShippingNo1`}
                            size="sm"
                            placeholder="선택"
                            {...register("OptionShippingNo1")}
                          />
                          <FormErrorMessage>
                            {errors.OptionShippingNo1?.message}
                          </FormErrorMessage>
                        </FormControl>
                        <FormControl
                          isInvalid={Boolean(errors.OptionShippingNo2)}
                        >
                          <Text fontSize="sm" fontWeight="medium" mb={1}>
                            옵션배송비 2 (OptionShippingNo2)
                          </Text>
                          <Input
                            id={`${idPrefix}-OptionShippingNo2`}
                            size="sm"
                            placeholder="선택"
                            {...register("OptionShippingNo2")}
                          />
                          <FormErrorMessage>
                            {errors.OptionShippingNo2?.message}
                          </FormErrorMessage>
                        </FormControl>
                      </Stack>

                      <FormControl isInvalid={Boolean(errors.IndustrialCode)}>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          산업코드 (IndustrialCode)
                        </Text>
                        <Input
                          id={`${idPrefix}-IndustrialCode`}
                          size="sm"
                          placeholder="선택"
                          readOnly={isMasterLinked}
                          bg={isMasterLinked ? "gray.50" : undefined}
                          {...register("IndustrialCode")}
                        />
                        <FormErrorMessage>
                          {errors.IndustrialCode?.message}
                        </FormErrorMessage>
                      </FormControl>

                      <FormControl isInvalid={Boolean(errors.Keyword)}>
                        <Text fontSize="sm" fontWeight="medium" mb={1}>
                          검색키워드 (최대 10개, 콤마 구분)
                        </Text>
                        <Input
                          id={`${idPrefix}-Keyword`}
                          size="sm"
                          placeholder="예: shoes, leather, men"
                          readOnly={isMasterLinked}
                          bg={isMasterLinked ? "gray.50" : undefined}
                          value={watch("Keyword")}
                          onChange={(e) =>
                            setValue("Keyword", e.target.value, {
                              shouldValidate: true,
                            })
                          }
                        />
                        <FormErrorMessage>
                          {errors.Keyword?.message}
                        </FormErrorMessage>
                      </FormControl>
                    </Stack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </Box>

            {/* <OptionSection /> 슬롯: 기존 옵션 form 제거 후 재구성 */}
            {/* <InventoryOptionSection itemCode={itemCode} channelId="qoo10" /> */}
            {/* <SimpleOptionSection itemCode={itemCode} channelId="qoo10" /> */}

            {/* ── 하단 액션 버튼 ───────────────────────── */}
            <Flex justify="flex-end" gap={3} pt={2}>
              <Button
                variant="ghost"
                onClick={() => router.push("/sales-products")}
                disabled={isFormDisabled}
              >
                취소
              </Button>
              <Button
                type="submit"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                disabled={isFormDisabled}
                loading={isFormDisabled}
              >
                수정 완료
              </Button>
            </Flex>
          </Stack>
        </fieldset>
      </Box>
    </Box>
  );
}

export function ItemEditPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box py={10}>
          <Stack gap={4}>
            <Skeleton height="32px" />
            <Skeleton height="200px" />
          </Stack>
        </Box>
      }
    >
      <ItemEditPageContent />
    </Suspense>
  );
}
