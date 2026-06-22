"use client";

import type React from "react";
import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Flex,
  Image,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { AvailableDateType, Product } from "@/entities/product";
import { useProductDetail } from "@/entities/product";

const MotionDiv = motion.div;

export interface ProductDetailModalProps {
  itemCode: string | null;
  sellerCode: string | null;
  onClose: () => void;
}

function dashIfEmptyOrZero(value: string): string {
  const v = value.trim();
  if (v === "" || v === "0") return "-";
  return v;
}

function formatJpyOrDash(value: number): string {
  if (value === 0) return "-";
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatShippingNo(shippingNo: string): string {
  const v = shippingNo.trim();
  if (v === "" || v === "0") return "무료(0)";
  return v;
}

function availableDateTypeLabel(type: AvailableDateType): string {
  if (type === "normal") {
    return "일반발송 (3영업일)";
  }
  if (type === "prep") {
    return "상품준비일";
  }
  if (type === "release") {
    return "출시일";
  }
  return "당일발송";
}

function formatNameWithCode(name: string, code: string): string {
  const n = dashIfEmptyOrZero(name);
  const c = dashIfEmptyOrZero(code);
  if (n === "-" && c === "-") return "-";
  if (c === "-") return n;
  return `${n} (${c})`;
}

function ProductStatusBadge({
  status,
}: {
  status: Product["status"];
}): React.JSX.Element {
  const isActive = status === "active";
  const label = isActive ? "판매중" : "판매대기";

  if (isActive) {
    return (
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        px={2}
        py={0.5}
        fontSize="xs"
        borderRadius="sm"
        bg="gray.900"
        color="white"
      >
        {label}
      </Box>
    );
  }

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="sm"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="gray.500"
      color="gray.500"
      bg="white"
    >
      {label}
    </Box>
  );
}

function AdultTag({ isAdult }: { isAdult: boolean }): React.JSX.Element {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="full"
      bg="gray.100"
      color="gray.700"
    >
      성인 {isAdult ? "Y" : "N"}
    </Box>
  );
}

function DetailInfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <Flex fontSize="sm" align="flex-start" gap={2}>
      <Text width="120px" flexShrink={0} color="gray.500">
        {label}
      </Text>
      <Box flex="1" color="gray.800">
        {value}
      </Box>
    </Flex>
  );
}

export function ProductDetailModal({
  itemCode,
  sellerCode,
  onClose,
}: ProductDetailModalProps): React.JSX.Element {
  const router = useRouter();
  const isOpen = Boolean(itemCode);

  const { product, isLoading, error, hasApiKey } = useProductDetail(
    itemCode,
    sellerCode,
  );

  const errorMessage = ((): string => {
    if (!error) return "";
    if (error.type === "NO_API_KEY") {
      return "Qoo10 API 키가 없습니다. 채널 설정에서 키를 등록해 주세요.";
    }
    return error.message;
  })();

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
    >
      <DialogBackdrop
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      />
      <DialogPositioner
        alignItems="center"
        justifyContent="center"
        px={{ base: 0, sm: 4 }}
      >
        <DialogContent
          maxW="4xl"
          w="100%"
          maxH="90vh"
          overflow="hidden"
          borderRadius="lg"
        >
          <DialogHeader
            borderBottomWidth="1px"
            borderColor="gray.100"
            pr={12}
            py={4}
            position="relative"
          >
            <Flex align="center" justify="space-between" gap={3} pr={2}>
              <DialogTitle fontSize="md" fontWeight="semibold">
                상품 상세
              </DialogTitle>
              {hasApiKey && itemCode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  borderColor="gray.900"
                  color="gray.900"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                  onClick={() => {
                    const seller = (sellerCode ?? "").trim();
                    const qs = new URLSearchParams();
                    if (seller.length > 0) {
                      qs.set("sellerCode", seller);
                    }
                    const secondSub = product?.category.sub2.code.trim() ?? "";
                    if (secondSub.length > 0) {
                      qs.set("secondSubCat", secondSub);
                    }
                    const query = qs.toString();
                    router.push(
                      query.length > 0
                        ? `/items/${encodeURIComponent(itemCode)}/edit?${query}`
                        : `/items/${encodeURIComponent(itemCode)}/edit`,
                    );
                  }}
                >
                  상품 수정
                </Button>
              ) : null}
            </Flex>

            <DialogCloseTrigger
              aria-label="닫기"
              position="absolute"
              right={3}
              top={3}
              bg="transparent"
              _hover={{ bg: "gray.100" }}
            >
              <X size={16} />
            </DialogCloseTrigger>
          </DialogHeader>

          <DialogBody py={4} overflowY="auto">
            {!hasApiKey && isOpen ? (
              <Flex minH="200px" align="center" justify="center" px={4}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {errorMessage}
                </Text>
              </Flex>
            ) : null}

            {hasApiKey && isOpen && error && !isLoading ? (
              <Flex
                minH="200px"
                align="center"
                justify="center"
                px={4}
                direction="column"
                gap={3}
              >
                <Text fontSize="sm" color="red.600" textAlign="center">
                  {errorMessage}
                </Text>
                {error.type === "NO_API_KEY" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    colorPalette="blue"
                    onClick={() => router.push("/settings/channels")}
                  >
                    채널 설정으로 이동
                  </Button>
                ) : null}
              </Flex>
            ) : null}

            {hasApiKey && isLoading && isOpen ? (
              <Stack gap={4} px={2}>
                <Flex gap={3} align="flex-start">
                  <Skeleton
                    w="88px"
                    h="88px"
                    borderRadius="md"
                    flexShrink={0}
                  />
                  <Stack flex="1" gap={2}>
                    <Skeleton height="20px" width="40%" />
                    <SkeletonText noOfLines={2} rootProps={{ gap: 2 }} />
                  </Stack>
                </Flex>
                <Skeleton height="80px" borderRadius="md" />
                <SkeletonText noOfLines={6} rootProps={{ gap: 3 }} />
              </Stack>
            ) : null}

            {hasApiKey && product && isOpen && !isLoading && !error ? (
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={itemCode ?? "empty"}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Stack gap={4}>
                    {/* 상단 요약 */}
                    <Flex gap={3} align="flex-start">
                      <Box
                        w="88px"
                        h="88px"
                        flexShrink={0}
                        borderRadius="md"
                        overflow="hidden"
                        bg="gray.100"
                      >
                        {product.imageUrl.trim().length > 0 ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            w="100%"
                            h="100%"
                            objectFit="cover"
                          />
                        ) : null}
                      </Box>

                      <Stack flex="1" gap={2} minW={0}>
                        <Flex gap={2} align="center" flexWrap="wrap">
                          <ProductStatusBadge status={product.status} />
                          <AdultTag isAdult={product.isAdult} />
                        </Flex>
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.900"
                        >
                          {dashIfEmptyOrZero(product.title)}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {dashIfEmptyOrZero(product.promotionName)}
                        </Text>
                      </Stack>
                    </Flex>

                    {/* 가격/재고 */}
                    <SimpleGrid
                      columns={3}
                      gap={2}
                      bg="gray.50"
                      p={3}
                      borderRadius="md"
                    >
                      <Stack gap={0.5}>
                        <Text fontSize="xs" color="gray.500">
                          판매가
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.900"
                        >
                          {formatJpyOrDash(product.price)}
                        </Text>
                      </Stack>
                      <Stack gap={0.5}>
                        <Text fontSize="xs" color="gray.500">
                          정산가
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="gray.900"
                        >
                          {formatJpyOrDash(product.settlePrice)}
                        </Text>
                      </Stack>
                      <Stack gap={0.5}>
                        <Text fontSize="xs" color="gray.500">
                          재고
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color={product.qty < 10 ? "red.500" : "gray.900"}
                        >
                          {product.qty.toLocaleString("ja-JP")}
                        </Text>
                      </Stack>
                    </SimpleGrid>

                    {/* 상세 필드 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" />

                    {/* 기본 정보 */}
                    <Stack gap={3}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="gray.500"
                      >
                        기본 정보
                      </Text>
                      <Box
                        display="grid"
                        gridTemplateColumns="repeat(2, 1fr)"
                        gap={4}
                      >
                        <DetailInfoRow
                          label="상품코드"
                          value={dashIfEmptyOrZero(product.id)}
                        />
                        <DetailInfoRow
                          label="판매자코드"
                          value={dashIfEmptyOrZero(product.sellerCode)}
                        />
                        <DetailInfoRow
                          label="상품 상태"
                          value={<ProductStatusBadge status={product.status} />}
                        />
                        <DetailInfoRow
                          label="홍보용 상품명"
                          value={dashIfEmptyOrZero(product.promotionName)}
                        />
                        <DetailInfoRow
                          label="성인 상품"
                          value={product.isAdult ? "Y" : "N"}
                        />
                        <DetailInfoRow
                          label="공급원가(정산가)"
                          value={formatJpyOrDash(product.retailPrice)}
                        />
                      </Box>
                    </Stack>

                    {/* 카테고리 / 원산지 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
                      <Stack gap={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.500"
                        >
                          카테고리 / 원산지
                        </Text>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2, 1fr)"
                          gap={4}
                        >
                          <DetailInfoRow
                            label="메인 카테고리"
                            value={formatNameWithCode(
                              product.category.main.name,
                              product.category.main.code,
                            )}
                          />
                          <DetailInfoRow
                            label="서브 카테고리 1"
                            value={dashIfEmptyOrZero(
                              product.category.sub1.name,
                            )}
                          />
                          <DetailInfoRow
                            label="서브 카테고리 2"
                            value={dashIfEmptyOrZero(
                              product.category.sub2.name,
                            )}
                          />
                          <DetailInfoRow
                            label="원산지 타입"
                            value={product.origin.type}
                          />
                          <DetailInfoRow
                            label="원산지"
                            value={dashIfEmptyOrZero(product.origin.place)}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    {/* 배송 / 발송 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
                      <Stack gap={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.500"
                        >
                          배송 / 발송
                        </Text>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2, 1fr)"
                          gap={4}
                        >
                          <DetailInfoRow
                            label="발송 가능일 유형"
                            value={availableDateTypeLabel(
                              product.availableDate.type,
                            )}
                          />
                          <DetailInfoRow
                            label="발송 가능일 값"
                            value={dashIfEmptyOrZero(
                              product.availableDate.value,
                            )}
                          />
                          <DetailInfoRow
                            label="희망 배송일"
                            value={dashIfEmptyOrZero(
                              product.desiredShippingDate,
                            )}
                          />
                          <DetailInfoRow
                            label="배송비 코드"
                            value={formatShippingNo(product.shippingNo)}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    {/* 판매 기간 / 일정 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
                      <Stack gap={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.500"
                        >
                          판매 기간 / 일정
                        </Text>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2, 1fr)"
                          gap={4}
                        >
                          <DetailInfoRow
                            label="판매 종료일"
                            value={dashIfEmptyOrZero(product.expireDate)}
                          />
                          <DetailInfoRow
                            label="등록일"
                            value={dashIfEmptyOrZero(product.listedDate)}
                          />
                          <DetailInfoRow
                            label="최종 수정일"
                            value={dashIfEmptyOrZero(product.changedDate)}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    {/* 상품 속성 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
                      <Stack gap={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.500"
                        >
                          상품 속성
                        </Text>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2, 1fr)"
                          gap={4}
                        >
                          <DetailInfoRow
                            label="모델번호"
                            value={dashIfEmptyOrZero(product.modelNm)}
                          />
                          <DetailInfoRow
                            label="제조사"
                            value={dashIfEmptyOrZero(product.manufacturerDate)}
                          />
                          <DetailInfoRow
                            label="브랜드 번호"
                            value={dashIfEmptyOrZero(product.brandNo)}
                          />
                          <DetailInfoRow
                            label="소재"
                            value={dashIfEmptyOrZero(product.material)}
                          />
                          <DetailInfoRow
                            label="산업코드 타입"
                            value={dashIfEmptyOrZero(
                              product.industrialCodeType,
                            )}
                          />
                          <DetailInfoRow
                            label="산업코드"
                            value={dashIfEmptyOrZero(product.industrialCode)}
                          />
                          <DetailInfoRow
                            label="소비세율"
                            value={dashIfEmptyOrZero(product.taxRate)}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    {/* 키워드 */}
                    <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
                      <Stack gap={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="gray.500"
                        >
                          키워드
                        </Text>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2, 1fr)"
                          gap={4}
                        >
                          <DetailInfoRow
                            label="키워드"
                            value={
                              product.keyword.length > 0 ? (
                                <Flex gap={1} flexWrap="wrap">
                                  {product.keyword
                                    .filter(
                                      (word) => dashIfEmptyOrZero(word) !== "-",
                                    )
                                    .map((word) => (
                                      <Box
                                        key={word}
                                        as="span"
                                        px={2}
                                        py={0.5}
                                        fontSize="xs"
                                        borderRadius="full"
                                        bg="gray.100"
                                        color="gray.700"
                                      >
                                        {word}
                                      </Box>
                                    ))}
                                </Flex>
                              ) : (
                                "-"
                              )
                            }
                          />
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </MotionDiv>
              </AnimatePresence>
            ) : null}
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
