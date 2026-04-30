/**
 * Qoo10 단순(추가구성) 옵션 — 항목명 프리셋 버튼
 * 버튼 라벨은 한·일 병기, 항목명 input에는 Qoo10 관행에 맞는 일본어 값을 넣는다.
 */

export type Qoo10SimpleOptionPresetAction = "fill" | "focus";

export interface Qoo10SimpleOptionPreset {
  id: string;
  /** 버튼 표시 텍스트 */
  label: string;
  /** action이 fill일 때 항목명 input에 넣을 값 */
  nameValue: string | null;
  action: Qoo10SimpleOptionPresetAction;
}

export const QOO10_SIMPLE_OPTION_NOT_SELECTED_VALUE = "選択しない";

export const QOO10_SIMPLE_OPTION_PRESETS: readonly Qoo10SimpleOptionPreset[] = [
  {
    id: "additional_purchase",
    label: "+追加購入 (추가구매)",
    nameValue: "追加購入",
    action: "fill",
  },
  {
    id: "bonus",
    label: "+おまけ (사은품)",
    nameValue: "おまけ",
    action: "fill",
  },
  {
    id: "gift_wrap",
    label: "+ギフト包装 (선물포장)",
    nameValue: "ギフト包装",
    action: "fill",
  },
  {
    id: "custom",
    label: "+직접입력",
    nameValue: null,
    action: "focus",
  },
];
