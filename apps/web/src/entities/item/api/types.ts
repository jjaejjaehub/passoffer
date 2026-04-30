export interface EditGoodsImageRequest {
  itemCode: string;
  sellerCode?: string;
  standardImage: string;
  videoURL?: string;
}

export interface EditGoodsContentsRequest {
  itemCode: string;
  sellerCode?: string;
  contents: string;
}

export interface EditGoodsResponse {
  ResultCode: number;
  ResultMsg: string;
}
