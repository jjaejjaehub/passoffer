import type { Product, UpdateProductFormValues } from "@/entities/product";

function mapAvailableDateTypeToCode(
  type: Product["availableDate"]["type"],
): UpdateProductFormValues["AvailableDateType"] {
  if (type === "normal") {
    return "0";
  }
  if (type === "prep") {
    return "1";
  }
  if (type === "release") {
    return "2";
  }
  return "3";
}

function mapOriginLabelToCode(
  type: Product["origin"]["type"],
): UpdateProductFormValues["ProductionPlaceType"] {
  if (type === "국내") {
    return "1";
  }
  if (type === "해외") {
    return "2";
  }
  return "3";
}

function normalizeTaxRate(raw: string): UpdateProductFormValues["TaxRate"] {
  const t = raw.trim();
  if (t === "S" || t === "10" || t === "8" || t === "0") {
    return t;
  }
  return "10";
}

function formatExpireForPicker(expire: string): string {
  const e = expire.trim();
  if (e.length === 0) {
    return "";
  }
  if (e.includes("-")) {
    return e.replaceAll("-", ".");
  }
  return e;
}

function parseShippingNo(value: string): number {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : 0;
}

function normalizeIndustrialCodeType(
  value: string,
): UpdateProductFormValues["IndustrialCodeType"] {
  if (value === "") {
    return "";
  }
  if (value === "J") {
    return "J";
  }
  if (value === "K") {
    return "K";
  }
  if (value === "I") {
    return "I";
  }
  if (value === "U") {
    return "U";
  }
  if (value === "E") {
    return "E";
  }
  if (value === "H") {
    return "H";
  }
  return "";
}

export function mapProductToUpdateFormValues(
  product: Product,
  secondSubCatHint: string | null,
): UpdateProductFormValues {
  const hint = secondSubCatHint?.trim() ?? "";
  const secondSub = hint.length > 0 ? hint : product.category.sub2.code;

  return {
    mainCatCd: product.category.main.code,
    midCatCd: product.category.sub1.code,
    SecondSubCat: secondSub,
    ItemCode: product.id,
    BrandNo: product.brandNo,
    NoBrandInput: !product.brandNo.trim(),
    ItemTitle: product.title,
    PromotionName: product.promotionName,
    SellerCode: product.sellerCode,
    ExpireDate: formatExpireForPicker(product.expireDate),
    ItemPrice: product.price,
    ItemQty: product.qty,
    TaxRate: normalizeTaxRate(product.taxRate),
    RetailPrice: product.retailPrice > 0 ? product.retailPrice : undefined,
    StandardImage: product.imageUrl,
    ItemDescription: product.itemDetail,
    ShippingNo: parseShippingNo(product.shippingNo),
    OptionShippingNo1: product.optionShippingNo1,
    OptionShippingNo2: product.optionShippingNo2,
    AvailableDateType: mapAvailableDateTypeToCode(product.availableDate.type),
    AvailableDateValue: product.availableDate.value,
    AdultYN: product.isAdult ? "Y" : "N",
    ProductionPlaceType: mapOriginLabelToCode(product.origin.type),
    ProductionPlace: product.origin.place,
    IndustrialCodeType: normalizeIndustrialCodeType(product.industrialCodeType),
    IndustrialCode: product.industrialCode,
    ModelNm: product.modelNm,
    ManufactureDate: product.manufacturerDate,
    Weight: "",
    Material: product.material,
    ContactInfo: product.contactInfo,
    VideoURL: product.videoUrl,
    Keyword: product.keyword.join(", "),
    Drugtype: product.drugtype,
    DesiredShippingDate: product.desiredShippingDate,
    ItemType: "",
    AdditionalOption: "",
  };
}
