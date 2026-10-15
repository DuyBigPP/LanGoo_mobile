/** Mã ngôn ngữ của dữ liệu từ điển — mirror `getLanguage` bên web (language_id → code/cờ). */
import type { SpeakLang } from "@/hooks/use-speech";

export interface DictionaryLanguage {
  /** Mã ngôn ngữ hiển thị trên chip (en | ja | vi | zh-Hans) */
  code: string;
  /** Mã quốc kỳ cho component Flag */
  flagCode: string;
}

/** Bốn ngôn ngữ backend đang trả về (giống LANGUAGE_DEFS bên web). */
const LANGUAGES: Record<number, DictionaryLanguage> = {
  1: { code: "en", flagCode: "gb" },
  2: { code: "ja", flagCode: "jp" },
  3: { code: "vi", flagCode: "vn" },
  4: { code: "zh-Hans", flagCode: "cn" },
};

export function dictionaryLanguage(
  languageId: number | null | undefined,
): DictionaryLanguage | null {
  if (languageId == null) return null;
  return LANGUAGES[languageId] ?? null;
}

/** Ngôn ngữ TTS của gloss theo language_id (1 = en, 2 = ja, 3 = vi); khác thì không đọc. */
export function glossSpeakLang(languageId: number): SpeakLang | null {
  if (languageId === 1) return "en";
  if (languageId === 2) return "ja";
  if (languageId === 3) return "vi";
  return null;
}
