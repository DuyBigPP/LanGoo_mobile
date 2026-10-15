/**
 * Tìm "từ khoá" trong câu ví dụ tiếng Nhật để highlight (offset theo CODE POINT).
 * Port nguyên logic từ web `src/lib/example-highlight.ts`.
 *
 * Thứ tự thử:
 * 1. Khớp nguyên dạng (食べる trong "…を食べるべきです。")
 * 2. Thân từ có chữ Hán + 1 kana ngay sau (食べる → 食べ) — bắt được thể chia 食べた/食べます
 * 3. Chỉ phần chữ Hán cuối (食べる → 食) — vẫn đánh dấu được từ
 * 4. Từ toàn kana: tiền tố dài dần, tối thiểu 2 ký tự (tránh nhiễu 1 ký tự)
 */

export interface ExampleTargetRange {
  /** Vị trí bắt đầu trong câu — offset theo code point */
  start: number;
  /** Vị trí kết thúc (exclusive) — offset theo code point */
  end: number;
}

const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const KANA = /[\u3040-\u30ff]/;

function indexOfChars(chars: string[], pattern: string[]): number {
  if (pattern.length === 0 || pattern.length > chars.length) return -1;
  for (let i = 0; i <= chars.length - pattern.length; i += 1) {
    let matched = true;
    for (let j = 0; j < pattern.length; j += 1) {
      if (chars[i + j] !== pattern[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

export function findExampleTarget(sentence: string, target: string): ExampleTargetRange | null {
  const chars = Array.from(sentence);
  const targetChars = Array.from(target.trim()).filter(char => !/\s/.test(char));
  if (targetChars.length === 0) return null;

  // 1) nguyên dạng
  const exact = indexOfChars(chars, targetChars);
  if (exact >= 0) return { start: exact, end: exact + targetChars.length };

  const lastKanji = targetChars
    .map((char, index) => (KANJI.test(char) ? index : -1))
    .filter(index => index >= 0)
    .pop();

  if (lastKanji !== undefined) {
    // 2) thân từ: tới 1 kana ngay sau chữ Hán cuối (nếu có)
    const stemEnd =
      lastKanji + 2 <= targetChars.length && KANA.test(targetChars[lastKanji + 1] ?? "")
        ? lastKanji + 2
        : lastKanji + 1;
    const stem = targetChars.slice(0, stemEnd);
    if (stem.length >= 2) {
      const at = indexOfChars(chars, stem);
      if (at >= 0) return { start: at, end: at + stem.length };
    }

    // 3) chỉ phần chữ Hán
    const kanjiOnly = targetChars.slice(0, lastKanji + 1);
    const atKanji = indexOfChars(chars, kanjiOnly);
    if (atKanji >= 0) return { start: atKanji, end: atKanji + kanjiOnly.length };
  }

  // 4) toàn kana: tiền tố dài dần, tối thiểu 2 ký tự
  for (let length = targetChars.length - 1; length >= 2; length -= 1) {
    const at = indexOfChars(chars, targetChars.slice(0, length));
    if (at >= 0) return { start: at, end: at + length };
  }

  return null;
}
