"use client";

import { Box, Flex, IconButton, Input } from "@chakra-ui/react";
import { RefreshCw, Search } from "lucide-react";
import type { ReactElement } from "react";

export type GroupByMode = "lot" | "sku";

interface InventoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  groupBy: GroupByMode;
  onGroupByChange: (value: GroupByMode) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lotSupported: boolean;
}

export function InventoryToolbar({
  search,
  onSearchChange,
  groupBy,
  onGroupByChange,
  onRefresh,
  isRefreshing = false,
  lotSupported,
}: InventoryToolbarProps): ReactElement {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      mb={4}
      wrap="wrap"
    >
      <Flex
        align="center"
        gap={2}
        borderWidth="1px"
        borderColor="gray.300"
        borderRadius="md"
        bg="white"
        px={3}
        width={{ base: "100%", md: "320px" }}
      >
        <Search size={16} color="#718096" />
        <Input
          size="sm"
          placeholder="SKU / LOT / 로케이션 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          border="none"
          _focus={{ outline: "none", boxShadow: "none" }}
          px={0}
        />
      </Flex>

      <Flex align="center" gap={2}>
        {lotSupported ? (
          <Box
            display="inline-flex"
            borderWidth="1px"
            borderColor="gray.300"
            borderRadius="md"
            overflow="hidden"
            bg="white"
          >
            <ToggleSegment
              active={groupBy === "lot"}
              onClick={() => onGroupByChange("lot")}
              label="LOT 단위"
            />
            <ToggleSegment
              active={groupBy === "sku"}
              onClick={() => onGroupByChange("sku")}
              label="SKU 단위"
            />
          </Box>
        ) : null}

        <IconButton
          aria-label="새로고침"
          size="sm"
          variant="outline"
          onClick={onRefresh}
          loading={isRefreshing}
        >
          <RefreshCw size={16} />
        </IconButton>
      </Flex>
    </Flex>
  );
}

interface ToggleSegmentProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function ToggleSegment({ active, onClick, label }: ToggleSegmentProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        fontSize: "0.875rem",
        fontWeight: 500,
        backgroundColor: active ? "#3182ce" : "white",
        color: active ? "white" : "#374151",
        cursor: "pointer",
        border: "none",
      }}
    >
      {label}
    </button>
  );
}
