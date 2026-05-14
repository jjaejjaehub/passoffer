import type { ChannelType } from "@oms/types";

export type FieldSource = "master" | "variant" | "channel-only";
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "image"
  | "date";

export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  source: FieldSource;
  type: FieldType;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  masterPath?: string;
}

const QOO10_FIELDS: FieldSpec[] = [
  {
    key: "ItemTitle",
    label: "상품명",
    required: true,
    source: "master",
    type: "text",
    masterPath: "title",
  },
  {
    key: "ItemDescription",
    label: "상품 상세 설명",
    required: true,
    source: "master",
    type: "textarea",
    masterPath: "descriptionHtml",
  },
  {
    key: "StandardImage",
    label: "대표 이미지",
    required: true,
    source: "master",
    type: "image",
    masterPath: "images.0.url",
  },
  {
    key: "SellerCode",
    label: "판매자 상품코드",
    required: true,
    source: "variant",
    type: "text",
    masterPath: "sku",
  },
  {
    key: "ItemPrice",
    label: "판매가",
    required: true,
    source: "variant",
    type: "number",
    masterPath: "price",
  },
  {
    key: "ProductionPlaceType",
    label: "원산지 타입",
    required: true,
    source: "channel-only",
    type: "select",
    description: "Qoo10 등록 필수: 국내/해외/기타",
    options: [
      { value: "1", label: "국내" },
      { value: "2", label: "해외" },
      { value: "3", label: "기타" },
    ],
  },
  {
    key: "ProductionPlace",
    label: "원산지 지역",
    required: true,
    source: "master",
    type: "text",
    masterPath: "countryOfOrigin",
  },
  {
    key: "SecondSubCat",
    label: "Qoo10 카테고리 코드",
    required: true,
    source: "channel-only",
    type: "text",
    description: "Qoo10 2차 서브 카테고리 코드",
  },
  {
    key: "ShippingNo",
    label: "배송 그룹 번호",
    required: false,
    source: "channel-only",
    type: "text",
  },
  {
    key: "AdultYN",
    label: "성인용품 여부",
    required: false,
    source: "channel-only",
    type: "select",
    options: [
      { value: "Y", label: "예" },
      { value: "N", label: "아니오" },
    ],
  },
  {
    key: "Keyword",
    label: "검색 키워드",
    required: false,
    source: "master",
    type: "text",
    masterPath: "tags",
  },
  {
    key: "ModelNM",
    label: "모델명/브랜드",
    required: false,
    source: "master",
    type: "text",
    masterPath: "brand",
  },
  {
    key: "Material",
    label: "소재",
    required: false,
    source: "master",
    type: "text",
    masterPath: "material",
  },
  {
    key: "Weight",
    label: "무게(kg)",
    required: false,
    source: "master",
    type: "number",
    masterPath: "weightG",
  },
];

const SHOPIFY_FIELDS: FieldSpec[] = [
  {
    key: "title",
    label: "상품명",
    required: true,
    source: "master",
    type: "text",
    masterPath: "title",
  },
  {
    key: "descriptionHtml",
    label: "상품 설명(HTML)",
    required: false,
    source: "master",
    type: "textarea",
    masterPath: "descriptionHtml",
  },
  {
    key: "sku",
    label: "SKU",
    required: true,
    source: "variant",
    type: "text",
    masterPath: "sku",
  },
  {
    key: "price",
    label: "판매가",
    required: true,
    source: "variant",
    type: "number",
    masterPath: "price",
  },
  {
    key: "vendor",
    label: "브랜드(Vendor)",
    required: false,
    source: "master",
    type: "text",
    masterPath: "brand",
  },
  {
    key: "productType",
    label: "상품 카테고리(Product Type)",
    required: false,
    source: "channel-only",
    type: "text",
  },
  {
    key: "status",
    label: "게시 상태",
    required: false,
    source: "channel-only",
    type: "select",
    options: [
      { value: "ACTIVE", label: "게시" },
      { value: "DRAFT", label: "임시저장" },
      { value: "ARCHIVED", label: "보관" },
    ],
  },
  {
    key: "tags",
    label: "태그",
    required: false,
    source: "master",
    type: "text",
    masterPath: "tags",
  },
  {
    key: "images",
    label: "이미지",
    required: false,
    source: "master",
    type: "image",
    masterPath: "images",
  },
];

const SHOPEE_FIELDS: FieldSpec[] = [
  {
    key: "item_name",
    label: "상품명",
    required: true,
    source: "master",
    type: "text",
    masterPath: "title",
  },
  {
    key: "description",
    label: "상품 설명",
    required: true,
    source: "master",
    type: "textarea",
    masterPath: "descriptionHtml",
  },
  {
    key: "category_id",
    label: "Shopee 카테고리 ID",
    required: true,
    source: "channel-only",
    type: "text",
  },
  {
    key: "price",
    label: "판매가",
    required: true,
    source: "variant",
    type: "number",
    masterPath: "price",
  },
  {
    key: "stock",
    label: "재고",
    required: true,
    source: "variant",
    type: "number",
    masterPath: "stock",
  },
  {
    key: "weight",
    label: "무게(kg)",
    required: true,
    source: "master",
    type: "number",
    masterPath: "weightG",
  },
  {
    key: "image",
    label: "대표 이미지",
    required: true,
    source: "master",
    type: "image",
    masterPath: "images.0.url",
  },
  {
    key: "logistic_id",
    label: "배송 옵션 ID",
    required: true,
    source: "channel-only",
    type: "text",
  },
  {
    key: "item_sku",
    label: "판매자 SKU",
    required: false,
    source: "variant",
    type: "text",
    masterPath: "sku",
  },
];

const RAKUTEN_FIELDS: FieldSpec[] = [
  {
    key: "itemName",
    label: "상품명",
    required: true,
    source: "master",
    type: "text",
    masterPath: "title",
  },
  {
    key: "itemPrice",
    label: "판매가",
    required: true,
    source: "variant",
    type: "number",
    masterPath: "price",
  },
  {
    key: "itemUrl",
    label: "상품 URL 식별자",
    required: true,
    source: "channel-only",
    type: "text",
  },
  {
    key: "itemNumber",
    label: "상품관리번호(SKU)",
    required: true,
    source: "variant",
    type: "text",
    masterPath: "sku",
  },
  {
    key: "genreId",
    label: "Rakuten 장르 ID",
    required: true,
    source: "channel-only",
    type: "text",
  },
  {
    key: "description",
    label: "상품 설명(PC)",
    required: false,
    source: "master",
    type: "textarea",
    masterPath: "descriptionHtml",
  },
  {
    key: "images",
    label: "이미지",
    required: false,
    source: "master",
    type: "image",
    masterPath: "images",
  },
];

const REGISTRY: Record<ChannelType, FieldSpec[]> = {
  QOO10_JP: QOO10_FIELDS,
  SHOPIFY: SHOPIFY_FIELDS,
  SHOPEE: SHOPEE_FIELDS,
  RAKUTEN: RAKUTEN_FIELDS,
  CUSTOM: [],
};

export function getChannelFieldSpecs(channelType: ChannelType): FieldSpec[] {
  return REGISTRY[channelType] ?? [];
}

interface MasterLike {
  title?: string | null;
  descriptionHtml?: string | null;
  brand?: string | null;
  countryOfOrigin?: string | null;
  material?: string | null;
  weightG?: number | null;
  retailPrice?: string | null;
  images?: unknown;
  tags?: unknown;
  attributes?: unknown;
}

interface VariantLike {
  sku?: string | null;
  price?: string | null;
  stock?: number | null;
}

function readMasterPath(
  master: MasterLike,
  variant: VariantLike | undefined,
  path: string,
): unknown {
  if (path.startsWith("images")) {
    const images = Array.isArray(master.images)
      ? (master.images as Array<Record<string, unknown>>)
      : [];
    if (path === "images") return images.length > 0 ? images : undefined;
    if (path === "images.0.url") return images[0]?.url;
    return undefined;
  }
  if (path === "tags") {
    const tags = Array.isArray(master.tags) ? (master.tags as string[]) : [];
    return tags.length > 0 ? tags : undefined;
  }
  if (path === "sku") return variant?.sku;
  if (path === "price") return variant?.price;
  if (path === "stock") return variant?.stock;
  const key = path as keyof MasterLike;
  return master[key];
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

export interface MissingField {
  key: string;
  label: string;
  source: FieldSource;
  type: FieldType;
  description?: string;
  options?: Array<{ value: string; label: string }>;
}

export function findMissingFields(
  channelType: ChannelType,
  master: MasterLike,
  variant: VariantLike | undefined,
  channelOverrides: Record<string, unknown> = {},
): MissingField[] {
  const specs = getChannelFieldSpecs(channelType);
  const missing: MissingField[] = [];
  for (const spec of specs) {
    if (!spec.required) continue;
    if (isPresent(channelOverrides[spec.key])) continue;
    if (spec.source === "channel-only") {
      missing.push({
        key: spec.key,
        label: spec.label,
        source: spec.source,
        type: spec.type,
        description: spec.description,
        options: spec.options,
      });
      continue;
    }
    const value = spec.masterPath
      ? readMasterPath(master, variant, spec.masterPath)
      : undefined;
    if (!isPresent(value)) {
      missing.push({
        key: spec.key,
        label: spec.label,
        source: spec.source,
        type: spec.type,
        description: spec.description,
        options: spec.options,
      });
    }
  }
  return missing;
}

export interface ResolvedField {
  key: string;
  value: unknown;
  source: FieldSource | "override";
  fromMaster: boolean;
  overridden: boolean;
}

export interface ChannelPayload {
  payload: Record<string, unknown>;
  resolved: ResolvedField[];
}

export function buildChannelPayload(
  channelType: ChannelType,
  master: MasterLike,
  variant: VariantLike | undefined,
  channelOverrides: Record<string, unknown> = {},
): ChannelPayload {
  const specs = getChannelFieldSpecs(channelType);
  const payload: Record<string, unknown> = {};
  const resolved: ResolvedField[] = [];

  for (const spec of specs) {
    const overrideValue = channelOverrides[spec.key];
    const hasOverride = isPresent(overrideValue);
    const masterValue = spec.masterPath
      ? readMasterPath(master, variant, spec.masterPath)
      : undefined;
    const hasMaster = isPresent(masterValue);

    let value: unknown;
    let source: FieldSource | "override";
    let fromMaster = false;
    let overridden = false;

    if (hasOverride) {
      value = overrideValue;
      source = "override";
      overridden = hasMaster;
    } else if (spec.source === "channel-only") {
      if (!hasMaster) continue;
      value = masterValue;
      source = spec.source;
    } else {
      if (!hasMaster) continue;
      value = masterValue;
      source = spec.source;
      fromMaster = true;
    }

    payload[spec.key] = value;
    resolved.push({ key: spec.key, value, source, fromMaster, overridden });
  }

  return { payload, resolved };
}
