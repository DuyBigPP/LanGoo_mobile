/**
 * Khai báo cho module ảo `@env` do babel-plugin `react-native-dotenv` sinh ra.
 * Giá trị thật nằm trong `.env` (đã gitignore) — xem `.env.example`.
 */
declare module "@env" {
  /** URL backend Langoo API (không có dấu `/` ở cuối). */
  export const API_BASE_URL: string | undefined;
}
