/**
 * Cấu hình môi trường — app HỌC TIẾNG NHẬT (UI Việt/Anh).
 * Nội dung học chỉ tiếng Nhật: hồ sơ mặc định JA, từ điển JA, chat JA.
 *
 * URL backend đọc từ `.env` (xem `.env.example`) — file `.env` đã được gitignore.
 * Đổi giá trị trong `.env` thì khởi động lại Metro kèm `--reset-cache`.
 */
import {
  API_BASE_URL as ENV_API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID as ENV_GOOGLE_WEB_CLIENT_ID,
} from "@env";

/** URL backend Langoo API (không có dấu `/` ở cuối). */
export const API_BASE_URL: string = (ENV_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

/** Web OAuth client ID cho Google Sign-In (rỗng = chưa bật). */
export const GOOGLE_WEB_CLIENT_ID: string = (ENV_GOOGLE_WEB_CLIENT_ID ?? "").trim();

if (!API_BASE_URL) {
  console.warn(
    "[env] Thiếu API_BASE_URL — copy `.env.example` thành `.env` rồi chạy lại Metro với --reset-cache.",
  );
}

/** Ngôn ngữ học duy nhất của app (JA). */
export const STUDY_LANGUAGE_ID = 2;
/** Ngôn ngữ hiển thị nghĩa (VI gloss từ backend). */
export const SUPPORT_LANGUAGE_ID = 3;
/** Chat AI luôn ở chế độ tiếng Nhật. */
export const CHAT_LANGUAGE_ID = 2;

/** Nhãn phiên bản hiển thị trong màn Cài đặt. */
export const APP_VERSION = "0.1.0";
