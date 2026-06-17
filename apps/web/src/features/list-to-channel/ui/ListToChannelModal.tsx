"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { useState } from "react";
import {
  useChannels,
  usePlatformConstraints,
  type ChannelRecord,
  type ChannelRequiredField,
} from "@/entities/channel";
import { useListToChannel, type MasterProductVariant } from "@/entities/master-product";
import { appToaster } from "@/shared/ui/app-toaster";

interface ListedProduct {
  channelId: string;
  channelType: string;
}

interface Props {
  masterProductId: string;
  variants?: MasterProductVariant[];
  listedProducts?: ListedProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ListToChannelModal({ masterProductId, variants = [], listedProducts = [], open, onOpenChange, onSuccess }: Props): React.JSX.Element | null {
  const { data: channels, isLoading: loadingChannels } = useChannels();
  const { data: platformData } = usePlatformConstraints();
  const { mutateAsync: listToChannel, isPending } = useListToChannel(masterProductId);

  const [selectedChannel, setSelectedChannel] = useState<ChannelRecord | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  if (!open) return null;

  const totalStock = variants.reduce((sum, v) => {
    const attached = v.attachedSkus ?? [];
    const available =
      attached.length === 0
        ? 0
        : Math.min(...attached.map((s) => Math.floor((s.stock ?? 0) / Math.max(1, s.qty))));
    return sum + available;
  }, 0);
  const firstPrice = variants[0]?.price ?? '';
  const listedChannelIds = new Set(listedProducts.map((lp) => lp.channelId));

  const handleChannelSelect = (ch: ChannelRecord): void => {
    setSelectedChannel(ch);
    const defaults: Record<string, string> = {};
    if (ch.channelType === 'QOO10_JP') {
      if (totalStock > 0) defaults['ItemQty'] = String(totalStock);
      if (firstPrice) defaults['ItemPrice'] = String(Math.round(Number(firstPrice)));
    }
    setOverrides(defaults);
  };

  const requiredFields: ChannelRequiredField[] =
    selectedChannel && platformData
      ? (platformData.requiredFields[selectedChannel.channelType] ?? [])
      : [];

  const handleSubmit = async (): Promise<void> => {
    if (!selectedChannel) return;

    const parsedOverrides: Record<string, unknown> = {};
    for (const field of requiredFields) {
      const raw = overrides[field.key];
      if (raw !== undefined && raw !== "") {
        parsedOverrides[field.key] = field.type === "number" ? Number(raw) : raw;
      }
    }

    try {
      await listToChannel({ channelId: selectedChannel.id, overrides: parsedOverrides });
      appToaster.create({ title: "채널 등록 완료", type: "success" });
      onOpenChange(false);
      setSelectedChannel(null);
      setOverrides({});
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "채널 등록에 실패했습니다.";
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
        w={{ base: "90vw", md: "480px" }}
        maxH="80vh"
        overflowY="auto"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={5}>
          <Text fontWeight="semibold" fontSize="md">채널 등록</Text>
          <Button
            variant="ghost"
            size="sm"
            p={1}
            onClick={() => !isPending && onOpenChange(false)}
          >
            <X size={16} />
          </Button>
        </Flex>

        {/* Step 1: 채널 선택 */}
        <Box mb={5}>
          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>1. 채널 선택</Text>
          {loadingChannels ? (
            <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
          ) : !channels?.length ? (
            <Text fontSize="sm" color="gray.500">연결된 채널이 없습니다. 채널 설정 페이지에서 먼저 채널을 연결해 주세요.</Text>
          ) : (
            <Stack gap={2}>
              {channels.map((ch) => {
                const alreadyListed = listedChannelIds.has(ch.id);
                return (
                  <Box
                    key={ch.id}
                    borderWidth="1px"
                    borderRadius="md"
                    px={3}
                    py={2.5}
                    cursor={alreadyListed ? "not-allowed" : "pointer"}
                    borderColor={
                      alreadyListed
                        ? "gray.200"
                        : selectedChannel?.id === ch.id
                          ? "gray.800"
                          : "gray.200"
                    }
                    bg={
                      alreadyListed
                        ? "gray.50"
                        : selectedChannel?.id === ch.id
                          ? "gray.50"
                          : "white"
                    }
                    opacity={alreadyListed ? 0.6 : 1}
                    onClick={() => !alreadyListed && handleChannelSelect(ch)}
                    _hover={alreadyListed ? undefined : { borderColor: "gray.400" }}
                    transition="all 0.1s"
                  >
                    <Flex justify="space-between" align="center">
                      <Box>
                        <Flex align="center" gap={2}>
                          <Text fontSize="sm" fontWeight="medium">{ch.name}</Text>
                          {alreadyListed && (
                            <Text fontSize="xs" color="green.600" fontWeight="medium" bg="green.50" px={1.5} py={0.5} borderRadius="sm">
                              등록됨
                            </Text>
                          )}
                        </Flex>
                        <Text fontSize="xs" color="gray.500">{ch.channelType}</Text>
                      </Box>
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={ch.status === "ACTIVE" ? "green.400" : "gray.300"}
                      />
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* Step 2: 채널 전용 필드 */}
        {selectedChannel && requiredFields.length > 0 && (
          <Box mb={5}>
            <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={3}>2. 채널 전용 정보 입력</Text>
            <Stack gap={3}>
              {requiredFields.map((field) => (
                <Box key={field.key}>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {field.label}
                    {field.note && (
                      <Text as="span" color="gray.400" ml={1.5} fontSize="xs">({field.note})</Text>
                    )}
                  </Text>
                  {field.type === "select" && field.options ? (
                    <NativeSelect.Root size="sm">
                      <NativeSelect.Field
                        value={String(overrides[field.key] ?? "")}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        borderColor="gray.200"
                      >
                        <option value="">선택안함</option>
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  ) : field.conditionalOptions &&
                    field.conditionalOptions.values.includes(
                      String(overrides[field.conditionalOptions.dependsOn] ?? "")
                    ) ? (
                    <NativeSelect.Root size="sm">
                      <NativeSelect.Field
                        value={String(overrides[field.key] ?? "")}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        borderColor="gray.200"
                      >
                        <option value="">선택안함</option>
                        {field.conditionalOptions.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  ) : (
                    <Input
                      size="sm"
                      type={field.type === "number" ? "number" : "text"}
                      value={overrides[field.key] ?? ""}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      borderColor="gray.200"
                    />
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* 제약 조건 안내 */}
        {selectedChannel && platformData?.constraints[selectedChannel.channelType] && (
          <Box mb={5} bg="amber.50" borderWidth="1px" borderColor="amber.200" borderRadius="md" p={3}>
            <Text fontSize="xs" fontWeight="medium" color="amber.700" mb={1.5}>플랫폼 제약 안내</Text>
            {(() => {
              const c = platformData.constraints[selectedChannel.channelType];
              const notes: string[] = [];
              if (c.title.maxLength) notes.push(`상품명 최대 ${c.title.maxLength}자`);
              if (c.title.forbiddenChars?.length) notes.push(`상품명 사용 불가 문자: ${c.title.forbiddenChars.join(" ")}`);
              if (c.images.maxCount) notes.push(`이미지 최대 ${c.images.maxCount}장`);
              if (c.title.note) notes.push(c.title.note);
              if (c.images.note) notes.push(c.images.note);
              return notes.map((note, i) => (
                <Text key={i} fontSize="xs" color="amber.700">• {note}</Text>
              ));
            })()}
          </Box>
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
            onClick={() => void handleSubmit()}
            loading={isPending}
            disabled={!selectedChannel}
          >
            등록
          </Button>
        </Flex>
      </Box>
    </>
  );
}
