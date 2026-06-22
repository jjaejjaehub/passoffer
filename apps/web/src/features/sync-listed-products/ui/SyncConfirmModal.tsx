"use client";

import { Box, Button, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSyncProductInfoToChannel } from "@/entities/master-product";
import { appToaster } from "@/shared/ui/app-toaster";

interface LinkedProduct {
  id: string;
  title?: string;
  channelName: string;
  channelType: string;
}

interface Props {
  open: boolean;
  linkedProducts: LinkedProduct[];
  onClose: () => void;
}

export function SyncConfirmModal({
  open,
  linkedProducts,
  onClose,
}: Props): React.JSX.Element | null {
  const { mutateAsync: sync, isPending } = useSyncProductInfoToChannel();
  const [synced, setSynced] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());

  if (!open) return null;

  const handleSyncAll = async (): Promise<void> => {
    const results = await Promise.allSettled(
      linkedProducts.map(async (p) => {
        try {
          await sync(p.id);
          setSynced((prev) => new Set([...prev, p.id]));
        } catch {
          setFailed((prev) => new Set([...prev, p.id]));
          throw new Error(p.id);
        }
      }),
    );

    const failCount = results.filter((r) => r.status === "rejected").length;
    if (failCount === 0) {
      appToaster.create({
        title: `${linkedProducts.length}개 채널 동기화 완료`,
        type: "success",
      });
      onClose();
    } else {
      appToaster.create({
        title: `${failCount}개 채널 동기화 실패`,
        type: "error",
      });
    }
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={() => !isPending && onClose()}
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
        w={{ base: "90vw", md: "440px" }}
        p={6}
      >
        <Text fontWeight="semibold" fontSize="md" mb={1}>
          판매상품 동기화
        </Text>
        <Text fontSize="sm" color="gray.500" mb={5}>
          마스터 상품이 수정되었습니다. 연결된 판매상품 {linkedProducts.length}
          개를 지금 동기화하시겠습니까?
        </Text>

        <Stack gap={2} mb={5}>
          {linkedProducts.map((p) => (
            <Flex
              key={p.id}
              align="center"
              justify="space-between"
              borderWidth="1px"
              borderColor={
                failed.has(p.id)
                  ? "red.200"
                  : synced.has(p.id)
                    ? "green.200"
                    : "gray.200"
              }
              borderRadius="md"
              px={3}
              py={2}
            >
              <Box>
                <Text fontSize="sm" fontWeight="medium">
                  {p.title ?? "제목 없음"}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {p.channelName} · {p.channelType}
                </Text>
              </Box>
              {synced.has(p.id) && (
                <Text fontSize="xs" color="green.500">
                  완료
                </Text>
              )}
              {failed.has(p.id) && (
                <Text fontSize="xs" color="red.500">
                  실패
                </Text>
              )}
            </Flex>
          ))}
        </Stack>

        <Flex justify="flex-end" gap={2}>
          <Button
            size="sm"
            variant="outline"
            borderColor="gray.300"
            onClick={onClose}
            disabled={isPending}
          >
            나중에 하기
          </Button>
          <Button
            size="sm"
            bg="gray.900"
            color="white"
            _hover={{ bg: "gray.800" }}
            onClick={() => void handleSyncAll()}
            loading={isPending}
          >
            <RefreshCw size={14} />
            지금 동기화
          </Button>
        </Flex>
      </Box>
    </>
  );
}
