export const LOCALES = ["ko", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "oms-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ko" || value === "ja";
}
