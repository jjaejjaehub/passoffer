import type { ParsedRow, ParsedRowError } from "../model/types";
import { REQUIRED_COLUMNS } from "../model/types";

interface ValidateInput {
  rows: ParsedRow[];
  presentColumns: Set<string>;
  skuSet: Set<string>;
}

export function validateRows({ rows, presentColumns, skuSet }: ValidateInput): {
  rows: ParsedRow[];
  missingColumns: string[];
} {
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !presentColumns.has(col),
  );

  const validated = rows.map((row) => {
    const errors: ParsedRowError[] = [];

    if (missingColumns.length > 0) {
      errors.push({ code: "missing_columns", missing: [...missingColumns] });
    }

    if (row.sku === null || row.sku.length === 0) {
      errors.push({ code: "sku_not_found", sku: String(row.rawSku ?? "") });
    } else if (!skuSet.has(row.sku)) {
      errors.push({ code: "sku_not_found", sku: row.sku });
    }

    if (row.quantity === null || row.quantity <= 0) {
      errors.push({ code: "quantity_invalid", raw: row.rawQuantity });
    }

    if (row.expectedAt === null) {
      errors.push({ code: "date_invalid", raw: row.rawExpectedAt });
    }

    return { ...row, errors };
  });

  return { rows: validated, missingColumns };
}

export function summarize(rows: ParsedRow[]): {
  validCount: number;
  errorCount: number;
  total: number;
} {
  let validCount = 0;
  let errorCount = 0;
  for (const row of rows) {
    if (row.errors.length === 0) validCount++;
    else errorCount++;
  }
  return { validCount, errorCount, total: rows.length };
}
