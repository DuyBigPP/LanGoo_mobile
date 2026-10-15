import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en } from "./messages/en";
import { vi } from "./messages/vi";
import { LOCALES, type Locale, type Messages } from "./messages/types";

const STORAGE_KEY = "langoo-locale";
const DICTIONARIES: Record<Locale, Messages> = { vi, en };

/** Locale hiện tại ở mức module — để `translate()` dùng được ngoài React (api/lib). */
let activeLocale: Locale = "vi";

function lookup(source: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : null;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Dịch một khoá (dot-path). Thiếu khoá: fallback VI rồi trả lại khoá. */
export function translate(key: string, params?: Record<string, string | number>): string {
  const template =
    lookup(DICTIONARIES[activeLocale], key) ?? lookup(DICTIONARIES.vi, key);
  if (template === null) {
    if (__DEV__) console.warn(`[i18n] Thiếu khoá: ${key}`);
    return key;
  }
  return interpolate(template, params);
}

export interface I18nValue {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  // Khôi phục ngôn ngữ đã chọn (mặc định VI như bản web)
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (cancelled) return;
      if (isLocale(stored) && stored !== locale) {
        activeLocale = stored;
        setLocaleState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    activeLocale = next;
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => {
        const template =
          lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES.vi, key);
        return template === null ? key : interpolate(template, params);
      },
    }),
    [locale, setLocale],
  );

  return (
    <I18nContext.Provider value={value}>
      {/* key = locale để cây con render lại toàn bộ, đồng bộ cả các chỗ dùng translate() trực tiếp */}
      {React.isValidElement(children) ? React.cloneElement(children, { key: locale }) : children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n phải dùng trong <I18nProvider>");
  return context;
}

/** Hook gọn khi chỉ cần hàm dịch. */
export function useT() {
  return useI18n().t;
}

/** Ngoài React (api/lib) — dùng locale đang hoạt động. */
export function getLocale(): Locale {
  return activeLocale;
}
