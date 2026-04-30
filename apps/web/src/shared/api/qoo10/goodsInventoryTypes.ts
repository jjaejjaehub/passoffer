// ItemsLookup.GetGoodsInventoryInfo — 응답 필드명은 Qoo10 API와 동일

export interface Qoo10GoodsInventoryRow {
  Name1: string;
  Value1: string;
  Name2: string;
  Value2: string;
  Name3: string;
  Value3: string;
  Name4: string;
  Value4: string;
  Name5: string;
  Value5: string;
  Price: number;
  Qty: number;
  ItemTypeCode: string;
}

export interface Qoo10GetGoodsInventoryInfoRequest {
  ItemCode: string;
  SellerCode?: string;
}

export interface Qoo10GoodsInventoryInfoResponse {
  ResultObject: Qoo10GoodsInventoryRow[];
  ResultCode: number;
  ResultMsg: string;
}

// ItemsOptions.EditGoodsInventory — 조합형 옵션 수정
export interface Qoo10EditGoodsInventoryRequest {
  ItemCode: string;
  SellerCode?: string;
  /**
   * 포맷:
   * [옵션명]||*[옵션상세]||*[가격]||*[수량]||*[옵션코드]$$...
   */
  InventoryInfo?: string;
}

export interface Qoo10EditGoodsInventoryResponse {
  ResultCode: number;
  ResultMsg: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readQoo10TextField(
  record: Record<string, unknown>,
  key: string,
): string {
  const v = record[key];
  if (typeof v === "string") {
    return v;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  return "";
}

function readQoo10IntField(
  record: Record<string, unknown>,
  key: string,
): number {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return Math.trunc(n);
    }
  }
  return 0;
}

function readQoo10DecimalField(
  record: Record<string, unknown>,
  key: string,
): number {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return 0;
}

/** Qoo10이 빈 행·부분 필드를 줄 수 있어 레코드면 정규화된 행을 만든다 */
export function normalizeQoo10GoodsInventoryRow(
  value: unknown,
): Qoo10GoodsInventoryRow | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    Name1: readQoo10TextField(value, "Name1"),
    Value1: readQoo10TextField(value, "Value1"),
    Name2: readQoo10TextField(value, "Name2"),
    Value2: readQoo10TextField(value, "Value2"),
    Name3: readQoo10TextField(value, "Name3"),
    Value3: readQoo10TextField(value, "Value3"),
    Name4: readQoo10TextField(value, "Name4"),
    Value4: readQoo10TextField(value, "Value4"),
    Name5: readQoo10TextField(value, "Name5"),
    Value5: readQoo10TextField(value, "Value5"),
    Price: readQoo10DecimalField(value, "Price"),
    Qty: readQoo10IntField(value, "Qty"),
    ItemTypeCode: readQoo10TextField(value, "ItemTypeCode"),
  };
}

export function normalizeQoo10GoodsInventoryRows(
  value: unknown,
): Qoo10GoodsInventoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: Qoo10GoodsInventoryRow[] = [];
  for (const el of value) {
    const row = normalizeQoo10GoodsInventoryRow(el);
    if (row !== null) {
      out.push(row);
    }
  }
  return out;
}
