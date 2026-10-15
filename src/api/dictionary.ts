import axios from "axios";
import { api } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import { tokenStore } from "@/lib/token-store";
import type { QueryLang } from "@/lib/lang";
import type {
  KanjiCardDto,
  LexemeSensesResultDto,
  ReverseLookupResultDto,
  SearchHistoryResultDto,
  SearchResultDto,
  SenseDetailDto,
  SenseLinksResultDto,
} from "@/types/dictionary";

export interface SearchDictionaryParams {
  q: string;
  lang?: QueryLang;
  limit?: number;
  cursor?: string | null;
}

export async function searchDictionary({
  q,
  lang,
  limit = 12,
  cursor,
}: SearchDictionaryParams): Promise<SearchResultDto> {
  const { data } = await api.get<SearchResultDto>("/v1/dictionary/search", {
    params: { q, lang: lang ?? undefined, limit, cursor: cursor ?? undefined },
  });
  return data;
}

/**
 * Tra nhanh cho các lần thử trong cụm bôi đen / gợi ý thể chia.
 * - Đã đăng nhập: gửi kèm Bearer để kết quả đúng scope hồ sơ.
 * - Khách: gọi thẳng axios không token, giữ catalog công khai.
 */
export async function searchDictionaryAnon({
  q,
  lang,
  limit = 3,
}: Pick<SearchDictionaryParams, "q" | "lang" | "limit">): Promise<SearchResultDto> {
  const params = { q, lang: lang ?? undefined, limit };
  if (tokenStore.hasSession()) {
    const { data } = await api.get<SearchResultDto>("/v1/dictionary/search", { params });
    return data;
  }
  const { data } = await axios.get<SearchResultDto>(`${API_BASE_URL}/v1/dictionary/search`, {
    params,
    timeout: 45_000,
  });
  return data;
}

/** Gợi ý khi gõ (M4.4) — tối đa 5, không cursor, không ghi lịch sử tra. */
export async function fetchDictionarySuggestions({
  q,
  lang,
}: Pick<SearchDictionaryParams, "q" | "lang">): Promise<SearchResultDto> {
  const { data } = await api.get<SearchResultDto>("/v1/dictionary/suggestions", {
    params: { q, lang: lang ?? undefined },
  });
  return data;
}

/** Tra ngược Việt → Nhật (app Nhật-only nên mặc định `to: "ja"`). */
export interface ReverseLookupParams {
  q: string;
  to?: "ja";
}

export async function fetchReverseLookup({
  q,
  to = "ja",
}: ReverseLookupParams): Promise<ReverseLookupResultDto> {
  const { data } = await api.get<ReverseLookupResultDto>("/v1/dictionary/reverse", {
    params: { q, to },
  });
  return data;
}

export async function fetchLexemeSenses(lexemeId: string): Promise<LexemeSensesResultDto> {
  const { data } = await api.get<LexemeSensesResultDto>(`/v1/lexemes/${lexemeId}/senses`);
  return data;
}

export async function fetchSenseDetail(senseId: string): Promise<SenseDetailDto> {
  const { data } = await api.get<SenseDetailDto>(`/v1/senses/${senseId}`);
  return data;
}

export async function fetchSenseLinks(senseId: string): Promise<SenseLinksResultDto> {
  const { data } = await api.get<SenseLinksResultDto>(`/v1/senses/${senseId}/links`);
  return data;
}

export async function fetchKanji(literal: string): Promise<KanjiCardDto> {
  const { data } = await api.get<KanjiCardDto>(`/v1/kanji/${encodeURIComponent(literal)}`);
  return data;
}

export async function fetchSearchHistory(): Promise<SearchHistoryResultDto> {
  const { data } = await api.get<SearchHistoryResultDto>("/v1/me/search-history");
  return data;
}

// ===== Báo lỗi nghĩa (gloss report) =====
// Các DTO dưới đây chưa khai báo trong @/types/dictionary — giữ tại đây (mirror web).

export type GlossReportTargetKind = "sense_gloss" | "concept_gloss" | "example" | "translation";
export type GlossReportIssue = "wrong" | "missing" | "offensive" | "other";

export interface CreateGlossReportDto {
  target_kind: GlossReportTargetKind;
  target_id: string;
  language_id?: number;
  issue: GlossReportIssue;
  comment?: string;
}

export interface GlossReportResponseDto {
  id: string;
  target_kind: string;
  target_id: string;
  language_id: number | null;
  issue: string;
  comment: string | null;
  status: string;
  created_at: string;
}

export async function createGlossReport(
  dto: CreateGlossReportDto,
): Promise<GlossReportResponseDto> {
  const { data } = await api.post<GlossReportResponseDto>("/v1/gloss-reports", dto);
  return data;
}
