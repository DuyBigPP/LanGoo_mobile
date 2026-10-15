# Langoo JP — React Native CLI (không Expo)

App **học tiếng Nhật** cho di động, dùng chung backend với bản web (`https://langoo-api.pixpress.art`).
Khác biệt duy nhất so với web: **nội dung học chỉ tiếng Nhật** — hồ sơ mặc định JA, từ điển JA, tra ngược Việt → Nhật, chat AI tiếng Nhật.
**Giao diện vẫn là Việt/Anh** (mặc định VI) giống web.

## Điểm nhanh

| Hạng mục | Nội dung |
| --- | --- |
| Framework | React Native CLI thuần (**without a framework** — không Expo) |
| Ngôn ngữ | TypeScript strict |
| Điều hướng | React Navigation 7 (native-stack + bottom-tabs) |
| Dữ liệu | TanStack React Query 5 + axios (Bearer + refresh token) |
| UI | Bộ UI kit tự viết (`src/components/ui`) + theme light/dark |
| i18n | vi/en (mặc định vi) — `src/i18n` |
| Streaming | SSE qua XMLHttpRequest (`src/lib/sse.ts`) |
| TTS | `react-native-tts` (degrade nhẹ nếu chưa link) |
| Ảnh | `react-native-image-picker` (chat base64, góp ý multipart) |

## Cài đặt & chạy

Xem [`docs/SETUP.md`](docs/SETUP.md) (theo hướng dẫn “Getting Started Without a Framework”).

```bash
npm install
npm run pods        # iOS
npm run android     # hoặc npm run ios
```

> **Đã build & chạy được** (14/10/2026): native shell `android/` + `ios/` đã có trong repo, `node_modules` đã cài,
> APK debug đã cài lên emulator Genymotion và mở lên màn hình Đăng nhập ✓ — xem [`docs/SETUP.md`](docs/SETUP.md) mục 8
> để biết lệnh build/cài (cache Gradle & npm nằm trên ổ **D**, không ghi ổ C).

## Tài liệu

| File | Nội dung |
| --- | --- |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Tổng hợp chức năng, đối chiếu web, khác biệt JA-only, phần hoãn |
| [`docs/API_MAP.md`](docs/API_MAP.md) | Toàn bộ endpoint ↔ hook ↔ màn hình |
| [`docs/UI_STRUCTURE.md`](docs/UI_STRUCTURE.md) | Cây điều hướng, danh sách màn hình, UI kit, theme, i18n |
| [`docs/SETUP.md`](docs/SETUP.md) | Cài đặt without framework, native modules, lưu ý build |

## Cấu trúc thư mục

```
src/
  api/          # lớp gọi HTTP thuần (client + 13 domain)
  components/   # ui/ (kit) · domain/ · dictionary/ · review/ · common/
  config/       # env (API_BASE_URL, language ids, version)
  contexts/     # AuthContext (phiên đăng nhập)
  hooks/        # React Query hooks + use-speech + use-translation
  i18n/         # vi/en catalog + translate()
  lib/          # sse, tts, media, translate, deinflect, lang, kanji, storage…
  navigation/   # RootNavigator, MainTabs, types
  screens/      # 20 màn theo domain
  theme/        # palette, tokens, ThemeProvider
  types/        # DTO mirror backend
```
