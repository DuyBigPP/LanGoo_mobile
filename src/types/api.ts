/**
 * DTO mirror Swagger backend (snake_case giữ nguyên như API).
 * App Nhật-only: chỉ khai báo những gì app dùng.
 */

// ===== Auth =====
export interface UserDto {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AuthTokensDto {
  user: UserDto;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface LoginDto {
  email: string;
  password: string;
  device?: DeviceDto;
}

export interface RegisterDto {
  email: string;
  password: string;
  display_name?: string;
  device?: DeviceDto;
}

export interface DeviceDto {
  platform: "android" | "ios" | "web";
  app_version: string;
}

// ===== Profiles / settings =====
export interface ProfileDto {
  id: string;
  name: string;
  primary_language_id: number;
  secondary_language_id: number | null;
  support_language_id: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileDto {
  name: string;
  primary_language_id: number;
  secondary_language_id?: number | null;
  support_language_id: number;
  is_default?: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  primary_language_id?: number;
  secondary_language_id?: number | null;
  support_language_id?: number;
  is_default?: boolean;
}

export interface ProfileListDto {
  data: ProfileDto[];
  next_cursor: string | null;
}

export interface SettingsDto {
  timezone: string | null;
  ui_language_id: number | null;
  daily_goal: number | null;
  notify: Record<string, unknown>;
  active_profile_id: string | null;
  srs_new_per_day: number | null;
  srs_review_per_day: number | null;
}

export interface UpdateSettingsDto {
  timezone?: string;
  daily_goal?: number;
  active_profile_id?: string | null;
  srs_new_per_day?: number;
  srs_review_per_day?: number;
}

// ===== Collections =====
export interface CollectionDto {
  id: string;
  profile_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  kind: string;
  is_public: boolean;
  item_count: number;
  visible_item_count?: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CollectionListResponseDto {
  data: CollectionDto[];
  next_cursor: string | null;
}

export interface CreateCollectionDto {
  name: string;
  description?: string;
  profile_id?: string;
}

export interface UpdateCollectionDto {
  name?: string;
  description?: string | null;
}

export interface ArchivedResponseDto {
  id: string;
  archived_at: string | null;
}

export interface ItemFaceResponseDto {
  id: string;
  sense_id: string;
  language_id: number;
  direction: string;
}

export interface ItemResponseDto {
  id: string;
  collection_id: string;
  concept_id: string | null;
  anchor_sense_id: string;
  /** M6.2: sense dùng để hiển thị (có thể null khi mọi face bị ẩn theo scope) */
  display_sense_id?: string | null;
  meaning_vi: string;
  meaning_source: string;
  note: string | null;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
  faces: ItemFaceResponseDto[];
  tag_ids: string[];
}

export interface ItemListResponseDto {
  data: ItemResponseDto[];
  next_cursor: string | null;
}

export interface CreateItemDto {
  sense_id: string;
  meaning_vi: string;
  note?: string;
  status?: string;
  tag_ids?: string[];
}

export interface UpdateItemDto {
  meaning_vi?: string;
  note?: string | null;
  status?: string;
  tag_ids?: string[];
}

export interface DeletedResponseDto {
  id: string;
  deleted_at: string | null;
}

// ===== SRS =====
export interface DueItemDto {
  srs_id: string;
  face_id: string;
  item_id: string;
  collection_id: string;
  /** Swagger: enum recognize | recall */
  direction: "recognize" | "recall";
  state: "new" | "learning" | "review" | "relearning" | string;
  language: { id: number; code: string; name_vi: string };
  instruction: string;
  prompt: { kind: string; text: string; reading: string | null; romanization: string | null };
  answer: { kind: string; text: string; meaning_source: string; is_machine_generated: boolean };
  due_at: string;
  meaning_source: string;
  is_machine_generated: boolean;
}

export interface DueCountsDto {
  learning: number;
  review: number;
  new: number;
}

export interface DueResultDto {
  data: DueItemDto[];
  next_cursor: string | null;
  counts: DueCountsDto;
}

export interface CreateReviewDto {
  face_id: string;
  direction: "recognize" | "recall";
  rating: 1 | 2 | 3 | 4;
  elapsed_ms: number;
  mode: "flashcard" | "multiple_choice" | "matching" | "typing" | "listening";
  /** UUID (Swagger `format: uuid`) — dùng `uuidv7()` từ `@/lib/uuid` */
  client_review_id: string;
  collection_id?: string;
}

export interface ReviewResultDto {
  srs: {
    srs_id: string;
    state: string;
    interval_days: number;
    due_at: string;
  };
  xp_awarded?: number;
}

export interface SrsStatsDto {
  due_now: number;
  due_today: number;
  learning: number;
  new_introduced_today: number;
  reviews_today: number;
  /** Độ chính xác 7 ngày (0..1 hoặc 0..100 tuỳ BE; null khi chưa đủ dữ liệu) */
  accuracy_7d: number | null;
}

// ===== Quiz / sessions =====
export type QuizType = "multiple_choice" | "fill_blank" | "matching" | "mixed";
export type QuizDifficulty = "easy" | "medium" | "hard";

/** v2 — dạng câu hỏi người dùng chọn (checkbox, 1–3 dạng) */
export type QuizQuestionType = "multiple_choice" | "fill_blank" | "matching";

/** Dạng của TỪNG câu (BE tự trộn): nghĩa / đọc kanji / chọn kanji / điền từ / ghép cặp */
export type QuizQuestionStyle =
  | "meaning"
  | "kanji_reading"
  | "kanji_orthography"
  | "fill_blank"
  | "matching";

/** M11.1 — chế độ ngữ cảnh (chỉ còn dùng cho payload legacy khi BE chưa deploy v2) */
export type QuizContextMode = "none" | "source" | "source_or_generated";

/** Ngữ cảnh câu kèm vị trí từ khoá (offset theo CODE POINT, end exclusive) */
export interface QuizContextDto {
  /** Câu chứa từ khoá */
  sentence?: string | null;
  /** v2 — vị trí từ khoá trong câu */
  target?: { start?: number | null; end?: number | null; text?: string | null } | null;
  /** M11.1 (cũ) — BE chưa đổi hết thì vẫn trả phẳng */
  start?: number | null;
  end?: number | null;
  /** "generated" = câu do AI tạo; "dictionary" = câu nguồn từ từ điển */
  origin?: string | null;
  /** Nguồn/attribution khi origin = dictionary */
  attribution?: string | null;
  source?: string | null;
}

export interface CreateQuizDto {
  collection_id?: string;
  question_count: number;
  /** v2 — mảng con KHÔNG rỗng, không trùng của 3 dạng câu hỏi */
  question_types?: QuizQuestionType[];
  /** @deprecated legacy — chỉ dùng ở fallback khi BE chưa deploy v2 (gửi field mới bị 400) */
  quiz_type?: QuizType;
  difficulty?: QuizDifficulty;
  question_styles?: QuizQuestionStyle[];
  context_mode?: QuizContextMode;
}

export interface QuizDto {
  id: string;
  collection_id: string | null;
  /** v2: dẫn xuất — 1 dạng khi chọn 1, "mixed" khi chọn ≥2 */
  quiz_type: QuizType;
  /** @deprecated v2 bỏ field này (giữ optional cho BE cũ) */
  difficulty?: QuizDifficulty;
  question_count: number;
  status: string;
  created_at: string;
  expires_at: string;
  /** true khi BE trả lại quiz cũ trong cooldown thay vì tạo mới */
  reused?: boolean;
  latest_session?: QuizSessionRefDto | null;
}

/** Phiên gắn với quiz (BE kèm trong QuizDto khi trả lại quiz cũ) */
export interface QuizSessionRefDto {
  id: string;
  status: string;
  score: number | null;
  item_count?: number;
  answered_count?: number;
  correct_count?: number;
  started_at?: string;
  finished_at?: string | null;
}

export interface QuizQuestionDto {
  ordinal: number;
  question_type: QuizQuestionType;
  prompt: string;
  options?: SessionOptionDto[];
  language_id?: number;
  /** M11.1 */
  question_style?: QuizQuestionStyle | null;
  context?: QuizContextDto | null;
}

export interface QuizListDto {
  data: QuizDto[];
  next_cursor: string | null;
}

export interface QuizDetailDto {
  quiz: QuizDto;
  questions: QuizQuestionDto[];
  sessions?: QuizSessionRefDto[];
}

/** Bắt đầu quiz trả về đúng dạng phiên học (session + items) */
export type QuizStartDto = SessionDetailDto;

// ===== Phiên học / quiz (mirror Swagger: SessionItemResponseDto…) =====

export interface SessionLanguageDto {
  id: number;
  code: string;
  name_vi: string;
}

export interface SessionQuestionDto {
  kind: "word" | "meaning";
  text: string;
  reading: string | null;
  romanization: string | null;
}

export interface SessionOptionDto {
  text: string;
  index: number;
  /** v2 — cột của câu ghép cặp */
  side?: "left" | "right" | null;
}

/** Đề bài phiên thường (thẻ trong bộ) */
export interface SessionWordPromptDto {
  kind: "flashcard" | "multiple_choice" | "matching" | "typing";
  language: SessionLanguageDto;
  question: SessionQuestionDto;
  direction: "recognize" | "recall";
  options?: SessionOptionDto[];
}

/** Đề bài quiz AI: soạn sẵn câu hỏi, không kèm đáp án */
export interface SessionQuizPromptDto {
  kind: "multiple_choice" | "typing" | "matching";
  text: string;
  options?: SessionOptionDto[];
  left?: SessionOptionDto[];
  right?: SessionOptionDto[];
  /** M11.1: dạng câu hỏi trắc nghiệm (nghĩa / đọc kanji / chọn kanji) */
  question_style?: QuizQuestionStyle | null;
  /** M11.1: câu ngữ cảnh kèm vị trí từ khoá (offset theo code point, end exclusive) */
  context?: QuizContextDto | null;
}

export type SessionPromptDto = SessionWordPromptDto | SessionQuizPromptDto;

export interface SessionAnswerContentDto {
  kind?: "word" | "meaning";
  text?: string;
  index?: number;
  meaning_source?: string;
  is_machine_generated?: boolean;
  /** Câu gõ từ: các đáp án được chấp nhận */
  accepted?: string[];
  /** Câu ghép cặp: cặp đúng left_index → right_index */
  mapping?: { left_index: number; right_index: number }[];
}

export interface SessionItemDto {
  id: string;
  ordinal: number;
  srs_id: string | null;
  face_id: string | null;
  prompt: SessionPromptDto;
  user_answer: unknown;
  is_correct: boolean | null;
  rating: number | null;
  elapsed_ms: number | null;
  answered_at: string | null;
  /** Chỉ có sau khi đã trả lời */
  correct_answer?: SessionAnswerContentDto | null;
}

export interface SessionDto {
  id: string;
  kind: string;
  mode: string;
  collection_id: string | null;
  status: string;
  item_count: number;
  answered_count: number;
  correct_count: number;
  score: number | null;
  xp_awarded: number;
  settings: { option_count?: number; quiz_type?: string; difficulty?: string };
  started_at: string;
  finished_at: string | null;
}

export interface SessionDetailDto {
  session: SessionDto;
  items: SessionItemDto[];
}

export interface CreateSessionDto {
  kind: "review" | "practice";
  mode: "flashcard" | "multiple_choice" | "matching" | "typing";
  collection_id?: string;
  limit?: number;
}

export interface AnswerSessionDto {
  ordinal: number;
  /** Bắt buộc với mode flashcard */
  rating?: 1 | 2 | 3 | 4;
  /** Bắt buộc với mode multiple_choice / matching */
  option_index?: number;
  /** Bắt buộc với mode typing */
  answer_text?: string;
  /** Câu ghép cặp của quiz: danh sách left_index → right_index */
  pairs?: { left_index: number; right_index: number }[];
  elapsed_ms?: number;
}

export interface SrsStateDto {
  srs_id: string;
  state: string;
  interval_days: number;
  due_at: string;
}

export interface AnswerResultDto {
  item: SessionItemDto;
  /** Quiz không tác động lịch ôn nên có thể null */
  srs: SrsStateDto | null;
  xp: { amount: number };
  session: SessionDto;
}

// ===== Chat =====
export interface ChatSessionDto {
  id: string;
  language_id: number;
  scenario: string;
  title: string | null;
  model: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface ChatSessionListDto {
  data: ChatSessionDto[];
  next_cursor: string | null;
}

export interface ChatMessageDto {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  ref_sense_id: string | null;
  created_at: string;
}

export interface ChatMessageListDto {
  data: ChatMessageDto[];
  next_cursor: string | null;
}

export interface CreateChatSessionDto {
  language_id: number;
  scenario?: string;
  title?: string;
  profile_id?: string;
}

export interface SendChatMessageDto {
  content: string;
  ref_sense_id?: string;
  /** Ảnh tạm: data URL png/jpeg/webp, tối đa 3 ảnh, mỗi ảnh ≤ 2 MiB */
  images?: string[];
}

export interface SendChatMessageResultDto {
  user_message: ChatMessageDto;
  assistant_message: ChatMessageDto;
  usage: { request_count: number; limit: number };
}

export interface ChatUsageDto {
  feature: string;
  period: string;
  request_count: number;
  limit: number;
}

// ===== Feedback =====
export type FeedbackCategory = "bug" | "feature" | "content" | "other";

export interface FeedbackDto {
  id: string;
  category: FeedbackCategory;
  content: string;
  status: string;
  admin_note: string | null;
  attachments?: { id: string; url: string }[];
  created_at: string;
}

export interface CreateFeedbackDto {
  category: FeedbackCategory;
  content: string;
  files?: { uri: string; name: string; type: string }[];
}

export interface MyFeedbackListDto {
  data: FeedbackDto[];
  next_cursor: string | null;
}

// ===== Stats / gamification =====
export interface LevelProgressDto {
  level: number;
  xp_in_level: number;
  xp_for_next: number;
  percent: number;
}

export interface TodayStatsDto {
  day: string;
  review_count: number;
  xp: number;
  met_goal: boolean;
  goal: number;
}

/**
 * GET /v1/me/stats — mirror web `GamificationStatsDto` (shape thật của BE, đã verify 14/10):
 * { xp_total, level, level_progress, streak_current, streak_longest, last_study_date,
 *   items_learned, reviews_total, today }
 */
export interface MeStatsDto {
  xp_total: number;
  level: number;
  level_progress: LevelProgressDto;
  streak_current: number;
  streak_longest: number;
  last_study_date: string | null;
  items_learned: number;
  reviews_total: number;
  today: TodayStatsDto;
}

// ===== Tags =====
export interface TagDto {
  id: string;
  name: string;
  color: string | null;
}

// ===== Sources =====
export interface SourceUsageDto {
  lexemes: number;
  senses: number;
  glosses: number;
  concepts: number;
  concept_glosses: number;
  kanji: number;
  examples: number;
}

export interface SourceDto {
  id: number;
  code: string;
  name: string;
  license: string;
  attribution: string;
  url: string;
  version: string;
  credit_line: string;
  child_count: number;
  usage: SourceUsageDto;
}

export interface SourceListResponseDto {
  data: SourceDto[];
}

// ===== Error =====
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
