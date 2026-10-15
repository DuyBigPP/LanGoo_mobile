import * as React from "react";
import { useI18n } from "@/i18n";
import { translateText, type TranslateResult } from "@/lib/translate";

/** Trạng thái dịch của useTranslation. */
export type TranslationStatus = "idle" | "loading" | "success" | "error";

export interface TranslationState {
  status: TranslationStatus;
  result: TranslateResult | null;
  /** Dịch lại thủ công (dùng cho nút "Thử lại" khi lỗi). */
  refetch: () => void;
}

const DEBOUNCE_MS = 250;

/**
 * Dịch văn bản phía client (fallback khi từ điển không có kết quả).
 * Debounce 250ms trước khi gọi `translateText`; đích là VI (hoặc EN khi giao diện tiếng Anh).
 */
export function useTranslation(text: string, enabled = true): TranslationState {
  const { locale } = useI18n();
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<TranslationStatus>("idle");
  const [result, setResult] = React.useState<TranslateResult | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const requestRef = React.useRef(0);

  // Debounce nội dung trước khi dịch
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  React.useEffect(() => {
    if (!enabled || !debounced) {
      setStatus("idle");
      setResult(null);
      return;
    }
    let cancelled = false;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus("loading");
    translateText(debounced, "auto", locale === "en" ? "en" : "vi")
      .then(next => {
        if (cancelled || requestRef.current !== requestId) return;
        setResult(next);
        setStatus("success");
      })
      .catch(() => {
        if (cancelled || requestRef.current !== requestId) return;
        setResult(null);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, enabled, locale, attempt]);

  const refetch = React.useCallback(() => setAttempt(value => value + 1), []);

  return { status, result, refetch };
}
