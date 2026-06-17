"use client";

import { Box, Table, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import { ClaimStatusBadge } from "@/entities/order";
import type { Qoo10ClaimItem } from "@/shared/api/qoo10/types";

interface ClaimTableProps {
  claims: Qoo10ClaimItem[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  return value.slice(0, 10);
};

const formatAmount = (amount: number, currency: string): string => {
  if (!amount && amount !== 0) return "—";
  return `${amount.toLocaleString()} ${currency}`;
};

export function ClaimTable({
  claims,
  selectedIds,
  onSelectionChange,
}: ClaimTableProps): React.JSX.Element {
  const t = useTranslations("widgets.claimTable");
  const isAllSelected =
    claims.length > 0 && selectedIds.length === claims.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < claims.length;

  const handleSelectAll = (checked: boolean): void => {
    onSelectionChange(checked ? claims.map((c) => c.orderNo) : []);
  };

  const handleSelectOne = (orderNo: number, checked: boolean): void => {
    onSelectionChange(
      checked
        ? [...selectedIds, orderNo]
        : selectedIds.filter((id) => id !== orderNo),
    );
  };

  if (claims.length === 0) {
    return (
      <Box py={10} textAlign="center">
        <Text color="gray.400" fontSize="sm">
          {t("empty")}
        </Text>
      </Box>
    );
  }

  return (
    <Box overflowX="auto">
      <Table.Root
        size="sm"
        variant="outline"
        style={{ tableLayout: "fixed", minWidth: "1200px" }}
      >
        <Table.Header>
          <Table.Row bg="gray.50">
            <Table.ColumnHeader w="44px" textAlign="center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSelectAll(e.target.checked)
                }
              />
            </Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.status")}</Table.ColumnHeader>
            <Table.ColumnHeader w="110px">{t("columns.orderNo")}</Table.ColumnHeader>
            <Table.ColumnHeader w="110px">{t("columns.cartNo")}</Table.ColumnHeader>
            <Table.ColumnHeader w="200px">{t("columns.productName")}</Table.ColumnHeader>
            <Table.ColumnHeader w="60px" textAlign="right">
              {t("columns.quantity")}
            </Table.ColumnHeader>
            <Table.ColumnHeader w="120px" textAlign="right">
              {t("columns.amount")}
            </Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.requestedAt")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.completedAt")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.orderedAt")}</Table.ColumnHeader>
            <Table.ColumnHeader w="120px">{t("columns.buyer")}</Table.ColumnHeader>
            <Table.ColumnHeader w="120px">{t("columns.recipient")}</Table.ColumnHeader>
            <Table.ColumnHeader w="180px">{t("columns.reason")}</Table.ColumnHeader>
            <Table.ColumnHeader w="140px">{t("columns.shippingCompanyTracking")}</Table.ColumnHeader>
            <Table.ColumnHeader w="140px">{t("columns.returnShippingCompanyTracking")}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {claims.map((claim) => {
            const isSelected = selectedIds.includes(claim.orderNo);
            return (
              <Table.Row
                key={`${claim.orderNo}-${claim.packNo}`}
                bg={isSelected ? "blue.50" : "white"}
                _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
              >
                {/* 체크박스 */}
                <Table.Cell textAlign="center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleSelectOne(claim.orderNo, e.target.checked)
                    }
                  />
                </Table.Cell>

                {/* 클레임 상태 */}
                <Table.Cell>
                  <ClaimStatusBadge status={claim.claimStatus} />
                </Table.Cell>

                {/* 주문번호 */}
                <Table.Cell>
                  <Text fontFamily="mono" fontSize="xs" color="gray.700">
                    {claim.orderNo}
                  </Text>
                </Table.Cell>

                {/* 장바구니번호 */}
                <Table.Cell>
                  <Text fontFamily="mono" fontSize="xs" color="gray.500">
                    {claim.packNo}
                  </Text>
                </Table.Cell>

                {/* 상품명 */}
                <Table.Cell>
                  <Text
                    fontSize="xs"
                    color="gray.800"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    title={claim.itemTitle}
                  >
                    {claim.itemTitle || "—"}
                  </Text>
                  {claim.sellerItemCode && (
                    <Text fontSize="xs" color="gray.400">
                      {claim.sellerItemCode}
                    </Text>
                  )}
                </Table.Cell>

                {/* 수량 */}
                <Table.Cell textAlign="right">
                  <Text fontSize="xs">{claim.orderQty}</Text>
                </Table.Cell>

                {/* 결제금액 */}
                <Table.Cell textAlign="right">
                  <Text fontSize="xs" fontFamily="mono">
                    {formatAmount(claim.paymentAmount, claim.currency)}
                  </Text>
                </Table.Cell>

                {/* 요청일 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.600">
                    {formatDate(claim.requestDate)}
                  </Text>
                </Table.Cell>

                {/* 완료일 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.600">
                    {formatDate(claim.cancelRefundDate)}
                  </Text>
                </Table.Cell>

                {/* 주문일 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.500">
                    {formatDate(claim.orderDate)}
                  </Text>
                </Table.Cell>

                {/* 구매자 */}
                <Table.Cell>
                  <Text
                    fontSize="xs"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {claim.buyer || "—"}
                  </Text>
                  {claim.buyerMobile && (
                    <Text fontSize="xs" color="gray.400">
                      {claim.buyerMobile}
                    </Text>
                  )}
                </Table.Cell>

                {/* 수취인 */}
                <Table.Cell>
                  <Text
                    fontSize="xs"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {claim.receiver || "—"}
                  </Text>
                  {claim.receiverMobile && (
                    <Text fontSize="xs" color="gray.400">
                      {claim.receiverMobile}
                    </Text>
                  )}
                </Table.Cell>

                {/* 사유 */}
                <Table.Cell>
                  <Text
                    fontSize="xs"
                    color="gray.600"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    title={claim.reason}
                  >
                    {claim.reason || "—"}
                  </Text>
                </Table.Cell>

                {/* 배송사/운송장 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.700">
                    {claim.deliveryCompany || "—"}
                  </Text>
                  {claim.trackingNo && (
                    <Text fontSize="xs" fontFamily="mono" color="gray.500">
                      {claim.trackingNo}
                    </Text>
                  )}
                </Table.Cell>

                {/* 반품배송사/운송장 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.700">
                    {claim.deliveryCompanyReturn || "—"}
                  </Text>
                  {claim.trackingNoReturn && (
                    <Text fontSize="xs" fontFamily="mono" color="gray.500">
                      {claim.trackingNoReturn}
                    </Text>
                  )}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
