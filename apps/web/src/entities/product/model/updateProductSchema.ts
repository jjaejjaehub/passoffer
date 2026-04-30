import { z } from "zod";

export const updateProductSchema = z
  .object({
    mainCatCd: z.string().min(1, "대분류를 선택해주세요"),
    midCatCd: z.string().min(1, "중분류를 선택해주세요"),
    SecondSubCat: z.string().min(1, "소분류를 선택해주세요"),

    ItemCode: z.string().min(1, "상품코드가 없습니다"),

    BrandNo: z.string(),
    NoBrandInput: z.boolean(),

    ItemTitle: z
      .string()
      .min(1, "상품명을 입력해주세요")
      .max(100, "최대 100자"),
    PromotionName: z.string().max(20).optional(),
    SellerCode: z.string().max(100).optional(),

    ExpireDate: z.string().optional(),
    ItemPrice: z.number().optional(),
    ItemQty: z.number().optional(),
    TaxRate: z.enum(["S", "10", "8", "0"]).optional(),

    RetailPrice: z.number().min(0).optional(),

    StandardImage: z.string().optional(),
    ItemDescription: z.string().optional(),

    ShippingNo: z.number().int().min(0).optional(),
    OptionShippingNo1: z.string().optional(),
    OptionShippingNo2: z.string().optional(),

    AvailableDateType: z.enum(["0", "1", "2", "3"]),
    AvailableDateValue: z.string().min(1, "발송가능일을 입력해주세요"),

    AdultYN: z.enum(["Y", "N"]),
    ProductionPlaceType: z.enum(["1", "2", "3"]),
    ProductionPlace: z.string().min(1, "원산지를 입력해주세요").max(50),

    IndustrialCodeType: z.enum(["J", "K", "I", "U", "E", "H", ""]).optional(),
    IndustrialCode: z.string().max(13).optional(),
    ModelNm: z.string().max(30).optional(),
    ManufactureDate: z.string().optional(),
    Weight: z.string().optional(),
    Material: z.string().max(500).optional(),
    ContactInfo: z.string().max(100).optional(),
    VideoURL: z.string().url().optional().or(z.literal("")),
    Keyword: z.string().optional(),
    Drugtype: z.string().optional(),
    DesiredShippingDate: z.string().optional(),

    ItemType: z.string().optional(),
    AdditionalOption: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.NoBrandInput && data.BrandNo.trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BrandNo"],
        message: "브랜드를 선택해주세요",
      });
    }
  });

export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
