# Bản đồ API — Langoo JP (React Native CLI)

Backend dùng chung với web: **`https://langoo-api.pixpress.art`** (Swagger: `/docs`).
Base URL khai báo tại `src/config/env.ts`. Mọi request đi qua `src/api/client.ts`.

## 1. Cơ chế phiên & client

| Hạng mục | Chi tiết |
| --- | --- |
| Access token | Giữ trong RAM (`src/lib/token-store.ts`), gắn `Authorization: Bearer` qua axios interceptor |
| Refresh token | AsyncStorage key `langoo.refresh_token`; nạp 1 lần lúc boot bằng `tokenStore.hydrate()` |
| Làm mới sớm | Request interceptor tự refresh khi còn < 90s (`REFRESH_MARGIN_MS`) |
| Single-flight | Nhiều request 401 cùng lúc chỉ gọi refresh 1 lần |
| 401 lần 2 | `tokenStore.clear()` + `emitUnauthorized()` → `AuthContext` đưa về màn đăng nhập |
| Lỗi chuẩn hoá | `ApiError { status, code, message, details }` — `ApiError.from(error)` dùng ở mọi màn |
| Timeout | 45s (backend free-tier có cold start) |
| SSE | `getAccessTokenForFetch()` cấp token cho XHR (không qua axios) |

## 2. Xác thực — `src/api/auth.ts`

| Method | Endpoint | Hàm | Dùng ở |
| --- | --- | --- | --- |
| POST | `/v1/auth/login` | `login` | `LoginScreen` · `AuthContext.login` |
| POST | `/v1/auth/register` | `register` | `RegisterScreen` · `AuthContext.register` |
| GET | `/v1/auth/me` | `fetchMe` | `AuthContext.bootstrap` |
| POST | `/v1/auth/refresh` | *(axios trực tiếp trong client)* | interceptor |
| POST | `/v1/auth/logout` | `revokeSession` | `AuthContext.logout` (best-effort) |

## 3. Hồ sơ & cài đặt — `src/api/profile.ts`

| Method | Endpoint | Hàm | Hook |
| --- | --- | --- | --- |
| GET | `/v1/profiles` | `fetchProfiles` | `useProfilesQuery` |
| POST | `/v1/profiles` | `createProfile` | `useCreateProfileMutation` |
| PATCH | `/v1/profiles/{id}` | `updateProfile` | `useUpdateProfileMutation` |
| DELETE | `/v1/profiles/{id}` | `deleteProfile` | `useDeleteProfileMutation` |
| GET | `/v1/me/settings` | `fetchSettings` | `useSettingsQuery` |
| PATCH | `/v1/me/settings` | `updateSettings` | `useUpdateSettingsMutation` |

> Hồ sơ tạo mới luôn `primary_language_id = 2 (JA)`, `support_language_id = 3 (VI)`.
> Đổi `active_profile_id` → `useScopeReset()` dọn cache theo scope.

## 4. Từ điển — `src/api/dictionary.ts`

| Method | Endpoint | Hàm | Hook | Màn hình |
| --- | --- | --- | --- | --- |
| GET | `/v1/dictionary/search` | `searchDictionary` | `useDictionarySearch` (lang `ja`) | `DictionaryScreen` |
| GET | `/v1/dictionary/search` *(ẩn danh)* | `searchDictionaryAnon` | `useDictionarySearchAnon`, `useDeinflectionSearch` | `DictionaryScreen` |
| GET | `/v1/dictionary/suggestions` | `fetchDictionarySuggestions` | `useDictionarySuggestions` | `DictionaryScreen` |
| GET | `/v1/dictionary/reverse` | `fetchReverseLookup` (`to = "ja"`) | `useReverseLookup` | `ReverseLookupScreen` |
| GET | `/v1/lexemes/{id}/senses` | `fetchLexemeSenses` | `useLexemeSenses` | `DictionaryScreen`, `SenseDetailScreen` |
| GET | `/v1/senses/{id}` | `fetchSenseDetail` | `useSenseDetail` | `SenseDetailScreen` |
| GET | `/v1/senses/{id}/links` | `fetchSenseLinks` | `useSenseLinks` | (sẵn sàng cho UI liên kết) |
| GET | `/v1/kanji/{literal}` | `fetchKanji` | `useKanji` | `KanjiDetailScreen` |
| GET | `/v1/me/search-history` | `fetchSearchHistory` | `useSearchHistory` | `DictionaryScreen` (tab lịch sử) |
| POST | `/v1/gloss-reports` | `createGlossReport` | `useGlossReportMutation` | (UI báo lỗi nghĩa) |

## 5. Sổ tay — `src/api/collections.ts`

| Method | Endpoint | Hàm | Hook |
| --- | --- | --- | --- |
| GET | `/v1/collections?profile_id=` | `fetchCollections` | `useCollectionsQuery`, `useCollectionsInfiniteQuery` |
| GET | `/v1/collections/{id}` | `fetchCollection` | `useCollectionQuery` |
| POST | `/v1/collections` | `createCollection` | `useCreateCollectionMutation` |
| PATCH | `/v1/collections/{id}` | `updateCollection` | `useUpdateCollectionMutation` |
| DELETE | `/v1/collections/{id}` | `archiveCollection` | `useArchiveCollectionMutation` |
| GET | `/v1/collections/{id}/items` | `fetchCollectionItems` | `useCollectionItemsQuery` |
| POST | `/v1/collections/{id}/items` | `addCollectionItem` | `useAddCollectionItemMutation` |
| PATCH | `/v1/collections/{id}/items/{itemId}` | `updateCollectionItem` | `useUpdateItemMutation` |
| DELETE | `/v1/collections/{id}/items/{itemId}` | `deleteCollectionItem` | `useDeleteItemMutation` |

> Lỗi cần bắt: `COLLECTION_LANGUAGE_NOT_IN_PROFILE` (toast riêng trong `AddToCollectionSheet`).
> Trường phòng thủ: `visible_item_count ?? item_count`, `display_sense_id ?? anchor_sense_id`.

## 6. SRS & phiên học — `src/api/srs.ts`, `src/api/sessions.ts`

| Method | Endpoint | Hàm | Hook |
| --- | --- | --- | --- |
| GET | `/v1/srs/stats` | `fetchSrsStats` | `useSrsStatsQuery` |
| GET | `/v1/srs/due?cursor=&limit=&collection_id=` | `fetchDue` | (infinite trong `FlashcardScreen`) |
| POST | `/v1/srs/reviews` | `postReview` | (mutation trong `FlashcardScreen`) |
| POST | `/v1/sessions` | `createSession` | `useCreateSessionMutation` |
| GET | `/v1/sessions/{id}` | `fetchSession` | `useSessionQuery` |
| GET | `/v1/sessions/{id}/items?is_correct=` | `fetchSessionItems` | `useSessionWrongItemsQuery` |
| POST | `/v1/sessions/{id}/answers` | `answerSession` | `useAnswerMutation` |
| POST | `/v1/sessions/{id}/finish` | `finishSession` | `useFinishMutation` |

> `fetchDue` trả `data + counts + next_cursor`; flashcard nối trang bằng `next_cursor`,
> thẻ đã chấm bị loại khỏi cache ngay, có bước recheck khi cạn hàng đợi.
> Lỗi cần bắt: `SRS_ITEM_UNAVAILABLE` (bỏ qua thẻ + toast).

## 7. Quiz AI — `src/api/quizzes.ts`

| Method | Endpoint | Hàm | Hook |
| --- | --- | --- | --- |
| POST | `/v1/quizzes` | `createQuiz` | `useCreateQuizMutation` |
| GET | `/v1/quizzes` | `fetchQuizzes` | `useQuizzesQuery` |
| GET | `/v1/quizzes/{id}` | `fetchQuiz` | `useQuizQuery` |
| POST | `/v1/quizzes/{id}/start` | `startQuiz` | `useStartQuizMutation` |

> Lỗi cần bắt: `QUIZ_GENERATION_COOLDOWN` (đếm ngược `details.retry_after_s`),
> `QUIZ_SCOPE_CHANGED` (thông báo + tải lại) — xử lý trong `StartStudySheet`.

## 8. Chat AI — `src/api/chat.ts`

| Method | Endpoint | Hàm |
| --- | --- | --- |
| POST | `/v1/chat/sessions` | `createChatSession` |
| GET | `/v1/chat/sessions` | `fetchChatSessions` |
| GET | `/v1/chat/sessions/{id}` | `fetchChatSession` |
| PATCH | `/v1/chat/sessions/{id}` | `updateChatSession` |
| DELETE | `/v1/chat/sessions/{id}` | `archiveChatSession` |
| GET | `/v1/chat/sessions/{id}/messages` | `fetchChatMessages` |
| POST | `/v1/chat/sessions/{id}/messages` | `sendChatMessage` (fallback không stream) |
| POST | `/v1/chat/sessions/{id}/messages/stream` | `streamChatMessage` (SSE) |
| GET | `/v1/chat/usage` | `fetchChatUsage` |

**Sự kiện SSE** (qua `src/lib/sse.ts` — XHR vì RN không có `EventSource`):

| Event | Data | Ý nghĩa |
| --- | --- | --- |
| `start` | `{ model }` | Bắt đầu sinh |
| `delta` | `{ content }` | Mảnh nội dung (nối dần) |
| `done` | `{ response }` | Hoàn tất — lưu tin nhắn trợ lý |
| `error` | `{ code, message }` | Lỗi giữa stream (HTTP vẫn 200) → ném `ApiError` |

> Ảnh: data URL ≤ 3 ảnh, ≤ 2MiB/ảnh, **không lưu server**. Quota ~50 lượt/ngày (`fetchChatUsage`).
> `streamChatMessage` tự retry 1 lần khi 401 và tôn trọng `AbortSignal` (nút dừng).

## 9. Tiện ích — `stats / feedback / sources / tags / gamification`

| Method | Endpoint | Hàm | Hook |
| --- | --- | --- | --- |
| GET | `/v1/me/stats` | `fetchMeStats` | `useMeStatsQuery` |
| POST | `/v1/feedback` | `createFeedback` (multipart, ảnh `{uri,name,type}`) | `useCreateFeedbackMutation` |
| GET | `/v1/me/feedback` | `fetchMyFeedback` | `useMyFeedbackInfiniteQuery` |
| GET | `/v1/sources` | `fetchSources` | `useSourcesQuery` |
| GET | `/v1/tags` | `fetchTags` | *(chưa có UI)* |
| POST | `/v1/tags` | `createTag` | *(chưa có UI)* |
| DELETE | `/v1/tags/{id}` | `deleteTag` | *(chưa có UI)* |
| GET | `/v1/me/achievements` | `fetchAchievements` | *(chưa có UI)* |
| POST | `/v1/me/achievements/seen` | `markAchievementsSeen` | *(chưa có UI)* |

## 10. Mã lỗi nghiệp vụ đã xử lý ở UI

| Code | Nơi bắt | Hành vi |
| --- | --- | --- |
| `COLLECTION_LANGUAGE_NOT_IN_PROFILE` | `AddToCollectionSheet` | Toast “ngôn ngữ không thuộc hồ sơ” |
| `SRS_ITEM_UNAVAILABLE` | `FlashcardScreen`, `QuizSessionScreen` | Bỏ qua thẻ/câu, đi tiếp |
| `QUIZ_GENERATION_COOLDOWN` | `StartStudySheet` | Đếm ngược theo `retry_after_s` |
| `QUIZ_SCOPE_CHANGED` | `StartStudySheet` | Thông báo + tải lại danh sách |
| `401` (hết phiên) | `client.ts` → `AuthContext` | Xoá phiên, về Login |
