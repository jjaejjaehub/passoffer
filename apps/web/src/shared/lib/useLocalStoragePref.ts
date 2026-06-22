"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage 동기화 훅.
 * 초기 mount 전에는 initialValue 반환 → hydration mismatch 방지.
 * setter 호출 시 localStorage + state 양쪽에 반영.
 */
export function useLocalStoragePref<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // mount 후 1회 localStorage 로 동기화
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore — corrupt JSON, quota, etc.
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [key],
  );

  return [hydrated ? value : initialValue, update];
}
