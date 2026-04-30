import type { ItemStatus } from "./types";

const QOO10_CODE_TO_STATUS: Record<string, ItemStatus> = {
  S0: "검수대기",
  S1: "거래대기",
  S2: "거래가능",
  S3: "거래중지",
  S5: "거래제한",
  S8: "승인거부",
};

export function itemStatusFromQoo10Code(code: string): ItemStatus {
  const mapped = QOO10_CODE_TO_STATUS[code];
  if (mapped !== undefined) {
    return mapped;
  }
  return "거래중지";
}

export type Qoo10UiTradeAction = "판매중" | "판매중지" | "삭제";

export function toQoo10StatusCode(status: Qoo10UiTradeAction): "1" | "2" | "3" {
  if (status === "판매중") {
    return "2";
  }
  if (status === "판매중지") {
    return "1";
  }
  return "3";
}

export function canSuspend(status: ItemStatus): boolean {
  return status === "거래가능";
}

export function canActivate(status: ItemStatus): boolean {
  return status === "거래대기";
}
