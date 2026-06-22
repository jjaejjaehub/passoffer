import type { OrderStatus } from "@/shared/config";

export const STATUS_CONFIG = {
  신규: {
    label: "신규",
    colorScheme: "gray",
    nextLabel: "처리 시작",
  },
  처리중: {
    label: "처리중",
    colorScheme: "gray",
    nextLabel: "배송 준비",
  },
  배송준비: {
    label: "배송준비",
    colorScheme: "gray",
    nextLabel: "배송 처리",
  },
  배송중: {
    label: "배송중",
    colorScheme: "gray",
    nextLabel: "배송 완료",
  },
  완료: {
    label: "완료",
    colorScheme: "gray",
    nextLabel: "반품 접수",
  },
  취소: {
    label: "취소",
    colorScheme: "gray",
    nextLabel: null,
  },
  반품: {
    label: "반품",
    colorScheme: "gray",
    nextLabel: null,
  },
} as const satisfies Record<
  OrderStatus,
  { label: string; colorScheme: string; nextLabel: string | null }
>;

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  신규: ["처리중", "취소"],
  처리중: ["배송준비", "취소"],
  배송준비: ["배송중", "취소"],
  배송중: ["완료", "반품"],
  완료: ["반품"],
  취소: [],
  반품: [],
};

export const ORDER_STATUSES: OrderStatus[] = [
  "신규",
  "처리중",
  "배송준비",
  "배송중",
  "완료",
  "취소",
  "반품",
];
