import { Box, Button, Flex, Input, Stack, Table, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pages.skus");
  return (
    <Stack gap={5}>
      <FormBox title={t("form.mapping.stockTitle")}>
        <Stack gap={3}>
          <Flex align="center" gap={4}>
            <Text fontSize="sm" color="gray.600">
              {t("form.mapping.currentStock")}
            </Text>
            <Text fontSize="xl" fontWeight="bold">
              {detail.stock}
            </Text>
          </Flex>
          <Flex gap={2} align="flex-end" flexWrap="wrap">
            <Box>
              <Label>{t("form.mapping.adjustQty")}</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder={t("form.mapping.adjustQtyPlaceholder")}
                size="sm"
                w="160px"
              />
            </Box>
            <Box flex="1" minW="200px">
              <Label>{t("form.mapping.memo")}</Label>
              <Input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder={t("form.mapping.memoPlaceholder")}
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
              {t("form.mapping.applyAdjust")}
            </Button>
          </Flex>
        </Stack>
      </FormBox>

      <FormBox
        title={t("form.mapping.masterTitle", {
          count: detail.masterVariants.length,
        })}
      >
        {detail.masterVariants.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            {t("form.mapping.masterEmpty")}
          </Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  {t("form.mapping.masterProduct")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("form.mapping.variantSku")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>{t("form.mapping.qty")}</Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("form.mapping.position")}
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {detail.masterVariants.map((row) => (
                <Table.Row key={`${row.masterVariantId}`}>
                  <Table.Cell>
                    <Stack gap={0.5}>
                      <Text fontSize="sm" fontWeight="medium">
                        {row.masterProductTitle}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {row.masterProductId}
                      </Text>
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
        <HelperText>{t("form.mapping.masterHelper")}</HelperText>
      </FormBox>

      <FormBox
        title={t("form.mapping.listedTitle", {
          count: detail.listedSkus.length,
        })}
      >
        {detail.listedSkus.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            {t("form.mapping.listedEmpty")}
          </Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  {t("form.mapping.listedProductId")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("form.mapping.channelVariantId")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("form.mapping.channelSellerCode")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>{t("form.mapping.qty")}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {detail.listedSkus.map((row, idx) => (
                <Table.Row key={`${row.listedProductId}_${idx}`}>
                  <Table.Cell>
                    <Text fontSize="sm" fontFamily="mono">
                      {row.listedProductId}
                    </Text>
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
        <HelperText>{t("form.mapping.listedHelper")}</HelperText>
      </FormBox>
    </Stack>
  );
}
