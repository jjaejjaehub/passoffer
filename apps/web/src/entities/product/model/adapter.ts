import type { Qoo10ItemDetailRaw } from "@/shared/api/qoo10/itemTypes";

import type { AvailableDateType, Product, ProductStatus } from "./types";

function parseNumericString(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapProductStatus(itemStatus: string): ProductStatus {
  return itemStatus === "S2" ? "active" : "inactive";
}

function mapProductionPlaceType(
  productionPlaceType: string,
): "국내" | "해외" | "기타" {
  if (productionPlaceType === "1") {
    return "국내";
  }
  if (productionPlaceType === "2") {
    return "해외";
  }
  if (productionPlaceType === "3") {
    return "기타";
  }
  return "기타";
}

function mapAvailableDateType(raw: string): AvailableDateType {
  if (raw === "0") {
    return "normal";
  }
  if (raw === "1") {
    return "prep";
  }
  if (raw === "2") {
    return "release";
  }
  if (raw === "3") {
    return "same_day";
  }
  return "normal";
}

function parseKeywords(keyword: string): string[] {
  return keyword
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseAdultYn(value: string): boolean {
  return value.trim().toUpperCase() === "Y";
}

export function adaptQoo10ItemDetail(raw: Qoo10ItemDetailRaw): Product {
  return {
    id: raw.ItemCode,
    sellerCode: raw.SellerCode,
    title: raw.ItemTitle,
    promotionName: raw.PromotionName,
    status: mapProductStatus(raw.ItemStatus),
    price: parseNumericString(raw.ItemPrice),
    settlePrice: parseNumericString(raw.SettlePrice),
    retailPrice: parseNumericString(raw.RetailPrice),
    qty: parseNumericString(raw.ItemQty),
    imageUrl: raw.ImageUrl,
    category: {
      main: { code: raw.MainCatCd, name: raw.MainCatNm },
      sub1: { code: raw.FirstSubCatCd, name: raw.FirstSubCatNm },
      sub2: { code: raw.SecondSubCatCd, name: raw.SecondSubCatNm },
    },
    origin: {
      type: mapProductionPlaceType(raw.ProductionPlaceType),
      place: raw.ProductionPlace,
    },
    shippingNo: raw.ShippingNo,
    availableDate: {
      type: mapAvailableDateType(raw.AvailableDateType),
      value: raw.AvailableDateValue,
    },
    desiredShippingDate: raw.DesiredShippingDate,
    keyword: parseKeywords(raw.Keyword),
    isAdult: parseAdultYn(raw.AdultYN),
    itemDetail: raw.ItemDetail,
    videoUrl: raw.VideoURL,
    modelNm: raw.ModelNM,
    manufacturerDate: raw.ManufacturerDate,
    brandNo: raw.BrandNo,
    material: raw.Material,
    industrialCodeType: raw.IndustrialCodeType,
    industrialCode: raw.IndustrialCode,
    taxRate: raw.TaxRate,
    listedDate: raw.ListedDate,
    changedDate: raw.ChangedDate,
    expireDate: raw.ExpireDate,
    drugtype: raw.Drugtype,
    optionShippingNo1: raw.OptionShippingNo1,
    optionShippingNo2: raw.OptionShippingNo2,
    contactInfo: raw.ContactInfo,
  };
}
