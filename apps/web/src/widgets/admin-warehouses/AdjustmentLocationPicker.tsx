"use client";

import { Box, Flex, Input, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { LocationNode } from "@oms/types";

interface AdjustmentLocationPickerProps {
  nodes: LocationNode[];
  value: string | null;
  onChange: (code: string) => void;
  excludeCode?: string | null;
  excludeReason?: string;
  emptyText?: string;
}

interface FlatLocation {
  code: string;
  name: string;
  fullPath: string;
}

function flatten(nodes: LocationNode[]): FlatLocation[] {
  const out: FlatLocation[] = [];
  const walk = (list: LocationNode[]): void => {
    for (const n of list) {
      out.push({ code: n.code, name: n.name, fullPath: n.fullPath });
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function AdjustmentLocationPicker({
  nodes,
  value,
  onChange,
  excludeCode = null,
  excludeReason = "출발 로케이션과 동일할 수 없습니다",
  emptyText = "로케이션이 없습니다",
}: AdjustmentLocationPickerProps): ReactElement {
  const [query, setQuery] = useState("");

  const flat = useMemo(() => flatten(nodes), [nodes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return flat;
    return flat.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.fullPath.toLowerCase().includes(q),
    );
  }, [flat, query]);

  return (
    <Stack gap={2}>
      <Input
        size="sm"
        placeholder="로케이션 코드 또는 이름 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        maxH="320px"
        overflowY="auto"
      >
        {flat.length === 0 ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            {emptyText}
          </Text>
        ) : filtered.length === 0 ? (
          <Text fontSize="sm" color="gray.500" p={4} textAlign="center">
            검색 결과가 없습니다.
          </Text>
        ) : (
          filtered.map((loc) => {
            const isSelected = value === loc.code;
            const isExcluded = excludeCode !== null && excludeCode === loc.code;
            return (
              <Flex
                key={loc.code}
                px={3}
                py={2}
                align="center"
                justify="space-between"
                bg={isSelected ? "blue.50" : undefined}
                borderLeftWidth={isSelected ? "3px" : "0"}
                borderLeftColor={isSelected ? "blue.500" : undefined}
                cursor={isExcluded ? "not-allowed" : "pointer"}
                opacity={isExcluded ? 0.5 : 1}
                _hover={
                  isExcluded
                    ? undefined
                    : { bg: isSelected ? "blue.50" : "gray.50" }
                }
                title={isExcluded ? excludeReason : undefined}
                onClick={() => {
                  if (isExcluded) return;
                  onChange(loc.code);
                }}
              >
                <Box>
                  <Text fontFamily="mono" fontSize="sm">
                    {loc.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {loc.fullPath}
                  </Text>
                </Box>
                <Text fontFamily="mono" fontSize="xs" color="gray.500">
                  {loc.code}
                </Text>
              </Flex>
            );
          })
        )}
      </Box>
    </Stack>
  );
}
