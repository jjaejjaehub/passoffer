'use client';

import type React from 'react';
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
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useShopifyProductDetail } from '@/entities/product';
import type { ShopifyProductDetail } from '@/entities/product';

const MotionDiv = motion.div;

export interface ShopifyProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
}

const SHOPIFY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: '판매',
  DRAFT: '판매중지',
  ARCHIVED: '보관',
};

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const isActive = status === 'ACTIVE';
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="sm"
      bg={isActive ? 'gray.900' : 'transparent'}
      color={isActive ? 'white' : 'gray.600'}
      borderWidth={isActive ? '0' : '1px'}
      borderStyle="dashed"
      borderColor="gray.400"
    >
      {SHOPIFY_STATUS_LABEL[status] ?? status}
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

function extractNumericId(gid: string): string {
  const idx = gid.lastIndexOf('/');
  return idx >= 0 ? gid.slice(idx + 1) : gid;
}

function VariantTable({
  product,
}: {
  product: ShopifyProductDetail;
}): React.JSX.Element {
  const variants = product.variants.nodes;
  if (variants.length === 0) {
    return <Text fontSize="sm" color="gray.400">옵션 정보 없음</Text>;
  }

  const optionNames = product.options.map((o) => o.name);

  return (
    <Box overflowX="auto">
      <Table.Root size="sm" style={{ tableLayout: 'fixed' }} width="100%">
        <Table.Header>
          <Table.Row>
            {optionNames.map((name) => (
              <Table.ColumnHeader key={name} px={3} py={2} width="120px">
                {name}
              </Table.ColumnHeader>
            ))}
            <Table.ColumnHeader px={3} py={2} width="100px">SKU</Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="100px">가격</Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="100px">정상가</Table.ColumnHeader>
            <Table.ColumnHeader px={3} py={2} width="80px">재고</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {variants.map((v) => (
            <Table.Row key={v.id}>
              {optionNames.map((name) => {
                const matched = v.selectedOptions.find((o) => o.name === name);
                return (
                  <Table.Cell key={name} px={3} py={2}>
                    {matched?.value ?? '-'}
                  </Table.Cell>
                );
              })}
              <Table.Cell px={3} py={2} color="gray.500" fontFamily="mono" fontSize="xs">
                {v.sku || '-'}
              </Table.Cell>
              <Table.Cell px={3} py={2} whiteSpace="nowrap">
                {v.price}
              </Table.Cell>
              <Table.Cell px={3} py={2} whiteSpace="nowrap" color="gray.500">
                {v.compareAtPrice ?? '-'}
              </Table.Cell>
              <Table.Cell
                px={3}
                py={2}
                color={v.inventoryQuantity < 10 ? 'red.500' : 'gray.800'}
              >
                {v.inventoryQuantity.toLocaleString()}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function DetailContent({
  product,
}: {
  product: ShopifyProductDetail;
}): React.JSX.Element {
  const variants = product.variants.nodes;
  const isSingleVariant = variants.length <= 1;
  const singleVariant = variants[0];
  const productNumericId = extractNumericId(product.id);
  const mainImage = product.featuredImage?.url ?? product.imageUrl ?? null;
  const mediaImages = product.media.nodes
    .map((n) => n.preview?.image?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

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
          {mainImage ? (
            <Image src={mainImage} alt="" w="100%" h="100%" objectFit="cover" />
          ) : null}
        </Box>

        <Stack flex="1" gap={2} minW={0}>
          <Flex gap={2} align="center" flexWrap="wrap">
            <StatusBadge status={product.status} />
            {product.vendor ? (
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
                {product.vendor}
              </Box>
            ) : null}
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" color="gray.900">
            {product.title}
          </Text>
          {product.productType ? (
            <Text fontSize="xs" color="gray.500">
              {product.productType}
            </Text>
          ) : null}
        </Stack>
      </Flex>

      {/* 가격/재고 (단일 variant) */}
      {isSingleVariant && singleVariant ? (
        <SimpleGrid columns={3} gap={2} bg="gray.50" p={3} borderRadius="md">
          <Stack gap={0.5}>
            <Text fontSize="xs" color="gray.500">가격</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.900">
              {singleVariant.price}
            </Text>
          </Stack>
          <Stack gap={0.5}>
            <Text fontSize="xs" color="gray.500">정상가</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {singleVariant.compareAtPrice ?? '-'}
            </Text>
          </Stack>
          <Stack gap={0.5}>
            <Text fontSize="xs" color="gray.500">재고</Text>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={singleVariant.inventoryQuantity < 10 ? 'red.500' : 'gray.900'}
            >
              {singleVariant.inventoryQuantity.toLocaleString()}
            </Text>
          </Stack>
        </SimpleGrid>
      ) : null}

      <Box borderTopWidth="1px" borderColor="gray.100" />

      {/* 기본 정보 */}
      <Stack gap={3}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500">기본 정보</Text>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={4}>
          <InfoRow label="Product ID" value={productNumericId} />
          <InfoRow label="Handle" value={product.handle || '-'} />
          <InfoRow label="상태" value={<StatusBadge status={product.status} />} />
          <InfoRow label="총 재고" value={product.totalInventory.toLocaleString()} />
          <InfoRow label="제조사" value={product.vendor || '-'} />
          <InfoRow label="상품 유형" value={product.productType || '-'} />
          <InfoRow
            label="태그"
            value={product.tags.length > 0 ? product.tags.join(', ') : '-'}
          />
          {isSingleVariant && singleVariant ? (
            <InfoRow label="SKU" value={singleVariant.sku || '-'} />
          ) : null}
        </Box>
      </Stack>

      {/* Variants (멀티) */}
      {!isSingleVariant ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              옵션 / Variants ({variants.length})
            </Text>
            <VariantTable product={product} />
          </Stack>
        </Box>
      ) : null}

      {/* 이미지 */}
      {mediaImages.length > 0 ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">
              이미지 ({mediaImages.length})
            </Text>
            <Flex gap={2} flexWrap="wrap">
              {mediaImages.map((url, i) => (
                <Box
                  key={url}
                  w="60px"
                  h="60px"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.100"
                  borderWidth={i === 0 ? '2px' : '1px'}
                  borderColor={i === 0 ? 'gray.900' : 'gray.200'}
                >
                  <Image src={url} alt="" w="100%" h="100%" objectFit="cover" />
                </Box>
              ))}
            </Flex>
          </Stack>
        </Box>
      ) : null}

      {/* 설명 */}
      {product.descriptionHtml ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">상품 설명</Text>
            <Box
              fontSize="sm"
              color="gray.800"
              maxH="240px"
              overflowY="auto"
              borderWidth="1px"
              borderColor="gray.100"
              borderRadius="md"
              p={3}
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </Stack>
        </Box>
      ) : null}

      {/* SEO */}
      {product.seo.title || product.seo.description ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={4}>
          <Stack gap={3}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">SEO</Text>
            <Box display="grid" gridTemplateColumns="repeat(1, 1fr)" gap={4}>
              {product.seo.title ? (
                <InfoRow label="SEO 제목" value={product.seo.title} />
              ) : null}
              {product.seo.description ? (
                <InfoRow label="SEO 설명" value={product.seo.description} />
              ) : null}
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}

export function ShopifyProductDetailModal({
  productId,
  onClose,
}: ShopifyProductDetailModalProps): React.JSX.Element {
  const router = useRouter();
  const isOpen = productId !== null;

  const { data: product, isLoading, error } = useShopifyProductDetail(productId);

  const errorMessage = ((): string => {
    if (!error) return '';
    if (error.type === 'NO_API_KEY')
      return 'Shopify API 키가 없습니다. 채널 설정에서 등록해 주세요.';
    if ((error.type as string) === 'NOT_FOUND') return '상품을 찾을 수 없습니다.';
    return error.message;
  })();

  const handleEditClick = (): void => {
    if (!productId) return;
    const numericId = extractNumericId(productId);
    onClose();
    router.push(`/products/${encodeURIComponent(numericId)}/edit`);
  };

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
      <DialogPositioner alignItems="center" justifyContent="center" px={{ base: 0, sm: 4 }}>
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
              {productId && product ? (
                <Button
                  type="button"
                  variant="solid"
                  colorPalette="gray"
                  size="sm"
                  bg="gray.900"
                  color="white"
                  _hover={{ bg: 'gray.800' }}
                  onClick={handleEditClick}
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
              _hover={{ bg: 'gray.100' }}
            >
              <X size={16} />
            </DialogCloseTrigger>
          </DialogHeader>

          <DialogBody py={4} overflowY="auto">
            {/* API 키 없음 */}
            {error?.type === 'NO_API_KEY' && isOpen ? (
              <Flex minH="200px" align="center" justify="center" direction="column" gap={3}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  {errorMessage}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/settings/channels')}
                >
                  채널 설정으로 이동
                </Button>
              </Flex>
            ) : null}

            {/* 에러 */}
            {error && error.type !== 'NO_API_KEY' && isOpen && !isLoading ? (
              <Flex minH="200px" align="center" justify="center" direction="column" gap={3}>
                <Text fontSize="sm" color="red.600" textAlign="center">
                  {errorMessage}
                </Text>
              </Flex>
            ) : null}

            {/* 로딩 */}
            {isLoading && isOpen ? (
              <Stack gap={4} px={2}>
                <Flex gap={3} align="flex-start">
                  <Skeleton w="88px" h="88px" borderRadius="md" flexShrink={0} />
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
            {product && isOpen && !isLoading && !error ? (
              <AnimatePresence mode="wait">
                <MotionDiv
                  key={productId ?? 'empty'}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <DetailContent product={product} />
                </MotionDiv>
              </AnimatePresence>
            ) : null}
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
