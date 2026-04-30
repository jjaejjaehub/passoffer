import { http } from "@/shared/api";
import type {
  Qoo10EditGoodsStatusRequest,
  Qoo10EditGoodsStatusResponse,
} from "@/shared/api/qoo10/itemTypes";

import type { EditItemStatusVariables } from "./editItemStatusTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQoo10EditGoodsStatusResponse(
  value: unknown,
): value is Qoo10EditGoodsStatusResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.ResultCode !== "number" ||
    !Number.isFinite(value.ResultCode)
  ) {
    return false;
  }
  if (typeof value.ResultMsg !== "string") {
    return false;
  }
  return true;
}

export async function executeEditItemStatus(
  variables: EditItemStatusVariables,
): Promise<Qoo10EditGoodsStatusResponse> {
  const body: Qoo10EditGoodsStatusRequest = {
    ItemCode: variables.itemCode.trim(),
    Status: variables.status,
  };

  const raw = await http.post<unknown>("/api/qoo10/items/edit-status", body);

  if (!isQoo10EditGoodsStatusResponse(raw)) {
    throw new Error("거래상태 변경 응답 형식이 올바르지 않습니다.");
  }

  if (raw.ResultCode !== 0) {
    throw new Error(
      raw.ResultMsg.trim().length > 0
        ? raw.ResultMsg
        : "거래상태 변경에 실패했습니다.",
    );
  }

  return raw;
}
