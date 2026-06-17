"use client";

import { Box, Flex, Skeleton, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Order } from "@/entities/order";
import { StatusBadge, useQoo10SetSendingInfo } from "@/entities/order";
import { useSaveShipDate } from "@/features/save-ship-date";
import { CHANNEL_CONFIG } from "@/shared/config";
import { ShipDateCell, TrackingInputCell, TruncatedCell } from "@/shared/ui";

export interface OrderTableProps {
  orders: Order[];
  isLoading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  showChannelColumn?: boolean;
  onOrderIdClick: (orderId: string) => void;
}

function PaymentBadge({ paymentDate }: { paymentDate?: string }): React.JSX.Element {
  const isPaid = Boolean(paymentDate && paymentDate !== "0" && paymentDate !== "");
  return isPaid ? (
    <Box
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      w={5}
      h={5}
      borderRadius="full"
      bg="gray.900"
      color="white"
      fontSize="10px"
      fontWeight="bold"
    >
      ✓
    </Box>
  ) : (
    <Box color="gray.300" fontSize="14px" textAlign="center">
      —
    </Box>
  );
}

export function OrderTable({
  orders,
  isLoading = false,
  selectedIds,
  onSelectionChange,
  showChannelColumn = true,
  onOrderIdClick,
}: OrderTableProps): React.JSX.Element {
  const tChannels = useTranslations("config.channels");
  const saveShipDate = useSaveShipDate();
  const setSendingInfo = useQoo10SetSendingInfo();

  const isAllSelected = useMemo(
    () => orders.length > 0 && selectedIds.length === orders.length,
    [orders, selectedIds],
  );
  const isIndeterminate = useMemo(
    () => selectedIds.length > 0 && selectedIds.length < orders.length,
    [orders, selectedIds],
  );

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      onSelectionChange(orders.map((order) => order.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleRowToggle = (orderId: string): void => {
    if (selectedIds.includes(orderId)) {
      onSelectionChange(selectedIds.filter((id) => id !== orderId));
    } else {
      onSelectionChange([...selectedIds, orderId]);
    }
  };

  if (isLoading) {
    return (
      <Box p={4}>
        {["s1", "s2", "s3", "s4", "s5"].map((key) => (
          <Skeleton key={key} height="48px" borderRadius="md" mb={2} />
        ))}
      </Box>
    );
  }

  const formatDate = (value?: string): string => {
    if (!value) return "—";
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatPriceWithCurrency = (amount: number | undefined, currency: Order["currency"]): string => {
    if (amount === undefined) return "—";
    if (currency === "JPY") {
      return `¥${amount.toLocaleString("ja-JP")}`;
    }
    if (currency === "USD") {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₩${amount.toLocaleString("ko-KR")}`;
  };

  return (
    <Box w="100%" overflowX="auto">
      <Box as="table" w="max-content" minW="100%" fontSize="sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <Box
          as="thead"
          bg="white"
          position="sticky"
          top={0}
          zIndex={1}
          boxShadow="inset 0 -1px 0 var(--chakra-colors-gray-100)"
        >
          <Box as="tr">
            <Box as="th" px={4} py={3} textAlign="left" whiteSpace="nowrap" minW="40px" w="40px">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(element: HTMLInputElement | null) => {
                  if (element) {
                    // 네이티브 체크박스 indeterminate 상태 표현
                    // eslint-disable-next-line no-param-reassign
                    element.indeterminate = isIndeterminate;
                  }
                }}
                onChange={(event) => handleSelectAll(event.target.checked)}
              />
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="120px"
              w="120px"
            >
              주문번호
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="100px"
              w="100px"
            >
              상태
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="center"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="64px"
              w="64px"
            >
              결제
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="110px"
              w="110px"
            >
              주문일
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="110px"
              w="110px"
            >
              결제일
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="110px"
              w="110px"
            >
              발송예정일
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="200px"
              w="200px"
            >
              상품명
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="60px"
              w="60px"
            >
              수량
            </Box>
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="right"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="90px"
              w="90px"
            >
              정산금액
            </Box>
            {/* 결제수단 / 수취인 / 주소 / 연락처 / 희망배송일 / 배송메시지 / 택배사 컬럼 제거 */}
            <Box
              as="th"
              px={4}
              py={3}
              textAlign="left"
              fontSize="xs"
              color="gray.500"
              whiteSpace="nowrap"
              minW="140px"
              w="140px"
            >
              운송장번호
            </Box>
            {showChannelColumn && (
              <Box
                as="th"
                px={4}
                py={3}
                textAlign="left"
                fontSize="xs"
                color="gray.500"
                whiteSpace="nowrap"
                minW="90px"
                w="90px"
              >
                채널
              </Box>
            )}
          </Box>
        </Box>

        <Box as="tbody">
          {orders.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            const channel = CHANNEL_CONFIG[order.channelId];
            let channelName: string = channel?.name ?? order.channelId;
            try {
              channelName = tChannels(`${order.channelId}.name`);
            } catch {
              channelName = channel?.name ?? order.channelId;
            }
            const primaryItem = order.items[0];
            const orderIdValue = order.channelOrderId;
            // 수취인 관련 필드는 리스트 테이블에서 사용하지 않고 주문 상세 Drawer에서만 사용

            return (
              <Box
                as="tr"
                key={order.id}
                bg={isSelected ? "gray.50" : "white"}
                _hover={{ bg: "gray.50" }}
                borderBottomWidth="1px"
                borderColor="gray.100"
              >
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="40px" w="40px">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleRowToggle(order.id)}
                  />
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  maxW={0}
                  overflow="hidden"
                  minW="120px"
                  w="120px"
                >
                  <button
                    type="button"
                    onClick={() => onOrderIdClick(order.id)}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      color: "#111827",
                      textDecoration: "underline",
                      textDecorationColor: "#d1d5db",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {orderIdValue}
                  </button>
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="100px" w="100px">
                  <StatusBadge status={order.status} />
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" textAlign="center" minW="64px" w="64px">
                  <PaymentBadge paymentDate={order.paymentDate} />
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="110px" w="110px">
                  <Text fontSize="sm" color="gray.700">{formatDate(order.orderedAt)}</Text>
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="110px" w="110px">
                  <Text fontSize="sm" color="gray.700">{formatDate(order.paymentDate)}</Text>
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="110px" w="110px">
                  <ShipDateCell
                    orderId={order.id}
                    value={order.shipDate ?? null}
                    isDisabled={saveShipDate.isPending}
                    onChange={(date) => {
                      saveShipDate.mutate({
                        channelOrderId: order.channelOrderId ?? order.id,
                        channelType: order.channelId ?? 'qoo10',
                        shipDate: date,
                      });
                    }}
                  />
                </Box>
                <Box
                  as="td"
                  px={4}
                  py={3}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  maxW="200px"
                  minW="200px"
                  w="200px"
                >
                  {primaryItem && (
                    <TruncatedCell
                      value={`${primaryItem.productName}${primaryItem.option ? ` [${primaryItem.option}]` : ""}`}
                      maxW="200px"
                    />
                  )}
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="60px" w="60px">
                  <Text fontSize="sm" color="gray.700">{primaryItem?.quantity ?? 0}</Text>
                </Box>
                <Box as="td" px={4} py={3} textAlign="right" whiteSpace="nowrap" minW="90px" w="90px">
                  <Text fontWeight="medium" color="gray.900">
                    {formatPriceWithCurrency(order.settlePrice, order.currency)}
                  </Text>
                </Box>
                <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="140px" w="140px">
                  <TrackingInputCell
                    orderId={order.id}
                    channelId={order.channelId}
                    shipDate={order.shipDate ?? null}
                    existingCarrierId={order.carrierId ?? undefined}
                    existingTrackingNumber={order.trackingNumber ?? undefined}
                    onSave={async ({ carrierId, trackingNumber }) => {
                      if (order.channelId === 'qoo10' && order.channelOrderId) {
                        await setSendingInfo.mutateAsync({
                          orderNo: String(order.packNo ?? order.channelOrderId),
                          shippingCorp: carrierId,
                          trackingNo: trackingNumber,
                        });
                      }
                      return { success: true };
                    }}
                    onCancel={() => {}}
                  />
                </Box>
                {showChannelColumn && (
                  <Box as="td" px={4} py={3} whiteSpace="nowrap" minW="90px" w="90px">
                    <Flex align="center" gap={2}>
                      <Box
                        w={5}
                        h={5}
                        borderRadius="sm"
                        borderWidth="1px"
                        borderColor="gray.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="xs"
                        fontWeight="bold"
                        color="gray.600"
                      >
                        {channel?.initial ?? order.channelId[0]?.toUpperCase()}
                      </Box>
                      <Text fontSize="sm" color="gray.700">
                        {channelName}
                      </Text>
                    </Flex>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
