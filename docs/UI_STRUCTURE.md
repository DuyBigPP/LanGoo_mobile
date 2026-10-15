# Cấu trúc giao diện — Langoo JP (React Native CLI)

## 1. Cây điều hướng

```
RootNavigator (native-stack, headerShown: false)
│
├─ [guest]
│   ├─ Login            → LoginScreen
│   └─ Register         → RegisterScreen
│
├─ [đã đăng nhập nhưng chưa có hồ sơ]
│   └─ Onboarding       → OnboardingScreen
│
└─ [đã đăng nhập + có hồ sơ]
    ├─ Tabs (bottom-tabs) — MainTabs
    │   ├─ Dictionary   → DictionaryScreen     (icon BookOpen)
    │   ├─ Translate    → TranslateScreen      (icon Languages)
    │   ├─ Collections  → CollectionsScreen    (icon BookMarked)
    │   ├─ Chat         → ChatScreen           (icon Bot)
    │   └─ Profile      → ProfileScreen        (icon UserRound)
    │
    └─ Các màn đẩy lên (native-stack):
        ├─ SenseDetail      { lexemeId?, senseId?, surface? }   (modal)
        ├─ KanjiDetail      { literal }
        ├─ ReverseLookup
        ├─ CollectionDetail { collectionId, name }
        ├─ EditItem         { collectionId, itemId }
        ├─ Flashcard        { collectionId?, limit? }           (modal)
        ├─ QuizSession      { sessionId }
        ├─ ProfileForm      { profileId? }                      (modal)
        ├─ Settings
        ├─ Sources
        └─ Feedback
```

- File: `src/navigation/RootNavigator.tsx` (chuyển nhánh theo `AuthContext` + danh sách hồ sơ), `src/navigation/MainTabs.tsx`.
- Kiểu tham số: `src/navigation/types.ts` (`RootStackParamList`, `MainTabParamList`).
- Tab Từ điển nhận `params: { q?: string }` để mở sẵn từ khoá (từ màn chữ Hán / tra ngược).
- `MainTabs` gọi `useScopeReset()` — đổi hồ sơ hoạt động là dọn cache theo scope ngay.

## 2. Danh sách màn hình (20)

| Nhóm | File | Vai trò chính |
| --- | --- | --- |
| auth | `screens/auth/LoginScreen.tsx` | Đăng nhập, validate, liên kết Đăng ký |
| auth | `screens/auth/RegisterScreen.tsx` | Đăng ký (tên hiển thị tuỳ chọn) |
| onboarding | `screens/onboarding/OnboardingScreen.tsx` | 2 bước: tên hồ sơ → mục tiêu/ngày (JA cố định) |
| dictionary | `screens/dictionary/DictionaryScreen.tsx` | Tra từ: gợi ý, kết quả phân trang, deinflect, dịch fallback, lịch sử |
| dictionary | `screens/dictionary/SenseDetailScreen.tsx` | Chi tiết nghĩa: nhóm nghĩa, ví dụ, dạng từ, TTS, thêm vào sổ |
| dictionary | `screens/dictionary/KanjiDetailScreen.tsx` | Chữ Hán: âm đọc, nghĩa, bộ thủ, cây thành phần |
| dictionary | `screens/dictionary/ReverseLookupScreen.tsx` | Tra ngược Việt → Nhật |
| translate | `screens/translate/TranslateScreen.tsx` | Dịch VI/EN/JA (engine client-side), sao chép + TTS |
| collections | `screens/collections/CollectionsScreen.tsx` | Tổng quan SRS + danh sách sổ tay (phân trang) |
| collections | `screens/collections/CollectionDetailScreen.tsx` | Chi tiết sổ: sắp xếp, danh sách mục, sửa/xoá |
| collections | `screens/collections/EditItemScreen.tsx` | Sửa nghĩa/ghi chú/trạng thái mục |
| review | `screens/review/FlashcardScreen.tsx` | Flashcard SRS: lật thẻ, chấm 4 mức, hàng đợi cursor |
| review | `screens/review/QuizSessionScreen.tsx` | Chơi quiz AI: câu hỏi, chấm, kết quả, câu sai |
| chat | `screens/chat/ChatScreen.tsx` | Chat streaming, phiên, ảnh, markdown, quota |
| profile | `screens/profile/ProfileScreen.tsx` | Tài khoản, hồ sơ, thống kê, liên kết, giao diện |
| profile | `screens/profile/ProfileFormScreen.tsx` | Tạo/sửa hồ sơ (JA cố định) |
| profile | `screens/profile/SettingsScreen.tsx` | Mục tiêu ngày, thẻ mới/lượt ôn, giao diện |
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
**Common**: `components/common/FullScreenLoader.tsx` (màn chờ boot/kiểm tra phiên).

## 4. Theme — `src/theme/`

| File | Nội dung |
| --- | --- |
| `palette.ts` | Bảng màu light/dark (primary chàm `#1C3A8C`, tinh thần bản web) |
| `tokens.ts` | `spacing`, `radius`, `fontSize`, `fontWeight`, `HIT_SLOP` |
| `ThemeContext.tsx` | `ThemeProvider` (system/light/dark), `useTheme()`, `useThemeControls()` |

Quy ước: mọi component lấy màu/khoảng cách từ `useTheme()` + token, không hard-code màu.
Chế độ giao diện chọn trong `SettingsScreen`/`ProfileScreen`, lưu bền qua AsyncStorage.

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
