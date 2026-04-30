"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";

import { http } from "@/shared/api";
import type {
  Qoo10UpdateGoodsRequest,
  Qoo10UpdateGoodsResponse,
} from "@/shared/api/qoo10/itemTypes";
import { appToaster } from "@/shared/ui/app-toaster";

import type { UpdateProductFormValues } from "../model/updateProductSchema";

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function isIsoDateString(value: string): boolean {
  // Qoo10 DateTime 파싱 실패(-999) 방지: yyyy-MM-dd만 허용
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mapUpdateErrorToMessage(error: unknown): string {
  if (isAxiosError<{ code?: number; message?: string }>(error)) {
    const data = error.response?.data;
    const code = typeof data?.code === "number" ? data.code : undefined;
    const message =
      typeof data?.message === "string" ? data.message : undefined;

    if (code === -10000) {
      return "API 키를 확인해주세요";
    }
    if (code === -10001) {
      return "상품 정보를 찾을 수 없습니다";
    }
    if (code === -10004) {
      return "배송 정보가 올바르지 않습니다";
    }
    if (code === -999) {
      return "날짜 형식이 올바르지 않습니다. yyyy-MM-dd 형식으로 입력해주세요.";
    }

    return message ?? "수정에 실패했습니다";
  }

  if (error instanceof Error && error.message === "NO_API_KEY") {
    return "Qoo10 API 키가 없습니다.";
  }

  return "알 수 없는 오류가 발생했습니다";
}

function toQoo10UpdateGoodsRequest(
  values: UpdateProductFormValues,
): Qoo10UpdateGoodsRequest {
  const payload: Qoo10UpdateGoodsRequest = {
    ItemCode: values.ItemCode,
    SecondSubCat: values.SecondSubCat,
    ItemTitle: values.ItemTitle,
    ProductionPlaceType: values.ProductionPlaceType,
    AdultYN: values.AdultYN,
    AvailableDateType: values.AvailableDateType,
    AvailableDateValue: values.AvailableDateValue,
  };

  if (isNonEmptyString(values.Drugtype)) {
    payload.Drugtype = values.Drugtype.trim();
  }

  if (isNonEmptyString(values.PromotionName)) {
    payload.PromotionName = values.PromotionName.trim();
  }

  if (isNonEmptyString(values.SellerCode)) {
    payload.SellerCode = values.SellerCode.trim();
  }

  if (!values.NoBrandInput && isNonEmptyString(values.BrandNo)) {
    payload.BrandNo = values.BrandNo.trim();
  }

  if (isNonEmptyString(values.IndustrialCodeType)) {
    payload.IndustrialCodeType = values.IndustrialCodeType.trim();
  }

  if (isNonEmptyString(values.IndustrialCode)) {
    payload.IndustrialCode = values.IndustrialCode.trim();
  }

  if (isNonEmptyString(values.ModelNm)) {
    payload.ModelNm = values.ModelNm.trim();
  }

  if (isNonEmptyString(values.ManufactureDate)) {
    const manufactureDate = values.ManufactureDate.trim();
    if (isIsoDateString(manufactureDate)) {
      payload.ManufactureDate = manufactureDate;
    }
  }

  if (isNonEmptyString(values.Weight)) {
    payload.Weight = values.Weight.trim();
  }

  if (isNonEmptyString(values.Material)) {
    payload.Material = values.Material.trim();
  }

  if (isNonEmptyString(values.ProductionPlace)) {
    payload.ProductionPlace = values.ProductionPlace.trim();
  }

  if (values.RetailPrice !== undefined) {
    payload.RetailPrice = String(values.RetailPrice);
  }

  if (isNonEmptyString(values.ContactInfo)) {
    payload.ContactInfo = values.ContactInfo.trim();
  }

  if (values.ShippingNo !== undefined) {
    payload.ShippingNo = String(values.ShippingNo);
  }

  if (isNonEmptyString(values.OptionShippingNo1)) {
    payload.OptionShippingNo1 = values.OptionShippingNo1.trim();
  }

  if (isNonEmptyString(values.OptionShippingNo2)) {
    payload.OptionShippingNo2 = values.OptionShippingNo2.trim();
  }

  if (isNonEmptyString(values.DesiredShippingDate)) {
    const desiredShippingDate = values.DesiredShippingDate.trim();
    if (isIsoDateString(desiredShippingDate)) {
      payload.DesiredShippingDate = desiredShippingDate;
    }
  }

  if (isNonEmptyString(values.Keyword)) {
    payload.Keyword = values.Keyword.trim();
  }

  return payload;
}

export const qoo10ProductMutations = {
  all: () => ["qoo10", "products", "mutations"] as const,
  update: () => [...qoo10ProductMutations.all(), "update"] as const,
  setPriceQty: () => [...qoo10ProductMutations.all(), "setPriceQty"] as const,
};

export function useQoo10UpdateProductMutation(): UseMutationResult<
  Qoo10UpdateGoodsResponse,
  unknown,
  UpdateProductFormValues
> {
  const router = useRouter();

  return useMutation<
    Qoo10UpdateGoodsResponse,
    unknown,
    UpdateProductFormValues
  >({
    mutationKey: qoo10ProductMutations.update(),
    mutationFn: async (
      values: UpdateProductFormValues,
    ): Promise<Qoo10UpdateGoodsResponse> => {
      const payload = toQoo10UpdateGoodsRequest(values);

      return http.post<Qoo10UpdateGoodsResponse>("/api/qoo10/items/update", payload);
    },
    onSuccess: () => {
      appToaster.create({
        title: "수정이 완료되었습니다",
        type: "success",
      });
      router.push("/products");
    },
    onError: (error: unknown) => {
      appToaster.create({
        title: mapUpdateErrorToMessage(error),
        type: "error",
      });
    },
  });
}

export interface SetPriceQtyInput {
  itemCode: string;
  sellerCode?: string;
  itemPrice: number;
  itemQty: number;
  taxRate?: string;
  retailPrice?: number;
}

export function useQoo10SetPriceQty() {
  return useMutation({
    mutationKey: qoo10ProductMutations.setPriceQty(),
    mutationFn: async (input: SetPriceQtyInput): Promise<void> => {
      await http.post("/api/qoo10/items/price-qty", input);
    },
  });
}
