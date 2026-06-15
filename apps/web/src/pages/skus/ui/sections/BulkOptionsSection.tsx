import { Badge, Box, Button, Flex, Input, Stack, Table, Text } from "@chakra-ui/react";
import { type Dispatch, type KeyboardEvent, type SetStateAction, useState } from "react";
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
      _focusWithin={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
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
            aria-label={`${chip} 삭제`}
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
        placeholder={chips.length === 0 ? "값 입력 후 Enter 또는 쉼표" : ""}
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
        <Field label="코드 prefix">
          <Input
            size="sm"
            value={bulkPrefix}
            onChange={(e) => setBulkPrefix(e.target.value)}
            placeholder="예: APPLE"
          />
          <HelperText>최종 코드 = prefix + "-" + 축값 조합 (대문자, 공백→_)</HelperText>
        </Field>

        <Box>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium">속성 축</Text>
            <Text fontSize="xs" color="gray.500">
              값은 Enter 또는 쉼표(,)로 칩이 됩니다.
            </Text>
          </Flex>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader w="200px">속성구분</Table.ColumnHeader>
                  <Table.ColumnHeader>속성명</Table.ColumnHeader>
                  <Table.ColumnHeader w="80px" textAlign="center">관리</Table.ColumnHeader>
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
                          placeholder="예: 색상"
                          value={axis.name}
                          onChange={(e) => updateAxis(idx, { name: e.target.value })}
                        />
                      </Table.Cell>
                      <Table.Cell verticalAlign="top">
                        <AxisChipInput
                          chips={chips}
                          onChange={(next) => updateAxis(idx, { values: joinChips(next) })}
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
                            aria-label="축 삭제"
                          >
                            －
                          </Button>
                          {isLast && (
                            <Button
                              size="xs"
                              variant="solid"
                              colorPalette="blue"
                              onClick={addAxis}
                              aria-label="축 추가"
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
            생성 미리보기 ({bulkPreview.length}개)
          </Text>
          {bulkPreview.length === 0 ? (
            <Text fontSize="sm" color="gray.500">속성 축과 값을 입력하면 생성될 SKU 목록이 표시됩니다.</Text>
          ) : (
            <Box maxH="240px" overflowY="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>코드</Table.ColumnHeader>
                    <Table.ColumnHeader>속성</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {bulkPreview.map((row) => (
                    <Table.Row key={row.code}>
                      <Table.Cell>
                        <Text fontSize="sm" fontFamily="mono">{row.code}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs" color="gray.600">
                          {Object.entries(row.attrs).map(([k, v]) => `${k}=${v}`).join(", ")}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>

        <HelperText>
          기본정보·규격가격·추가정보 탭의 값은 모든 SKU 에 공통 적용됩니다. (코드와 속성만 축에 따라 달라짐)
        </HelperText>
      </Stack>
    </FormBox>
  );
}
