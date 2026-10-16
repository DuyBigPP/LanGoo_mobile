import { format } from "date-fns";
import { translate } from "@/i18n";
import type { MediaError } from "@/lib/media";

/** Lỗi chọn ảnh -> khoá thông báo tương ứng (giống web). */
export const MEDIA_ERROR_KEYS: Record<MediaError, string> = {
  count: "chat.imageLimit",
  size: "chat.imageTooLarge",
  type: "chat.imageBadType",
  read: "chat.imageReadError",
};

/** 3 câu hỏi gợi ý cho phiên trống (dùng khoá i18n chat.suggest*). */
export const SUGGESTION_KEYS = [
  "chat.suggestGeneral1",
  "chat.suggestGeneral2",
  "chat.suggestVocabulary1",
] as const;

/** Kịch bản phiên chat -> khoá i18n (mirror web `chatScenarioLabel`). */
const SCENARIO_KEYS: Record<string, string> = {
  general: "chat.scenarioGeneral",
  vocabulary: "chat.scenarioVocabulary",
  grammar: "chat.scenarioGrammar",
  conversation: "chat.scenarioConversation",
};

/** Khoá i18n cho câu hỏi soạn sẵn khi mở chat từ chi tiết nghĩa. */
const ASK_ABOUT_KEY = "chat.askAbout";

/** Nhãn kịch bản của phiên (Tổng quát / Từ vựng / Ngữ pháp / Hội thoại). */
export function chatScenarioLabel(scenario: string | null | undefined): string {
  const key = (scenario && SCENARIO_KEYS[scenario]) || SCENARIO_KEYS.general;
  return translate(key);
}

/** Giờ gửi tin (HH:mm) — bản web dùng Intl "vi-VN", ở đây dùng date-fns cho gọn. */
export function formatTime(iso: string): string {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "";
  }
}

/** Câu hỏi soạn sẵn khi mở từ phiếu chi tiết nghĩa (web `/chat?ask=…&sense=…`). */
export function askAboutDraft(
  t: (key: string, params?: Record<string, string | number>) => string,
  word: string,
) {
  return t(ASK_ABOUT_KEY, { word });
}

/** Tên phiên hiển thị — chưa đặt tên thì dùng nhãn mặc định. */
export function sessionTitle(title: string | null, untitled: string): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : untitled;
}

/** Dòng "lượt đã dùng" của chat. */
export function formatUsage(count: number, limit: number): string {
  return translate("chat.usage", { count, limit });
}
