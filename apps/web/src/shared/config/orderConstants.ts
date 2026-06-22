// 주문 fulfillment rank 라벨/색상 + 페이지·카운터 상수.
// rank 체계는 서버 RANK_TO_SEMANTIC 와 1:1 매칭 (apps/server/src/routes/orders/index.ts).

export const FULFILLMENT_RANKS = [
  10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90,
] as const;
export type FulfillmentRank = (typeof FULFILLMENT_RANKS)[number];

export const FULFILLMENT_RANK_LABEL: Record<FulfillmentRank, string> = {
  10: "결제완료",
  20: "신규주문",
  25: "주문보류",
  30: "발송준비",
  35: "발송보류",
  40: "송장출력",
  50: "발송완료",
  60: "배송중",
  70: "배송완료",
  80: "정산완료",
  90: "구매확정",
};

// 보조 라벨 (서버 의미 키 → 한글)
export const SEMANTIC_LABEL: Record<string, string> = {
  paid: "결제완료",
  new: "신규주문",
  hold_order: "주문보류",
  ready: "발송준비",
  hold_dispatch: "발송보류",
  label_printed: "송장출력",
  shipped: "발송완료",
  in_transit: "배송중",
  delivered: "배송완료",
  settled: "정산완료",
  completed: "구매확정",
  claim_any: "클레임",
  all: "전체",
};

// 보류 라벨 — holdStatus 컬럼 텍스트 → 한글
export const HOLD_LABEL: Record<string, string> = {
  order_hold: "주문보류",
  dispatch_hold: "발송보류",
};

// 페이지 사이즈 (기본 100)
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 300, 500] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 100;

// 4~5라인 카운터 — 라인 단위로 의미 묶음. status 칩 클릭 → rank 필터로 변환.
export interface CounterChip {
  key: string; // counts[key] 조회 키
  label: string;
  // 칩 클릭 시 status 필터에 들어갈 rank 배열 (undefined = 필터 해제, all)
  statusRanks?: number[];
  tone?: "neutral" | "blue" | "amber" | "green" | "red" | "violet";
}

export interface CounterLine {
  id: string;
  title: string;
  chips: CounterChip[];
}

export const COUNTER_LINES: CounterLine[] = [
  {
    id: "intake",
    title: "주문 접수",
    chips: [
      { key: "all", label: "전체", tone: "neutral" },
      { key: "paid", label: "결제완료", statusRanks: [10], tone: "blue" },
      { key: "new", label: "신규주문", statusRanks: [20], tone: "blue" },
      {
        key: "hold_order",
        label: "주문보류",
        statusRanks: [25],
        tone: "amber",
      },
    ],
  },
  {
    id: "dispatch",
    title: "출고",
    chips: [
      { key: "ready", label: "발송준비", statusRanks: [30], tone: "violet" },
      {
        key: "hold_dispatch",
        label: "발송보류",
        statusRanks: [35],
        tone: "amber",
      },
      {
        key: "label_printed",
        label: "송장출력",
        statusRanks: [40],
        tone: "violet",
      },
      { key: "shipped", label: "발송완료", statusRanks: [50], tone: "green" },
    ],
  },
  {
    id: "delivery",
    title: "배송",
    chips: [
      { key: "in_transit", label: "배송중", statusRanks: [60], tone: "blue" },
      { key: "delivered", label: "배송완료", statusRanks: [70], tone: "green" },
    ],
  },
  {
    id: "settle",
    title: "정산/완료",
    chips: [
      { key: "settled", label: "정산완료", statusRanks: [80], tone: "green" },
      { key: "completed", label: "구매확정", statusRanks: [90], tone: "green" },
      { key: "claim_any", label: "클레임", tone: "red" },
    ],
  },
];

// 헤더 라벨 — 기본 컬럼 8종
export const DEFAULT_COLUMN_LABELS = {
  orderedAt: "주문일",
  channelId: "채널",
  channelOrderId: "주문번호",
  buyerName: "구매자",
  productSummary: "상품",
  total: "금액",
  fulfillmentStatus: "상태",
  trackingNo: "송장",
} as const;

export type DefaultColumnKey = keyof typeof DEFAULT_COLUMN_LABELS;
export const DEFAULT_COLUMN_ORDER: DefaultColumnKey[] = [
  "orderedAt",
  "channelId",
  "channelOrderId",
  "buyerName",
  "productSummary",
  "total",
  "fulfillmentStatus",
  "trackingNo",
];

// 정렬 가능한 컬럼 — 서버 SORT_COLUMNS 와 동일 키
export const SORTABLE_FIELDS = [
  "orderedAt",
  "paidAt",
  "shippedAt",
  "fulfillmentStatus",
  "total",
  "channelOrderId",
  "createdAt",
  "updatedAt",
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const SORT_FIELD_LABEL: Record<SortableField, string> = {
  orderedAt: "주문일",
  paidAt: "결제일",
  shippedAt: "발송일",
  fulfillmentStatus: "상태 단계",
  total: "금액",
  channelOrderId: "주문번호",
  createdAt: "생성일",
  updatedAt: "수정일",
};

export const DATE_FIELD_OPTIONS = [
  { value: "orderedAt", label: "주문일" },
  { value: "paidAt", label: "결제일" },
  { value: "shippedAt", label: "발송일" },
] as const;
export type DateField = (typeof DATE_FIELD_OPTIONS)[number]["value"];

// localStorage 키 (preferences)
export const LS_KEYS = {
  pageSize: "oms.orders.pageSize",
  columnOrder: "oms.orders.columnOrder",
  columnVisibility: "oms.orders.columnVisibility",
  exposeAll65: "oms.orders.exposeAll65",
  sort: "oms.orders.sort",
} as const;
