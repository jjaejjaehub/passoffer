import * as XLSX from "xlsx";
import type { ParsedRow } from "../model/types";

interface ParseResult {
  rows: ParsedRow[];
  presentColumns: Set<string>;
}

const COLUMN_ALIASES: Record<string, string> = {
  master_product_code: "sku",
  sku: "sku",
  product_code: "sku",
  quantity: "quantity",
  qty: "quantity",
  expected_at: "expectedAt",
  expected_date: "expectedAt",
  date: "expectedAt",
  lot_code: "lotCode",
  lot: "lotCode",
  note: "note",
  memo: "note",
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) {
    return { rows: [], presentColumns: new Set() };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (sheet === undefined) {
    return { rows: [], presentColumns: new Set() };
  }

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  const presentColumns = new Set<string>();
  for (const row of json) {
    for (const key of Object.keys(row)) {
      presentColumns.add(normalizeKey(key));
    }
  }

  const rows: ParsedRow[] = json.map((raw, idx) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const norm = normalizeKey(key);
      const target = COLUMN_ALIASES[norm];
      if (target !== undefined) {
        normalized[target] = value;
      }
    }

    return {
      rowIndex: idx + 2,
      rawSku: normalized.sku ?? null,
      rawQuantity: normalized.quantity ?? null,
      rawExpectedAt: normalized.expectedAt ?? null,
      rawLot: normalized.lotCode ?? null,
      rawNote: normalized.note ?? null,
      sku: typeof normalized.sku === "string" ? normalized.sku.trim() : null,
      quantity:
        typeof normalized.quantity === "number"
          ? normalized.quantity
          : typeof normalized.quantity === "string" &&
              /^-?\d+(\.\d+)?$/.test(normalized.quantity.trim())
            ? Number(normalized.quantity)
            : null,
      expectedAt: parseDate(normalized.expectedAt),
      lotCode:
        typeof normalized.lotCode === "string" && normalized.lotCode.trim().length > 0
          ? normalized.lotCode.trim()
          : null,
      note:
        typeof normalized.note === "string" && normalized.note.trim().length > 0
          ? normalized.note.trim()
          : null,
      errors: [],
    };
  });

  return { rows, presentColumns };
}

function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    return raw.toISOString();
  }
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    const iso = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
    if (Number.isNaN(iso.getTime())) return null;
    return iso.toISOString();
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;
    const t = Date.parse(trimmed);
    if (Number.isNaN(t)) return null;
    return new Date(t).toISOString();
  }
  return null;
}
