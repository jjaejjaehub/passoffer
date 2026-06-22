"use client";

import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { InventoryRow, LocationNode } from "@oms/types";
import { StatusBadge } from "@/shared/ui";

interface LocationTreeProps {
  nodes: LocationNode[];
  inventory: InventoryRow[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  mutationDisabled: boolean;
  mutationDisabledReason: string;
}

interface StockSummary {
  direct: number;
  total: number;
}

function buildStockMap(
  nodes: LocationNode[],
  directByCode: Map<string, number>,
): Map<string, StockSummary> {
  const result = new Map<string, StockSummary>();

  function visit(node: LocationNode): StockSummary {
    const direct = directByCode.get(node.code) ?? 0;
    let childTotal = 0;
    if (node.children) {
      for (const child of node.children) {
        const childSummary = visit(child);
        childTotal += childSummary.total;
      }
    }
    const summary: StockSummary = { direct, total: direct + childTotal };
    result.set(node.code, summary);
    return summary;
  }

  for (const root of nodes) {
    visit(root);
  }
  return result;
}

function collectAllCodes(nodes: LocationNode[]): string[] {
  const codes: string[] = [];
  const walk = (list: LocationNode[]): void => {
    for (const n of list) {
      codes.push(n.code);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return codes;
}

export function LocationTree({
  nodes,
  inventory,
  selectedCode,
  onSelect,
  mutationDisabled,
  mutationDisabledReason,
}: LocationTreeProps): ReactElement {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const n of nodes) init.add(n.code);
    return init;
  });

  const directByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of inventory) {
      if (r.locationCode === undefined) continue;
      m.set(r.locationCode, (m.get(r.locationCode) ?? 0) + r.quantity);
    }
    return m;
  }, [inventory]);

  const stockMap = useMemo(
    () => buildStockMap(nodes, directByCode),
    [nodes, directByCode],
  );

  const toggle = (code: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = (): void => {
    setExpanded(new Set(collectAllCodes(nodes)));
  };

  const collapseAll = (): void => {
    setExpanded(new Set());
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={2}>
        <Flex gap={2}>
          <button
            type="button"
            onClick={expandAll}
            style={{
              fontSize: "0.75rem",
              color: "#2563eb",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            모두 펼치기
          </button>
          <Text fontSize="xs" color="gray.400">
            ·
          </Text>
          <button
            type="button"
            onClick={collapseAll}
            style={{
              fontSize: "0.75rem",
              color: "#2563eb",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            모두 접기
          </button>
        </Flex>
        <IconButton
          aria-label="루트 로케이션 추가"
          size="xs"
          variant="outline"
          disabled
          title={mutationDisabledReason}
        >
          <Plus size={14} />
        </IconButton>
      </Flex>

      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        py={1}
      >
        {nodes.length === 0 ? (
          <Box p={4}>
            <Text fontSize="sm" color="gray.500">
              로케이션이 없습니다.
            </Text>
          </Box>
        ) : (
          nodes.map((node) => (
            <TreeRow
              key={node.code}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              selectedCode={selectedCode}
              onSelect={onSelect}
              stockMap={stockMap}
              mutationDisabled={mutationDisabled}
              mutationDisabledReason={mutationDisabledReason}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

interface TreeRowProps {
  node: LocationNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  stockMap: Map<string, StockSummary>;
  mutationDisabled: boolean;
  mutationDisabledReason: string;
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  selectedCode,
  onSelect,
  stockMap,
  mutationDisabled,
  mutationDisabledReason,
}: TreeRowProps): ReactElement {
  const hasChildren = !!node.children && node.children.length > 0;
  const isOpen = expanded.has(node.code);
  const isSelected = selectedCode === node.code;
  const stock = stockMap.get(node.code) ?? { direct: 0, total: 0 };
  const hasStock = stock.total > 0;

  const deleteDisabled = mutationDisabled || hasStock;
  const deleteReason = mutationDisabled
    ? mutationDisabledReason
    : hasStock
      ? "재고가 남아있는 로케이션은 삭제할 수 없습니다"
      : "삭제";

  return (
    <Box>
      <Flex
        align="center"
        gap={1}
        px={2}
        py={1.5}
        pl={2 + depth * 5}
        bg={isSelected ? "blue.50" : undefined}
        borderLeftWidth={isSelected ? "3px" : "0"}
        borderLeftColor={isSelected ? "blue.500" : undefined}
        _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
        cursor="pointer"
        onClick={() => onSelect(node.code)}
        role="group"
      >
        <Box
          width="20px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              onToggle(node.code);
            }
          }}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : null}
        </Box>

        <Text fontSize="sm" flex="1" fontFamily="mono">
          {node.name}{" "}
          <Text as="span" color="gray.400" fontSize="xs">
            ({node.code})
          </Text>
        </Text>

        {hasStock ? (
          <StatusBadge
            tone="info"
            label={`${stock.total.toLocaleString()}개`}
          />
        ) : (
          <Text fontSize="xs" color="gray.400">
            0
          </Text>
        )}

        <Flex
          gap={1}
          opacity={0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.15s"
        >
          <IconButton
            aria-label="하위 로케이션 추가"
            size="2xs"
            variant="ghost"
            disabled={mutationDisabled}
            title={mutationDisabled ? mutationDisabledReason : "하위 추가"}
            onClick={(e) => e.stopPropagation()}
          >
            <Plus size={12} />
          </IconButton>
          <IconButton
            aria-label="이름 수정"
            size="2xs"
            variant="ghost"
            disabled={mutationDisabled}
            title={mutationDisabled ? mutationDisabledReason : "이름 수정"}
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil size={12} />
          </IconButton>
          <IconButton
            aria-label="삭제"
            size="2xs"
            variant="ghost"
            colorPalette="red"
            disabled={deleteDisabled}
            title={deleteReason}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={12} />
          </IconButton>
        </Flex>
      </Flex>

      {hasChildren && isOpen ? (
        <Box>
          {node.children!.map((child) => (
            <TreeRow
              key={child.code}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedCode={selectedCode}
              onSelect={onSelect}
              stockMap={stockMap}
              mutationDisabled={mutationDisabled}
              mutationDisabledReason={mutationDisabledReason}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
