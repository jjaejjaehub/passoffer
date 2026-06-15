import { Box, Button, Flex, Input, Stack, Table, Text } from "@chakra-ui/react";
import type { Dispatch, SetStateAction } from "react";
import type { SkuDetail } from "@/entities/sku";
import {
  ShopifyFormHelperText as HelperText,
  ShopifyFormLabel as Label,
} from "@/shared/ui/ShopifyFormPrimitives";
import { FormBox } from "./primitives";

interface Props {
  detail: SkuDetail;
  adjustQty: string;
  setAdjustQty: Dispatch<SetStateAction<string>>;
  adjustNote: string;
  setAdjustNote: Dispatch<SetStateAction<string>>;
  handleAdjust: () => Promise<void> | void;
  isAdjusting: boolean;
}

export function MappingStockSection({
  detail,
  adjustQty,
  setAdjustQty,
  adjustNote,
  setAdjustNote,
  handleAdjust,
  isAdjusting,
}: Props) {
  return (
    <Stack gap={5}>
      <FormBox title="재고">
        <Stack gap={3}>
          <Flex align="center" gap={4}>
            <Text fontSize="sm" color="gray.600">현재 재고</Text>
            <Text fontSize="xl" fontWeight="bold">{detail.stock}</Text>
          </Flex>
          <Flex gap={2} align="flex-end" flexWrap="wrap">
            <Box>
              <Label>조정 수량 (±)</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="예: 10 또는 -5"
                size="sm"
                w="160px"
              />
            </Box>
            <Box flex="1" minW="200px">
              <Label>메모</Label>
              <Input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="조정 사유"
                size="sm"
              />
            </Box>
            <Button
              size="sm"
              bg="gray.900"
              color="white"
              _hover={{ bg: "gray.800" }}
              onClick={() => void handleAdjust()}
              loading={isAdjusting}
            >
              조정 적용
            </Button>
          </Flex>
        </Stack>
      </FormBox>

      <FormBox title={`마스터 변형 매핑 (${detail.masterVariants.length})`}>
        {detail.masterVariants.length === 0 ? (
          <Text fontSize="sm" color="gray.500">연결된 마스터 변형이 없습니다.</Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>마스터 상품</Table.ColumnHeader>
                <Table.ColumnHeader>변형 SKU</Table.ColumnHeader>
                <Table.ColumnHeader>수량</Table.ColumnHeader>
                <Table.ColumnHeader>위치</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {detail.masterVariants.map((row) => (
                <Table.Row key={`${row.masterVariantId}`}>
                  <Table.Cell>
                    <Stack gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium">{row.masterProductTitle}</Text>
                      <Text fontSize="xs" color="gray.500">{row.masterProductId}</Text>
                    </Stack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.variantSku}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.qty}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.position}</Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
        <HelperText>매핑은 마스터 상품 편집 화면에서 추가/제거합니다.</HelperText>
      </FormBox>

      <FormBox title={`판매상품 매핑 (${detail.listedSkus.length})`}>
        {detail.listedSkus.length === 0 ? (
          <Text fontSize="sm" color="gray.500">연결된 판매상품 매핑이 없습니다.</Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>판매상품 ID</Table.ColumnHeader>
                <Table.ColumnHeader>채널 옵션</Table.ColumnHeader>
                <Table.ColumnHeader>채널 셀러코드</Table.ColumnHeader>
                <Table.ColumnHeader>수량</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {detail.listedSkus.map((row, idx) => (
                <Table.Row key={`${row.listedProductId}_${idx}`}>
                  <Table.Cell>
                    <Text fontSize="sm" fontFamily="mono">{row.listedProductId}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.channelVariantId}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.channelSellerCode ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{row.qty}</Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
        <HelperText>매핑은 판매상품 상세 화면에서 편집합니다.</HelperText>
      </FormBox>
    </Stack>
  );
}
