// 플랫폼별 필드 제약 메타데이터
// 플랫폼이 추가될 때 이 파일에만 추가하면 프론트가 자동으로 경고 표시

export interface FieldConstraint {
  maxLength?: number;
  minLength?: number;
  forbiddenChars?: string[];
  forbiddenPattern?: string; // RegExp source string (JSON 직렬화 가능)
  min?: number;
  max?: number;
  maxCount?: number; // 배열 필드용
  currency?: string;
  note?: string;
}

export interface PlatformConstraints {
  title: FieldConstraint;
  description: FieldConstraint;
  sku: FieldConstraint;
  price: FieldConstraint;
  images: FieldConstraint;
  tags?: FieldConstraint;
  brand?: FieldConstraint;
  weight?: FieldConstraint;
}

export const PLATFORM_CONSTRAINTS: Record<string, PlatformConstraints> = {
  QOO10_JP: {
    title: {
      maxLength: 100,
      forbiddenChars: ["@", "#", "$", "&", "<", ">", '"'],
      note: 'Qoo10 상품명은 특수문자(@#$&<>")가 허용되지 않습니다',
    },
    description: {
      maxLength: 100_000,
    },
    sku: {
      maxLength: 50,
    },
    price: {
      min: 1,
      currency: "JPY",
    },
    images: {
      maxCount: 10,
      note: "대표 이미지 포함 최대 10장",
    },
    brand: {
      maxLength: 50,
    },
    weight: {
      min: 0,
      note: "단위: g",
    },
  },

  SHOPIFY: {
    title: {
      maxLength: 255,
    },
    description: {
      maxLength: 500_000,
    },
    sku: {
      maxLength: 255,
    },
    price: {
      min: 0,
      currency: "multi",
    },
    images: {
      maxCount: 250,
    },
    tags: {
      maxCount: 250,
      note: "태그 최대 250개",
    },
    brand: {
      maxLength: 255,
    },
  },

  SHOPEE: {
    title: {
      maxLength: 120,
      forbiddenChars: ["<", ">"],
      note: "Shopee 상품명은 최대 120자, < > 문자 불가",
    },
    description: {
      maxLength: 3000,
    },
    sku: {
      maxLength: 100,
    },
    price: {
      min: 0.01,
      currency: "multi",
    },
    images: {
      maxCount: 9,
      note: "이미지 최대 9장",
    },
    brand: {
      maxLength: 50,
    },
  },

  RAKUTEN: {
    title: {
      maxLength: 127,
      note: "Rakuten 상품명은 최대 127자",
    },
    description: {
      maxLength: 1_000_000,
    },
    sku: {
      maxLength: 36,
    },
    price: {
      min: 1,
      currency: "JPY",
    },
    images: {
      maxCount: 20,
    },
    brand: {
      maxLength: 127,
    },
  },
};

// 마스터 상품에서 채널 등록 시 필수 입력이 필요한 채널별 추가 필드
// 마스터 상품에 없는, 채널 고유의 필드들
export interface ChannelRequiredField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: Array<{ value: string; label: string }>;
  conditionalOptions?: {
    dependsOn: string;
    values: string[];
    options: Array<{ value: string; label: string }>;
  };
  note?: string;
}

const JAPAN_PREFECTURES = [
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
];

export const CHANNEL_REQUIRED_FIELDS: Record<string, ChannelRequiredField[]> = {
  QOO10_JP: [
    {
      key: "SecondSubCat",
      label: "카테고리 코드",
      type: "text",
      note: "Qoo10 카테고리 코드 (예: 1001001)",
    },
    {
      key: "AvailableDateType",
      label: "배송 가능 유형",
      type: "select",
      options: [
        { value: "0", label: "즉시 발송" },
        { value: "1", label: "날짜 지정" },
        { value: "2", label: "영업일 기준" },
        { value: "3", label: "품절" },
      ],
    },
    {
      key: "AvailableDateValue",
      label: "배송 가능 값",
      type: "text",
      note: "AvailableDateType에 대응하는 값",
    },
    {
      key: "ItemQty",
      label: "초기 재고 수량",
      type: "number",
    },
    {
      key: "ItemPrice",
      label: "판매가 (JPY)",
      type: "number",
    },
    {
      key: "ProductionPlaceType",
      label: "원산지 유형",
      type: "select",
      options: [
        { value: "1", label: "일본 국내 (1)" },
        { value: "2", label: "해외 (2)" },
        { value: "3", label: "기타 (3)" },
      ],
      note: "1=일본 국내, 2=해외, 3=기타",
    },
    {
      key: "ProductionPlace",
      label: "원산지 상세",
      type: "text",
      note: "유형 1: 일본 도도부현 선택, 유형 2: 국가명, 유형 3: 자유입력",
      conditionalOptions: {
        dependsOn: "ProductionPlaceType",
        values: ["1"],
        options: JAPAN_PREFECTURES,
      },
    },
  ],

  SHOPIFY: [
    {
      key: "status",
      label: "상품 상태",
      type: "select",
      options: [
        { value: "DRAFT", label: "임시저장 (DRAFT)" },
        { value: "ACTIVE", label: "판매중 (ACTIVE)" },
      ],
    },
    {
      key: "price",
      label: "판매가",
      type: "number",
    },
    {
      key: "inventoryQuantity",
      label: "초기 재고 수량",
      type: "number",
    },
  ],

  SHOPEE: [
    {
      key: "categoryId",
      label: "카테고리 ID",
      type: "number",
      note: "Shopee 카테고리 ID",
    },
    {
      key: "price",
      label: "판매가",
      type: "number",
    },
    {
      key: "stock",
      label: "초기 재고 수량",
      type: "number",
    },
  ],

  RAKUTEN: [
    {
      key: "itemUrl",
      label: "상품 URL (영문)",
      type: "text",
      note: "영소문자, 숫자, 하이픈만 사용 가능",
    },
    {
      key: "price",
      label: "판매가 (JPY)",
      type: "number",
    },
    {
      key: "stock",
      label: "초기 재고 수량",
      type: "number",
    },
  ],
};
