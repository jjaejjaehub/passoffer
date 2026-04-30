import { z } from "zod";

export const shopeeRegisterSchema = z
  .object({
    // ── 기본정보 ──────────────────────────────────────────
    item_name: z
      .string()
      .min(1, "상품명을 입력해 주세요")
      .max(120, "상품명은 최대 120자입니다"),
    description: z.string().min(1, "상품 설명을 입력해 주세요"),
    item_sku: z.string().optional(),
    condition: z.enum(["NEW", "USED"]),
    item_status: z.enum(["NORMAL", "UNLIST"]),

    // ── 카테고리 ──────────────────────────────────────────
    category_id: z
      .number({ invalid_type_error: "카테고리 ID를 입력해 주세요" })
      .int()
      .positive("유효한 카테고리 ID를 입력해 주세요"),

    // ── 가격 / 재고 ───────────────────────────────────────
    original_price: z
      .number({ invalid_type_error: "판매가를 입력해 주세요" })
      .positive("0보다 큰 값을 입력해 주세요"),
    stock: z
      .number({ invalid_type_error: "재고를 입력해 주세요" })
      .int()
      .min(0, "재고는 0 이상이어야 합니다"),

    // ── 이미지 (Shopee 미디어 업로드 후 발급되는 image_id) ──
    image_id_list: z.string().min(1, "이미지 ID를 하나 이상 입력해 주세요"),

    // ── 무게 / 포장 크기 ──────────────────────────────────
    weight: z
      .number({ invalid_type_error: "무게를 입력해 주세요" })
      .positive("0보다 큰 값을 입력해 주세요"),
    package_height: z.number().int().positive().optional(),
    package_length: z.number().int().positive().optional(),
    package_width: z.number().int().positive().optional(),

    // ── 배송 채널 ─────────────────────────────────────────
    logistic_id: z
      .number({ invalid_type_error: "배송 채널 ID를 입력해 주세요" })
      .int()
      .positive("유효한 배송 채널 ID를 입력해 주세요"),
    logistic_is_free: z.boolean(),
    logistic_shipping_fee: z
      .number()
      .nonnegative()
      .optional(),

    // ── 브랜드 ───────────────────────────────────────────
    no_brand: z.boolean(),
    brand_name: z.string().optional(),

    // ── 예약 구매 ─────────────────────────────────────────
    is_pre_order: z.boolean(),
    days_to_ship: z.number().int().positive().optional(),
  })
  .refine(
    (data) => data.no_brand || Boolean(data.brand_name?.trim()),
    {
      message: "브랜드명을 입력하거나 '브랜드 없음'을 선택해 주세요",
      path: ["brand_name"],
    },
  )
  .refine(
    (data) => !data.is_pre_order || (data.days_to_ship !== undefined && data.days_to_ship > 0),
    {
      message: "예약 구매 시 배송 소요일을 입력해 주세요",
      path: ["days_to_ship"],
    },
  );

export type ShopeeRegisterFormValues = z.infer<typeof shopeeRegisterSchema>;
