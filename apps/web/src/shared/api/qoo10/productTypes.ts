// 상품 등록 요청 파라미터 (Qoo10 SetNewGoods API 기준)
export interface Qoo10RegisterProductParams {
  SecondSubCat: string; // 소분류 카테고리 코드 [필수]
  ItemTitle: string; // 상품명 최대 100자 [필수]
  ItemPrice: number; // 판매가격 (円) [필수]
  ItemQty: number; // 재고수량 [필수]
  AvailableDateType: '0' | '1' | '2' | '3'; // 발송가능일 타입 [필수]
  AvailableDateValue: string; // 발송가능일 값 [필수]

  // 선택 필드
  OuterSecondSubCat?: string;
  Drugtype?: string;
  BrandNo?: string;
  PromotionName?: string;
  SellerCode?: string;
  IndustrialCodeType?: string;
  IndustrialCode?: string;
  ModelNM?: string;
  ManufactureDate?: string;
  ProductionPlaceType?: '1' | '2' | '3'; // 원산지 타입 (국내/해외/기타)
  ProductionPlace?: string; // 원산지
  Weight?: string;
  Material?: string;
  AdultYN?: 'Y' | 'N';
  ContactInfo?: string;
  StandardImage?: string; // 대표이미지 URL
  VideoURL?: string;
  ItemDescription?: string; // 상품상세 HTML
  AdditionalOption?: string;
  ItemType?: string;
  RetailPrice?: number;
  TaxRate?: '10' | '8' | '0' | 'S';
  ExpireDate?: string; // 판매종료일 yyyy-mm-dd
  ShippingNo?: number; // 배송비코드
  Keyword?: string;
}

// 카테고리 플랫 아이템
export interface Qoo10CategoryItem {
  CATE_L_CD: string;
  CATE_L_NM: string;
  CATE_M_CD: string;
  CATE_M_NM: string;
  CATE_S_CD: string;
  CATE_S_NM: string;
}

// 브랜드 아이템
export interface Qoo10BrandItem {
  M_B_NO: string;
  M_B_NM: string;
  M_B_NM_EN: string;
}

// 배송 그룹 아이템 (ItemsLookup.GetSellerDeliveryGroupInfo)
// ShippingType: X=무료, F=유료, M=조건부무료, W=방문수령, D=착불(선결제불가), R=착불(선결제가능)
export interface Qoo10ShippingTemplate {
  ShippingNo: number;
  ShippingFee: number;
  ShippingType: string;
  FreeCondition: number;
  Region: string;   // Y=지역별 배송비 설정, N=미설정
  Oversea: string;  // Y=해외배송비 설정, N=미설정
  transcName: string; // 배송사명
}

// 등록 결과
export interface Qoo10RegisterProductResult {
  GdNo: string;
  delivery_group_no: number;
}

