# Cấu trúc giao diện — Langoo JP (React Native CLI)

## 1. Cây điều hướng

```
RootNavigator (native-stack, headerShown: false) — MỘT navigator, key theo trạng thái phiên
│
├─ [đã đăng nhập nhưng chưa có hồ sơ]  → chỉ Onboarding (OnboardingScreen)
├─ [đã đăng nhập, tải hồ sơ lỗi]       → ProfileLoadError (Thử lại / Đăng xuất)
│
└─ [guest HOẶC đã đăng nhập + có hồ sơ]
    ├─ Tabs (bottom-tabs) — MainTabs, thứ tự như web
    │   ├─ Dictionary   → DictionaryScreen     (BookOpen)    công khai
    │   ├─ Collections  → CollectionsScreen    (BookMarked)  cần đăng nhập*
    │   ├─ Translate    → TranslateScreen      (Languages)   công khai
    │   ├─ Chat         → ChatScreen           (Bot)         cần đăng nhập*
    │   └─ Profile      → ProfileScreen        (UserRound)   guest: thẻ đăng nhập + giao diện + ngôn ngữ
    │
    ├─ Màn công khai (luôn đăng ký):
    │   ├─ SenseDetail      { lexemeId?, senseId?, surface? }   (modal)
    │   ├─ KanjiDetail      { literal }
    │   └─ Sources
    │
    ├─ Chỉ khi đã đăng nhập:
    │   ├─ CollectionDetail { collectionId, name }
    │   ├─ EditItem         { collectionId, itemId }
    │   ├─ Flashcard        { collectionId?, limit? }           (modal)
    │   ├─ QuizSession      { sessionId }
    │   ├─ ProfileForm      { profileId? }                      (modal)
    │   └─ Feedback
    │
    └─ Chỉ khi guest (nhóm modal):  Login → LoginScreen · Register → RegisterScreen
```

* Guest bấm tab Sổ tay/Chat → `tabPress` bị chặn và mở modal Login. Các hành động cần tài khoản
(thêm vào sổ tay, báo lỗi nghĩa, "Hỏi AI", góp ý) đi qua `useRequireAuth()` (`AuthContext`).
Đăng nhập xong React Navigation tự gỡ nhóm Login/Register. Đăng xuất → stack dựng lại nhưng state tab được giữ (đang ở Hồ sơ thì ở lại Hồ sơ dạng khách); nếu đang ở tab Sổ tay/Chat thì `MainTabs` (`screenListeners.focus`) đẩy về Từ điển.

- File: `src/navigation/RootNavigator.tsx` (chuyển nhánh theo `AuthContext` + danh sách hồ sơ), `src/navigation/MainTabs.tsx`.
- Kiểu tham số: `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`).
- Tab Từ điển nhận `params: { q?: string }` để mở sẵn từ khoá (từ màn chữ Hán). Tra ngược Việt → Nhật nằm **inline** trong Từ điển (segmented auto/ja/vi), không còn màn riêng.
- `MainTabs` gọi `useScopeReset()` — đổi hồ sơ hoạt động là dọn cache theo scope ngay (guest: không làm gì).
- Query cần token (hồ sơ, cài đặt, sổ tay, SRS, chat, lịch sử tra…) đều `enabled` theo `status === "authenticated"` — guest không gọi API cần đăng nhập.

## 2. Danh sách màn hình (17)

| Nhóm | File | Vai trò chính |
| --- | --- | --- |
| auth | `screens/auth/LoginScreen.tsx` | Đăng nhập (modal cho guest): logo, đổi VI/EN, nút đóng |
| auth | `screens/auth/RegisterScreen.tsx` | Đăng ký (tên hiển thị tuỳ chọn) |
| onboarding | `screens/onboarding/OnboardingScreen.tsx` | 2 bước: tên hồ sơ → mục tiêu/ngày (JA cố định) |
| dictionary | `screens/dictionary/DictionaryScreen.tsx` | Tra từ (ja) + tra ngược Việt → Nhật inline (`components/dictionary/ReverseResults.tsx`): gợi ý, tải thêm, deinflect, dịch fallback, lịch sử |
| dictionary | `screens/dictionary/SenseDetailScreen.tsx` | Chi tiết nghĩa: nhóm nghĩa, ví dụ, dạng từ, TTS, thêm vào sổ |
| dictionary | `screens/dictionary/KanjiDetailScreen.tsx` | Chữ Hán: âm đọc, nghĩa, bộ thủ, cây thành phần |
| translate | `screens/translate/TranslateScreen.tsx` | Dịch VI/EN/JA (engine client-side), sao chép + TTS |
| collections | `screens/collections/CollectionsScreen.tsx` | Tổng quan SRS + danh sách sổ tay (phân trang) |
| collections | `screens/collections/CollectionDetailScreen.tsx` | Chi tiết sổ: sắp xếp, danh sách mục, sửa/xoá |
| collections | `screens/collections/EditItemScreen.tsx` | Sửa nghĩa/ghi chú/trạng thái mục |
| review | `screens/review/FlashcardScreen.tsx` | Flashcard SRS: lật thẻ, chấm 4 mức, hàng đợi cursor |
| review | `screens/review/QuizSessionScreen.tsx` | Chơi quiz AI: câu hỏi, chấm, kết quả, câu sai |
| chat | `screens/chat/ChatScreen.tsx` | Chat streaming, phiên, ảnh, markdown, quota |
| profile | `screens/profile/ProfileScreen.tsx` | Guest: đăng nhập/đăng ký + giao diện + ngôn ngữ. Đã đăng nhập: thống kê, cài đặt học (`components/profile/SettingsSection.tsx`, gồm múi giờ), mục Khác (góp ý/nguồn/JLPT), thẻ tài khoản + đăng xuất. Không hiện XP/thành tựu (như web) |
| profile | `screens/profile/ProfileFormScreen.tsx` | Tạo/sửa hồ sơ (JA cố định) |
| profile | `screens/profile/SourcesScreen.tsx` | Nguồn dữ liệu từ điển + credit |
| profile | `screens/profile/FeedbackScreen.tsx` | Gửi góp ý (4 loại, ≤ 3 ảnh) + lịch sử |
| (component) | `components/dictionary/AddToCollectionSheet.tsx` | Bottom sheet chọn bộ + nghĩa + ghi chú |
| (component) | `components/review/StartStudySheet.tsx` | Bottom sheet chọn chế độ học (flashcard/quiz) |

## 3. UI kit — `src/components/ui/` (22 file)

| Nhóm | Component | Ghi chú |
| --- | --- | --- |
| Nền tảng | `Screen` | Scaffold: SafeArea + header (title/back/right) + scroll tuỳ chọn |
| Chữ | `AppText` | Variant: title/subtitle/body/caption/label/mono; màu theo theme |
| Nút | `Button`, `IconButton` | 5 variant × 3 size; minHeight ≥ 44 (a11y); loading spinner |
| Nhập liệu | `Input` | Label, lỗi, secure, multiline, rightSlot; focus = primary |
| Bề mặt | `Card`, `Divider`, `ListRow` | Bo góc + viền theo token |
| Nhãn | `Chip`, `Badge`, `Flag` | Badge kiểu “MÁY/ĐÃ DUYỆT”; Flag emoji theo mã ngôn ngữ |
| Trạng thái | `Skeleton`, `EmptyState`, `ProgressBar` | Skeleton nhấp nháy; empty có icon + action |
| Điều hướng trong màn | `SegmentedControl`, `Pager` | Pager có chọn số mục/trang 5/10/15/20 |
| Lớp phủ | `BottomSheet`, `Dialog`, `Toast` | Tự viết bằng Modal + Animated (không thêm thư viện) |
| Khác | `SectionHeader`, `Avatar` | Tiêu đề mục có count; avatar chữ cái đầu |

**Domain components**: `components/domain/SpeakButton.tsx` (TTS ja/vi), `WordCell.tsx` (từ + cách đọc + cờ).
**Common**: `FullScreenLoader.tsx` (màn chờ boot; sau 4s hiện gợi ý máy chủ đang khởi động), `ErrorBoundary.tsx` (bắt lỗi render toàn app), `OfflineBanner.tsx` (banner mất mạng, dùng `lib/netinfo.ts`), `LanguageToggle.tsx` (chọn VI/EN).

## 4. Theme — `src/theme/`

| File | Nội dung |
| --- | --- |
| `palette.ts` | Bảng màu light/dark — quy đổi từ token oklch của web (`index.css`): primary `#23418F`, brand `#fc3603`, stamp `#D33E25` (khớp `global.css`) |
| `tokens.ts` | `spacing`, `radius` (sm 8 / md 10 / lg 12 / xl 16 như web), `fontSize` (xs 12 … xxl 24, hero 40), `fontWeight`, `HIT_SLOP` |
| `ThemeContext.tsx` | `ThemeProvider` (system/light/dark), `useTheme()`, `useThemeControls()` |

Font mặc định **Be Vietnam Pro** (TTF trong `android/app/src/main/res/font/`, đăng ký ở `MainApplication.kt`; chữ Nhật tự fallback font hệ thống).
Quy ước: mọi component lấy màu/khoảng cách từ `useTheme()` + token, không hard-code màu.
Chế độ giao diện chọn trong `ProfileScreen`, lưu bền qua AsyncStorage.

## 5. i18n — `src/i18n/`

| Thành phần | Nội dung |
| --- | --- |
| Catalog | `messages/vi.ts` (gốc, đủ khoá) + `messages/en.ts` (bắt buộc đủ khoá — TS báo nếu thiếu) |
| Kiểu | `messages/types.ts` — `Locale = "vi" | "en"`, `Messages = Widen<typeof vi>` |
| API | `translate(key, params)` (ngoài React), `useT()`, `useI18n()` → `{ t, locale, setLocale }` |
| Lưu chọn | AsyncStorage key `langoo-locale`, mặc định **vi** |
| Cập nhật | Đổi locale → `cloneElement(children, { key: locale })` để cả cây render lại |

Khoá chia theo namespace: `common, nav, auth, onboarding, profile, settings, study, review, chat,
dict, translatePage, feedback, sources, errors, guards, account, theme…`.

## 6. Lớp lib dùng chung — `src/lib/`

| File | Vai trò |
| --- | --- |
| `storage.ts` | Bọc AsyncStorage (JSON + bắt lỗi) |
| `token-store.ts` | Access (RAM) + refresh (AsyncStorage) + sự kiện 401 |
| `session-cache.ts` | Cache user/hồ sơ để hiện UI tức thì lúc boot |
| `sse.ts` | SSE qua XHR (start/delta/done/error) |
| `tts.ts` | `react-native-tts` nạp lazy, `speak/stop/isTtsAvailable` |
| `media.ts` | Chọn ảnh: chat (base64 ≤ 2MB ×3), góp ý (file ≤ 5MB ×3) |
| `translate.ts` | Dịch client-side (gtx → clients5 → MyMemory) + cache AsyncStorage |
| `jp-deinflect.ts` | Chia biến thể tiếng Nhật (port nguyên từ web) |
| `lang.ts` | Nhận diện ngôn ngữ, chuẩn hoá truy vấn, `isSingleKanji` |
| `kanji.ts`, `dictionary-labels.ts` | Đọc âm đọc/nghĩa chữ Hán, nhãn từ loại |
| `format.ts` | Định dạng số/ngày theo locale UI |

## 7. Quy ước code

- TypeScript strict, import alias `@/` (babel module-resolver + tsconfig paths).
- Comment tiếng Việt; mọi chuỗi UI qua i18n; màu qua theme; testID cho luồng chính.
- Không dùng DOM API; không thêm thư viện UI ngoài danh sách ở `package.json`.
- Hook đặt tên `use-*.ts`; API thuần đặt trong `src/api/*.ts`, không gọi axios rải rác trong màn hình.
