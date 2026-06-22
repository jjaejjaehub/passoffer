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
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  usePushStockToChannel,
  useListedProduct,
  useSyncProductInfoToChannel,
} from "@/entities/master-product";
import { ROUTES } from "@/shared/config";
import { PageHeader } from "@/shared/ui";
import { appToaster } from "@/shared/ui/app-toaster";

const SYNC_STATUS_COLOR: Record<string, string> = {
  SYNCED: "green",
  PENDING: "orange",
  ERROR: "red",
};

interface Props {
  id: string;
}

export function ListedProductDetailPage({ id }: Props): React.JSX.Element {
  const t = useTranslations("pages.listedProductDetail");
  const router = useRouter();
  const { data: product, isLoading } = useListedProduct(id);
  const { mutateAsync: syncInfo, isPending: isSyncingInfo } =
    useSyncProductInfoToChannel();
  const { mutateAsync: pushStock, isPending: isPushingStock } =
    usePushStockToChannel();

  async function handleSync() {
    try {
      await syncInfo(id);
      await pushStock(id);
      appToaster.success({ title: t("syncSuccess") });
    } catch {
      appToaster.error({ title: t("syncError") });
    }
  }

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
          {t("notFound")}
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
          title={product.title ?? t("fallbackTitle")}
          description={`${product.channelName} · ${product.channelType}`}
        />
        <Button
          size="sm"
          variant="outline"
          borderColor="gray.300"
          onClick={() => router.back()}
          mt={1}
        >
          {t("back")}
        </Button>
      </Flex>

      <Stack gap={6} maxW="640px">
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={5}>
          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={3}>
            {t("sections.basicInfo")}
          </Text>
          <Stack gap={2.5}>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.channelItemCode")}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelItemCode ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.channelSellerCode")}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelSellerCode ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.channel")}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.channelName}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.status")}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.status ?? "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.syncStatus")}
              </Text>
              <Badge
                colorPalette={SYNC_STATUS_COLOR[product.syncStatus] ?? "gray"}
                size="sm"
              >
                {t.has(`syncStatus.${product.syncStatus}`)
                  ? t(`syncStatus.${product.syncStatus}` as "syncStatus.SYNCED")
                  : product.syncStatus}
              </Badge>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.lastSyncedAt")}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                {product.lastSyncedAt
                  ? new Date(product.lastSyncedAt).toLocaleString("ko-KR")
                  : "-"}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                {t("labels.createdAt")}
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
              {t("sections.channelData")}
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
          <Flex justify="flex-end" gap={2}>
            {product.syncStatus === "PENDING" && (
              <Button
                size="sm"
                colorPalette="orange"
                onClick={handleSync}
                loading={isSyncingInfo || isPushingStock}
              >
                <RefreshCw size={14} />
                {t("actions.sync")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              borderColor="gray.300"
              onClick={() =>
                router.push(ROUTES.masterProductEdit(product.masterProductId!))
              }
            >
              {t("actions.editMaster")}
            </Button>
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
