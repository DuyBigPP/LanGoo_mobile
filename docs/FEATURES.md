# Tổng hợp chức năng — Langoo JP (React Native CLI)

> App **học tiếng Nhật** trên di động, dùng chung backend với web. Giao diện **Việt/Anh** (mặc định VI);
> **nội dung học duy nhất là tiếng Nhật** (hồ sơ JA, từ điển JA, tra ngược Việt→Nhật, chat JA).

## 1. Bản đồ chức năng theo khu vực

### 1.1 Xác thực & hồ sơ

| Chức năng | Mô tả | Màn hình / Hook |
| --- | --- | --- |
| Đăng nhập | Email + mật khẩu (≥ 8 ký tự), lưu phiên bằng refresh token (AsyncStorage) | `LoginScreen` · `AuthContext` |
| Đăng ký | Email + mật khẩu + tên hiển thị (tuỳ chọn) | `RegisterScreen` |
| Khôi phục phiên | Boot app: đọc refresh token → hiện user cache → xác thực ngầm `/auth/me` | `AuthContext.bootstrap` |
| Refresh token | Tự làm mới trước 90s khi hết hạn, single-flight, retry 1 lần khi 401 | `src/api/client.ts` |
| Onboarding | 2 bước: tên hồ sơ → mục tiêu/ngày (5/10/20/30). Ngôn ngữ **cố định JA** | `OnboardingScreen` |
| Nhiều hồ sơ | Tạo/sửa/xoá/chọn hồ sơ hoạt động; đổi hồ sơ → tự dọn cache theo scope | `ProfileScreen`, `ProfileFormScreen`, `useScopeReset` |
| Cài đặt học | Mục tiêu ngày, số thẻ mới/ngày, số lượt ôn/ngày, giao diện sáng/tối | `SettingsScreen` |
| Đăng xuất | Xoá phiên client trước, thu hồi server best-effort | `ProfileScreen` |

### 1.2 Từ điển (lõi học tập)

| Chức năng | Mô tả | Hook |
| --- | --- | --- |
| Tra từ JA | Tìm theo chữ Nhật (kana/kanji/romaji), phân trang 5/10/15/20 | `useDictionarySearch` (lang `ja`) |
| Gợi ý realtime | Debounce 250ms, tối đa 6 gợi ý, gộp gợi ý thể chia | `useDictionarySuggestions` + `useDeinflectionSearch` |
| Deinflection | Khi không có kết quả khớp: chia nhỏ biến thể (động từ/tính từ) → tra lại dạng gốc | `useDeinflectionSearch` |
| Fallback dịch máy | Vẫn không có → dịch câu (Google gtx → clients5 → MyMemory), cache AsyncStorage | `useTranslation` + `src/lib/translate.ts` |
| Lịch sử tra | Danh sách từ đã tra (phân trang client 10/trang), chạm để tra lại | `useSearchHistory` |
| Chi tiết nghĩa | Nhóm nghĩa + nghĩa con (thu gọn “N nghĩa khác”), gloss VI trước, ví dụ, dạng từ | `SenseDetailScreen` |
| Chi tiết chữ Hán | Âm Kun/On/Nanori/Hán-Việt, nghĩa, nét, JLPT, bộ thủ, cây thành phần | `KanjiDetailScreen` |
| Tra ngược VI→JA | Nhập nghĩa tiếng Việt → danh sách từ Nhật (badge “đúng nghĩa”, “qua lemma”) | `ReverseLookupScreen` |
| Thêm vào sổ tay | Chọn bộ + nghĩa + ghi chú; xử lý lỗi ngôn ngữ không thuộc hồ sơ | `AddToCollectionSheet` |
| Báo lỗi nghĩa | Gửi gloss report (API sẵn sàng, UI tối thiểu) | `useGlossReportMutation` |

### 1.3 Dịch hai chiều (client-side)

| Chức năng | Mô tả |
| --- | --- |
| Dịch văn bản | Việt ⇄ Anh ⇄ Nhật, nguồn “Tự động nhận diện”, đổi chiều, xoá |
| Kết quả | Sao chép (Clipboard) + đọc to (TTS theo ngôn ngữ đích), hiện ngôn ngữ nhận diện |
| Engine | Google gtx → clients5 → MyMemory; cache AsyncStorage 300 mục |

### 1.4 Sổ tay & ôn tập (SRS)

| Chức năng | Mô tả | Hook |
| --- | --- | --- |
| Tổng quan SRS | 4 ô: đến hạn hôm nay / đang học / từ mới hôm nay / đã ôn hôm nay | `useSrsStatsQuery` |
| Sổ tay | Danh sách bộ (phân trang 5/10/15/20), tạo/đổi tên/lưu trữ | `useCollectionsInfiniteQuery` |
| Chi tiết bộ | Đếm từ, sắp xếp (mới nhất/cũ nhất/A-Z), danh sách mục (12/trang) | `CollectionDetailScreen` |
| Mục trong bộ | Sửa nghĩa/ghi chú/trạng thái (đang học/tạm dừng/đã biết), xoá | `EditItemScreen` |
| Flashcard | Hàng đợi SRS cursor, lật thẻ, chấm 4 mức (Lại/Khó/Được/Dễ), đọc to JA/VI | `FlashcardScreen` |
| Quiz AI | Tạo quiz (4 loại câu hỏi × 3 độ khó × 5–20 câu), chơi, chấm điểm, xem câu sai | `QuizSessionScreen`, `StartStudySheet` |
| Chống lỗi | `SRS_ITEM_UNAVAILABLE` → bỏ qua thẻ; `QUIZ_GENERATION_COOLDOWN` → đếm ngược; `QUIZ_SCOPE_CHANGED` → thông báo | các hook |

### 1.5 Trợ lý AI (chat)

| Chức năng | Mô tả |
| --- | --- |
| Hội thoại streaming | SSE `POST /chat/sessions/{id}/messages/stream` (start/delta/done/error), nút dừng, thử lại |
| Phiên chat | Tạo/đổi tên/lưu trữ, danh sách phiên trong bottom sheet, tự đặt tiêu đề từ tin nhắn đầu |
| Ảnh | ≤ 3 ảnh, ≤ 2MB, gửi dạng data URL base64 (server không lưu), xem thumbnail trong bong bóng |
| Hiển thị | Markdown cho câu trả lời AI, chỉ báo “Đang suy nghĩ…”, quota lượt/ngày |
| Gợi ý | Chip câu hỏi mẫu (tổng quát/từ vựng/ngữ pháp) khi phiên trống |

### 1.6 Tiện ích khác

| Chức năng | Mô tả |
| --- | --- |
| Thống kê cá nhân | XP/cấp/chuỗi ngày/từ đã lưu/độ chính xác (`useMeStatsQuery`) |
| Góp ý | 4 loại (bug/tính năng/nội dung/khác), kèm ≤ 3 ảnh (multipart), xem lịch sử phản hồi |
| Nguồn dữ liệu | 18–19 nguồn từ điển, license, dòng credit, sao chép |
| Giao diện | Sáng/tối/theo hệ thống, đồng bộ toàn app qua ThemeProvider |
| Ngôn ngữ UI | VI/EN, lưu lựa chọn vào AsyncStorage |

## 2. Khác biệt JA-only so với bản web (đúng yêu cầu)

| Hạng mục | Web | RN (app này) |
| --- | --- | --- |
| Ngôn ngữ UI | VI/EN/JA (đủ) | **VI/EN** (không cần JA cho UI) |
| Hồ sơ học | Chọn cặp ngôn ngữ, có hồ sơ EN | **Luôn JA**: `primary_language_id = 2`, `support_language_id = 3` |
| Onboarding | 3 bước có bước chọn ngôn ngữ | **2 bước**, bỏ bước chọn ngôn ngữ |
| Từ điển | Đa ngôn ngữ, có chế độ học EN | **Chỉ JA**: `lang = "ja"` cố định |
| Tra ngược | VI→EN/JA | **VI→JA** (`to = "ja"`) |
| Chat AI | Theo ngôn ngữ hồ sơ | **Luôn JA** (`language_id = 2`) |
| Bộ sưu tập | Lọc theo ngôn ngữ | Không cần lọc (tất cả JA) |
| Nghĩa hiển thị | VI/EN | VI (gloss_vi, fallback gloss_en) |

## 3. Phần hoãn trên RN v1 (có lý do native)

| Tính năng web | Trạng thái RN | Ghi chú |
| --- | --- | --- |
| Đọc PDF + session PDF | **Hoãn** | Cần native PDF layer; web dùng pdf.js + text layer |
| Viết tay / nhận diện ONNX | **Đã làm (14/10)** | `onnxruntime-react-native` + model DaKanji (2.1MB) trong `assets/models/dakanji/`; màn `HandwritingScreen` (vẽ bằng Svg + PanResponder, tự nhận dạng sau 600ms, bấm gợi ý → tra luôn). Lưu ý release Android: asset vào `res/raw` nên cần native copy (debug qua Metro thì OK) |
| Furigana (kuromoji) | **Hoãn** | Từ điển kuromoji nặng; có thể bổ sung sau bằng thư viện JS thuần |
| Hoạt ảnh nét chữ Hán (SVG) | **Hoãn** | Cần dữ liệu KanjiVG + animation; màn chi tiết hiện chỉ hiện dữ liệu (vẽ tay đã có ở màn Vẽ chữ) |
| Đăng nhập Google | **Hoãn** | Cần native Google Sign-In; v1 chỉ email/mật khẩu |
| PWA / Service Worker | Không áp dụng | Đặc thù web |
| Banner offline | **Hoãn** | Cần NetInfo; có thể thêm nhanh khi cần |
| UI thành tựu (achievements) | API có, **chưa có màn** | `/v1/me/achievements` đã port sẵn ở `api/gamification.ts` |
| UI tag | API có, **chưa có màn** | `/v1/tags` đã port sẵn ở `api/tags.ts` |

## 3b. Đồng bộ với web (14/10/2026)

| Khu vực | Đã đồng bộ |
| --- | --- |
| Tra từ | Kết quả chuyển **"Tải thêm"** theo cursor (bỏ phân trang theo trang; lịch sử vẫn phân trang), header đếm theo số đã nạp |
| Ví dụ | **Highlight từ đang tra** trong câu ví dụ bằng **đỏ logo #fc3603** (`lib/example-highlight.ts`, offset code point) + loa cho từng ví dụ |
| Nghĩa | Loa cho **từng gloss**; thứ tự VI trước EN (đã có) |
| Chip | Bo **4px** (bỏ kiểu viên thuốc) |
| Quiz | **v2**: 3 checkbox `question_types`, loading "Đang tạo đề quiz…" (thanh tiến trình thuần FE chạy tới 90% rồi chờ), context v2 + highlight, ghép cặp theo `options[].side`, lỗi `QUIZ_NOT_ENOUGH_ITEMS`/`AI_QUOTA_EXCEEDED`… |
| Vẽ chữ | **Bottom sheet trượt lên** (không còn màn full-screen) + nhận dạng chữ Hán on-device (ONNX DaKanji) — nút bút ở header Từ điển; chọn gợi ý là **tra luôn** chữ đó |
| Tra nhanh | **Nhấn giữ một chữ** trong câu ví dụ / câu ngữ cảnh quiz → **phiếu tra nhanh** dạng sheet (thẻ kanji nhanh + tối đa 3 kết quả + thêm vào bộ); RN không bắt được selection như web nên dùng long-press từng ký tự |
| Thứ tự nét | **Hoạt ảnh vẽ từng nét** chữ Hán (KanjiVG từ backend + react-native-svg) trong chi tiết chữ Hán, có nút phát lại |
| TTS | Nút loa **luôn hiện** (máy thiếu engine thì báo toast), thêm loa ở kết quả tra, từng gloss, từng ví dụ, hàng sổ tay, đề bài quiz |
| Hồ sơ | **Ẩn quản lý hồ sơ** (app chỉ học tiếng Nhật): bỏ danh sách/tạo/sửa/xoá hồ sơ, giữ tài khoản + thống kê + cài đặt |

## 4. Cơ chế quan trọng đã port (giữ đúng hợp đồng backend)

- **Scope theo hồ sơ**: đổi hồ sơ hoạt động → `useScopeReset` xoá cache các root
  `dictionary / collections / srs / srs-stats / me-stats / session / quizzes / achievements` rồi refetch.
- **SRS cursor**: `GET /v1/srs/due` trả `data + counts + next_cursor`; flashcard nối trang bằng cursor,
  thẻ đã chấm bị loại khỏi cache ngay (optimistic) và có bước “recheck” khi cạn hàng đợi.
- **Quiz 409**: `QUIZ_GENERATION_COOLDOWN` (đếm ngược theo `retry_after_s`), `QUIZ_SCOPE_CHANGED` (thông báo + tải lại).
- **Trường phòng thủ**: `display_sense_id ?? anchor_sense_id`, `visible_item_count ?? item_count`.
- **SSE không dùng fetch**: RN thiếu stream — `src/lib/sse.ts` tự tách block qua XHR `readyState === 3`.
- **TTS lazy**: thiếu module native → `isTtsAvailable() = false`, nút loa tự ẩn, không crash.
