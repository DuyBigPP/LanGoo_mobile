/** Nhận diện & chuẩn hoá truy vấn tra từ */

const KANA_RE = /[\u3040-\u30ff\u31f0-\u31ff]/
const HAN_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const LATIN_RE = /[a-zA-Z]/
/** Ký tự đặc trưng tiếng Việt: ă â đ ê ô ơ ư + nguyên âm có dấu thanh */
const VIETNAMESE_RE =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i

export type QueryLang = "en" | "ja" | "vi"
export type LangMode = "auto" | QueryLang

export function isHanChar(char: string): boolean {
  return HAN_RE.test(char)
}

/** Đoán ngôn ngữ của truy vấn: kana/kanji -> ja, có dấu tiếng Việt -> vi, latin -> en */
export function detectLang(query: string): QueryLang | null {
  if (KANA_RE.test(query) || HAN_RE.test(query)) return "ja"
  if (VIETNAMESE_RE.test(query)) return "vi"
  if (LATIN_RE.test(query)) return "en"
  return null
}

/**
 * Ngôn ngữ để gọi API tra từ.
 * Chế độ "Tự động" + chữ Latin -> **không giới hạn** để backend tra cả tiếng Anh
 * lẫn romaji tiếng Nhật (vd "sensei" -> 先生, "hashiru" -> 走る).
 */
export function searchLangFor(query: string, mode: LangMode): QueryLang | null {
  const detected = detectLang(query)
  if (mode === "auto") return detected === "en" ? null : detected
  return mode
}

/** Một chữ Hán đơn -> tra thẳng thẻ kanji */
export function isSingleKanji(query: string): boolean {
  const text = query.trim()
  return text.length === 1 && isHanChar(text)
}

/** Cắt khoảng trắng + dấu câu ở hai đầu, gộp khoảng trắng giữa */
export function normalizeSelection(raw: string): string {
  return raw
    // PDF: chữ Hán có thể bị trả về dạng Kangxi radical (⽣ -> 生) và dấu tiếng
    // Việt tách rời (NFD) -> NFKC gộp lại đúng ký tự để tra từ điển
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}\p{S}]+/u, "")
    .replace(/[\s\p{P}\p{S}]+$/u, "")
    .trim()
}

/**
 * Chuẩn hoá truy vấn tra từ trước khi gọi API:
 * - NFKC (chữ Hán Kangxi radical, dấu tiếng Việt tách rời)
 * - bỏ dấu câu/ký hiệu ở hai đầu — nhận dạng giọng nói hay thêm dấu chấm cuối
 *   ("Cat." -> "Cat", "猫。" -> "猫"), gộp khoảng trắng giữa.
 */
export function cleanSearchQuery(raw: string): string {
  return normalizeSelection(raw)
}

/** Bôi đen này có đáng để tra không (không rỗng, không quá dài, có chữ) */
export function isLookupable(text: string): boolean {
  const value = text.trim()
  if (!value || value.length > 40) return false
  return LATIN_RE.test(value) || KANA_RE.test(value) || HAN_RE.test(value)
}

/** Các từ mẫu cho trạng thái rỗng của trang tra từ */
export const SAMPLE_QUERIES = ["run", "book", "water", "猫", "学生", "食べる"]
