/**
 * Chia thể tiếng Nhật (deinflection) ở FE.
 *
 * Backend `/v1/dictionary/search` khớp gần-chính-xác (không hiểu thể chia), nên
 * "たおさない"/"食べなかった" trả rỗng. Module này sinh các **thể gốc ứng viên**
 * (たおす / 食べる) từ dạng chia rồi để tầng gọi tra lại — hành vi kiểu Mazii.
 *
 * Thuần logic, không phụ thuộc React/API.
 */

const ROWS = [
  "あいうえお",
  "かきくけこ",
  "さしすせそ",
  "たちつてと",
  "なにぬねの",
  "はひふへほ",
  "まみむめも",
  "やいゆえよ",
  "らりるれろ",
  "わいうえお",
  "がぎぐげご",
  "ざじずぜぞ",
  "だぢづでど",
  "ばびぶべぼ",
  "ぱぴぷぺぽ",
] as const

const U_INDEX = 2
const E_INDEX = 3
const O_INDEX = 4

/** Đổi nguyên âm của một kana sang hàng mong muốn (giữ phụ âm), không đổi -> null */
function changeDan(char: string, toIndex: number): string | null {
  for (const row of ROWS) {
    const index = row.indexOf(char)
    if (index >= 0) return index === toIndex ? null : row[toIndex]
  }
  return null
}

/** Kana cuối thuộc hàng e (gốc ichidan: 食べ, 見, 出) */
function isEDan(stem: string): boolean {
  const last = stem.at(-1)
  if (!last) return false
  for (const row of ROWS) {
    const index = row.indexOf(last)
    if (index >= 0) return index === E_INDEX
  }
  return false
}

/** Kana cuối thuộc hàng a (gốc phủ định godan: 倒さ, 読ま, 話さ) */
function isADan(stem: string): boolean {
  const last = stem.at(-1)
  if (!last) return false
  for (const row of ROWS) {
    const index = row.indexOf(last)
    if (index >= 0) return index === 0
  }
  return false
}

const toHiragana = (text: string) =>
  text.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  )

const HAS_KANA = /[\u3041-\u309f]/

/** Bất quy tắc: gốc chia -> thể từ điển */
const IRREGULAR_STEM: Record<string, string[]> = {
  し: ["する"],
  こ: ["くる"],
  き: ["くる", "きる"],
  来: ["来る"],
}

function uDan(stem: string): string | null {
  const last = stem.at(-1)
  if (!last) return null
  const converted = changeDan(last, U_INDEX)
  return converted ? stem.slice(0, -1) + converted : null
}

/** Ứng viên cơ bản từ một gốc: +る (ichidan) và đổi âm cuối sang hàng u (godan) */
function baseCandidates(stem: string): string[] {
  const u = uDan(stem)
  // Gốc hàng a (読ま, 倒さ) -> nghiêng về godan (hàng u) trước
  if (u && isADan(stem)) return [u, stem + "る"]
  return [stem + "る", ...(u ? [u] : [])]
}

/** Gốc thể ます (hàng i) — ưu tiên dạng する với các gốc đuôi し (勉強します -> 勉強する) */
function fromMasuStem(stem: string): string[] {
  const irregular = IRREGULAR_STEM[stem]
  if (irregular) return [...irregular, ...baseCandidates(stem)]
  if (stem.endsWith("し") && stem.length > 1) {
    return [stem.slice(0, -1) + "する", ...baseCandidates(stem)]
  }
  return baseCandidates(stem)
}

/** Gốc thể phủ định (hàng a) — ưu tiên đổi sang hàng u (倒さない -> 倒す), riêng gốc hàng e -> +る */
function fromNegativeStem(stem: string): string[] {
  const irregular = IRREGULAR_STEM[stem]
  const u = uDan(stem)
  const head = irregular ?? (isEDan(stem) ? [] : u ? [u] : [])
  const extra = stem.endsWith("し") && stem.length > 1 ? [stem.slice(0, -1) + "する"] : []
  const rest = baseCandidates(stem).filter(
    (candidate) => !head.includes(candidate) && !extra.includes(candidate),
  )
  return [...head, ...extra, ...rest]
}

/** Gốc thể て/た chung (食べて -> 食べる) */
function fromTeStem(stem: string): string[] {
  const extra = stem.endsWith("し") && stem.length > 1 ? [stem.slice(0, -1) + "する"] : []
  return [...extra, ...baseCandidates(stem)]
}

/** Thể điều kiện: 行けば -> 行く (godan), 食べれば -> 食べる (ichidan qua rule れば) */
function fromConditional(stem: string): string[] {
  const u = uDan(stem)
  return u ? [u, stem + "る"] : [stem + "る"]
}

/** Thể ý chí godan: 行こう -> 行く (gốc hàng o + う); bỏ qua nếu kana cuối không phải hàng o */
function fromVolitional(stem: string): string[] {
  const last = stem.at(-1)
  if (!last) return []
  for (const row of ROWS) {
    const index = row.indexOf(last)
    if (index < 0) continue
    if (index !== O_INDEX) return []
    const u = uDan(stem)
    return u ? [u, stem + "る"] : [stem + "る"]
  }
  return []
}

/** Âm tiện った (買った -> 買う/待った -> 待つ/分かった -> 分かる/行った -> 行く) */
const fromTta = (stem: string): string[] => [stem + "う", stem + "つ", stem + "る", stem + "く"]
/** いた (書いた -> 書く) */
const fromIta = (stem: string): string[] => [stem + "く", stem + "いる"]
/** いだ (泳いだ -> 泳ぐ) */
const fromIda = (stem: string): string[] => [stem + "ぐ"]
/** んだ (読んだ -> 読む/遊んだ -> 遊ぶ/死んだ -> 死ぬ) */
const fromNda = (stem: string): string[] => [stem + "む", stem + "ぶ", stem + "ぬ"]
/** した (話した -> 話す) */
const fromShita = (stem: string): string[] => (stem ? [stem + "す"] : ["する"])

interface Rule {
  from: string
  to: (stem: string) => string[]
}

/** Hậu tố -> các ứng viên (áp dụng lặp tới maxDepth nên có thể nối chuỗi) */
const RULES: Rule[] = [
  // Thể lịch sự
  { from: "ませんでした", to: (s) => [s + "ません"] },
  { from: "ましょう", to: (s) => [s + "ます"] },
  { from: "ました", to: (s) => [s + "ます"] },
  { from: "ません", to: (s) => [s + "ます"] },
  { from: "ます", to: fromMasuStem },
  // Thể phủ định
  { from: "なかった", to: (s) => [s + "ない"] },
  { from: "なくて", to: (s) => [s + "ない"] },
  { from: "なければ", to: (s) => [s + "ない"] },
  { from: "なきゃ", to: (s) => [s + "ない"] },
  { from: "ない", to: fromNegativeStem },
  // Thể て / quá khứ (âm tiện)
  { from: "ったら", to: fromTta },
  { from: "って", to: fromTta },
  { from: "った", to: fromTta },
  { from: "いたら", to: fromIta },
  { from: "いて", to: fromIta },
  { from: "いた", to: fromIta },
  { from: "いで", to: fromIda },
  { from: "いだ", to: fromIda },
  { from: "んで", to: fromNda },
  { from: "んだ", to: fromNda },
  { from: "して", to: fromShita },
  { from: "した", to: fromShita },
  { from: "て", to: fromTeStem },
  { from: "た", to: fromTeStem },
  { from: "で", to: fromTeStem },
  { from: "だ", to: fromTeStem },
  // Khả năng / bị động / sai khiến
  { from: "させられる", to: (s) => [s + "させる"] },
  { from: "される", to: (s) => [s + "する"] },
  { from: "られる", to: baseCandidates },
  { from: "れる", to: baseCandidates },
  { from: "させる", to: baseCandidates },
  { from: "せる", to: baseCandidates },
  // Điều kiện / ý chí / mệnh lệnh / nhờ vả
  { from: "ければ", to: (s) => [s + "い"] },
  { from: "れば", to: baseCandidates },
  { from: "ば", to: fromConditional },
  { from: "よう", to: baseCandidates },
  { from: "う", to: fromVolitional },
  { from: "なさい", to: (s) => fromMasuStem(s) },
  { from: "ください", to: (s) => [s + "て"] },
  { from: "ろ", to: (s) => [s + "る"] },
  // Đang/đã làm gì đó (ている)
  { from: "ています", to: (s) => [s + "て"] },
  { from: "ていた", to: (s) => [s + "て"] },
  { from: "ている", to: (s) => [s + "て"] },
  { from: "てる", to: (s) => [s + "て"] },
  { from: "てた", to: (s) => [s + "て"] },
  { from: "でいる", to: (s) => [s + "で"] },
  // Tính từ -i
  { from: "かった", to: (s) => [s + "い"] },
  { from: "くない", to: (s) => [s + "い"] },
  { from: "くて", to: (s) => [s + "い"] },
  // Câu lịch sự của danh từ/tính từ (学生です -> 学生)
  { from: "でした", to: (s) => [s] },
  { from: "だった", to: (s) => [s] },
  { from: "です", to: (s) => [s] },
]

/** Từ đã là thể từ điển nếu không rule nào còn biến đổi được nữa */
const isTerminal = (word: string) =>
  !RULES.some(
    (rule) =>
      word.length > rule.from.length &&
      word.endsWith(rule.from) &&
      rule.to(word.slice(0, -rule.from.length)).length > 0,
  )

/**
 * Trả về các thể gốc ứng viên (đã chuẩn hoá katakana -> hiragana), ưu tiên thể từ
 * điển, bỏ chuỗi còn dấu cách. Trả [] nếu không có kana (không phải tiếng Nhật).
 */
export function deinflectJapanese(input: string, limit = 8): string[] {
  const text = toHiragana(input.trim())
  if (!HAS_KANA.test(text)) return []

  interface Candidate {
    word: string
    index: number
    ruleLength: number
    depth: number
  }

  const seen = new Set<string>([text])
  const results: Candidate[] = []
  let frontier = [text]

  for (let depth = 0; depth < 4 && frontier.length > 0; depth += 1) {
    const next: string[] = []
    for (const word of frontier) {
      for (const rule of RULES) {
        if (!word.endsWith(rule.from)) continue
        const stem = word.slice(0, -rule.from.length)
        for (const candidate of rule.to(stem)) {
          if (!candidate || seen.has(candidate) || /\s/.test(candidate)) continue
          // Bỏ ứng viên quá ngắn sinh từ hậu tố (vd "ください" -> "て")
          if (candidate.length < 2 && candidate.length < text.length) continue
          seen.add(candidate)
          next.push(candidate)
          results.push({
            word: candidate,
            index: results.length,
            ruleLength: rule.from.length,
            depth,
          })
        }
      }
    }
    frontier = next
  }

  // Thể từ điển trước, rồi ưu tiên hậu tố dài (khớp cụ thể hơn), rồi chuỗi đã bỏ nhiều lớp hơn
  return results
    .map((entry) => ({ ...entry, terminal: isTerminal(entry.word) ? 0 : 1 }))
    .sort(
      (a, b) =>
        a.terminal - b.terminal ||
        b.ruleLength - a.ruleLength ||
        b.depth - a.depth ||
        a.index - b.index,
    )
    .map((entry) => entry.word)
    .slice(0, limit)
}
