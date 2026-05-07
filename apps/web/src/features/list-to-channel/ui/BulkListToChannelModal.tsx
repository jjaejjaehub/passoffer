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
import { CheckCircle, XCircle, X, Loader } from "lucide-react";
import { useState } from "react";
import {
  useChannels,
  usePlatformConstraints,
  type ChannelRecord,
  type ChannelRequiredField,
} from "@/entities/channel";
import { http } from "@/shared/api";
import type { MasterProduct } from "@/entities/master-product";

interface Props {
  products: MasterProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ProductStatus = "pending" | "running" | "success" | "error";

interface ProductResult {
  id: string;
  title: string;
  status: ProductStatus;
  error?: string;
}

export function BulkListToChannelModal({ products, open, onOpenChange, onSuccess }: Props): React.JSX.Element | null {
  const { data: channels, isLoading: loadingChannels } = useChannels();
  const { data: platformData } = usePlatformConstraints();

  const [selectedChannel, setSelectedChannel] = useState<ChannelRecord | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ProductResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!open) return null;

  const requiredFields: ChannelRequiredField[] =
    selectedChannel && platformData
      ? (platformData.requiredFields[selectedChannel.channelType] ?? [])
      : [];

  const handleChannelSelect = (ch: ChannelRecord): void => {
    setSelectedChannel(ch);
    setOverrides({});
    setResults(null);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedChannel || products.length === 0) return;

    const parsedOverrides: Record<string, unknown> = {};
    for (const field of requiredFields) {
      const raw = overrides[field.key];
      if (raw !== undefined && raw !== "") {
        parsedOverrides[field.key] = field.type === "number" ? Number(raw) : raw;
      }
    }

    const initial: ProductResult[] = products.map((p) => ({
      id: p.id,
      title: p.title,
      status: "pending",
    }));
    setResults(initial);
    setIsRunning(true);

    const updated = [...initial];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      updated[i] = { ...updated[i], status: "running" };
      setResults([...updated]);

      try {
        // Merge product-level saved attributes with modal overrides
        const productAttrs = (p.attributes as Record<string, unknown>)?.[selectedChannel.channelType.toLowerCase()] ?? {};
        const mergedOverrides: Record<string, unknown> = {
          ...(productAttrs as Record<string, unknown>),
          ...parsedOverrides,
        };

        await http.post<void>(`/api/master-products/${p.id}/list`, {
          channelId: selectedChannel.id,
          overrides: mergedOverrides,
        });
        updated[i] = { ...updated[i], status: "success" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "등록 실패";
        updated[i] = { ...updated[i], status: "error", error: msg };
      }

      setResults([...updated]);
    }

    setIsRunning(false);
    onSuccess?.();
  };

  const isDone = results !== null && !isRunning;
  const successCount = results?.filter((r) => r.status === "success").length ?? 0;
  const errorCount = results?.filter((r) => r.status === "error").length ?? 0;

  const handleClose = (): void => {
    if (isRunning) return;
    onOpenChange(false);
    setSelectedChannel(null);
    setOverrides({});
    setResults(null);
  };

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={1000}
        onClick={handleClose}
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
        w={{ base: "90vw", md: "520px" }}
        maxH="85vh"
        overflowY="auto"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={5}>
          <Box>
            <Text fontWeight="semibold" fontSize="md">채널 일괄 등록</Text>
            <Text fontSize="xs" color="gray.500" mt={0.5}>{products.length}개 상품 선택됨</Text>
          </Box>
          <Button variant="ghost" size="sm" p={1} onClick={handleClose} disabled={isRunning}>
            <X size={16} />
          </Button>
        </Flex>

        {/* 진행 결과 표시 */}
        {results !== null ? (
          <Box>
            {isDone && (
              <Box mb={4} p={3} borderRadius="md" bg={errorCount === 0 ? "green.50" : "orange.50"} borderWidth="1px" borderColor={errorCount === 0 ? "green.200" : "orange.200"}>
                <Text fontSize="sm" fontWeight="medium" color={errorCount === 0 ? "green.700" : "orange.700"}>
                  완료: 성공 {successCount}개{errorCount > 0 ? `, 실패 ${errorCount}개` : ""}
                </Text>
              </Box>
            )}
            <Stack gap={1.5} mb={5}>
              {results.map((r) => (
                <Flex key={r.id} align="flex-start" gap={2} px={3} py={2} borderRadius="md" bg="gray.50">
                  <Box pt={0.5} flexShrink={0}>
                    {r.status === "pending" && <Box w={4} h={4} borderRadius="full" bg="gray.300" />}
                    {r.status === "running" && <Spinner size="xs" color="blue.500" />}
                    {r.status === "success" && <CheckCircle size={16} color="var(--chakra-colors-green-500)" />}
                    {r.status === "error" && <XCircle size={16} color="var(--chakra-colors-red-500)" />}
                  </Box>
                  <Box flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="medium" truncate>{r.title}</Text>
                    {r.error && (
                      <Text fontSize="xs" color="red.600" mt={0.5} whiteSpace="pre-wrap" wordBreak="break-word">{r.error}</Text>
                    )}
                  </Box>
                </Flex>
              ))}
            </Stack>

            {isDone && (
              <Flex justify="flex-end">
                <Button size="sm" bg="gray.900" color="white" _hover={{ bg: "gray.800" }} onClick={handleClose}>
                  닫기
                </Button>
              </Flex>
            )}
          </Box>
        ) : (
          <>
            {/* Step 1: 채널 선택 */}
            <Box mb={5}>
              <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>1. 채널 선택</Text>
              {loadingChannels ? (
                <Flex justify="center" py={4}><Spinner size="sm" /></Flex>
              ) : !channels?.length ? (
                <Text fontSize="sm" color="gray.500">연결된 채널이 없습니다.</Text>
              ) : (
                <Stack gap={2}>
                  {channels.map((ch) => (
                    <Box
                      key={ch.id}
                      borderWidth="1px"
                      borderRadius="md"
                      px={3}
                      py={2.5}
                      cursor="pointer"
                      borderColor={selectedChannel?.id === ch.id ? "gray.800" : "gray.200"}
                      bg={selectedChannel?.id === ch.id ? "gray.50" : "white"}
                      onClick={() => handleChannelSelect(ch)}
                      _hover={{ borderColor: "gray.400" }}
                      transition="all 0.1s"
                    >
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontSize="sm" fontWeight="medium">{ch.name}</Text>
                          <Text fontSize="xs" color="gray.500">{ch.channelType}</Text>
                        </Box>
                        <Box w={2} h={2} borderRadius="full" bg={ch.status === "ACTIVE" ? "green.400" : "gray.300"} />
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Step 2: 채널 전용 필드 */}
            {selectedChannel && requiredFields.length > 0 && (
              <Box mb={5}>
                <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1}>2. 채널 전용 정보 입력</Text>
                <Text fontSize="xs" color="gray.400" mb={3}>각 상품에 저장된 값이 있으면 자동 적용됩니다. 여기서 입력하면 전체 선택 상품에 덮어씁니다.</Text>
                <Stack gap={3}>
                  {requiredFields.map((field) => (
                    <Box key={field.key}>
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        {field.label}
                        {field.note && <Text as="span" color="gray.400" ml={1.5} fontSize="xs">({field.note})</Text>}
                      </Text>
                      {field.type === "select" && field.options ? (
                        <NativeSelect.Root size="sm">
                          <NativeSelect.Field
                            value={String(overrides[field.key] ?? "")}
                            onChange={(e) => setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            borderColor="gray.200"
                          >
                            <option value="">각 상품 저장값 사용</option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      ) : (
                        <Input
                          size="sm"
                          type={field.type === "number" ? "number" : "text"}
                          placeholder="각 상품 저장값 사용"
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

            {/* 플랫폼 제약 안내 */}
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

            {/* 선택 상품 미리보기 */}
            <Box mb={5}>
              <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>선택된 상품</Text>
              <Stack gap={1}>
                {products.map((p) => (
                  <Flex key={p.id} align="center" gap={2} px={2.5} py={1.5} bg="gray.50" borderRadius="md">
                    <Box w={1.5} h={1.5} borderRadius="full" bg="gray.400" flexShrink={0} />
                    <Text fontSize="xs" color="gray.700" truncate>{p.title}</Text>
                  </Flex>
                ))}
              </Stack>
            </Box>

            <Flex justify="flex-end" gap={2}>
              <Button size="sm" variant="outline" borderColor="gray.300" onClick={handleClose}>
                취소
              </Button>
              <Button
                size="sm"
                bg="gray.900"
                color="white"
                _hover={{ bg: "gray.800" }}
                onClick={() => void handleSubmit()}
                disabled={!selectedChannel}
              >
                {products.length}개 일괄 등록
              </Button>
            </Flex>
          </>
        )}
      </Box>
    </>
  );
}
