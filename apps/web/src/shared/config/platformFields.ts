// 플랫폼별 마스터 상품 폼 필드 정의
// 실제 API 스펙 기반:
//   Qoo10  → ItemsBasic.SetNewGoods v1.1
//   Shopify → productCreate + productVariantsBulkCreate (2025-10 stable)

import type { ChannelId } from "./channels";

export type PlatformKey = "QOO10_JP" | "SHOPIFY" | "SHOPEE" | "RAKUTEN";

export interface PlatformField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "checkbox";
  required: boolean;
  /** 다른 필드 값에 따라 동적으로 required가 바뀌는 경우 사용 */
  conditionalRequired?: { dependsOn: string; values: string[] };
  placeholder?: string;
  note?: string;
  options?: Array<{ value: string; label: string }>;
  /**
   * 다른 필드 값에 따라 options가 달라지는 경우.
   * dependsOn 필드 값이 values 중 하나이면 conditionalOptions를 select로 표시,
   * 그 외에는 일반 text input으로 표시.
   */
  conditionalOptions?: {
    dependsOn: string;
    values: string[];
    options: Array<{ value: string; label: string }>;
  };
  maxLength?: number;
  /** 섹션 구분 헤더. 값이 있으면 이 필드 위에 섹션 헤더를 렌더링 */
  sectionHeader?: string;
}

export interface PlatformDef {
  key: PlatformKey;
  /** 연결된 채널 ID (useChannelApiKey와 매핑) */
  channelId: ChannelId;
  label: string;
  color: string; // Chakra colorPalette
  fields: PlatformField[];
  /** 공통 필드 중 이 플랫폼에서 필수인 것들 */
  requiredCommonFields: string[];
  /** false면 API 미구현 — 채널 연결 여부와 무관하게 폼에서 숨김 */
  apiAvailable: boolean;
}

export const PLATFORM_DEFS: PlatformDef[] = [
  // ─────────────────────────────────────────────────────────────
  // Qoo10  (ItemsBasic.SetNewGoods v1.1)
  // ─────────────────────────────────────────────────────────────
  {
    key: "QOO10_JP",
    channelId: "qoo10",
    label: "Qoo10",
    color: "orange",
    apiAvailable: true,
    requiredCommonFields: ["title", "descriptionHtml"],
    fields: [
      // ── 카테고리 ──────────────────────────────────────────────
      {
        key: "qoo10.SecondSubCat",
        label: "카테고리 코드 (소분류)",
        type: "text",
        required: true,
        placeholder: "예: 100100100",
        note: "Qoo10 카테고리 9자리 코드. 카테고리 선택 UI는 추후 지원 예정.",
        sectionHeader: "카테고리",
      },
      {
        key: "qoo10.OuterSecondSubCat",
        label: "글로벌 카테고리 코드",
        type: "text",
        required: false,
        placeholder: "예: 100100100",
        note: "일본 외 글로벌 노출용 카테고리 코드 (선택)",
        maxLength: 9,
      },

      // ── 기본 정보 ─────────────────────────────────────────────
      {
        key: "qoo10.ItemTitle",
        label: "상품명 (Qoo10용)",
        type: "text",
        required: false,
        placeholder: "미입력 시 공통 상품명 사용",
        note: "Qoo10에 실제 노출될 상품명. 미입력 시 공통 상품명 적용.",
        maxLength: 100,
        sectionHeader: "기본 정보",
      },
      {
        key: "qoo10.PromotionName",
        label: "프로모션명",
        type: "text",
        required: false,
        placeholder: "예: 여름 특가",
        maxLength: 20,
      },
      {
        key: "qoo10.SellerCode",
        label: "판매자 상품 코드",
        type: "text",
        required: false,
        placeholder: "판매자 지정 코드",
        maxLength: 100,
      },
      {
        key: "qoo10.AdultYN",
        label: "성인 상품 여부",
        type: "select",
        required: false,
        options: [
          { value: "N", label: "일반 (N)" },
          { value: "Y", label: "성인 (Y)" },
        ],
      },
      {
        key: "qoo10.BrandNo",
        label: "브랜드 번호",
        type: "text",
        required: false,
        placeholder: "Qoo10 브랜드 번호 (숫자)",
        note: "Qoo10 브랜드 검색 후 번호 입력. 브랜드 자동완성 UI는 추후 지원 예정.",
      },

      // ── 가격 · 재고 ───────────────────────────────────────────
      {
        key: "qoo10.ItemPrice",
        label: "판매가 (JPY)",
        type: "number",
        required: true,
        placeholder: "예: 3000",
        sectionHeader: "가격 · 재고",
      },
      {
        key: "qoo10.RetailPrice",
        label: "시중 정가 (JPY)",
        type: "number",
        required: false,
        placeholder: "예: 5000",
      },
      {
        key: "qoo10.TaxRate",
        label: "세율",
        type: "select",
        required: false,
        options: [
          { value: "S", label: "표준 (S)" },
          { value: "10", label: "10%" },
          { value: "8", label: "8% (경감세율)" },
          { value: "0", label: "비과세 (0)" },
        ],
      },
      {
        key: "qoo10.ItemQty",
        label: "초기 재고 수량",
        type: "number",
        required: true,
        placeholder: "예: 100",
        note: "옵션(변형) 미사용 상품 전용. 옵션 사용 시 변형별 재고로 대체됩니다.",
      },
      {
        key: "qoo10.ExpireDate",
        label: "판매 종료일",
        type: "text",
        required: false,
        placeholder: "YYYY-MM-DD (미입력 시 1년 후)",
      },

      // ── 이미지 · 미디어 ───────────────────────────────────────
      {
        key: "qoo10.StandardImage",
        label: "대표 이미지 URL (Qoo10용)",
        type: "text",
        required: false,
        placeholder: "미입력 시 공통 첫 번째 이미지 사용",
        note: "Qoo10 전용 대표 이미지. 미입력 시 공통 이미지[0] 적용.",
        maxLength: 200,
        sectionHeader: "이미지 · 미디어",
      },
      {
        key: "qoo10.VideoURL",
        label: "동영상 URL",
        type: "text",
        required: false,
        placeholder: "https://...",
        maxLength: 200,
      },
      {
        key: "qoo10.ItemDescription",
        label: "상품 설명 (Qoo10용)",
        type: "textarea",
        required: false,
        placeholder: "HTML 가능. 미입력 시 공통 상품 설명 사용.",
        note: "Qoo10 전용 상품 설명(HTML). 미입력 시 공통 descriptionHtml 적용.",
      },

      // ── 배송 ──────────────────────────────────────────────────
      {
        key: "qoo10.ShippingNo",
        label: "배송 템플릿 번호",
        type: "text",
        required: true,
        placeholder: "Qoo10 배송 템플릿 번호",
        sectionHeader: "배송",
      },
      {
        key: "qoo10.AvailableDateType",
        label: "배송 가능 유형",
        type: "select",
        required: true,
        options: [
          { value: "0", label: "일반발송 (0) — 1~3 영업일" },
          { value: "1", label: "상품준비일 (1) — 4~14일" },
          { value: "2", label: "출시일 (2) — YYYY/MM/DD" },
          { value: "3", label: "당일발송 (3) — HH:MM" },
        ],
      },
      {
        key: "qoo10.AvailableDateValue",
        label: "배송 가능 값",
        type: "text",
        required: false,
        placeholder: "유형 1: YYYY-MM-DD / 유형 2: 영업일 수",
        note: "배송 가능 유형이 '날짜 지정(1)' 또는 '영업일 기준(2)'일 때 입력",
        conditionalRequired: { dependsOn: "qoo10.AvailableDateType", values: ["1", "2"] },
        maxLength: 10,
      },

      // ── 원산지 ────────────────────────────────────────────────
      {
        key: "qoo10.ProductionPlaceType",
        label: "원산지 유형",
        type: "select",
        required: false,
        options: [
          { value: "1", label: "일본 국내 (1)" },
          { value: "2", label: "해외 (2)" },
          { value: "3", label: "기타 (3)" },
        ],
        sectionHeader: "원산지",
      },
      {
        key: "qoo10.ProductionPlace",
        label: "원산지 상세",
        type: "text",
        required: false,
        placeholder: "예: Korea / 기타",
        note: "유형 1: 일본 도도부현 선택, 유형 2: 국가명, 유형 3: 자유입력",
        maxLength: 50,
        conditionalOptions: {
          dependsOn: "qoo10.ProductionPlaceType",
          values: ["1"],
          options: [
            { value: "HOKKAIDO", label: "北海道 (HOKKAIDO)" },
            { value: "AOMORI", label: "青森県 (AOMORI)" },
            { value: "IWATE", label: "岩手県 (IWATE)" },
            { value: "MIYAGI", label: "宮城県 (MIYAGI)" },
            { value: "AKITA", label: "秋田県 (AKITA)" },
            { value: "YAMAGATA", label: "山形県 (YAMAGATA)" },
            { value: "FUKUSHIMA", label: "福島県 (FUKUSHIMA)" },
            { value: "IBARAKI", label: "茨城県 (IBARAKI)" },
            { value: "TOCHIGI", label: "栃木県 (TOCHIGI)" },
            { value: "GUMMA", label: "群馬県 (GUMMA)" },
            { value: "SAITAMA", label: "埼玉県 (SAITAMA)" },
            { value: "CHIBA", label: "千葉県 (CHIBA)" },
            { value: "TOKYO", label: "東京都 (TOKYO)" },
            { value: "KANAGAWA", label: "神奈川県 (KANAGAWA)" },
            { value: "NIIGATA", label: "新潟県 (NIIGATA)" },
            { value: "TOYAMA", label: "富山県 (TOYAMA)" },
            { value: "ISHIKAWA", label: "石川県 (ISHIKAWA)" },
            { value: "FUKUI", label: "福井県 (FUKUI)" },
            { value: "YAMANASHI", label: "山梨県 (YAMANASHI)" },
            { value: "NAGANO", label: "長野県 (NAGANO)" },
            { value: "GIFU", label: "岐阜県 (GIFU)" },
            { value: "SHIZUOKA", label: "静岡県 (SHIZUOKA)" },
            { value: "AICHI", label: "愛知県 (AICHI)" },
            { value: "MIE", label: "三重県 (MIE)" },
            { value: "SHIGA", label: "滋賀県 (SHIGA)" },
            { value: "KYOTO", label: "京都府 (KYOTO)" },
            { value: "OSAKA", label: "大阪府 (OSAKA)" },
            { value: "HYOGO", label: "兵庫県 (HYOGO)" },
            { value: "NARA", label: "奈良県 (NARA)" },
            { value: "WAKAYAMA", label: "和歌山県 (WAKAYAMA)" },
            { value: "TOTTORI", label: "鳥取県 (TOTTORI)" },
            { value: "SHIMANE", label: "島根県 (SHIMANE)" },
            { value: "OKAYAMA", label: "岡山県 (OKAYAMA)" },
            { value: "HIROSHIMA", label: "広島県 (HIROSHIMA)" },
            { value: "YAMAGUCHI", label: "山口県 (YAMAGUCHI)" },
            { value: "TOKUSHIMA", label: "徳島県 (TOKUSHIMA)" },
            { value: "KAGAWA", label: "香川県 (KAGAWA)" },
            { value: "EHIME", label: "愛媛県 (EHIME)" },
            { value: "KOCHI", label: "高知県 (KOCHI)" },
            { value: "FUKUOKA", label: "福岡県 (FUKUOKA)" },
            { value: "SAGA", label: "佐賀県 (SAGA)" },
            { value: "NAGASAKI", label: "長崎県 (NAGASAKI)" },
            { value: "KUMAMOTO", label: "熊本県 (KUMAMOTO)" },
            { value: "OITA", label: "大分県 (OITA)" },
            { value: "MIYAZAKI", label: "宮崎県 (MIYAZAKI)" },
            { value: "KAGOSHIMA", label: "鹿児島県 (KAGOSHIMA)" },
            { value: "OKINAWA", label: "沖縄県 (OKINAWA)" },
          ],
        },
      },

      // ── 추가 정보 ─────────────────────────────────────────────
      {
        key: "qoo10.ModelNM",
        label: "모델명",
        type: "text",
        required: false,
        placeholder: "예: MODEL-001",
        maxLength: 30,
        sectionHeader: "추가 정보",
      },
      {
        key: "qoo10.ManufactureDate",
        label: "제조일",
        type: "text",
        required: false,
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "qoo10.Material",
        label: "소재 (Qoo10용)",
        type: "text",
        required: false,
        placeholder: "미입력 시 공통 소재 사용",
        note: "Qoo10 전용 소재 설명. 미입력 시 공통 소재 적용.",
        maxLength: 500,
      },
      {
        key: "qoo10.Weight",
        label: "무게 (kg)",
        type: "number",
        required: false,
        placeholder: "예: 0.3 (최대 30kg)",
        note: "미입력 시 공통 무게(g)에서 자동 변환",
      },
      {
        key: "qoo10.ContactInfo",
        label: "문의처",
        type: "text",
        required: false,
        placeholder: "예: 03-1234-5678",
        maxLength: 100,
      },
      {
        key: "qoo10.IndustrialCodeType",
        label: "산업 코드 유형",
        type: "select",
        required: false,
        options: [
          { value: "J", label: "JAN (J)" },
          { value: "K", label: "KAN (K)" },
          { value: "I", label: "ISBN (I)" },
          { value: "U", label: "UPC (U)" },
          { value: "E", label: "EAN (E)" },
          { value: "H", label: "HS코드 (H)" },
        ],
      },
      {
        key: "qoo10.IndustrialCode",
        label: "산업 코드",
        type: "text",
        required: false,
        placeholder: "예: 4901234567890",
        maxLength: 13,
      },
      {
        key: "qoo10.Drugtype",
        label: "의약품 분류",
        type: "text",
        required: false,
        placeholder: "의약품 카테고리 한정",
        note: "의약품 카테고리 상품에만 입력. 일반 상품은 공백으로 두세요.",
      },
      {
        key: "qoo10.Keyword",
        label: "검색 키워드",
        type: "text",
        required: false,
        placeholder: "예: 티셔츠,반팔,여름 (최대 10개, 쉼표 구분)",
        note: "쉼표로 구분, 최대 10개",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Shopify  (productCreate + productVariantsBulkCreate)
  // ─────────────────────────────────────────────────────────────
  {
    key: "SHOPIFY",
    channelId: "shopify",
    label: "Shopify",
    color: "green",
    apiAvailable: true,
    requiredCommonFields: ["title", "images"],
    fields: [
      // ── 기본 정보 ─────────────────────────────────────────────
      {
        key: "shopify.title",
        label: "상품명 (Shopify용)",
        type: "text",
        required: false,
        placeholder: "미입력 시 공통 상품명 사용",
        note: "Shopify에 실제 노출될 상품명. 미입력 시 공통 상품명 적용.",
        sectionHeader: "기본 정보",
      },
      {
        key: "shopify.status",
        label: "상품 상태",
        type: "select",
        required: true,
        options: [
          { value: "DRAFT", label: "임시저장 (DRAFT)" },
          { value: "ACTIVE", label: "판매중 (ACTIVE)" },
          { value: "ARCHIVED", label: "보관됨 (ARCHIVED)" },
        ],
      },
      {
        key: "shopify.vendor",
        label: "공급업체 (Vendor)",
        type: "text",
        required: false,
        placeholder: "브랜드명 또는 공급업체명",
        maxLength: 255,
      },
      {
        key: "shopify.productType",
        label: "상품 유형",
        type: "text",
        required: false,
        placeholder: "예: Apparel",
        maxLength: 255,
      },
      {
        key: "shopify.handle",
        label: "URL 핸들 (Slug)",
        type: "text",
        required: false,
        placeholder: "예: my-product-001",
        note: "영소문자, 숫자, 하이픈만 사용. 미입력 시 Shopify 자동 생성.",
      },
      {
        key: "shopify.descriptionHtml",
        label: "상품 설명 (Shopify용)",
        type: "textarea",
        required: false,
        placeholder: "HTML 가능. 미입력 시 공통 상품 설명 사용.",
        note: "Shopify 전용 상품 설명(HTML). 미입력 시 공통 descriptionHtml 적용.",
      },
      {
        key: "shopify.tags",
        label: "태그",
        type: "text",
        required: false,
        placeholder: "예: summer, sale, new-arrival",
        note: "쉼표로 구분. 미입력 시 공통 태그 사용.",
      },
      {
        key: "shopify.giftCard",
        label: "기프트 카드",
        type: "checkbox",
        required: false,
        note: "체크 시 Shopify 기프트 카드 상품으로 설정됩니다.",
      },
      {
        key: "shopify.requiresSellingPlan",
        label: "구독 판매 전용",
        type: "checkbox",
        required: false,
        note: "체크 시 구독 플랜 없이 단독 구매 불가.",
      },

      // ── SEO ───────────────────────────────────────────────────
      {
        key: "shopify.seo.title",
        label: "SEO 제목",
        type: "text",
        required: false,
        placeholder: "검색엔진 표시 제목",
        sectionHeader: "SEO",
      },
      {
        key: "shopify.seo.description",
        label: "SEO 설명",
        type: "textarea",
        required: false,
        placeholder: "검색엔진 표시 설명",
      },

      // ── 변형 기본값 ───────────────────────────────────────────
      {
        key: "shopify.variantDefaults.compareAtPrice",
        label: "비교 가격 (할인 전 원가)",
        type: "number",
        required: false,
        placeholder: "예: 39.99",
        note: "할인 전 원가. 판매가보다 높으면 Shopify에서 할인율 표시.",
        sectionHeader: "변형 기본값",
      },
      {
        key: "shopify.variantDefaults.barcode",
        label: "바코드",
        type: "text",
        required: false,
        placeholder: "EAN, UPC 등",
        maxLength: 255,
      },
      {
        key: "shopify.variantDefaults.inventoryPolicy",
        label: "재고 정책",
        type: "select",
        required: false,
        options: [
          { value: "DENY", label: "품절 시 판매 중단 (DENY)" },
          { value: "CONTINUE", label: "품절 시에도 계속 판매 (CONTINUE)" },
        ],
      },
      {
        key: "shopify.variantDefaults.weightUnit",
        label: "무게 단위",
        type: "select",
        required: false,
        options: [
          { value: "GRAMS", label: "그램 (GRAMS)" },
          { value: "KILOGRAMS", label: "킬로그램 (KILOGRAMS)" },
          { value: "OUNCES", label: "온스 (OUNCES)" },
          { value: "POUNDS", label: "파운드 (POUNDS)" },
        ],
      },
      {
        key: "shopify.variantDefaults.taxable",
        label: "과세 상품",
        type: "checkbox",
        required: false,
        note: "체크 시 변형 기본값으로 세금 적용.",
      },
      {
        key: "shopify.variantDefaults.requiresShipping",
        label: "배송 필요",
        type: "checkbox",
        required: false,
        note: "체크 시 실물 배송 상품으로 처리. 디지털 상품은 해제.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Shopee  (API 미구현 — 폼 숨김)
  // ─────────────────────────────────────────────────────────────
  {
    key: "SHOPEE",
    channelId: "shopee",
    label: "Shopee",
    color: "red",
    apiAvailable: false,
    requiredCommonFields: ["title", "images", "descriptionHtml"],
    fields: [],
  },

  // ─────────────────────────────────────────────────────────────
  // Rakuten  (API 미구현 — 폼 숨김)
  // ─────────────────────────────────────────────────────────────
  {
    key: "RAKUTEN",
    channelId: "rakuten",
    label: "Rakuten",
    color: "red",
    apiAvailable: false,
    requiredCommonFields: ["title", "images", "descriptionHtml"],
    fields: [],
  },
];

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  QOO10_JP: "Qoo10",
  SHOPIFY: "Shopify",
  SHOPEE: "Shopee",
  RAKUTEN: "Rakuten",
};
