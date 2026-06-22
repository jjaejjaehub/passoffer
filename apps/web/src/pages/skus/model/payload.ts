import type { CreateSkuInput } from "@/entities/sku";
import type { FormState } from "./formState";

export function emptyToUndef(v: string): string | undefined {
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function intOrUndef(v: string): number | undefined {
  const t = v.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function intOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function decOrUndef(v: string): string | undefined {
  const t = v.trim();
  if (t === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(t) ? t : undefined;
}

export function decOrNull(v: string): string | null {
  const t = v.trim();
  if (t === "") return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? t : null;
}

export function buildPayload(
  s: FormState,
  attributes: Record<string, unknown>,
): CreateSkuInput {
  return {
    code: s.code.trim(),
    name: emptyToNull(s.name),
    barcode: emptyToNull(s.barcode),
    attributes,
    warehouseText: emptyToNull(s.warehouseText),
    isPrimaryWarehouse: s.isPrimaryWarehouse,
    vendorText: emptyToNull(s.vendorText),
    leadTimeDays: intOrNull(s.leadTimeDays),
    safetyStock: intOrUndef(s.safetyStock),
    modelName: emptyToNull(s.modelName),
    inventoryCode: emptyToNull(s.inventoryCode),
    image: emptyToNull(s.image),
    standardCode: emptyToNull(s.standardCode),
    hsCode: emptyToNull(s.hsCode),
    isbn: emptyToNull(s.isbn),
    isBundlable: s.isBundlable,
    widthCm: decOrNull(s.widthCm),
    heightCm: decOrNull(s.heightCm),
    depthCm: decOrNull(s.depthCm),
    weightKg: decOrNull(s.weightKg),
    inboundUnit: decOrNull(s.inboundUnit),
    inboundUnitType: emptyToNull(s.inboundUnitType),
    purchaseCost: decOrUndef(s.purchaseCost),
    purchaseFreight: decOrUndef(s.purchaseFreight),
    deliveryFee: decOrUndef(s.deliveryFee),
    adCost: decOrUndef(s.adCost),
    etcCost: decOrUndef(s.etcCost),
    supplyPrice: decOrNull(s.supplyPrice),
    salePrice: decOrNull(s.salePrice),
    currency: emptyToUndef(s.currency),
    originCountry: emptyToNull(s.originCountry),
    requiresCaution: s.requiresCaution,
    taxType: s.taxType,
    brand: emptyToNull(s.brand),
    manufacturer: emptyToNull(s.manufacturer),
    manufacturerEn: emptyToNull(s.manufacturerEn),
    ageGroup: emptyToNull(s.ageGroup),
    mainImage: emptyToNull(s.mainImage),
    descriptionHtml: emptyToNull(s.descriptionHtml),
  };
}

export function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, cur) => acc.flatMap((a) => cur.map((c) => [...a, c])),
    [[]],
  );
}
