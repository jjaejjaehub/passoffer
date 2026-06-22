"use client";

import { Box, Button, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useSkus } from "../api/skuQueries";

export interface AttachedSkuRef {
  skuId: string;
  code: string;
  qty: number;
}

interface SkuPickerCellProps {
  attached: AttachedSkuRef[];
  onChange: (next: AttachedSkuRef[]) => void;
  placeholder?: string;
}

export function SkuPickerCell({
  attached,
  onChange,
  placeholder,
}: SkuPickerCellProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();
  const { data } = useSkus({
    search: trimmed,
    page: 1,
    pageSize: 10,
    enabled: trimmed.length > 0,
  });
  const results = data?.items ?? [];
  const attachedIds = new Set(attached.map((a) => a.skuId));

  return (
    <Box position="relative">
      {attached.length > 0 && (
        <Stack gap={1} mb={1}>
          {attached.map((s) => (
            <Flex key={s.skuId} align="center" gap={1}>
              <Text fontSize="xs" flex="1" lineClamp={1}>
                {s.code}
              </Text>
              <Input
                size="xs"
                type="number"
                value={String(s.qty)}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  onChange(
                    attached.map((a) =>
                      a.skuId === s.skuId ? { ...a, qty: n } : a,
                    ),
                  );
                }}
                w="14"
                min={1}
              />
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() =>
                  onChange(attached.filter((a) => a.skuId !== s.skuId))
                }
              >
                ✕
              </Button>
            </Flex>
          ))}
        </Stack>
      )}
      <Input
        size="xs"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "SKU 검색"}
      />
      {open && trimmed.length > 0 && results.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="md"
          maxH="48"
          overflowY="auto"
          zIndex={20}
        >
          {results.map((s) => {
            const already = attachedIds.has(s.id);
            return (
              <Box
                key={s.id}
                px={2}
                py={1}
                fontSize="xs"
                cursor={already ? "default" : "pointer"}
                opacity={already ? 0.4 : 1}
                _hover={already ? undefined : { bg: "gray.50" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (already) return;
                  onChange([
                    ...attached,
                    { skuId: s.id, code: s.code, qty: 1 },
                  ]);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Text fontWeight="medium">{s.code}</Text>
                <Text color="gray.500">재고 {s.stock}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
