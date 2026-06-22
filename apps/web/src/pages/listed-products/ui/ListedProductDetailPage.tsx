"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useListedProduct } from "@/entities/master-product";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";

const SYNC_STATUS_LABEL: Record<string, string> = {
  SYNCED: "동기화됨",
  PENDING: "대기중",
  FAILED: "실패",
};

const SYNC_STATUS_COLOR: Record<string, string> = {
  SYNCED: "green",
  PENDING: "orange",
  FAILED: "red",
};

interface Props {
  id: string;
}

export function ListedProductDetailPage({ id }: Props): React.JSX.Element {
  const router = useRouter();
  const { data: product, isLoading } = useListedProduct(id);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <Spinner />
      </Box>
    );
  }

  if (!product) {
    return (
      <Box py={10} textAlign="center">
        <Text color="gray.500" fontSize="sm">
          판매상품을 찾을 수 없습니다.
        </Text>
      </Box>
    );
  }

  const channelDataEntries = product.channelData
    ? Object.entries(product.channelData)
    : [];

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Flex align="flex-start" justify="space-between" mb={6}>
        <PageHeader
          title={product.title ?? "판매상품 상세"}
          description={`${product.channelName} · ${product.channelType}`}
        />
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => router.back()}
          mt={1}
        >
          뒤로
        </Button>
      </Flex>

      <Stack gap={6} maxW="640px">
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={5}>
          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={3}>
            기본 정보
          </Text>
          <Stack gap={2.5}>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                채널 상품 코드
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelItemCode ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                판매자 코드
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelSellerCode ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                채널
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelName}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                상태
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.status ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                동기화 상태
              </Text>
              <Badge
                colorPalette={SYNC_STATUS_COLOR[product.syncStatus] ?? "gray"}
                size="sm"
              >
                {SYNC_STATUS_LABEL[product.syncStatus] ?? product.syncStatus}
              </Badge>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                마지막 동기화
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.lastSyncedAt
                  ? new Date(product.lastSyncedAt).toLocaleString("ko-KR")
                  : "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                등록일
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {new Date(product.createdAt).toLocaleDateString("ko-KR")}
              </Text>
            </Flex>
          </Stack>
        </Box>

        {channelDataEntries.length > 0 && (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={5}>
            <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={3}>
              채널 등록 데이터
            </Text>
            <Stack gap={2}>
              {channelDataEntries.map(([key, value]) => (
                <Flex
                  key={key}
                  justify="space-between"
                  align="flex-start"
                  gap={4}
                >
                  <Text fontSize="sm" color="gray.600" flexShrink={0}>
                    {key}
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    textAlign="right"
                    wordBreak="break-all"
                    maxW="360px"
                  >
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value ?? "-")}
                  </Text>
                </Flex>
              ))}
            </Stack>
          </Box>
        )}

        {product.masterProductId && (
          <Flex justify="flex-end">
            <Button
              size="sm"
              variant="outline"
              borderColor="gray.300"
              onClick={() =>
                router.push(ROUTES.masterProductEdit(product.masterProductId!))
              }
            >
              마스터 상품 편집
            </Button>
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
