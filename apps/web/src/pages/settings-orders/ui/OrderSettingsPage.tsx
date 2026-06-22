"use client";

import { useEffect } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PageHeader, appToaster } from "@/shared/ui";
import {
  DEFAULT_ORDER_SETTINGS,
  useOrderSettings,
  useUpdateOrderSettings,
  type OrderSettings,
} from "@/entities/user-settings";

interface FormValues {
  lookbackDays: number;
  autoMatchSku: boolean;
  dispatchDelayThresholdDays: number;
  bundleKey: string[];
}

const BUNDLE_KEY_OPTIONS = [
  "receiverName",
  "receiverTel",
  "zipCode",
  "receiverAddr",
] as const;

export function OrderSettingsPage(): React.JSX.Element {
  const t = useTranslations("pages.settingsOrders");
  const { data, isLoading } = useOrderSettings();
  const updateMutation = useUpdateOrderSettings();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: {
      lookbackDays: DEFAULT_ORDER_SETTINGS.lookbackDays,
      autoMatchSku: DEFAULT_ORDER_SETTINGS.autoMatchSku,
      dispatchDelayThresholdDays:
        DEFAULT_ORDER_SETTINGS.dispatchDelayThresholdDays,
      bundleKey: [...DEFAULT_ORDER_SETTINGS.bundleKey],
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        lookbackDays: data.lookbackDays,
        autoMatchSku: data.autoMatchSku,
        dispatchDelayThresholdDays: data.dispatchDelayThresholdDays,
        bundleKey: [...data.bundleKey],
      });
    }
  }, [data, reset]);

  const bundleKey = watch("bundleKey");
  const autoMatchSku = watch("autoMatchSku");

  const toggleBundleKey = (key: string) => {
    const next = bundleKey.includes(key)
      ? bundleKey.filter((k) => k !== key)
      : [...bundleKey, key];
    setValue("bundleKey", next, { shouldDirty: true });
  };

  const onSubmit = async (values: FormValues) => {
    const patch: Partial<OrderSettings> = {
      lookbackDays: Number(values.lookbackDays),
      autoMatchSku: values.autoMatchSku,
      dispatchDelayThresholdDays: Number(values.dispatchDelayThresholdDays),
      bundleKey: values.bundleKey,
    };
    try {
      await updateMutation.mutateAsync(patch);
      appToaster.create({
        type: "success",
        title: t("toast.savedTitle"),
        description: t("toast.savedDescription"),
      });
    } catch (err) {
      appToaster.create({
        type: "error",
        title: t("toast.errorTitle"),
        description:
          err instanceof Error ? err.message : t("toast.errorDescription"),
      });
    }
  };

  return (
    <Box>
      <PageHeader title={t("title")} description={t("description")} mb={8} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={5}>
          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="white"
            p={5}
          >
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              {t("lookbackDays.label")}
            </Text>
            <Text fontSize="xs" color="gray.500" mb={3}>
              {t("lookbackDays.help")}
            </Text>
            <Flex align="center" gap={2}>
              <Input
                type="number"
                min={1}
                max={365}
                size="sm"
                maxW="120px"
                disabled={isLoading}
                {...register("lookbackDays", {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 365,
                })}
              />
              <Text fontSize="sm" color="gray.600">
                {t("lookbackDays.unit")}
              </Text>
            </Flex>
            {errors.lookbackDays && (
              <Text fontSize="xs" color="red.500" mt={1}>
                {t("lookbackDays.error")}
              </Text>
            )}
          </Box>

          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="white"
            p={5}
          >
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              {t("autoMatchSku.label")}
            </Text>
            <Text fontSize="xs" color="gray.500" mb={3}>
              {t("autoMatchSku.help")}
            </Text>
            <Checkbox.Root
              checked={autoMatchSku}
              onCheckedChange={(d) =>
                setValue("autoMatchSku", !!d.checked, { shouldDirty: true })
              }
              size="sm"
              disabled={isLoading}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{t("autoMatchSku.checkboxLabel")}</Checkbox.Label>
            </Checkbox.Root>
          </Box>

          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="white"
            p={5}
          >
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              {t("dispatchDelay.label")}
            </Text>
            <Text fontSize="xs" color="gray.500" mb={3}>
              {t("dispatchDelay.help")}
            </Text>
            <Flex align="center" gap={2}>
              <Input
                type="number"
                min={0}
                max={30}
                size="sm"
                maxW="120px"
                disabled={isLoading}
                {...register("dispatchDelayThresholdDays", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                  max: 30,
                })}
              />
              <Text fontSize="sm" color="gray.600">
                {t("dispatchDelay.unit")}
              </Text>
            </Flex>
            {errors.dispatchDelayThresholdDays && (
              <Text fontSize="xs" color="red.500" mt={1}>
                {t("dispatchDelay.error")}
              </Text>
            )}
          </Box>

          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            bg="white"
            p={5}
          >
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              {t("bundleKey.label")}
            </Text>
            <Text fontSize="xs" color="gray.500" mb={3}>
              {t("bundleKey.help")}
            </Text>
            <Stack gap={2}>
              {BUNDLE_KEY_OPTIONS.map((key) => (
                <Checkbox.Root
                  key={key}
                  checked={bundleKey.includes(key)}
                  onCheckedChange={() => toggleBundleKey(key)}
                  size="sm"
                  disabled={isLoading}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    {t(`bundleKey.options.${key}`)}
                  </Checkbox.Label>
                </Checkbox.Root>
              ))}
            </Stack>
          </Box>

          <Flex justify="flex-end">
            <Button
              type="submit"
              size="sm"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              loading={isSubmitting || updateMutation.isPending}
              loadingText={t("saving")}
              disabled={isLoading}
            >
              {t("save")}
            </Button>
          </Flex>
        </Stack>
      </form>
    </Box>
  );
}
