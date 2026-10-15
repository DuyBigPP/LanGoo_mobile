import type { KanjiCardDto, KanjiMeaningItemDto, KanjiReadingItemDto } from "@/types/dictionary"

/** Đọc phẳng các item trong readings.groups của API kanji */
export function kanjiReadingItems(data: KanjiCardDto | undefined): KanjiReadingItemDto[] {
  if (!data) return []
  return (data.readings?.groups ?? []).flat()
}

/** Đọc phẳng các item trong meanings.groups của API kanji */
export function kanjiMeaningItems(data: KanjiCardDto | undefined): KanjiMeaningItemDto[] {
  if (!data) return []
  return (data.meanings?.groups ?? []).flat()
}

export interface KanjiReadings {
  /** Onyomi (âm Hán) — vd ["セン"] */
  on: string[]
  /** Kunyomi (âm Nhật) — vd ["さき", "ま.ず"] (dấu chấm ngăn okurigana) */
  kun: string[]
  /** Âm Hán–Việt — vd ["Tiên", "Tiến"] */
  vietnam: string[]
}

/** Tách âm đọc theo loại — dùng cho màn chi tiết chữ Hán (kiểu Mazii) */
export function kanjiReadings(data: KanjiCardDto | undefined): KanjiReadings {
  const items = kanjiReadingItems(data)
  const byType = (type: string) =>
    items.filter((item) => item.type === type).map((item) => item.value)
  return { on: byType("ja_on"), kun: byType("ja_kun"), vietnam: byType("vietnam") }
}

/** Nghĩa tiếng Anh (KanjiVG/KanjiDict dùng tiếng Anh) */
export function kanjiMeaningsEn(data: KanjiCardDto | undefined): string[] {
  return kanjiMeaningItems(data)
    .filter((item) => item.lang === "en")
    .map((item) => item.value)
}
