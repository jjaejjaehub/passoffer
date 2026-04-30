import { z } from "zod";

// ─── 옵션 (Color, Size 등) ────────────────────────────────────

export const shopifyOptionSchema = z.object({
  name: z.string().min(1, "옵션명을 입력해 주세요"),
  values: z.string().min(1, "값을 하나 이상 입력해 주세요"), // 콤마 구분 문자열
});

// ─── 옵션이 있을 때의 variant row ─────────────────────────────

export const shopifyVariantRowSchema = z.object({
  combination: z.string(), // "Red / S" (표시용)
  price: z
    .number({ invalid_type_error: "가격을 입력해 주세요" })
    .min(0, "0 이상 입력해 주세요"),
  compareAtPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  inventoryQuantity: z
    .number({ invalid_type_error: "재고를 입력해 주세요" })
    .int()
    .min(0)
    .default(0),
});

// ─── 메인 스키마 ──────────────────────────────────────────────

export const shopifyRegisterSchema = z
  .object({
    // 기본정보
    title: z.string().min(1, "상품명을 입력해 주세요"),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.string().optional(),

    // 판매 상태
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),

    // 옵션 (최대 3개)
    hasOptions: z.boolean().default(false),
    options: z.array(shopifyOptionSchema).max(3).default([]),

    // 단일 variant (hasOptions=false)
    price: z
      .number({ invalid_type_error: "판매가를 입력해 주세요" })
      .min(0, "0 이상의 값을 입력해 주세요")
      .optional(),
    compareAtPrice: z.number().min(0).optional(),
    sku: z.string().optional(),
    inventoryQuantity: z
      .number({ invalid_type_error: "재고를 입력해 주세요" })
      .int()
      .min(0, "재고는 0 이상이어야 합니다")
      .default(0),
    trackInventory: z.boolean().default(true),

    // 다중 variant (hasOptions=true)
    variantRows: z.array(shopifyVariantRowSchema).default([]),

    // 이미지
    imageUrls: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.hasOptions) {
      // 단일 variant: price 필수
      if (val.price === undefined || val.price === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "판매가를 입력해 주세요",
          path: ["price"],
        });
      }
    } else {
      // 다중 variant: 최소 1개 옵션
      if (val.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "옵션을 하나 이상 추가해 주세요",
          path: ["options"],
        });
      }
    }
  });

export type ShopifyRegisterFormValues = z.infer<typeof shopifyRegisterSchema>;
export type ShopifyOptionValue = z.infer<typeof shopifyOptionSchema>;
export type ShopifyVariantRow = z.infer<typeof shopifyVariantRowSchema>;
