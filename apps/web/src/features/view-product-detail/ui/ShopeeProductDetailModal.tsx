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
  Table,
  Text,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useShopeeProductDetail } from "@/entities/product";
import type { ShopeeProductDetailItem } from "@/entities/product";

const MotionDiv = motion.div;

export interface ShopeeProductDetailModalProps {
  itemId: number | null;
  onClose: () => void;
}

const SHOPEE_STATUS_LABEL: Record<string, string> = {
  NORMAL: "판매중",
  UNLIST: "판매중지",
  REVIEWING: "검수중",
  BANNED: "차단",
  SELLER_DELETE: "삭제",
  SHOPEE_DELETE: "쇼피삭제",
};

function formatTimestamp(ts: number): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("ko-KR");
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const isNormal = status === "NORMAL";
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="sm"
      bg={isNormal ? "gray.900" : "transparent"}
      color={isNormal ? "white" : "gray.600"}
      borderWidth={isNormal ? "0" : "1px"}
      borderStyle="dashed"
      borderColor="gray.400"
    >
      {SHOPEE_STATUS_LABEL[status] ?? status}
    </Box>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <Flex fontSize="sm" align="flex-start" gap={2}>
      <Text width="110px" flexShrink={0} color="gray.500">
        {label}
      </Text>
      <Box flex="1" color="gray.800">
        {value}
      </Box>
    </Flex>
  );
}

function ModelTable({
  item,
}: {
  item: ShopeeProductDetailItem;
}): React.JSX.Element {
  const { tierVariations, models } = item;

  if (models.length === 0)
    return (
      <Text fontSize="sm" color="gray.400">
        모델 정보 없음
      </Text>
    );

  const headers = tierVariations.map((tv) => tv.name);

  return (
    <Box overflowX="auto">
      <Table.Root size="sm" style={{ tableLayout: "fixed" }} width="100%">
        <Table.Header>
          <Table.Row>
            {headers.map((h) => (
              <Table.ColumnHeader key={h} px={3} py={2} width="120px">
                {h}
              </Table.ColumnHeader>
            ))}
            <Table.ColumnHeader px={3} py={2} width="80px">
              SKU
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="100px">
              가격
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="70px">
              재고
            </Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="80px">
              상태
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {models.map((model) => (
            <Table.Row key={model.modelId}>
              {model.tierIndex.map((optionIdx, varIdx) => {
                const optionName =
                  tierVariations[varIdx]?.options[optionIdx]?.option ?? "-";
                return (
                  <Table.Cell key={varIdx} px={3} py={2}>
                    {optionName}
                  </Table.Cell>
                );
              })}
              <Table.Cell
                px={3}
                py={2}
                color="gray.500"
                fontFamily="mono"
                fontSize="xs"
              >
                {model.modelSku || "-"}
              </Table.Cell>
              <Table.Cell px={3} py={2} whiteSpace="nowrap">
                {model.price.toLocaleString()} {model.currency}
              </Table.Cell>
              <Table.Cell
                px={3}
                py={2}
                color={model.stock < 10 ? "red.500" : "gray.800"}
              >
                {model.stock.toLocaleString()}
              </Table.Cell>
              <Table.Cell px={3} py={2}>
                <StatusBadge
                  status={
                    model.modelStatus === "MODEL_NORMAL" ? "NORMAL" : "UNLIST"
                  }
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function DetailContent({
  item,
}: {
  item: ShopeeProductDetailItem;
}): React.JSX.Element {
  return (
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
          {item.images[0] ? (
            <Image
              src={item.images[0]}
              alt=""
              w="100%"
              h="100%"
              objectFit="cover"
            />
          ) : null}
        </Box>

        <Stack flex="1" gap={2} minW={0}>
          <Flex gap={2} align="center" flexWrap="wrap">
            <StatusBadge status={item.itemStatus} />
            {item.condition ? (
              <Box
                as="span"
                display="inline-flex"
                alignItems="center"
                px={2}
                py={0.5}
                fontSize="xs"
                borderRadius="sm"
                bg="gray.100"
                color="gray.700"
              >
                {item.condition === "NEW" ? "새 상품" : "중고"}
              </Box>
            ) : null}
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">
            {item.itemName}
          </Text>
          {item.brand ? (
            <Text fontSize="xs" color="gray.500">
              {item.brand.brandName}
            </Text>
          ) : null}
        </Stack>
      </Flex>

      {/* 가격/재고 요약 (has_model=false) */}
      {!item.hasModel ? (
        <SimpleGrid columns={2} gap={2} bg="gray.50" p={3} borderRadius="md">
          <Stack gap={0.5}>
            <Text fontSize="xs" color="gray.500">
              현재 가격
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.900">
              {item.price.toLocaleString()} {item.currency}
            </Text>
          </Stack>
          <Stack gap={0.5}>
            <Text fontSize="xs" color="gray.500">
              재고
            </Text>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={item.stock < 10 ? "red.500" : "gray.900"}
            >
              {item.stock.toLocaleString()}
            </Text>
          </Stack>
        </SimpleGrid>
      ) : null}

      <Box borderTopWidth="1px" borderColor="gray.100" />

      {/* 기본 정보 */}
      <Stack gap={3}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500">
          기본 정보
        </Text>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={4}>
          <InfoRow label="Item ID" value={String(item.itemId)} />
          <InfoRow label="SKU" value={item.itemSku || "-"} />
          <InfoRow label="카테고리 ID" value={String(item.categoryId)} />
          <InfoRow
            label="상태"
            value={<StatusBadge status={item.itemStatus} />}
          />
          <InfoRow label="등록일" value={formatTimestamp(item.createTime)} />
          <InfoRow label="수정일" value={formatTimestamp(item.updateTime)} />
          {item.weight ? (
            <InfoRow label="무게" value={`${item.weight} kg`} />
          ) : null}
          {item.dimension ? (
            <InfoRow
              label="크기 (L×W×H)"
              value={`${item.dimension.length}×${item.dimension.width}×${item.dimension.height} cm`}
            />
          ) : null}
          {item.preOrder?.isPreOrder ? (
            <InfoRow
              label="예약주문"
              value={`발송 ${item.preOrder.daysToShip}일`}
            />
          ) : null}
        </Box>
      </Stack>

      {/* 옵션/모델 */}
      {item.hasModel ? (
        <>
          <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
            <Stack gap={3}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                옵션 / 모델
              </Text>
              <ModelTable item={item} />
            </Stack>
          </Box>
        </>
      ) : null}

      {/* 이미지 목록 */}
      {item.images.length > 1 ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              이미지 ({item.images.length})
            </Text>
            <Flex gap={2} flexWrap="wrap">
              {item.images.map((url, i) => (
                <Box
                  key={url}
                  w="60px"
                  h="60px"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.100"
                  borderWidth={i === 0 ? "2px" : "1px"}
                  borderColor={i === 0 ? "gray.900" : "gray.200"}
                >
                  <Image src={url} alt="" w="100%" h="100%" objectFit="cover" />
                </Box>
              ))}
            </Flex>
          </Stack>
        </Box>
      ) : null}

      {/* 배송 */}
      {item.logistics.length > 0 ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              배송
            </Text>
            <Stack gap={2}>
              {item.logistics.map((l) => (
                <Flex key={l.logisticId} justify="space-between" fontSize="sm">
                  <Text color="gray.700">{l.logisticName}</Text>
                  <Text color={l.isFree ? "green.600" : "gray.800"}>
                    {l.isFree
                      ? "무료"
                      : `예상 ${l.estimatedShippingFee.toLocaleString()}`}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </Stack>
        </Box>
      ) : null}

      {/* 속성 */}
      {item.attributes.length > 0 ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              상품 속성
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={4}>
              {item.attributes.map((attr) => (
                <InfoRow
                  key={attr.attributeId}
                  label={attr.attributeName}
                  value={
                    attr.values.length > 0
                      ? attr.values
                          .map((v) =>
                            v.valueUnit
                              ? `${v.valueName} ${v.valueUnit}`
                              : v.valueName,
                          )
                          .join(", ")
                      : "-"
                  }
                />
              ))}
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}

export function ShopeeProductDetailModal({
  itemId,
  onClose,
}: ShopeeProductDetailModalProps): React.JSX.Element {
  const router = useRouter();
  const isOpen = itemId !== null;

  const { item, isLoading, error, hasApiKey } = useShopeeProductDetail(itemId);

  const errorMessage = ((): string => {
    if (!error) return "";
    if (error.type === "NO_API_KEY")
      return "Shopee API 키가 없습니다. 채널 설정에서 등록해 주세요.";
    if (error.type === "NOT_FOUND") return "상품을 찾을 수 없습니다.";
    return error.message;
  })();

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <DialogBackdrop
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
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
                Shopee 상품 상세
              </DialogTitle>
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
            {/* API 키 없음 */}
            {!hasApiKey && isOpen ? (
              <Flex
                minH="200px"
                align="center"
                justify="center"
                direction="column"
                gap={3}
              >
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {errorMessage || "Shopee API 키가 없습니다."}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/settings/channels")}
                >
                  채널 설정으로 이동
                </Button>
              </Flex>
            ) : null}

            {/* 에러 */}
            {hasApiKey && isOpen && error && !isLoading ? (
              <Flex
                minH="200px"
                align="center"
                justify="center"
                direction="column"
                gap={3}
              >
                <Text fontSize="sm" color="red.600" textAlign="center">
                  {errorMessage}
                </Text>
              </Flex>
            ) : null}

            {/* 로딩 */}
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

            {/* 내용 */}
            {hasApiKey && item && isOpen && !isLoading && !error ? (
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={itemId ?? "empty"}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <DetailContent item={item} />
                </MotionDiv>
              </AnimatePresence>
            ) : null}
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
