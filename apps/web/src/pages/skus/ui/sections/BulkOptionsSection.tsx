import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import {
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useState,
} from "react";
import { ShopifyFormHelperText as HelperText } from "@/shared/ui/ShopifyFormPrimitives";
import type { AxisRow } from "../../model/formState";
import { Field, FormBox } from "./primitives";

interface Props {
  bulkPrefix: string;
  setBulkPrefix: Dispatch<SetStateAction<string>>;
  axes: AxisRow[];
  setAxes: Dispatch<SetStateAction<AxisRow[]>>;
  bulkPreview: { code: string; attrs: Record<string, string> }[];
}

function parseChips(s: string): string[] {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function joinChips(chips: string[]): string {
  return chips.join(", ");
}

function AxisChipInput({
  chips,
  onChange,
}: {
  chips: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("pages.skus");
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...chips];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      e.preventDefault();
      onChange(chips.slice(0, -1));
    }
  };

  const removeChip = (idx: number) => {
    onChange(chips.filter((_, i) => i !== idx));
  };

  return (
    <Flex
      align="center"
      flexWrap="wrap"
      gap={1.5}
      px={2}
      py={1.5}
      minH="34px"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
      _focusWithin={{
        borderColor: "blue.400",
        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
      }}
    >
      {chips.map((chip, idx) => (
        <Badge
          key={`${chip}-${idx}`}
          variant="subtle"
          colorPalette="blue"
          px={2}
          py={0.5}
          borderRadius="full"
          display="inline-flex"
          alignItems="center"
          gap={1}
        >
          <Text fontSize="xs">{chip}</Text>
          <button
            type="button"
            onClick={() => removeChip(idx)}
            aria-label={t("form.bulk.chipDeleteLabel", { chip })}
            style={{
              cursor: "pointer",
              fontSize: "12px",
              lineHeight: 1,
              color: "#1E40AF",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          >
            ×
          </button>
        </Badge>
      ))}
      <Input
        flex="1"
        minW="120px"
        variant="outline"
        border="none"
        outline="none"
        boxShadow="none"
        _focus={{ boxShadow: "none" }}
        size="sm"
        h="24px"
        px={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={
          chips.length === 0 ? t("form.bulk.chipInputPlaceholder") : ""
        }
      />
    </Flex>
  );
}

export function BulkOptionsSection({
  bulkPrefix,
  setBulkPrefix,
  axes,
  setAxes,
  bulkPreview,
}: Props) {
  const t = useTranslations("pages.skus");
  const updateAxis = (idx: number, patch: Partial<AxisRow>) => {
    setAxes((a) => a.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeAxis = (idx: number) => {
    setAxes((a) => (a.length === 1 ? a : a.filter((_, i) => i !== idx)));
  };

  const addAxis = () => {
    setAxes((a) => [...a, { name: "", values: "" }]);
  };

  return (
    <FormBox>
      <Stack gap={4}>
        <Field label={t("form.bulk.codePrefix")}>
          <Input
            size="sm"
            value={bulkPrefix}
            onChange={(e) => setBulkPrefix(e.target.value)}
            placeholder={t("form.bulk.codePrefixPlaceholder")}
          />
          <HelperText>{t("form.bulk.codePrefixHelper")}</HelperText>
        </Field>

        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              {t("form.bulk.axesTitle")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("form.bulk.axesHelper")}
            </Text>
          </Flex>

          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            overflow="hidden"
          >
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader w="200px">
                    {t("form.bulk.axisType")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("form.bulk.axisName")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="80px" textAlign="center">
                    {t("form.bulk.axisManage")}
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {axes.map((axis, idx) => {
                  const chips = parseChips(axis.values);
                  const isLast = idx === axes.length - 1;
                  return (
                    <Table.Row key={idx}>
                      <Table.Cell verticalAlign="top">
                        <Input
                          size="sm"
                          placeholder={t("form.bulk.axisNamePlaceholder")}
                          value={axis.name}
                          onChange={(e) =>
                            updateAxis(idx, { name: e.target.value })
                          }
                        />
                      </Table.Cell>
                      <Table.Cell verticalAlign="top">
                        <AxisChipInput
                          chips={chips}
                          onChange={(next) =>
                            updateAxis(idx, { values: joinChips(next) })
                          }
                        />
                      </Table.Cell>
                      <Table.Cell verticalAlign="top" textAlign="center">
                        <Flex gap={1} justify="center">
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            onClick={() => removeAxis(idx)}
                            disabled={axes.length === 1}
                            aria-label={t("form.bulk.axisRemoveLabel")}
                          >
                            －
                          </Button>
                          {isLast && (
                            <Button
                              size="xs"
                              variant="solid"
                              colorPalette="blue"
                              onClick={addAxis}
                              aria-label={t("form.bulk.axisAddLabel")}
                            >
                              ＋
                            </Button>
                          )}
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t("form.bulk.previewTitle", { count: bulkPreview.length })}
          </Text>
          {bulkPreview.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              {t("form.bulk.previewEmpty")}
            </Text>
          ) : (
            <Box
              maxH="240px"
              overflowY="auto"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      {t("form.bulk.previewCode")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("form.bulk.previewAttrs")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {bulkPreview.map((row) => (
                    <Table.Row key={row.code}>
                      <Table.Cell>
                        <Text fontSize="sm" fontFamily="mono">
                          {row.code}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs" color="gray.600">
                          {Object.entries(row.attrs)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(", ")}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>

        <HelperText>{t("form.bulk.finalHelper")}</HelperText>
      </Stack>
    </FormBox>
  );
}
