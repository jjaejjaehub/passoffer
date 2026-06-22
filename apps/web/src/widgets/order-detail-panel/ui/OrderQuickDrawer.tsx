"use client";

import {
  Box,
  Button,
  Flex,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";

import type { Order } from "@/entities/order";
import { ClaimStatusBadge, StatusBadge } from "@/entities/order";
import { useQoo10OrderDetail } from "@/entities/order";
import type { OrderStatus } from "@/shared/config";
import { CHANNEL_CONFIG } from "@/shared/config";
import { useChannelUuid } from "@/entities/channel";

interface OrderQuickDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}): React.JSX.Element => (
  <Flex fontSize="sm">
    <Text width="140px" color="gray.500" flexShrink={0}>
      {label}
    </Text>
    <Text flex="1" color="gray.800">
      {value ?? "—"}
    </Text>
  </Flex>
);

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <Box
    border="1px solid"
    borderColor="gray.200"
    borderRadius="md"
    overflow="hidden"
  >
    <Box
      px={4}
      py={2}
      bg="gray.50"
      borderBottom="1px solid"
      borderColor="gray.200"
    >
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="gray.500"
        letterSpacing="wide"
      >
        {title}
      </Text>
    </Box>
    <Box px={4} py={3}>
      <Stack gap={1}>{children}</Stack>
    </Box>
  </Box>
);

export function OrderQuickDrawer({
  open,
  onOpenChange,
  order,
}: OrderQuickDrawerProps): React.JSX.Element | null {
  const qoo10ChannelUuid = useChannelUuid("qoo10");
  const isQoo10Channel =
    !!order && !!qoo10ChannelUuid && order.channelId === qoo10ChannelUuid;

  // Qoo10 채널만 상세 API 조회 (Shopee 등 타 채널은 Order 객체 데이터로 표시)
  const { data: detail, isLoading: isDetailLoading } = useQoo10OrderDetail(
    open && order && isQoo10Channel ? order.channelOrderId : null,
  );

  if (!open || !order) return null;

  const channel = CHANNEL_CONFIG[order.channelId];

  // COD 관련 데이터가 있는지 여부
  const hasCodInfo =
    detail &&
    (detail.cod_price > 0 ||
      detail.CODCancelPrice > 0 ||
      detail.CODQrefundPrice > 0);

  // 미수취 신고 데이터가 있는지 여부
  const hasNrInfo = detail && !!detail.nrDutyTarget;

  // 반품 수거지 데이터가 있는지 여부
  const hasReturnPickup =
    detail && (!!detail.pickupAddress || !!detail.pickupzipCode);

  return (
    <>
      {/* 배경 오버레이 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 29,
            }}
            onClick={() => onOpenChange(false)}
          />
        )}
      </AnimatePresence>

      {/* 중앙 모달 패널 */}
      <Box
        position="fixed"
        inset={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={{ base: 0, sm: 4 }}
        zIndex={30}
      >
        <Box
          width={{ base: "100%", sm: "78vw", md: "58vw", lg: "640px" }}
          maxW="640px"
          height={{ base: "100%", sm: "auto" }}
          maxH={{ base: "100%", sm: "90vh" }}
          bg="white"
          borderWidth={{ base: 0, sm: "1px" }}
          borderColor="gray.200"
          borderRadius={{ base: "none", sm: "lg" }}
          boxShadow="lg"
          display="flex"
          flexDirection="column"
          onClick={(event) => event.stopPropagation()}
        >
          {/* 헤더 */}
          <Flex
            px={4}
            py={3}
            borderBottomWidth="1px"
            borderColor="gray.200"
            align="center"
            gap={2}
          >
            <Text fontSize="md" fontWeight="semibold">
              주문 상세
            </Text>
            {isDetailLoading && <Spinner size="xs" color="gray.400" />}
            <Box flex="1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
          </Flex>

          <Box px={4} py={4} overflowY="auto" flex="1">
            {/* 헤더 요약 */}
            <Box mb={6}>
              <Text fontFamily="mono" fontSize="lg" fontWeight="bold" mb={1}>
                {order.packNo ?? order.channelOrderId}
              </Text>
              <Flex align="center" gap={2} mb={2} wrap="wrap">
                <StatusBadge status={order.status} />
                {detail?.claimStatus && (
                  <ClaimStatusBadge status={detail.claimStatus} />
                )}
                <Box
                  px={2}
                  py={1}
                  borderWidth="1px"
                  borderRadius="full"
                  borderColor="gray.200"
                  fontSize="xs"
                  color="gray.700"
                >
                  {channel?.name ?? order.channelId}
                </Box>
                {detail?.OrderType && (
                  <Box
                    px={2}
                    py={1}
                    borderWidth="1px"
                    borderRadius="full"
                    borderColor="blue.100"
                    bg="blue.50"
                    fontSize="xs"
                    color="blue.700"
                  >
                    {detail.OrderType}
                  </Box>
                )}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                주문일: {formatDate(order.orderedAt)} / 결제일:{" "}
                {formatDate(order.paymentDate)}
                {detail?.DeliveredDate && (
                  <> / 배송완료일: {formatDate(detail.DeliveredDate)}</>
                )}
              </Text>
            </Box>

            <Stack gap={4}>
              {/* 구매자 연락처 */}
              <SectionCard title="구매자 연락처">
                <InfoRow label="구매자" value={order.buyerName} />
                <InfoRow label="구매자(카타카나)" value={order.buyerKana} />
                <InfoRow
                  label="전화번호"
                  value={order.buyerTel ?? order.buyerPhone}
                />
                <InfoRow label="휴대폰" value={order.buyerMobile} />
                <InfoRow label="이메일" value={order.buyerEmail} />
              </SectionCard>

              {/* 배송지 상세 */}
              <SectionCard title="배송지 상세">
                <InfoRow
                  label="배송지 국가"
                  value={detail?.shippingCountry ?? "—"}
                />
                <InfoRow label="전체 주소" value={order.shippingAddress} />
                <InfoRow label="Address1" value={order.address1} />
                <InfoRow label="Address2" value={order.address2} />
                <InfoRow label="우편번호" value={order.zipCode} />
                <InfoRow label="수취인" value={order.receiver} />
                <InfoRow label="수취인(카타카나)" value={order.receiverKana} />
                <InfoRow label="수취인 전화" value={order.receiverTel} />
                <InfoRow label="수취인 휴대폰" value={order.receiverMobile} />
                <InfoRow
                  label="배송 희망일"
                  value={order.desiredDeliveryDate}
                />
                <InfoRow label="배송 메시지" value={order.shippingMessage} />
              </SectionCard>

              {/* 결제 상세 */}
              <SectionCard title="결제 상세">
                <InfoRow
                  label="주문 국가"
                  value={detail?.paymentNation ?? "—"}
                />
                <InfoRow label="결제수단" value={order.paymentMethod} />
                <InfoRow
                  label="상품 금액"
                  value={
                    order.orderPrice !== undefined
                      ? `${order.orderPrice.toLocaleString()} ${order.currency}`
                      : undefined
                  }
                />
                <InfoRow
                  label="할인"
                  value={
                    order.discount !== undefined
                      ? `${order.discount.toLocaleString()} ${order.currency}`
                      : undefined
                  }
                />
                <InfoRow
                  label="실 주문 금액"
                  value={`${order.totalAmount.toLocaleString()} ${order.currency}`}
                />
                <InfoRow
                  label="정산 금액"
                  value={
                    order.settlePrice !== undefined
                      ? `${order.settlePrice.toLocaleString()} ${order.currency}`
                      : undefined
                  }
                />
                <InfoRow
                  label="장바구니 할인(셀러)"
                  value={
                    order.cartDiscountSeller !== undefined
                      ? `${order.cartDiscountSeller.toLocaleString()} ${order.currency}`
                      : undefined
                  }
                />
                <InfoRow
                  label="장바구니 할인(Qoo10)"
                  value={
                    order.cartDiscountQoo10 !== undefined
                      ? `${order.cartDiscountQoo10.toLocaleString()} ${order.currency}`
                      : undefined
                  }
                />
                <InfoRow label="배송비 타입" value={order.shippingRateType} />
              </SectionCard>

              {/* 발신자 정보 */}
              <SectionCard title="발신자 정보">
                <InfoRow label="발신자명" value={order.senderName} />
                <InfoRow label="전화번호" value={order.senderTel} />
                <InfoRow label="국가" value={order.senderNation} />
                <InfoRow label="우편번호" value={order.senderZipCode} />
                <InfoRow label="주소" value={order.senderAddress} />
              </SectionCard>

              {/* 배송 상세 */}
              <SectionCard title="배송 상세">
                <InfoRow label="배송방법" value={order.shippingWay} />
                <InfoRow
                  label="배송사"
                  value={detail?.deliveryCompany ?? order.carrierId ?? "—"}
                />
                <InfoRow
                  label="운송장 번호"
                  value={detail?.trackingNo ?? order.trackingNumber ?? "—"}
                />
                <InfoRow
                  label="발송일"
                  value={formatDate(
                    detail?.shippingDate ?? order.shipDate ?? undefined,
                  )}
                />
                <InfoRow
                  label="배송완료일"
                  value={formatDate(detail?.DeliveredDate)}
                />
                <InfoRow label="Packing No" value={order.packingNo} />
                <InfoRow label="셀러 배송번호" value={order.sellerDeliveryNo} />
              </SectionCard>

              {/* COD 정보 (착불 주문일 때만) */}
              {hasCodInfo && (
                <SectionCard title="COD(착불) 정보">
                  <InfoRow
                    label="착불 결제금액"
                    value={
                      detail.cod_price > 0
                        ? `${detail.cod_price.toLocaleString()} ${detail.currency}`
                        : undefined
                    }
                  />
                  <InfoRow
                    label="COD 환불금액"
                    value={
                      detail.CODCancelPrice > 0
                        ? `${detail.CODCancelPrice.toLocaleString()} ${detail.currency}`
                        : undefined
                    }
                  />
                  <InfoRow
                    label="Q통장 환불금액"
                    value={
                      detail.CODQrefundPrice > 0
                        ? `${detail.CODQrefundPrice.toLocaleString()} ${detail.currency}`
                        : undefined
                    }
                  />
                  <InfoRow
                    label="관련 주문"
                    value={detail.CODCancelRelatedOrder}
                  />
                </SectionCard>
              )}

              {/* 클레임/반품 */}
              {(order.claimStatus ?? detail?.claimStatus) && (
                <SectionCard title="클레임/반품">
                  <InfoRow
                    label="클레임 상태"
                    value={detail?.claimStatus ?? order.claimStatus}
                  />
                  <InfoRow
                    label="사유"
                    value={detail?.reason ?? order.reason}
                  />
                  <InfoRow
                    label="요청일"
                    value={detail?.requestDate ?? order.requestDate}
                  />
                  <InfoRow
                    label="취소/환불 완료일"
                    value={detail?.cancelRefundDate ?? order.cancelRefundDate}
                  />
                  <InfoRow
                    label="반품 택배사"
                    value={
                      detail?.deliveryCompanyReturn ??
                      order.deliveryCompanyReturn
                    }
                  />
                  <InfoRow
                    label="반품 운송장 번호"
                    value={detail?.trackingNoReturn ?? order.trackingNoReturn}
                  />
                  {hasReturnPickup && (
                    <>
                      <InfoRow
                        label="수거지 우편번호"
                        value={detail?.pickupzipCode}
                      />
                      <InfoRow
                        label="수거지 주소"
                        value={detail?.pickupAddress}
                      />
                    </>
                  )}
                  {detail?.paymentReturnShipping && (
                    <InfoRow
                      label="반품배송비 지불"
                      value={detail.paymentReturnShipping}
                    />
                  )}
                  {detail?.itemCondition && (
                    <InfoRow
                      label="반품 상품 상태"
                      value={detail.itemCondition}
                    />
                  )}
                </SectionCard>
              )}

              {/* 미수취 신고 */}
              {hasNrInfo && (
                <SectionCard title="미수취 신고">
                  <InfoRow
                    label="신고 사유"
                    value={
                      detail.nrDutyTarget === "SC"
                        ? "미수취"
                        : detail.nrDutyTarget === "SL"
                          ? "일부 미수취"
                          : detail.nrDutyTarget
                    }
                  />
                  <InfoRow
                    label="희망 처리"
                    value={
                      detail.nrSolType === "ND"
                        ? "재배송"
                        : detail.nrSolType === "NC"
                          ? "환불"
                          : detail.nrSolType
                    }
                  />
                  {detail.nrPartRefundCnt > 0 && (
                    <InfoRow
                      label="부분 환불 수량"
                      value={detail.nrPartRefundCnt}
                    />
                  )}
                  {detail.nrPartRefundBalance > 0 && (
                    <InfoRow
                      label="부분 환불 금액"
                      value={`${detail.nrPartRefundBalance.toLocaleString()} ${detail.currency}`}
                    />
                  )}
                </SectionCard>
              )}

              {/* 기타 */}
              <SectionCard title="기타">
                <SimpleGrid columns={1} gap={2}>
                  <InfoRow label="바우처 코드" value={order.voucherCode} />
                  <InfoRow label="기프트" value={order.gift} />
                  <InfoRow label="소재" value={order.material} />
                  <InfoRow label="지점명" value={order.branchName} />
                  <InfoRow label="Qoo10 상품번호" value={detail?.itemCode} />
                  <InfoRow label="셀러 상품코드" value={order.sellerItemCode} />
                  <InfoRow label="옵션 코드" value={order.optionCode} />
                  <InfoRow label="셀러 ID" value={order.sellerId} />
                </SimpleGrid>
              </SectionCard>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}
