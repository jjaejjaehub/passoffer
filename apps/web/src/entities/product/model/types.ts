import type { Product } from "@oms/types";
export type { Product };

export interface Qoo10ProductsQueryParams {
  ItemStatus: string;
  Page: string;
  /** true면 S2·S1·S0·S3·S5·S8 각각 같은 Page로 조회 후 목록을 병합 (전체 탭) */
  mergeAllStatuses?: boolean;
  /** false로 설정 시 쿼리 비활성화 (채널 미선택 시 낭비 방지) */
  enabled?: boolean;
}

export interface Qoo10ProductsQueryResult {
  data: Product[];
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  error: Qoo10QueryError | null;
  hasApiKey: boolean;
  refetch: () => void;
  /** mergeAll 모드에서만 채워짐 — 상태별 총 건수 */
  statusTotals?: Record<string, number>;
}

export type Qoo10QueryErrorType =
  | "NO_API_KEY"
  | "AUTH_ERROR"
  | "NETWORK_ERROR"
  | "API_ERROR"
  | "STATUS_RESTRICTED" // 거래중지·거래제한 등 상세 조회 불가 상태
  | "UNKNOWN";

export interface Qoo10QueryError {
  type: Qoo10QueryErrorType;
  message: string;
}

export type ProductStatus = "active" | "inactive";

export type AvailableDateType = "same_day" | "prep" | "release" | "normal";

export interface InventoryOptionItem {
  Name1: string;
  Value1: string;
  Name2: string;
  Value2: string;
  Name3: string;
  Value3: string;
  Name4: string;
  Value4: string;
  Name5: string;
  Value5: string;
  Price: number;
  Qty: number;
  ItemTypeCode: string;
  /** UI 전용 row 고유 식별자. 직렬화 시 무시됨. */
  _rowId?: string;
}

export interface SimpleOptionItem {
  Name: string;
  Value: string;
  Price: number;
  OptionCode: string;
  /** UI 전용: 신규 행 — API 페이로드에서 제외 */
  _isNew?: boolean;
  /** UI 전용: 임시 행 식별 — API 페이로드에서 제외 */
  _tempId?: string;
}

export type OptionAxisState = {
  id: string;
  name: string;
  values: string[];
  _rawValues: string;
};

export type InventoryOptionData =
  | { type: "inventory"; items: InventoryOptionItem[] }
  | { type: "none" };

export type SimpleOptionData =
  | { type: "simple"; items: SimpleOptionItem[] }
  | { type: "none" };
