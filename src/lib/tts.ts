/**
 * Text-to-speech trên thiết bị (react-native-tts).
 * Module native có thể chưa link — nạp lazy và degrade thành "không hỗ trợ".
 */

export type SpeechLang = "ja" | "vi" | "en" | "zh-Hans";

const BCP47: Record<SpeechLang, string> = {
  ja: "ja-JP",
  vi: "vi-VN",
  en: "en-US",
  "zh-Hans": "zh-CN",
};

interface TtsModule {
  setDefaultLanguage: (lang: string) => void;
  setDefaultRate?: (rate: number, skipTransform?: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
  /** Promise reject khi máy chưa cài engine TTS (react-native-tts: mã "no_engine") */
  getInitStatus?: () => Promise<unknown>;
  /** Trả về subscription (có `.remove()`) — dùng để huỷ đăng ký an toàn */
  addEventListener: (
    event: string,
    handler: (data?: unknown) => void,
  ) => { remove?: () => void } | undefined;
  removeEventListener?: (event: string, handler: (data?: unknown) => void) => void;
}

let tts: TtsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require("react-native-tts");
  tts = (module?.default ?? module ?? null) as TtsModule | null;
} catch {
  tts = null;
}

export function isTtsAvailable(): boolean {
  return tts !== null;
}

let engineReady = false;

/**
 * Kiểm tra máy có engine TTS thật không (module có thể đã link nhưng máy chưa cài
 * Google Text-to-Speech). Kết quả "có engine" được nhớ; "không có" thì lần sau kiểm
 * lại vì người dùng có thể vừa cài thêm engine.
 */
export async function ensureTtsEngine(): Promise<boolean> {
  if (!tts) return false;
  if (engineReady) return true;
  if (!tts.getInitStatus) {
    engineReady = true; // bản module cũ không có API này — cứ thử đọc
    return true;
  }
  try {
    await tts.getInitStatus();
    engineReady = true;
    return true;
  } catch {
    return false;
  }
}

export function toSpeechLang(code: string | null | undefined): SpeechLang | null {
  if (!code) return null;
  const normalized = code === "zh" || code === "zh-CN" ? "zh-Hans" : code;
  return normalized in BCP47 ? (normalized as SpeechLang) : null;
}

/** Đọc to văn bản sau khi chắc chắn máy có engine; trả false nếu không đọc được. */
export async function speakAsync(
  text: string,
  lang: SpeechLang,
  rate = 1,
): Promise<boolean> {
  if (!(await ensureTtsEngine())) return false;
  return speak(text, lang, rate);
}

/** Đọc to văn bản; trả false nếu máy không hỗ trợ TTS. */
export function speak(text: string, lang: SpeechLang, rate = 1): boolean {
  const trimmed = text.trim();
  if (!tts || !trimmed) return false;
  try {
    tts.stop();
    tts.setDefaultLanguage(BCP47[lang]);
    tts.setDefaultRate?.(rate);
    tts.speak(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  try {
    tts?.stop();
  } catch {
    // ignore
  }
}

/**
 * Nghe sự kiện bắt đầu/kết thúc đọc (để đổi icon loa).
 *
 * Lưu ý: `react-native-tts` gọi `this.removeListener` trong `removeEventListener`
 * — API này đã bị RN 0.7x xoá nên sẽ warn "removeListener is not a function".
 * Vì vậy huỷ đăng ký qua subscription mà `addListener` trả về (`.remove()`).
 */
export function addTtsListener(
  event: "tts-start" | "tts-finish" | "tts-cancel",
  handler: () => void,
): () => void {
  if (!tts) return () => undefined;
  try {
    const subscription = tts.addEventListener(event, handler);
    return () => {
      try {
        subscription?.remove?.();
      } catch {
        // bỏ qua — chỉ là dọn listener
      }
    };
  } catch {
    return () => undefined;
  }
}
