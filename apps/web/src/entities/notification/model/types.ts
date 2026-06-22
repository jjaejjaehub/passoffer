export type NotificationChannel = "sms" | "kakao";
export type NotificationResult = "ok" | "warn" | "error";

export interface NotificationEvent {
  id: string;
  userId: string | null;
  orderId: string | null;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  payload: Record<string, string | number>;
  result: NotificationResult;
  errorMessage: string | null;
  vendorMessageId: string | null;
  renderedBody: string | null;
  sentAt: string;
  createdAt: string;
}

export interface SendNotificationInput {
  orderId?: string;
  channel: NotificationChannel;
  template: string;
  recipient?: string;
  body?: string;
  variables?: Record<string, string | number>;
}

export interface NotificationTemplateDef {
  key: string;
  label: string;
  channel: NotificationChannel;
  body: string;
  variables: { name: string; label: string; example?: string }[];
}

// 운영에서 자주 쓰는 템플릿 기본값. 사용자 정의 템플릿 추가는 후속 작업.
export const NOTIFICATION_TEMPLATES: NotificationTemplateDef[] = [
  {
    key: "sms.shipping_started",
    label: "[SMS] 출고 시작 안내",
    channel: "sms",
    body: "{{buyerName}}님, 주문하신 상품이 출고되었습니다. 운송장: {{trackingNo}}",
    variables: [
      { name: "buyerName", label: "구매자명", example: "홍길동" },
      { name: "trackingNo", label: "운송장번호", example: "1234567890" },
    ],
  },
  {
    key: "sms.delay_notice",
    label: "[SMS] 배송 지연 안내",
    channel: "sms",
    body: "{{buyerName}}님, 주문 {{orderNo}}의 배송이 {{newDate}}로 지연됩니다. 양해 부탁드립니다.",
    variables: [
      { name: "buyerName", label: "구매자명", example: "홍길동" },
      { name: "orderNo", label: "주문번호", example: "ORD-2026-0001" },
      { name: "newDate", label: "변경 발송예정일", example: "2026-06-20" },
    ],
  },
  {
    key: "kakao.shipping_started",
    label: "[카카오] 출고 시작 알림",
    channel: "kakao",
    body: "#{buyerName}님 주문하신 상품이 출고되었습니다.\n운송장: #{trackingNo}",
    variables: [
      { name: "buyerName", label: "구매자명", example: "홍길동" },
      { name: "trackingNo", label: "운송장번호", example: "1234567890" },
    ],
  },
  {
    key: "kakao.delay_notice",
    label: "[카카오] 배송 지연 알림",
    channel: "kakao",
    body: "#{buyerName}님, 주문 #{orderNo}의 배송이 #{newDate}로 지연됩니다.",
    variables: [
      { name: "buyerName", label: "구매자명", example: "홍길동" },
      { name: "orderNo", label: "주문번호", example: "ORD-2026-0001" },
      { name: "newDate", label: "변경 발송예정일", example: "2026-06-20" },
    ],
  },
];
