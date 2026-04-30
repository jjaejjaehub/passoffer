import type { Qoo10EditGoodsStatusRequest } from "@/shared/api/qoo10/itemTypes";

export interface EditItemStatusVariables {
  itemCode: string;
  status: Qoo10EditGoodsStatusRequest["Status"];
}
