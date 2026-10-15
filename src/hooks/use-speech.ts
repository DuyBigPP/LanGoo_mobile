import * as React from "react";
import {
  addTtsListener,
  isTtsAvailable,
  speakAsync as ttsSpeakAsync,
  stopSpeaking,
} from "@/lib/tts";

/** Ngôn ngữ đọc của app (Nhật là chính; vi/en cho ghi chú, UI). */
export type SpeakLang = "ja" | "vi" | "en";

/** Khoá nhận diện đoạn đang đọc (lang + text) — UI so với `speakingKey`. */
export function speechKey(text: string, lang: SpeakLang): string {
  return `${lang}:${text}`;
}

export interface SpeakController {
  /** Đọc to văn bản; trả false nếu máy không hỗ trợ TTS (thiếu module hoặc thiếu engine). */
  speak: (text: string, lang: SpeakLang) => Promise<boolean>;
  /** Dừng đọc ngay. */
  stop: () => void;
  /** Khoá đoạn đang đọc (null khi không đọc gì). */
  speakingKey: string | null;
}

/** Bọc react-native-tts: một trạng thái speakingKey, tự xoá khi tts-finish/tts-cancel. */
export function useSpeak(): SpeakController {
  const [speakingKey, setSpeakingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    const clear = () => setSpeakingKey(null);
    const offFinish = addTtsListener("tts-finish", clear);
    const offCancel = addTtsListener("tts-cancel", clear);
    return () => {
      offFinish();
      offCancel();
    };
  }, []);

  const speak = React.useCallback(
    async (text: string, lang: SpeakLang): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const key = speechKey(trimmed, lang);
      const started = await ttsSpeakAsync(trimmed, lang);
      setSpeakingKey(started ? key : null);
      return started;
    },
    [],
  );

  const stop = React.useCallback(() => {
    stopSpeaking();
    setSpeakingKey(null);
  }, []);

  return { speak, stop, speakingKey };
}

/** Máy có cài module TTS không (để ẩn nút loa khi thiếu). */
export function useSpeechSupported(): boolean {
  return isTtsAvailable();
}
