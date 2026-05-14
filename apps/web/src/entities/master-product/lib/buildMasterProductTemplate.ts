import * as XLSX from "xlsx";

const HEADERS = [
  "code",
  "title",
  "brand",
  "hs_code",
  "country_of_origin",
  "material",
  "weight_g",
  "retail_price",
  "description_html",
  "tags",
  "image_urls",
  "option_group_1_name",
  "option_group_1_values",
  "option_group_2_name",
  "option_group_2_values",
  "variant_sku",
  "option_1",
  "option_2",
  "variant_price",
  "variant_stock",
] as const;

const SAMPLE_ROWS: Array<
  Record<(typeof HEADERS)[number], string | number | null>
> = [
  {
    code: "MP-DEMO-001",
    title: "데모 티셔츠",
    brand: "PassOffer",
    hs_code: "6109.10",
    country_of_origin: "KR",
    material: "Cotton 100%",
    weight_g: 220,
    retail_price: "19900",
    description_html: "<p>샘플 설명입니다.</p>",
    tags: "신상,베스트",
    image_urls: "https://example.com/img1.jpg,https://example.com/img2.jpg",
    option_group_1_name: "색상",
    option_group_1_values: "블랙,화이트",
    option_group_2_name: "사이즈",
    option_group_2_values: "S,M,L",
    variant_sku: "MP-DEMO-001-BK-S",
    option_1: "블랙",
    option_2: "S",
    variant_price: "19900",
    variant_stock: 10,
  },
  {
    code: "MP-DEMO-001",
    title: null,
    brand: null,
    hs_code: null,
    country_of_origin: null,
    material: null,
    weight_g: null,
    retail_price: null,
    description_html: null,
    tags: null,
    image_urls: null,
    option_group_1_name: null,
    option_group_1_values: null,
    option_group_2_name: null,
    option_group_2_values: null,
    variant_sku: "MP-DEMO-001-BK-M",
    option_1: "블랙",
    option_2: "M",
    variant_price: "19900",
    variant_stock: 8,
  },
  {
    code: "MP-DEMO-001",
    title: null,
    brand: null,
    hs_code: null,
    country_of_origin: null,
    material: null,
    weight_g: null,
    retail_price: null,
    description_html: null,
    tags: null,
    image_urls: null,
    option_group_1_name: null,
    option_group_1_values: null,
    option_group_2_name: null,
    option_group_2_values: null,
    variant_sku: "MP-DEMO-001-WH-L",
    option_1: "화이트",
    option_2: "L",
    variant_price: "21900",
    variant_stock: 5,
  },
  {
    code: "MP-DEMO-002",
    title: "데모 머그컵",
    brand: "PassOffer",
    hs_code: "6912.00",
    country_of_origin: "JP",
    material: "Ceramic",
    weight_g: 350,
    retail_price: "12000",
    description_html: "<p>옵션 없는 단일 상품 예시입니다.</p>",
    tags: "주방,선물",
    image_urls: "https://example.com/mug.jpg",
    option_group_1_name: null,
    option_group_1_values: null,
    option_group_2_name: null,
    option_group_2_values: null,
    variant_sku: "MP-DEMO-002",
    option_1: null,
    option_2: null,
    variant_price: "12000",
    variant_stock: 30,
  },
];

const README_ROWS: Array<[string, string]> = [
  ["컬럼", "설명"],
  ["code", "필수. 마스터 상품 코드 (행 그룹핑 키)"],
  ["title", "필수. 상품명 (같은 code의 첫 행에만 입력)"],
  ["brand", "선택. 브랜드명"],
  ["hs_code", "선택. HS 코드"],
  ["country_of_origin", "선택. 원산지 (예: KR, JP)"],
  ["material", "선택. 소재"],
  ["weight_g", "선택. 무게(g) — 숫자"],
  ["retail_price", "선택. 소비자가 — 숫자 문자열 (예: 19900, 19900.50)"],
  ["description_html", "선택. 상품 상세 HTML"],
  ["tags", "선택. 콤마로 구분 (예: 신상,베스트)"],
  ["image_urls", "선택. 콤마로 구분된 이미지 URL"],
  ["option_group_N_name", "선택. 옵션 그룹명 (N=1..5)"],
  ["option_group_N_values", "선택. 옵션 값 콤마 구분 (예: S,M,L)"],
  ["variant_sku", "변형 SKU. 같은 code의 모든 변형은 다른 행에 입력"],
  ["option_N", "변형의 옵션 값. option_group_N_name 순서와 매칭"],
  ["variant_price", "선택. 변형 가격 (미입력 시 retail_price 사용)"],
  ["variant_stock", "선택. 변형 재고 (기본 0)"],
  ["", ""],
  ["주의", "같은 code의 두 번째 행부터는 변형 컬럼만 채우면 됩니다."],
  ["주의", "option_N의 값은 option_group_N_values에 정의된 값이어야 합니다."],
  ["주의", "variant_sku는 파일 전체에서 고유해야 합니다."],
];

export function buildMasterProductTemplate(): Blob {
  const workbook = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
    header: HEADERS as unknown as string[],
  });
  dataSheet["!cols"] = HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, dataSheet, "products");

  const readmeSheet = XLSX.utils.aoa_to_sheet(README_ROWS);
  readmeSheet["!cols"] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, readmeSheet, "README");

  const buffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadMasterProductTemplate(
  filename = "master-products-template.xlsx",
): void {
  const blob = buildMasterProductTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
