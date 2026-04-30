"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { http } from "@/shared/api";
import type {
  Qoo10RegisterProductParams,
  Qoo10RegisterProductResult,
} from "@/shared/api/qoo10/productTypes";
import type { Qoo10ApiResponse } from "@/shared/api/qoo10/types";

import type { RegisterProductFormValues } from "../model/registerSchema";

function isNonEmptyString(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function toQoo10Date(dateValue: string): string {
  // ShipDateCell 포맷: yyyy.MM.dd -> Qoo10 요청 포맷: yyyy-mm-dd
  if (dateValue.includes(".")) {
    return dateValue.replaceAll(".", "-");
  }
  return dateValue;
}

function toQoo10RegisterProductParams(
  values: RegisterProductFormValues,
): Qoo10RegisterProductParams {
  const payload: Qoo10RegisterProductParams = {
    SecondSubCat: values.SecondSubCat,
    ItemTitle: values.ItemTitle,
    ItemPrice: values.ItemPrice,
    ItemQty: values.ItemQty,
    AvailableDateType: values.AvailableDateType,
    AvailableDateValue: values.AvailableDateValue,

    BrandNo: values.BrandNo.trim().length > 0 ? values.BrandNo : undefined,
    PromotionName: isNonEmptyString(values.PromotionName)
      ? values.PromotionName
      : undefined,
    SellerCode: isNonEmptyString(values.SellerCode)
      ? values.SellerCode
      : undefined,

    ExpireDate: isNonEmptyString(values.ExpireDate)
      ? toQoo10Date(values.ExpireDate)
      : undefined,

    RetailPrice: values.RetailPrice,
    TaxRate: values.TaxRate,

    StandardImage: values.StandardImage,
    ItemDescription: values.ItemDescription,

    ShippingNo: values.ShippingNo,

    AdultYN: values.AdultYN,
    ProductionPlaceType: values.ProductionPlaceType,
    ProductionPlace: values.ProductionPlace,

    IndustrialCodeType: isNonEmptyString(values.IndustrialCodeType)
      ? values.IndustrialCodeType
      : undefined,
    IndustrialCode: isNonEmptyString(values.IndustrialCode)
      ? values.IndustrialCode
      : undefined,
    ModelNM: isNonEmptyString(values.ModelNM) ? values.ModelNM : undefined,
    ManufactureDate: isNonEmptyString(values.ManufactureDate)
      ? values.ManufactureDate
      : undefined,
    Weight: isNonEmptyString(values.Weight) ? values.Weight : undefined,
    Material: isNonEmptyString(values.Material) ? values.Material : undefined,
    ContactInfo: isNonEmptyString(values.ContactInfo)
      ? values.ContactInfo
      : undefined,

    VideoURL: isNonEmptyString(values.VideoURL) ? values.VideoURL : undefined,
    Keyword: isNonEmptyString(values.Keyword) ? values.Keyword : undefined,

    ItemType: isNonEmptyString(values.ItemType) ? values.ItemType : undefined,
    AdditionalOption: isNonEmptyString(values.AdditionalOption)
      ? values.AdditionalOption
      : undefined,
  };

  return payload;
}

type Qoo10MutationResponse = Qoo10ApiResponse<Qoo10RegisterProductResult>;

export function useQoo10RegisterProductMutation(): UseMutationResult<
  Qoo10MutationResponse,
  unknown,
  RegisterProductFormValues
> {
  const router = useRouter();

  return useMutation<Qoo10MutationResponse, unknown, RegisterProductFormValues>(
    {
      mutationFn: async (
        values: RegisterProductFormValues,
      ): Promise<Qoo10MutationResponse> => {
        const payload = toQoo10RegisterProductParams(values);

        return http.post<Qoo10MutationResponse>("/api/qoo10/products", payload);
      },
      onSuccess: async () => {
        router.push("/products");
      },
    },
  );
}
