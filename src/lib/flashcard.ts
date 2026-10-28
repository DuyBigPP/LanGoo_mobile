import type { TextSize } from "@/components/ui/Text";
import type { SearchHitDto } from "@/types/dictionary";

/**
 * Cỡ chữ mặt thẻ theo độ dài (port web `lib/flashcard`): từ ngắn to, nghĩa dài
 * (có khi 80+ ký tự) nhỏ dần để nằm gọn trong thẻ cao 300.
 */
export function flashcardTextSize(text: string): TextSize {
  const length = text.trim().length;
  if (length <= 6) return "hero";
  if (length <= 12) return "xxl";
  if (length <= 28) return "xl";
  if (length <= 50) return "lg";
  return "md";
}

/**
 * Hit từ điển ứng với từ trên thẻ (thẻ /srs/due không có pos/sense_id): khớp chữ,
 * ưu tiên khớp cả cách đọc (日 ひ ≠ 日 にち). Không khớp chữ -> null, không đoán từ khác.
 */
export function pickWordHit(
  hits: SearchHitDto[],
  text: string,
  reading: string | null | undefined,
): SearchHitDto | null {
  const sameText = hits.filter(hit => hit.surface === text);
  return sameText.find(hit => reading && hit.reading === reading) ?? sameText[0] ?? null;
}
