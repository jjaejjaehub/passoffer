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
  Textarea,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type MissingField,
  useChannelOverrides,
  useUpsertChannelOverrides,
  useValidateListing,
} from "@/entities/channel";
import { appToaster } from "@/shared/ui/app-toaster";

interface Props {
  masterProductId: string;
  channelId: string;
  variantId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function coerceValue(field: MissingField, raw: string): unknown {
  if (raw === "") return undefined;
  if (field.type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

export function MissingFieldsModal({
  masterProductId,
  channelId,
  variantId,
  open,
  onOpenChange,
  onSuccess,
}: Props): React.JSX.Element | null {
  const overridesQuery = useChannelOverrides(
    open ? masterProductId : undefined,
    open ? channelId : undefined,
  );
  const validateMutation = useValidateListing(channelId);
  const upsertMutation = useUpsertChannelOverrides(masterProductId, channelId);

  const [missing, setMissing] = useState<MissingField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!open) {
      setMissing([]);
      setValues({});
      setValidateError(null);
      setValidated(false);
      return;
    }
    if (overridesQuery.isLoading) return;
    if (validated) return;

    const stored = overridesQuery.data?.overrides ?? {};
    validateMutation
      .mutateAsync({ masterProductId, variantId, overrides: stored })
      .then((res) => {
        setMissing(res.missing);
        setValidated(true);
        const seed: Record<string, string> = {};
        for (const f of res.missing) {
          const existing = stored[f.key];
          if (existing !== undefined && existing !== null)
            seed[f.key] = String(existing);
        }
        setValues(seed);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "검증에 실패했습니다.";
        setValidateError(msg);
      });
  }, [
    open,
    overridesQuery.isLoading,
    overridesQuery.data,
    validated,
    masterProductId,
    variantId,
    validateMutation,
  ]);

  const isPending = upsertMutation.isPending || validateMutation.isPending;

  const requiredKeys = useMemo(
    () => new Set(missing.map((f) => f.key)),
    [missing],
  );

  const allFilled = missing.every((f) => {
    const raw = values[f.key];
    return raw !== undefined && raw.trim() !== "";
  });

  const handleSubmit = async (): Promise<void> => {
    if (!allFilled) {
      appToaster.create({ title: "모든 필드를 입력해 주세요.", type: "error" });
      return;
    }
    try {
      const stored = overridesQuery.data?.overrides ?? {};
      const next: Record<string, unknown> = { ...stored };
      for (const f of missing) {
        if (!requiredKeys.has(f.key)) continue;
        const v = coerceValue(f, values[f.key] ?? "");
        if (v !== undefined) next[f.key] = v;
      }
      await upsertMutation.mutateAsync(next);

      const res = await validateMutation.mutateAsync({
        masterProductId,
        variantId,
        overrides: next,
      });
      if (!res.valid) {
        setMissing(res.missing);
        appToaster.create({
          title: "아직 입력되지 않은 필드가 있습니다.",
          type: "error",
        });
        return;
      }
      appToaster.create({
        title: "필드 정보가 저장되었습니다.",
        type: "success",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      appToaster.create({ title: msg, type: "error" });
    }
  };

  if (!open) return null;

  const loading = overridesQuery.isLoading || (!validated && !validateError);

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
        w={{ base: "90vw", md: "520px" }}
        maxH="80vh"
        overflowY="auto"
        p={6}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Text fontWeight="semibold" fontSize="md">
              부족 필드 입력
            </Text>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              채널 등록에 필요한 필수 정보를 입력해 주세요.
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
          <Flex justify="center" py={8}>
            <Spinner size="sm" />
          </Flex>
        ) : validateError ? (
          <Box
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
            borderRadius="md"
            p={3}
          >
            <Text fontSize="sm" color="red.700">
              {validateError}
            </Text>
          </Box>
        ) : missing.length === 0 ? (
          <Box
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
            borderRadius="md"
            p={3}
            mb={4}
          >
            <Text fontSize="sm" color="green.700">
              필수 필드가 모두 채워져 있습니다.
            </Text>
          </Box>
        ) : (
          <Stack gap={3} mb={5}>
            {missing.map((field) => (
              <Box key={field.key}>
                <Text fontSize="xs" color="gray.700" mb={1}>
                  {field.label}
                  <Text as="span" color="red.500" ml={1}>
                    *
                  </Text>
                  <Text as="span" color="gray.400" ml={2} fontSize="xs">
                    [
                    {field.source === "channel-only"
                      ? "채널 전용"
                      : field.source === "variant"
                        ? "옵션"
                        : "마스터"}
                    ]
                  </Text>
                </Text>
                {field.description && (
                  <Text fontSize="xs" color="gray.500" mb={1.5}>
                    {field.description}
                  </Text>
                )}
                {field.type === "select" && field.options ? (
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      borderColor="gray.200"
                    >
                      <option value="">선택안함</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                ) : field.type === "textarea" ? (
                  <Textarea
                    size="sm"
                    rows={3}
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    borderColor="gray.200"
                  />
                ) : (
                  <Input
                    size="sm"
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : field.type === "image"
                            ? "url"
                            : "text"
                    }
                    placeholder={
                      field.type === "image" ? "https://..." : undefined
                    }
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    borderColor="gray.200"
                  />
                )}
              </Box>
            ))}
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
          {missing.length > 0 && (
            <Button
              size="sm"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              onClick={() => void handleSubmit()}
              loading={isPending}
              disabled={!allFilled}
            >
              저장
            </Button>
          )}
        </Flex>
      </Box>
    </>
  );
}
