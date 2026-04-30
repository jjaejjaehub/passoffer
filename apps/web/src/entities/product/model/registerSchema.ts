import { z } from "zod";

export const registerProductSchema = z
  .object({
    // ── 카테고리 (필수) ──────────────────────────
    mainCatCd: z.string().min(1, "대분류를 선택해주세요"),
    midCatCd: z.string().min(1, "중분류를 선택해주세요"),
    SecondSubCat: z.string().min(1, "소분류를 선택해주세요"),

    // ── 브랜드 (필수 - QSM 폼 기준) ──────────────
    BrandNo: z.string(),
    NoBrandInput: z.boolean(),

    // ── 상품 기본정보 (필수) ──────────────────────
    ItemTitle: z
      .string()
      .min(1, "상품명을 입력해주세요")
      .max(100, "최대 100자"),
    PromotionName: z.string().max(20).optional(),
    SellerCode: z.string().min(1, "판매자상품코드를 입력해주세요").max(100),

    // ── 판매기간 (필수 - QSM 폼 기준) ───────────
    ExpireDate: z.string().min(1, "판매종료일을 선택해주세요"),

    // ── 가격/재고 (필수) ─────────────────────────
    ItemPrice: z.number().min(1, "1円 이상 입력해주세요"),
    RetailPrice: z.number().min(0).optional(),
    TaxRate: z.enum(["S", "10", "8", "0"]),
    ItemQty: z.number().int().min(0, "재고수량을 입력해주세요"),

    // ── 대표이미지 (필수 - QSM 폼 기준) ─────────
    StandardImage: z
      .string()
      .url("올바른 이미지 URL을 입력해주세요")
      .min(1, "대표이미지 URL을 입력해주세요"),

    // ── 상품상세 (필수 - QSM 폼 기준) ───────────
    ItemDescription: z.string().min(1, "상품상세를 입력해주세요"),

    // ── 배송비 (필수 - QSM 폼 기준) ─────────────
    ShippingNo: z.number().int().min(0, "배송비 코드를 입력해주세요"),

    // ── 발송가능일 (필수) ─────────────────────────
    AvailableDateType: z.enum(["0", "1", "2", "3"]),
    AvailableDateValue: z.string().min(1, "발송가능일을 입력해주세요"),

    // ── 상품상태 / 원산지 (필수 - QSM 폼 기준) ──
    AdultYN: z.enum(["Y", "N"]),
    ProductionPlaceType: z.enum(["1", "2", "3"]),
    ProductionPlace: z.string().min(1, "원산지를 입력해주세요").max(50),

    // ── 선택 입력 ─────────────────────────────────
    IndustrialCodeType: z.enum(["J", "K", "I", "U", "E", "H", ""]).optional(),
    IndustrialCode: z.string().max(13).optional(),
    ModelNM: z.string().max(30).optional(),
    ManufactureDate: z.string().optional(),
    Weight: z.string().optional(),
    Material: z.string().max(500).optional(),
    ContactInfo: z.string().max(100).optional(),
    VideoURL: z.string().url().optional().or(z.literal("")),
    Keyword: z.string().optional(),
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

export type RegisterProductFormValues = z.infer<typeof registerProductSchema>;
