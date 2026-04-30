import { DEFAULT_ADJUSTMENT_REASONS } from "@oms/types";
import type { ReasonOption } from "../model/types";

export function buildReasonOptions(
  mapping: Record<string, string> | null | undefined,
): ReasonOption[] {
  if (mapping && Object.keys(mapping).length > 0) {
    return Object.entries(mapping).map(([value, label]) => ({ value, label }));
  }
  return Object.entries(DEFAULT_ADJUSTMENT_REASONS).map(([value, label]) => ({
    value,
    label,
  }));
}
