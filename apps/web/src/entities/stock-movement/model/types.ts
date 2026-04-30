import type { InventoryRow, AdjustmentReason } from "@oms/types";

export type WizardStep = 1 | 2 | 3;

export interface SourceSelection {
  locationCode: string;
  sku: string;
  lotCode: string | null;
  inventoryRow: InventoryRow;
}

export interface DestinationInput {
  locationCode: string;
  quantity: number;
}

export interface ReviewInput {
  reasonCode: AdjustmentReason | string;
  note: string;
}

export interface WizardState {
  step: WizardStep;
  source: SourceSelection | null;
  destination: DestinationInput | null;
  review: ReviewInput;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  source: null,
  destination: null,
  review: { reasonCode: "", note: "" },
};

export interface ReasonOption {
  value: string;
  label: string;
}
