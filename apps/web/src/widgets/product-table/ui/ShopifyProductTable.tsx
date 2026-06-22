"use client";

import { Box, Button, HStack } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

import type { ShopifyProductItem } from "@/entities/product";

const STATUS_MAP: Record<string, string> = {
  active: "판매",
  inactive: "판매중지",
};

function ShopifyStatusBadge({ status }: { status: string }): React.JSX.Element {
  const isActive = status === "active";
  const label = STATUS_MAP[status] ?? status;

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      fontSize="xs"
      borderRadius="sm"
      borderWidth="1px"
      borderStyle={isActive ? "solid" : "dashed"}
      borderColor={isActive ? "gray.900" : "gray.300"}
      color="gray.800"
      bg="white"
    >
      {label}
    </Box>
  );
}

export interface ShopifyProductTableProps {
  items: ShopifyProductItem[];
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  selectedProductIds: Set<string>;
  onToggleRowSelection: (productId: string) => void;
  onToggleAllSelection: (checked: boolean) => void;
  onRowPublish: (productId: string) => void;
  onRowUnpublish: (productId: string) => void;
  isStatusActionPending: boolean;
  onRowDelete?: (productId: string) => void;
}

export function ShopifyProductTable({
  items,
  selectedProductId,
  onSelectProduct,
  selectedProductIds,
  onToggleRowSelection,
  onToggleAllSelection,
  onRowPublish,
  onRowUnpublish,
  isStatusActionPending,
  onRowDelete,
}: ShopifyProductTableProps): React.JSX.Element {
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const isAllSelected: boolean =
    items.length > 0 && items.every((item) => selectedProductIds.has(item.id));

  const selectedInViewCount: number = items.filter((item) =>
    selectedProductIds.has(item.id),
  ).length;

  const isIndeterminate: boolean =
    selectedInViewCount > 0 && selectedInViewCount < items.length;

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  return (
    <Box
      mt={2}
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      bg="white"
    >
      <Box w="100%" overflowX="auto">
        <Box
          as="table"
          w="100%"
          fontSize="sm"
          style={{ borderCollapse: "separate", borderSpacing: 0 }}
        >
          <Box as="thead" bg="gray.50">
            <Box as="tr">
              {/* 체크박스 */}
              <Box
                as="th"
                w="44px"
                minW="44px"
                px={2}
                py={3}
                textAlign="center"
                fontSize="xs"
                color="gray.500"
              >
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onToggleAllSelection(e.target.checked)}
                  disabled={items.length === 0 || isStatusActionPending}
                  aria-label="전체 선택"
                />
              </Box>
              {/* 썸네일 */}
              <Box
                as="th"
                w="48px"
                minW="48px"
                px={2}
                py={3}
                fontSize="xs"
                color="gray.500"
              />
              {/* 상품명 */}
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                minW="200px"
              >
                상품명
              </Box>
              {/* 상태 */}
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                minW="90px"
                w="90px"
              >
                상태
              </Box>
              {/* 가격 */}
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="right"
                fontSize="xs"
                color="gray.500"
                minW="100px"
                w="100px"
              >
                가격
              </Box>
              {/* 재고 */}
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="right"
                fontSize="xs"
                color="gray.500"
                minW="70px"
                w="70px"
              >
                재고
              </Box>
              {/* 작업 */}
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="right"
                fontSize="xs"
                color="gray.500"
                minW="160px"
              >
                작업
              </Box>
            </Box>
          </Box>

          <Box as="tbody">
            {items.map((item) => {
              const isRowSelected = selectedProductId === item.id;
              const isActive = item.status === "active";
              const isDraft = item.status === "inactive";

              return (
                <Box
                  key={item.id}
                  as="tr"
                  borderTopWidth="1px"
                  borderColor="gray.100"
                  bg={isRowSelected ? "gray.50" : "white"}
                  _hover={{ bg: "gray.50" }}
                >
                  {/* 체크박스 */}
                  <Box
                    as="td"
                    px={2}
                    py={3}
                    textAlign="center"
                    verticalAlign="middle"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.has(item.id)}
                      onChange={() => onToggleRowSelection(item.id)}
                      disabled={isStatusActionPending}
                      aria-label={`${item.title} 선택`}
                    />
                  </Box>

                  {/* 썸네일 */}
                  <Box as="td" px={2} py={3} verticalAlign="middle">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{
                          width: 36,
                          height: 36,
                          objectFit: "cover",
                          borderRadius: 4,
                          border: "1px solid #e2e8f0",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Box
                        w="36px"
                        h="36px"
                        borderRadius="sm"
                        borderWidth="1px"
                        borderColor="gray.200"
                        bg="gray.100"
                      />
                    )}
                  </Box>

                  {/* 상품명 */}
                  <Box as="td" px={4} py={3} verticalAlign="middle">
                    <Button
                      type="button"
                      variant="plain"
                      fontSize="sm"
                      color="gray.900"
                      textDecoration="underline"
                      textUnderlineOffset="2px"
                      h="auto"
                      minH={0}
                      p={0}
                      textAlign="left"
                      fontWeight="normal"
                      maxW="280px"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      display="block"
                      _hover={{ color: "gray.600" }}
                      onClick={() => onSelectProduct(item.id)}
                    >
                      {item.title}
                    </Button>
                  </Box>

                  {/* 상태 */}
                  <Box as="td" px={4} py={3} verticalAlign="middle">
                    <ShopifyStatusBadge status={item.status} />
                  </Box>

                  {/* 가격 */}
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    textAlign="right"
                    verticalAlign="middle"
                    fontFamily="mono"
                    fontSize="sm"
                    color="gray.700"
                    whiteSpace="nowrap"
                  >
                    {Number(item.price).toLocaleString()}
                  </Box>

                  {/* 재고 */}
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    textAlign="right"
                    verticalAlign="middle"
                    fontFamily="mono"
                    fontSize="sm"
                    color={item.qty === 0 ? "red.500" : "gray.700"}
                  >
                    {item.qty.toLocaleString()}
                  </Box>

                  {/* 작업 */}
                  <Box
                    as="td"
                    px={4}
                    py={3}
                    textAlign="right"
                    verticalAlign="middle"
                  >
                    <HStack gap={2} justify="flex-end" flexWrap="wrap">
                      {isDraft && (
                        <Button
                          type="button"
                          variant="solid"
                          size="sm"
                          bg="gray.900"
                          color="white"
                          _hover={{ bg: "gray.800" }}
                          disabled={isStatusActionPending}
                          onClick={() => onRowPublish(item.id)}
                        >
                          판매중으로 변경
                        </Button>
                      )}
                      {isActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          borderColor="gray.300"
                          disabled={isStatusActionPending}
                          onClick={() => onRowUnpublish(item.id)}
                        >
                          판매중지로 변경
                        </Button>
                      )}
                      {onRowDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          borderColor="red.200"
                          color="red.500"
                          _hover={{ bg: "red.50" }}
                          disabled={isStatusActionPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowDelete(item.id);
                          }}
                        >
                          삭제
                        </Button>
                      )}
                    </HStack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
