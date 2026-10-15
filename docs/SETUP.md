# Cài đặt — React Native CLI không dùng framework

Tài liệu này bám theo hướng dẫn chính thức
[Getting Started Without a Framework](https://reactnative.dev/docs/getting-started-without-a-framework):
app dùng **React Native CLI** + **Metro** + native project (android/ios) do chính mình quản lý, **không Expo**.

## 1. Vì sao “without a framework”

- Cần kiểm soát native project (TTS, image picker…) và không muốn phụ thuộc Expo runtime.
- RN CLI sinh `android/` + `ios/` thật; mọi native module link qua autolinking.

## 2. Yêu cầu môi trường

| Nền tảng | Cần |
| --- | --- |
| Chung | Node ≥ 18, npm, JDK 17 |
| Android | Android Studio + SDK 34, biến `ANDROID_HOME` |
| iOS | macOS + Xcode ≥ 15 + CocoaPods |

## 3. Khởi tạo project (lần đầu)

Repo này chứa phần **JS/TS + config**; native shell cần sinh bằng CLI:

```bash
# Trong thư mục cha của repo
npx @react-native-community/cli@15 init LangooJP --version 0.76.6 --skip-install

# Copy code + config từ repo này vào project vừa tạo
#   src/, index.js, App? (App nằm trong src/App.tsx), app.json, babel.config.js,
#   metro.config.js, tsconfig.json, jest.config.js, .eslintrc.js, .prettierrc.js, package.json
# KHÔNG copy: android/ ios/ của template (giữ của CLI)
```

> `babel.config.js` đã thêm `babel-plugin-module-resolver` để alias `@/ → src/`
> (trùng với `paths` trong `tsconfig.json`).

## 4. Cài dependencies

```bash
npm install

# iOS
cd ios && bundle exec pod install && cd ..

# Android: không cần bước thêm (autolinking)
```

Các native module chính: `react-native-tts`, `react-native-image-picker`,
`@react-native-async-storage/async-storage`, `react-native-svg` (cho `lucide-react-native`),
`react-native-screens`, `react-native-safe-area-context`, `react-native-markdown-display`.

## 5. Chạy

```bash
npm start            # Metro
npm run android      # thiết bị/emulator
npm run ios          # macOS
npm run tsc          # type-check
npm run lint
npm test
```

## 6. Cấu hình backend (.env)

URL backend **không nằm trong code** — đọc từ `.env` qua `react-native-dotenv` (module ảo `@env`, khai báo ở `src/types/env.d.ts`):

```bash
cp .env.example .env   # rồi điền giá trị
```

```ini
# .env (đã gitignore — chỉ commit .env.example)
API_BASE_URL=https://langoo-api.pixpress.art
```

```ts
// src/config/env.ts
export const API_BASE_URL = ...;      // lấy từ @env, tự bỏ dấu "/" cuối
export const STUDY_LANGUAGE_ID = 2;   // JA — nội dung học duy nhất
export const SUPPORT_LANGUAGE_ID = 3; // VI — ngôn ngữ hiển thị nghĩa
export const CHAT_LANGUAGE_ID = 2;    // chat AI tiếng Nhật
```

⚠️ **Đổi giá trị trong `.env` phải khởi động lại Metro kèm `--reset-cache`** (giá trị được nhúng vào bundle lúc build).

## 7. Lưu ý khi build thật

- **TTS**: nút loa **luôn hiển thị**; máy chưa cài engine (Google Text-to-Speech) thì bấm sẽ hiện toast hướng dẫn — `lib/tts.ts` kiểm tra engine thật bằng `Tts.getInitStatus()` (nhớ kết quả "có engine"; máy thật có engine thì đọc bình thường).
- **Android cleartext**: không cần — backend là HTTPS.
- **Ảnh chat**: picker trả `base64` — với ảnh lớn có thể tốn RAM; giới hạn 3 ảnh ≤ 2MB đã chặn sẵn.
- **SSE**: dùng XHR (`src/lib/sse.ts`) vì RN không có `EventSource`; khi release nhớ test mạng chậm.
- **Deep link** (tuỳ chọn): có thể map `langoo://` → màn hình tương ứng sau này.

## 8. Build & chạy thực tế (Windows + Genymotion — 14/10/2026)

Máy dev hiện tại: **JDK 17** (`JAVA_HOME=C:\Program Files\Microsoft\jdk-17...`), SDK ở `D:\Android\Sdk`,
emulator **Genymotion** (adb `192.168.66.102:5555`, Android 15 x86_64).
**Toàn bộ cache/build phải nằm trên ổ D — không ghi ổ C:**

| Thứ | Đường dẫn |
| --- | --- |
| Gradle cache (dependency + wrapper) | `D:\Cache\gradle` (`GRADLE_USER_HOME`) |
| npm cache | `D:\Cache\npm-cache` |
| Temp cho Gradle/Metro | `D:\Cache\tmp` (`TEMP`/`TMP`) |
| Android SDK (NDK 26.1 tự cài khi build) | `D:\Android\Sdk` |

```bash
cd E:/LanGoo/web/react_native_CLI

# 1) Metro (để riêng 1 terminal)
TEMP=D:/Cache/tmp TMP=D:/Cache/tmp npx react-native start --port 8081

# 2) Build APK
cd android
TEMP=D:/Cache/tmp TMP=D:/Cache/tmp GRADLE_USER_HOME=D:/Cache/gradle ./gradlew assembleDebug

# 3) Cài + mở trên Genymotion
cd ..
adb -s 192.168.66.102:5555 install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s 192.168.66.102:5555 reverse tcp:8081 tcp:8081
adb -s 192.168.66.102:5555 shell am start -n com.langoojp/.MainActivity
```

Hoặc 1 lệnh (Metro đã chạy sẵn):
`GRADLE_USER_HOME=D:/Cache/gradle npx react-native run-android --deviceId 192.168.66.102:5555`

### Ghi chú đã xử lý khi build lần đầu

- `android/`, `ios/` sinh từ `npx @react-native-community/cli@15 init LangooJP --version 0.76.6 --skip-install`
  (shell tạm ở `D:\Cache\rn-shell`, chỉ copy native shell — không copy App/package.json của template).
- **Ghim version đúng cho RN 0.76** (bản mới hơn làm codegen lỗi `Unknown prop type`):
  `react-native-screens@4.5.0`, `react-native-svg@15.10.1` (lưu exact trong `package.json`).
- **`react-native-tts` trỏ jcenter (đã chết)** → vá bỏ block `buildscript { jcenter() }`;
  vá được giữ bằng **`patches/react-native-tts+4.1.1.patch`** + `postinstall: patch-package`.
- `android/gradle.properties`: `newArchEnabled=false` (lần build đầu, nhanh & không cần NDK C++),
  `reactNativeArchitectures=x86_64` (chỉ cho Genymotion — thêm `arm64-v8a` khi chạy máy thật).
- Gradle wrapper dùng bản `-bin` + `networkTimeout=180000` (mạng hay chớp).
- Metro trên Windows có thể crash `ENOENT watch node_modules/fsevents` nếu `npm install` chạy lúc
  Metro đang mở → chỉ cần khởi động lại Metro (`--reset-cache`).
