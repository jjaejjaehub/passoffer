export type ParsedRowError =
  | { code: "missing_columns"; missing: string[] }
  | { code: "sku_not_found"; sku: string }
  | { code: "quantity_invalid"; raw: unknown }
  | { code: "date_invalid"; raw: unknown };

export interface ParsedRow {
  rowIndex: number;
  rawSku: unknown;
  rawQuantity: unknown;
  rawExpectedAt: unknown;
  rawLot?: unknown;
  rawNote?: unknown;

  sku: string | null;
  quantity: number | null;
  expectedAt: string | null;
  lotCode: string | null;
  note: string | null;

  errors: ParsedRowError[];
}

export type ParsedBatchStatus =
  | "pending_dispatch"
  | "instructed"
  | "received"
  | "canceled";

export interface ParsedBatch {
  id: string;
  fileName: string;
  createdAt: string;
  rows: ParsedRow[];
  status: ParsedBatchStatus;
  vendorRef: string | null;
  dispatchError: string | null;
}

export interface BatchSummary {
  validCount: number;
  errorCount: number;
  total: number;
}

export const REQUIRED_COLUMNS = [
  "master_product_code",
  "quantity",
  "expected_at",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];
