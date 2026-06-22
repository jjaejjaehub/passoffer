"use client";

import { useState } from "react";
import { Box, Button, Dialog, Flex, Portal, Text } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import {
  CHANNEL_CONFIG,
  type ChannelId,
  FULFILLMENT_RANK_LABEL,
  type FulfillmentRank,
  HOLD_LABEL,
  SEMANTIC_LABEL,
} from "@/shared/config";
import type { OrderListItem } from "@/entities/order";
import { SendNotificationModal } from "@/features/send-notification";

interface OrderDetailModalProps {
  order: OrderListItem | null;
  open: boolean;
  onClose: () => void;
}

type FieldDef = {
  key: keyof OrderListItem;
  label: string;
  format?: (v: unknown, row: OrderListItem) => string;
};

type SectionDef = {
  id: string;
  title: string;
  fields: FieldDef[];
};

function formatDate(v: unknown): string {
  if (!v) return "—";
  return String(v).slice(0, 19).replace("T", " ");
}

function formatBool(v: unknown): string {
  if (v === true) return "예";
  if (v === false) return "아니오";
  return "—";
}

function formatMoney(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v as string | number);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString();
}

function makeFormatChannel(
  tChannels: (key: string) => string,
): (v: unknown) => string {
  return (v: unknown) => {
    if (!v) return "—";
    const id = v as ChannelId;
    try {
      return tChannels(`${id}.name`);
    } catch {
      return CHANNEL_CONFIG[id]?.name ?? String(v);
    }
  };
}

function makeFormatFulfillment(
  tRank: (key: string) => string,
): (v: unknown) => string {
  return (v: unknown) => {
    if (v === null || v === undefined) return "—";
    const k = v as FulfillmentRank;
    try {
      return tRank(String(k));
    } catch {
      return FULFILLMENT_RANK_LABEL[k] ?? String(v);
    }
  };
}

function makeFormatHold(
  tHold: (key: string) => string,
): (v: unknown) => string {
  return (v: unknown) => {
    if (!v) return "—";
    const key = String(v) as keyof typeof HOLD_LABEL;
    try {
      return tHold(key);
    } catch {
      return HOLD_LABEL[key] ?? String(v);
    }
  };
}

function makeFormatSemantic(
  tSemantic: (key: string) => string,
): (v: unknown) => string {
  return (v: unknown) => {
    if (!v) return "—";
    const key = String(v) as keyof typeof SEMANTIC_LABEL;
    try {
      return tSemantic(key);
    } catch {
      return SEMANTIC_LABEL[key] ?? String(v);
    }
  };
}

function buildSections(formatters: {
  channel: (v: unknown) => string;
  fulfillment: (v: unknown) => string;
  hold: (v: unknown) => string;
  semantic: (v: unknown) => string;
}): SectionDef[] {
  return [
    {
      id: "identity",
      title: "주문 식별",
      fields: [
        { key: "channelId", label: "채널", format: formatters.channel },
        { key: "channelOrderId", label: "주문번호" },
        { key: "channelPackNo", label: "팩번호" },
        { key: "channelItemNo", label: "상품번호" },
        { key: "channelAccountId", label: "채널 계정" },
        { key: "relatedOrders", label: "연관 주문" },
      ],
    },
    {
      id: "buyer",
      title: "구매자",
      fields: [
        { key: "buyerName", label: "이름" },
        { key: "buyerKana", label: "카나" },
        { key: "buyerTel", label: "전화" },
        { key: "buyerMobile", label: "휴대전화" },
        { key: "buyerEmail", label: "이메일" },
        { key: "buyerLanguage", label: "언어" },
      ],
    },
    {
      id: "receiver",
      title: "수령인",
      fields: [
        { key: "receiverName", label: "이름" },
        { key: "receiverKana", label: "카나" },
        { key: "receiverTel", label: "전화" },
        { key: "receiverMobile", label: "휴대전화" },
        { key: "receiverEmail", label: "이메일" },
        { key: "zipCode", label: "우편번호" },
        { key: "shippingAddress", label: "주소" },
        { key: "address1", label: "주소1" },
        { key: "address2", label: "주소2" },
        { key: "receiverCountry", label: "국가" },
        { key: "desiredDeliveryDate", label: "희망배송일", format: formatDate },
      ],
    },
    {
      id: "sender",
      title: "발송인",
      fields: [
        { key: "senderName", label: "이름" },
        { key: "senderTel", label: "전화" },
        { key: "senderNation", label: "국가" },
        { key: "senderZipCode", label: "우편번호" },
        { key: "senderAddress", label: "주소" },
      ],
    },
    {
      id: "payment",
      title: "결제",
      fields: [
        { key: "orderedAt", label: "주문일시", format: formatDate },
        { key: "paidAt", label: "결제일시", format: formatDate },
        { key: "paymentMethod", label: "결제수단" },
        { key: "currency", label: "통화" },
        { key: "orderPrice", label: "상품금액", format: formatMoney },
        { key: "discount", label: "할인", format: formatMoney },
        { key: "cartDiscountSeller", label: "셀러할인", format: formatMoney },
        { key: "cartDiscountChannel", label: "채널할인", format: formatMoney },
        { key: "total", label: "최종금액", format: formatMoney },
      ],
    },
    {
      id: "fulfillment",
      title: "출고/배송",
      fields: [
        { key: "shippingWay", label: "배송방법" },
        { key: "shippingMessage", label: "배송메모" },
        { key: "shippingRate", label: "배송비", format: formatMoney },
        { key: "shippingRateType", label: "배송비유형" },
        { key: "shippingDueDate", label: "출고기한", format: formatDate },
        { key: "shippedAt", label: "출고일시", format: formatDate },
        { key: "deliveredAt", label: "배송완료일시", format: formatDate },
        { key: "trackingCarrier", label: "택배사" },
        { key: "trackingNo", label: "송장번호" },
        { key: "trackingConflict", label: "송장충돌", format: formatBool },
      ],
    },
    {
      id: "status",
      title: "상태",
      fields: [
        {
          key: "fulfillmentStatus",
          label: "이행상태",
          format: formatters.fulfillment,
        },
        { key: "claimStatus", label: "클레임상태" },
        {
          key: "displayStatus",
          label: "표시상태",
          format: formatters.semantic,
        },
        { key: "isDispatchDelayed", label: "출고지연", format: formatBool },
        { key: "dispatchHoldReason", label: "출고보류 사유" },
        { key: "syncLocked", label: "동기화 잠금", format: formatBool },
        { key: "holdStatus", label: "보류구분", format: formatters.hold },
        {
          key: "heldFromStatus",
          label: "보류 직전 상태",
          format: formatters.fulfillment,
        },
      ],
    },
    {
      id: "claim",
      title: "클레임",
      fields: [
        { key: "claimType", label: "유형" },
        { key: "claimReason", label: "사유" },
        { key: "claimRequestedAt", label: "요청일", format: formatDate },
        { key: "claimResolvedAt", label: "해결일", format: formatDate },
        { key: "returnTrackingNo", label: "반품송장" },
      ],
    },
    {
      id: "bundle",
      title: "묶음",
      fields: [
        { key: "bundleNumber", label: "묶음번호" },
        { key: "bundleable", label: "묶음가능", format: formatBool },
        { key: "bundleRoleIsPrimary", label: "대표주문", format: formatBool },
        { key: "autoMatched", label: "자동매칭", format: formatBool },
        { key: "matchedBy", label: "매칭자" },
      ],
    },
    {
      id: "audit",
      title: "감사 로그",
      fields: [
        { key: "createdAt", label: "생성일시", format: formatDate },
        { key: "updatedAt", label: "수정일시", format: formatDate },
      ],
    },
  ];
}

function renderValue(field: FieldDef, row: OrderListItem): string {
  const v = row[field.key];
  if (field.format) return field.format(v, row);
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return formatBool(v);
  if (typeof v === "object") return "—";
  return String(v);
}

export function OrderDetailModal({
  order,
  open,
  onClose,
}: OrderDetailModalProps): React.JSX.Element | null {
  const tChannels = useTranslations("config.channels");
  const tRank = useTranslations("config.fulfillmentRank");
  const tHold = useTranslations("config.hold");
  const tSemantic = useTranslations("config.semantic");

  const formatChannel = makeFormatChannel((k: string) => tChannels(k as never));
  const formatFulfillment = makeFormatFulfillment((k: string) =>
    tRank(k as never),
  );
  const formatHold = makeFormatHold((k: string) => tHold(k as never));
  const formatSemantic = makeFormatSemantic((k: string) =>
    tSemantic(k as never),
  );

  const sections = buildSections({
    channel: formatChannel,
    fulfillment: formatFulfillment,
    hold: formatHold,
    semantic: formatSemantic,
  });

  const [notifyOpen, setNotifyOpen] = useState(false);

  if (!order) return null;

  const defaultRecipient =
    order.buyerMobile ??
    order.buyerTel ??
    order.receiverMobile ??
    order.receiverTel ??
    "";
  const defaultVariables: Record<string, string> = {
    buyerName: order.buyerName ?? "",
    orderNo: order.channelOrderId ?? "",
    trackingNo: order.trackingNo ?? "",
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="1000px" w="92vw">
            <Dialog.Header>
              <Flex align="center" justify="space-between" w="100%" gap={3}>
                <Flex direction="column" gap={1}>
                  <Text fontSize="sm" color="gray.500">
                    {formatChannel(order.channelId)} · {order.channelOrderId}
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {order.buyerName ?? "(구매자 없음)"} ·{" "}
                    {formatFulfillment(order.fulfillmentStatus)}
                  </Text>
                </Flex>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => setNotifyOpen(true)}
                >
                  알림 발송
                </Button>
              </Flex>
              <Dialog.CloseTrigger />
            </Dialog.Header>

            <Dialog.Body maxH="70vh" overflowY="auto">
              <Flex direction="column" gap={5}>
                {sections.map((section) => (
                  <Box key={section.id}>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.500"
                      mb={2}
                      letterSpacing="0.04em"
                      textTransform="uppercase"
                    >
                      {section.title}
                    </Text>
                    <Box
                      bg="gray.50"
                      borderRadius="md"
                      p={3}
                      display="grid"
                      gridTemplateColumns="repeat(2, 1fr)"
                      gap={2}
                    >
                      {section.fields.map((field) => (
                        <Flex
                          key={String(field.key)}
                          align="baseline"
                          gap={2}
                          fontSize="xs"
                        >
                          <Text color="gray.500" minW="90px">
                            {field.label}
                          </Text>
                          <Text color="gray.800" wordBreak="break-all">
                            {renderValue(field, order)}
                          </Text>
                        </Flex>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
      <SendNotificationModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        orderId={order.id}
        defaultRecipient={defaultRecipient || undefined}
        defaultVariables={defaultVariables}
      />
    </Dialog.Root>
  );
}
