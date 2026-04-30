// Qoo10 ItemsLookup.GetItemDetailInfo — 응답 필드명은 API와 동일(PascalCase)

export interface Qoo10ItemDetailRaw {
  ItemCode: string;
  ItemStatus: string;
  ItemTitle: string;
  PromotionName: string;
  MainCatCd: string;
  MainCatNm: string;
  FirstSubCatCd: string;
  FirstSubCatNm: string;
  SecondSubCatCd: string;
  SecondSubCatNm: string;
  Drugtype: string;
  SellerCode: string;
  ProductionPlaceType: string;
  ProductionPlace: string;
  IndustrialCodeType: string;
  IndustrialCode: string;
  RetailPrice: string;
  ItemPrice: string;
  TaxRate: string;
  SettlePrice: string;
  ItemQty: string;
  ExpireDate: string;
  ModelNM: string;
  ManufacturerDate: string;
  BrandNo: string;
  Material: string;
  AdultYN: string;
  DesiredShippingDate: string;
  AvailableDateType: string;
  AvailableDateValue: string;
  ShippingNo: string;
  ContactInfo: string;
  ItemDetail: string;
  ImageUrl: string;
  VideoURL: string;
  Keyword: string;
  ListedDate: string;
  ChangedDate: string;
  OptionShippingNo1: string;
  OptionShippingNo2: string;
}

export interface Qoo10ItemDetailResponse {
  ResultObject?: Qoo10ItemDetailRaw[];
  ResultCode: number;
  ResultMsg: string;
}

// ItemsLookup.GetGoodsOptionInfo — 단일형 옵션 조회
export interface Qoo10GoodsOption {
  Name: string;
  Value: string;
  Price: number;
  OptionCode: string;
}

export interface Qoo10GetGoodsOptionInfoRequest {
  ItemCode: string;
  SellerCode?: string;
}

export interface Qoo10GetGoodsOptionInfoResponse {
  ResultObject: Qoo10GoodsOption[];
  ResultCode: number;
  ResultMsg: string;
}

// ItemsBasic.UpdateGoods — 요청 필드명은 Qoo10 API와 동일
export interface Qoo10UpdateGoodsRequest {
  ItemCode: string;
  SecondSubCat: string;
  ItemTitle: string;
  ProductionPlaceType: string;
  AdultYN: string;
  AvailableDateType: string;
  AvailableDateValue: string;

  Drugtype?: string;
  PromotionName?: string;
  SellerCode?: string;
  IndustrialCodeType?: string;
  IndustrialCode?: string;
  BrandNo?: string;
  ManufactureDate?: string;
  ModelNm?: string;
  Material?: string;
  ProductionPlace?: string;
  RetailPrice?: string;
  ContactInfo?: string;
  ShippingNo?: string;
  OptionShippingNo1?: string;
  OptionShippingNo2?: string;
  Weight?: string;
  DesiredShippingDate?: string;
  Keyword?: string;
  ItemQty?: string;
}

export interface Qoo10UpdateGoodsResponse {
  ResultCode: number;
  ResultMsg: string;
}

/** ItemsBasic.EditGoodsStatus — 거래상태 변경 */
export type Qoo10EditGoodsStatusCode = "1" | "2" | "3";

export interface Qoo10EditGoodsStatusRequest {
  ItemCode: string;
  Status: Qoo10EditGoodsStatusCode;
}

export interface Qoo10EditGoodsStatusResponse {
  ResultCode: number;
  ResultMsg: string;
}

// ItemsOptions.EditGoodsOption — 단일형 옵션 수정
export interface Qoo10EditGoodsOptionRequest {
  ItemCode: string;
  SellerCode?: string;
  /**
   * 포맷:
   * [옵션명]||*[옵션상세]||*[가격]||*[옵션코드]$$...
   */
  AdditionalOption?: string;
}

export interface Qoo10EditGoodsOptionResponse {
  ResultCode: number;
  ResultMsg: string;
}
