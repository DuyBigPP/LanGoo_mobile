import * as React from "react";
import { hasKanji, toFurigana, type FuriganaSegment } from "@/lib/furigana";
import { getString, setString } from "@/lib/storage";

/** Chờ người dùng ngừng gõ rồi mới phân tích (giống web). */
const DEBOUNCE_MS = 350;

export interface FuriganaState {
  status: "idle" | "loading" | "done" | "error";
  segments: FuriganaSegment[];
}

/** Sinh furigana cho văn bản tiếng Nhật (nạp từ điển kuromoji ở lần đầu). */
export function useFurigana(text: string, enabled: boolean): FuriganaState {
  const [state, setState] = React.useState<FuriganaState>({ status: "idle", segments: [] });

  React.useEffect(() => {
    if (!enabled || !text.trim() || !hasKanji(text)) {
      setState({ status: "idle", segments: [] });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", segments: [] });
    const timer = setTimeout(() => {
      toFurigana(text)
        .then(segments => {
          if (!cancelled) setState({ status: "done", segments });
        })
        .catch(error => {
          console.warn("[furigana] nạp từ điển lỗi:", error);
          if (!cancelled) setState({ status: "error", segments: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, enabled]);

  return state;
}

const PREF_KEY = "langoo.furigana";

/**
 * Công tắc furigana nhớ lựa chọn của người dùng. Mặc định BẬT (như web); lần đầu bật sẽ nạp từ điển ~17MB
 * nên chỉ trả `true` sau khi đã đọc xong lựa chọn đã lưu (tránh nạp từ điển khi người dùng đã tắt).
 */
export function useFuriganaPreference(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    void getString(PREF_KEY).then(value => setEnabled(value !== "0"));
  }, []);

  const update = React.useCallback((value: boolean) => {
    setEnabled(value);
    void setString(PREF_KEY, value ? "1" : "0");
  }, []);

  return [enabled, update];
}
