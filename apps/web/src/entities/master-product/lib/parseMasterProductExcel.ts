import * as XLSX from "xlsx";

export interface ParsedVariantInput {
  sku: string;
  price?: string;
  stock?: number;
  optionValues?: Array<{ groupName: string; value: string }>;
}

export interface ParsedMasterProductItem {
  code: string;
  title: string;
  descriptionHtml?: string;
  brand?: string;
  hsCode?: string;
  countryOfOrigin?: string;
  material?: string;
  weightG?: number;
  retailPrice?: string;
  tags?: string[];
  images?: Array<{ url: string }>;
  optionGroups?: Array<{ name: string; values: string[] }>;
  variants?: ParsedVariantInput[];
}

export interface ParsedRowError {
  rowIndex: number;
  message: string;
}

export interface ParseMasterProductsResult {
  items: ParsedMasterProductItem[];
  errors: ParsedRowError[];
  rowCount: number;
}

const NORMALIZE_RE = /[\s-]+/g;

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(NORMALIZE_RE, "_");
}

function toString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function splitCommaList(v: unknown): string[] | undefined {
  const s = toString(v);
  if (s === undefined) return undefined;
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : undefined;
}

interface RawRow {
  rowIndex: number;
  data: Record<string, unknown>;
}

function readWorkbook(buffer: ArrayBuffer): RawRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (sheet === undefined) return [];

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  return json.map((raw, idx) => {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      data[normalizeKey(key)] = value;
    }
    return { rowIndex: idx + 2, data };
  });
}

function extractOptionGroups(
  data: Record<string, unknown>,
): Array<{ name: string; values: string[] }> {
  const groups: Array<{ name: string; values: string[] }> = [];
  for (let i = 1; i <= 5; i++) {
    const name = toString(data[`option_group_${i}_name`]);
    const values = splitCommaList(data[`option_group_${i}_values`]);
    if (name !== undefined && values !== undefined && values.length > 0) {
      groups.push({ name, values });
    }
  }
  return groups;
}

function extractVariantOptionValues(
  data: Record<string, unknown>,
  groupNames: string[],
): Array<{ groupName: string; value: string }> {
  const result: Array<{ groupName: string; value: string }> = [];
  for (let i = 0; i < groupNames.length; i++) {
    const value = toString(data[`option_${i + 1}`]);
    if (value !== undefined) {
      result.push({ groupName: groupNames[i]!, value });
    }
  }
  return result;
}

const PRICE_RE = /^\d+(\.\d+)?$/;

function isValidPriceString(s: string): boolean {
  return PRICE_RE.test(s);
}

export async function parseMasterProductExcel(
  file: File,
): Promise<ParseMasterProductsResult> {
  const buffer = await file.arrayBuffer();
  const rows = readWorkbook(buffer);
  const errors: ParsedRowError[] = [];

  const grouped = new Map<
    string,
    {
      base: ParsedMasterProductItem;
      groupNames: string[];
      groupValueSets: Array<Set<string>>;
      firstRow: number;
    }
  >();

  const skuToLocation = new Map<string, { code: string; rowIndex: number }>();

  for (const row of rows) {
    const code = toString(row.data.code);
    if (code === undefined) {
      const hasAny = Object.values(row.data).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== "",
      );
      if (hasAny) {
        errors.push({
          rowIndex: row.rowIndex,
          message: "code 컬럼이 비어 있습니다.",
        });
      }
      continue;
    }

    let entry = grouped.get(code);
    if (entry === undefined) {
      const title = toString(row.data.title);
      if (title === undefined) {
        errors.push({
          rowIndex: row.rowIndex,
          message: `code=${code}: title 컬럼이 비어 있습니다.`,
        });
        continue;
      }

      const retailPriceRaw = toString(row.data.retail_price);
      if (retailPriceRaw !== undefined && !isValidPriceString(retailPriceRaw)) {
        errors.push({
          rowIndex: row.rowIndex,
          message: `code=${code}: retail_price 형식이 올바르지 않습니다 (숫자만 허용).`,
        });
      }

      const optionGroups = extractOptionGroups(row.data);
      const tags = splitCommaList(row.data.tags);
      const imageUrls = splitCommaList(row.data.image_urls);

      const base: ParsedMasterProductItem = {
        code,
        title,
        descriptionHtml: toString(row.data.description_html),
        brand: toString(row.data.brand),
        hsCode: toString(row.data.hs_code),
        countryOfOrigin: toString(row.data.country_of_origin),
        material: toString(row.data.material),
        weightG: toNumber(row.data.weight_g),
        retailPrice:
          retailPriceRaw !== undefined && isValidPriceString(retailPriceRaw)
            ? retailPriceRaw
            : undefined,
        tags,
        images: imageUrls?.map((url) => ({ url })),
        optionGroups: optionGroups.length > 0 ? optionGroups : undefined,
        variants: [],
      };
      entry = {
        base,
        groupNames: optionGroups.map((g) => g.name),
        groupValueSets: optionGroups.map((g) => new Set(g.values)),
        firstRow: row.rowIndex,
      };
      grouped.set(code, entry);
    }

    const variantSku = toString(row.data.variant_sku);
    if (variantSku !== undefined) {
      const existing = skuToLocation.get(variantSku);
      if (existing !== undefined) {
        errors.push({
          rowIndex: row.rowIndex,
          message: `variant_sku=${variantSku}가 중복되었습니다 (행 ${existing.rowIndex} code=${existing.code}와 충돌).`,
        });
        continue;
      }
      skuToLocation.set(variantSku, { code, rowIndex: row.rowIndex });

      const variantPriceRaw = toString(row.data.variant_price);
      if (
        variantPriceRaw !== undefined &&
        !isValidPriceString(variantPriceRaw)
      ) {
        errors.push({
          rowIndex: row.rowIndex,
          message: `variant_sku=${variantSku}: variant_price 형식이 올바르지 않습니다 (숫자만 허용).`,
        });
        continue;
      }

      const optionValues = extractVariantOptionValues(
        row.data,
        entry.groupNames,
      );
      let optionInvalid = false;
      for (const ov of optionValues) {
        const idx = entry.groupNames.indexOf(ov.groupName);
        if (idx < 0) {
          errors.push({
            rowIndex: row.rowIndex,
            message: `variant_sku=${variantSku}: 옵션 그룹 "${ov.groupName}"이(가) 선언되지 않았습니다.`,
          });
          optionInvalid = true;
          continue;
        }
        const allowed = entry.groupValueSets[idx];
        if (allowed && !allowed.has(ov.value)) {
          errors.push({
            rowIndex: row.rowIndex,
            message: `variant_sku=${variantSku}: 옵션 "${ov.groupName}"의 값 "${ov.value}"이(가) 그룹에 정의되지 않았습니다.`,
          });
          optionInvalid = true;
        }
      }
      if (optionInvalid) continue;

      entry.base.variants!.push({
        sku: variantSku,
        price: variantPriceRaw,
        stock: toNumber(row.data.variant_stock),
        optionValues: optionValues.length > 0 ? optionValues : undefined,
      });
    }
  }

  const items: ParsedMasterProductItem[] = [];
  for (const entry of grouped.values()) {
    if (entry.base.variants && entry.base.variants.length === 0) {
      delete entry.base.variants;
    }
    items.push(entry.base);
  }

  return { items, errors, rowCount: rows.length };
}
