"use client";

import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChannelProductVariant } from "@/entities/channel";
import {
  SkuPickerCell,
  useListedProductSkuMappings,
  useReplaceListedProductSkus,
  type AttachedSkuRef,
} from "@/entities/sku";
import type { ListedProductSkuRow } from "@/entities/sku";
import { appToaster } from "@/shared/ui/app-toaster";

interface Props {
  listedProductId: string;
  channelVariants: ChannelProductVariant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type VariantRowState = Record<string, AttachedSkuRef[]>;

export function SkuMappingModal({
  listedProductId,
  channelVariants,
  open,
  onOpenChange,
  onSuccess,
}: Props): React.JSX.Element | null {
  const { data: mappings, isLoading } = useListedProductSkuMappings(listedProductId);
  const { mutateAsync: replaceMappings, isPending } = useReplaceListedProductSkus(listedProductId);
  const [rows, setRows] = useState<VariantRowState>({});

  useEffect(() => {
    if (!open) return;
    if (!mappings) return;
    const next: VariantRowState = {};
    for (const v of channelVariants) {
      next[v.channelVariantId] = [];
    }
    for (const m of mappings) {
      const arr = next[m.channelVariantId] ?? [];
      arr.push({ skuId: m.skuId, code: m.skuCode, qty: m.qty });
      next[m.channelVariantId] = arr;
    }
    setRows(next);
  }, [open, mappings, channelVariants]);

  if (!open) return null;

  const handleSubmit = async (): Promise<void> => {
    const payloadRows: ListedProductSkuRow[] = [];
    for (const v of channelVariants) {
      const attached = rows[v.channelVariantId] ?? [];
      for (const s of attached) {
        payloadRows.push({
          channelVariantId: v.channelVariantId,
          channelSellerCode: v.optionCode,
          skuId: s.skuId,
          qty: s.qty,
        });
      }
    }
    try {
      await replaceMappings(payloadRows);
      appToaster.create({ title: "SKU 매핑 저장 완료", type: "success" });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "SKU 매핑 저장에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => !isPending && onOpenChange(false)}
      />
      <Box
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={1001}
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        w={{ base: "92vw", md: "640px" }}
        maxH="85vh"
        overflowY="auto"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={5}>
          <Text fontWeight="semibold" fontSize="md">SKU 매핑</Text>
          <Button
            variant="ghost"
            size="sm"
            p={1}
            onClick={() => !isPending && onOpenChange(false)}
          >
            <X size={16} />
          </Button>
        </Flex>

        <Text fontSize="xs" color="gray.500" mb={3}>
          채널 옵션마다 매핑할 SKU를 선택하세요. 한 옵션에 여러 SKU(번들)도 가능합니다.
        </Text>

        {isLoading ? (
          <Flex justify="center" py={8}><Spinner size="md" /></Flex>
        ) : channelVariants.length === 0 ? (
          <Text fontSize="sm" color="gray.500" py={4}>채널 옵션이 없습니다.</Text>
        ) : (
          <Stack gap={3}>
            {channelVariants.map((v) => {
              const attached = rows[v.channelVariantId] ?? [];
              return (
                <Box
                  key={v.channelVariantId}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={3}
                >
                  <Stack gap={1} mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      {v.optionName || v.optionValue || v.optionCode || v.channelVariantId}
                    </Text>
                    <Flex gap={2} fontSize="xs" color="gray.500">
                      {v.optionCode && <Text>코드: {v.optionCode}</Text>}
                      {typeof v.stock === "number" && <Text>채널재고: {v.stock}</Text>}
                    </Flex>
                  </Stack>
                  <SkuPickerCell
                    attached={attached}
                    onChange={(next) =>
                      setRows((prev) => ({ ...prev, [v.channelVariantId]: next }))
                    }
                    placeholder="이 옵션에 매핑할 SKU 검색"
                  />
                </Box>
              );
            })}
          </Stack>
        )}

        <Flex justify="flex-end" gap={2} mt={6}>
          <Button
            size="sm"
            variant="outline"
            borderColor="gray.300"
            onClick={() => !isPending && onOpenChange(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={() => void handleSubmit()}
            loading={isPending}
          >
            저장
          </Button>
        </Flex>
      </Box>
    </>
  );
}
