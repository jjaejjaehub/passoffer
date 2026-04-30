'use client';

import { Box, Flex, Skeleton } from "@chakra-ui/react";

interface TableSkeletonProps {
  /** 표시할 행 수 (기본 8) */
  rows?: number;
  /** 컬럼 수 (기본 6) */
  cols?: number;
  /** 필터바 스켈레톤 표시 여부 */
  showFilterBar?: boolean;
}

export function TableSkeleton({
  rows = 8,
  cols = 6,
  showFilterBar = true,
}: TableSkeletonProps): React.JSX.Element {
  return (
    <Box>
      {/* 필터바 스켈레톤 */}
      {showFilterBar && (
        <Flex gap={2} mb={4} align="center">
          {[80, 70, 72, 68, 80].map((w, i) => (
            <Skeleton key={i} height="28px" width={`${w}px`} borderRadius="md" />
          ))}
          <Box flex="1" />
          <Skeleton height="28px" width="200px" borderRadius="md" />
        </Flex>
      )}

      {/* 테이블 스켈레톤 */}
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        bg="white"
        overflow="hidden"
      >
        {/* 헤더 */}
        <Flex
          px={4}
          py={3}
          gap={4}
          borderBottomWidth="1px"
          borderColor="gray.100"
          bg="gray.50"
          align="center"
        >
          <Skeleton height="14px" width="14px" borderRadius="sm" flexShrink={0} />
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton
              key={i}
              height="12px"
              flex={i === 2 ? "2" : "1"}
              borderRadius="sm"
            />
          ))}
        </Flex>

        {/* 데이터 행 */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <Flex
            key={rowIdx}
            px={4}
            py={3}
            gap={4}
            borderBottomWidth={rowIdx < rows - 1 ? "1px" : "0"}
            borderColor="gray.100"
            align="center"
          >
            <Skeleton height="14px" width="14px" borderRadius="sm" flexShrink={0} />
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                height="14px"
                flex={colIdx === 2 ? "2" : "1"}
                borderRadius="sm"
                opacity={1 - rowIdx * 0.07}
              />
            ))}
          </Flex>
        ))}
      </Box>
    </Box>
  );
}
