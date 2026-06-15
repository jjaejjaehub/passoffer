"use client";

import { Box, Table, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

import type { ShopifyReturnItem } from "@/entities/order";

// ─── 상태 색상 ─────────────────────────────────────────────────

const RETURN_STATUS_COLOR: Record<
  string,
  { bg: string; color: string }
> = {
  OPEN: { bg: "blue.50", color: "blue.700" },
  REQUESTED: { bg: "orange.50", color: "orange.700" },
  DECLINED: { bg: "red.50", color: "red.700" },
  CLOSED: { bg: "green.50", color: "green.700" },
  CANCELLED: { bg: "gray.100", color: "gray.600" },
};

const STATUS_KEYS = new Set(["OPEN", "REQUESTED", "DECLINED", "CLOSED", "CANCELLED"]);
const REASON_KEYS = new Set([
  "UNKNOWN",
  "SIZE_TOO_SMALL",
  "SIZE_TOO_LARGE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "DEFECTIVE",
  "STYLE",
  "COLOR",
  "MISSING_ITEM",
  "OTHER",
]);

// ─── 서브 컴포넌트 ─────────────────────────────────────────────

function ReturnStatusBadge({ status }: { status: string }): React.JSX.Element {
  const t = useTranslations("widgets.shopifyReturnTable.statuses");
  const label = STATUS_KEYS.has(status) ? t(status) : status;
  const colors = RETURN_STATUS_COLOR[status] ?? { bg: "gray.100", color: "gray.600" };
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      borderRadius="md"
      bg={colors.bg}
      fontSize="xs"
      fontWeight="medium"
      color={colors.color}
      whiteSpace="nowrap"
    >
      {label}
    </Box>
  );
}

// ─── Props ─────────────────────────────────────────────────────

interface ShopifyReturnTableProps {
  returns: ShopifyReturnItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRowClick?: (item: ShopifyReturnItem) => void;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────

export function ShopifyReturnTable({
  returns,
  selectedIds,
  onSelectionChange,
  onRowClick,
}: ShopifyReturnTableProps): React.JSX.Element {
  const t = useTranslations("widgets.shopifyReturnTable");
  const tReasons = useTranslations("widgets.shopifyReturnTable.reasons");
  const isAllSelected = returns.length > 0 && selectedIds.length === returns.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < returns.length;

  const handleSelectAll = (checked: boolean): void => {
    onSelectionChange(checked ? returns.map((r) => r.returnId) : []);
  };

  const handleSelectOne = (returnId: string, checked: boolean): void => {
    onSelectionChange(
      checked
        ? [...selectedIds, returnId]
        : selectedIds.filter((id) => id !== returnId),
    );
  };

  if (returns.length === 0) {
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
        style={{ tableLayout: "fixed", minWidth: "1100px" }}
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
            <Table.ColumnHeader w="120px">{t("columns.status")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.returnNo")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.orderNo")}</Table.ColumnHeader>
            <Table.ColumnHeader w="200px">{t("columns.productName")}</Table.ColumnHeader>
            <Table.ColumnHeader w="60px" textAlign="right">{t("columns.quantity")}</Table.ColumnHeader>
            <Table.ColumnHeader w="120px" textAlign="right">{t("columns.refundAmount")}</Table.ColumnHeader>
            <Table.ColumnHeader w="160px">{t("columns.reason")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.requestedAt")}</Table.ColumnHeader>
            <Table.ColumnHeader w="100px">{t("columns.completedAt")}</Table.ColumnHeader>
            <Table.ColumnHeader w="140px">{t("columns.buyer")}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {returns.map((ret) => {
            const isSelected = selectedIds.includes(ret.returnId);
            const firstLineItem = ret.lineItems[0];
            const extraCount = ret.lineItems.length - 1;
            const firstReason = firstLineItem?.returnReason;
            const reasonLabel = firstReason
              ? (REASON_KEYS.has(firstReason) ? tReasons(firstReason) : firstReason)
              : null;
            const reasonNote = firstLineItem?.returnReasonNote ?? firstLineItem?.customerNote ?? null;

            return (
              <Table.Row
                key={ret.returnId}
                bg={isSelected ? "blue.50" : "white"}
                _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                cursor={onRowClick ? "pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(ret) : undefined}
              >
                {/* 체크박스 */}
                <Table.Cell textAlign="center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleSelectOne(ret.returnId, e.target.checked)
                    }
                  />
                </Table.Cell>

                {/* 반품 상태 */}
                <Table.Cell>
                  <ReturnStatusBadge status={ret.status} />
                </Table.Cell>

                {/* 반품번호 */}
                <Table.Cell>
                  <Text fontFamily="mono" fontSize="xs" color="gray.700">
                    {ret.returnName}
                  </Text>
                </Table.Cell>

                {/* 주문번호 */}
                <Table.Cell>
                  <Text fontFamily="mono" fontSize="xs" color="gray.500">
                    {ret.orderName}
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
                    title={firstLineItem?.lineItemName}
                  >
                    {firstLineItem?.lineItemName ?? "—"}
                  </Text>
                  {extraCount > 0 && (
                    <Text fontSize="xs" color="gray.400">
                      {t("extraItems", { count: extraCount })}
                    </Text>
                  )}
                  {firstLineItem?.lineItemSku && (
                    <Text fontSize="xs" color="gray.400">
                      {firstLineItem.lineItemSku}
                    </Text>
                  )}
                </Table.Cell>

                {/* 수량 */}
                <Table.Cell textAlign="right">
                  <Text fontSize="xs">
                    {ret.lineItems.reduce((s, li) => s + li.quantity, 0)}
                  </Text>
                </Table.Cell>

                {/* 환불금액 */}
                <Table.Cell textAlign="right">
                  <Text fontSize="xs" fontFamily="mono">
                    {parseFloat(ret.totalRefunded) > 0
                      ? `${parseFloat(ret.totalRefunded).toLocaleString()} ${ret.currencyCode}`
                      : "—"}
                  </Text>
                </Table.Cell>

                {/* 반품 사유 */}
                <Table.Cell>
                  {reasonLabel && (
                    <Text fontSize="xs" color="gray.700" fontWeight="medium">
                      {reasonLabel}
                    </Text>
                  )}
                  {reasonNote && (
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      title={reasonNote}
                    >
                      {reasonNote}
                    </Text>
                  )}
                  {!reasonLabel && !reasonNote && (
                    <Text fontSize="xs" color="gray.400">—</Text>
                  )}
                </Table.Cell>

                {/* 요청일 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.600">
                    {ret.createdAt.slice(0, 10)}
                  </Text>
                </Table.Cell>

                {/* 완료일 */}
                <Table.Cell>
                  <Text fontSize="xs" color="gray.600">
                    {ret.closedAt ? ret.closedAt.slice(0, 10) : "—"}
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
                    {ret.customerName ?? "—"}
                  </Text>
                  {ret.customerEmail && (
                    <Text fontSize="xs" color="gray.400">
                      {ret.customerEmail}
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
