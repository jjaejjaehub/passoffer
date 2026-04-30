export const ITEM_STATUSES = [
  "거래가능",
  "거래대기",
  "검수대기",
  "거래중지",
  "거래제한",
  "승인거부",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface Item {
  itemCode: string;
  sellerCode: string;
  status: ItemStatus;
}
