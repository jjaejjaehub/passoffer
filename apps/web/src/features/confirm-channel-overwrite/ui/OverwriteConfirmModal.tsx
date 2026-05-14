"use client";

import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type FieldSpec,
  type ResolveListingResponse,
  useChannelFieldSpecs,
  useChannelProduct,
  useResolveListing,
} from "@/entities/channel";
import { useSyncProductInfoToChannel } from "@/entities/master-product";
import { appToaster } from "@/shared/ui/app-toaster";

interface Props {
  masterProductId: string;
  listedProductId: string;
  channelId: string;
  channelItemCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DiffRow {
  key: string;
  label: string;
  current: unknown;
  next: unknown;
  changed: boolean;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function flattenChannelProduct(
  detail: { title: string; price?: string; images: string[] } | undefined,
): Record<string, unknown> {
  if (!detail) return {};
  return {
    title: detail.title,
    price: detail.price,
    image_url: detail.images?.[0],
  };
}

function buildDiffRows(
  specs: FieldSpec[] | undefined,
  resolved: ResolveListingResponse | undefined,
  current: Record<string, unknown>,
): DiffRow[] {
  if (!resolved) return [];
  const payload = resolved.payload ?? {};
  const labelByKey = new Map<string, string>();
  for (const s of specs ?? []) labelByKey.set(s.key, s.label);
  const allKeys = new Set<string>([
    ...Object.keys(payload),
    ...Object.keys(current),
  ]);
  const rows: DiffRow[] = [];
  for (const key of allKeys) {
    const next = payload[key];
    const cur = current[key];
    const changed = formatValue(next) !== formatValue(cur);
    rows.push({
      key,
      label: labelByKey.get(key) ?? key,
      current: cur,
      next,
      changed,
    });
  }
  rows.sort((a, b) => {
    if (a.changed !== b.changed) return a.changed ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  return rows;
}

export function OverwriteConfirmModal({
  masterProductId,
  listedProductId,
  channelId,
  channelItemCode,
  open,
  onOpenChange,
  onSuccess,
}: Props): React.JSX.Element | null {
  const fieldSpecsQuery = useChannelFieldSpecs(open ? channelId : undefined);
  const channelProductQuery = useChannelProduct(
    channelId,
    channelItemCode ?? "",
    open && !!channelItemCode,
  );
  const resolveMutation = useResolveListing(channelId);
  const syncMutation = useSyncProductInfoToChannel();

  const [resolved, setResolved] = useState<ResolveListingResponse | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setResolved(null);
      setResolveError(null);
      return;
    }
    resolveMutation
      .mutateAsync({ masterProductId })
      .then((res) => setResolved(res))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "미리보기를 불러오지 못했습니다.";
        setResolveError(msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, masterProductId, channelId]);

  const currentFlat = useMemo(
    () => flattenChannelProduct(channelProductQuery.data),
    [channelProductQuery.data],
  );

  const diffRows = useMemo(
    () =>
      buildDiffRows(
        fieldSpecsQuery.data?.specs,
        resolved ?? undefined,
        currentFlat,
      ),
    [fieldSpecsQuery.data, resolved, currentFlat],
  );

  const changedCount = diffRows.filter((r) => r.changed).length;

  const loading =
    fieldSpecsQuery.isLoading ||
    (channelItemCode ? channelProductQuery.isLoading : false) ||
    resolveMutation.isPending ||
    (!resolved && !resolveError);

  const isPending = syncMutation.isPending;

  const handleConfirm = async (): Promise<void> => {
    try {
      const res = await syncMutation.mutateAsync(listedProductId);
      if (res.status === "OK") {
        appToaster.create({
          title: "채널에 덮어쓰기를 완료했습니다.",
          type: "success",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        appToaster.create({
          title: `덮어쓰기 응답: ${res.status}`,
          type: "error",
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "덮어쓰기에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  if (!open) return null;

  const ready = resolved?.ready ?? false;

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
        w={{ base: "92vw", md: "720px" }}
        maxH="85vh"
        overflowY="auto"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              채널 덮어쓰기 확인
            </Text>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              마스터의 변경된 정보를 채널에 그대로 반영합니다.
            </Text>
          </Box>
          <Button
            variant="ghost"
            size="sm"
            p={1}
            onClick={() => !isPending && onOpenChange(false)}
          >
            <X size={16} />
          </Button>
        </Flex>

        {loading ? (
          <Flex justify="center" py={10}>
            <Spinner size="sm" />
          </Flex>
        ) : resolveError ? (
          <Box
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
            borderRadius="md"
            p={3}
            mb={4}
          >
            <Text fontSize="sm" color="red.700">
              {resolveError}
            </Text>
          </Box>
        ) : (
          <Stack gap={3} mb={5}>
            {!ready && resolved?.missing && resolved.missing.length > 0 && (
              <Box
                bg="orange.50"
                borderWidth="1px"
                borderColor="orange.200"
                borderRadius="md"
                p={3}
              >
                <Text
                  fontSize="sm"
                  color="orange.700"
                  fontWeight="medium"
                  mb={1}
                >
                  부족 필드가 있어 덮어쓰기를 실행할 수 없습니다.
                </Text>
                <Text fontSize="xs" color="orange.600">
                  {resolved.missing.map((m) => m.label).join(", ")}
                </Text>
              </Box>
            )}

            <Flex justify="space-between" align="center">
              <Text fontSize="xs" color="gray.500">
                {channelItemCode
                  ? `채널 상품 ID: ${channelItemCode}`
                  : "이 등록물에는 채널 상품 ID가 없어 현재 값을 비교할 수 없습니다."}
              </Text>
              <Text fontSize="xs" color="gray.500">
                변경 {changedCount}개 / 전체 {diffRows.length}개
              </Text>
            </Flex>

            <Box
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              overflow="hidden"
            >
              <Flex
                bg="gray.50"
                px={3}
                py={2}
                fontSize="xs"
                fontWeight="medium"
                color="gray.600"
              >
                <Box flex="1">필드</Box>
                <Box flex="2">현재 채널 값</Box>
                <Box flex="2">변경 후 값</Box>
              </Flex>
              {diffRows.length === 0 ? (
                <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                  비교할 필드가 없습니다.
                </Text>
              ) : (
                diffRows.map((row) => (
                  <Flex
                    key={row.key}
                    px={3}
                    py={2}
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    bg={row.changed ? "yellow.50" : "white"}
                    fontSize="xs"
                    align="flex-start"
                  >
                    <Box flex="1">
                      <Text fontWeight="medium" color="gray.700">
                        {row.label}
                      </Text>
                      <Text color="gray.400" fontSize="2xs">
                        {row.key}
                      </Text>
                    </Box>
                    <Box
                      flex="2"
                      color="gray.500"
                      wordBreak="break-word"
                      pr={2}
                    >
                      {formatValue(row.current)}
                    </Box>
                    <Box
                      flex="2"
                      color={row.changed ? "gray.900" : "gray.500"}
                      fontWeight={row.changed ? "medium" : "normal"}
                      wordBreak="break-word"
                    >
                      {formatValue(row.next)}
                    </Box>
                  </Flex>
                ))
              )}
            </Box>
          </Stack>
        )}

        <Flex justify="flex-end" gap={2}>
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
            onClick={() => void handleConfirm()}
            loading={isPending}
            disabled={loading || !!resolveError || !ready}
          >
            확인 후 덮어쓰기
          </Button>
        </Flex>
      </Box>
    </>
  );
}
