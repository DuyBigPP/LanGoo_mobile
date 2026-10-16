import { useInfiniteQuery, useMutation, useQueries, useQuery } from "@tanstack/react-query";
import * as React from "react";
import {
  createGlossReport,
  fetchDictionarySuggestions,
  fetchKanji,
  fetchLexemeSenses,
  fetchReverseLookup,
  fetchSearchHistory,
  fetchSenseDetail,
  fetchSenseLinks,
  searchDictionary,
  searchDictionaryAnon,
} from "@/api/dictionary";
import { useAuth } from "@/contexts/AuthContext";
import { detectLang, type QueryLang } from "@/lib/lang";
import { deinflectJapanese } from "@/lib/jp-deinflect";
import type { SearchHitDto } from "@/types/dictionary";

export const dictionaryKeys = {
  search: (q: string, lang: QueryLang, limit: number) =>
    ["dictionary", "search", q, lang, limit] as const,
  lexemeSenses: (lexemeId: string) => ["dictionary", "lexeme-senses", lexemeId] as const,
  sense: (senseId: string) => ["dictionary", "sense", senseId] as const,
  links: (senseId: string) => ["dictionary", "links", senseId] as const,
  kanji: (literal: string) => ["dictionary", "kanji", literal] as const,
  history: ["dictionary", "history"] as const,
};

const TEN_MINUTES = 10 * 60_000;
const DEFAULT_SEARCH_LIMIT = 12;
/** App Nhật-only: mặc định tra ở tiếng Nhật. */
const DEFAULT_QUERY_LANG: QueryLang = "ja";

export function useDictionarySearch(
  params: { q: string; lang?: QueryLang | null; limit?: number },
  enabled = true,
) {
  const q = params.q.trim();
  const lang: QueryLang = params.lang ?? DEFAULT_QUERY_LANG;
  const limit = params.limit ?? DEFAULT_SEARCH_LIMIT;
  return useInfiniteQuery({
    queryKey: dictionaryKeys.search(q, lang, limit),
    queryFn: ({ pageParam }) => searchDictionary({ q, lang, cursor: pageParam, limit }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: enabled && q.length > 0,
    staleTime: TEN_MINUTES,
  });
}

/** Tra nhanh ẩn danh (không ghi lịch sử) — dùng cho fallback trong cụm bôi đen. */
export function useDictionarySearchAnon(
  params: { q: string; lang: QueryLang | null },
  enabled: boolean,
) {
  const q = params.q.trim();
  return useQuery({
    queryKey: ["dictionary", "search-anon", q, params.lang],
    queryFn: () => searchDictionaryAnon({ q, lang: params.lang ?? undefined }),
    enabled: enabled && q.length > 0,
    staleTime: TEN_MINUTES,
  });
}

export interface DeinflectionSearch {
  /** Các thể gốc ứng viên đang thử (đã chuẩn hoá) */
  candidates: string[];
  /** Hit đầu tiên tìm được (ưu tiên khớp chính xác) */
  hit: SearchHitDto | null;
  /** Ứng viên đã ra hit */
  baseForm: string | null;
  loading: boolean;
  /** Đã thử xong tất cả ứng viên (hoặc không có ứng viên nào) */
  done: boolean;
}

const MAX_DEINFLECT_CANDIDATES = 6;

/**
 * Khi từ điển không khớp (từ đang ở thể chia), thử lần lượt các thể gốc do
 * `deinflectJapanese` sinh ra — dùng anon search nên không ghi lịch sử.
 */
export function useDeinflectionSearch(query: string, enabled: boolean): DeinflectionSearch {
  const candidates = React.useMemo(
    () => (enabled ? deinflectJapanese(query, MAX_DEINFLECT_CANDIDATES) : []),
    [query, enabled],
  );

  const results = useQueries({
    queries: candidates.map((candidate) => ({
      queryKey: ["dictionary", "search-anon", candidate, detectLang(candidate)],
      queryFn: () =>
        searchDictionaryAnon({ q: candidate, lang: detectLang(candidate) ?? undefined }),
      enabled,
      staleTime: TEN_MINUTES,
    })),
  });

  return React.useMemo(() => {
    let hit: SearchHitDto | null = null;
    let baseForm: string | null = null;
    // Ưu tiên khớp chính xác; nếu không có thì lấy hit gần đúng đầu tiên
    for (const exactOnly of [true, false]) {
      for (let index = 0; index < candidates.length; index += 1) {
        const first = results[index]?.data?.data?.[0];
        if (!first) continue;
        if (exactOnly && !first.is_exact) continue;
        hit = first;
        baseForm = candidates[index];
        break;
      }
      if (hit) break;
    }

    const settled = results.every((result) => result.isSuccess || result.isError);
    return {
      candidates,
      hit,
      baseForm,
      loading: enabled && candidates.length > 0 && !settled,
      done: !enabled || candidates.length === 0 || settled,
    };
  }, [candidates, results, enabled]);
}

/** Gợi ý khi gõ (M4.4) — tối đa 5, không ghi lịch sử tra; mặc định tiếng Nhật. */
export function useDictionarySuggestions(
  params: { q: string; lang?: QueryLang | null },
  enabled: boolean,
) {
  const q = params.q.trim();
  const lang: QueryLang = params.lang ?? DEFAULT_QUERY_LANG;
  return useQuery({
    queryKey: ["dictionary", "suggestions", q, lang],
    queryFn: () => fetchDictionarySuggestions({ q, lang }),
    enabled: enabled && q.length > 0,
    staleTime: TEN_MINUTES,
  });
}

/** Tra ngược Việt → Nhật (mặc định `to: "ja"`). */
export function useReverseLookup(query: string, enabled: boolean) {
  const q = query.trim();
  return useQuery({
    queryKey: ["dictionary", "reverse", q],
    queryFn: () => fetchReverseLookup({ q }),
    enabled: enabled && q.length > 0,
    staleTime: TEN_MINUTES,
  });
}

export function useLexemeSenses(lexemeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dictionaryKeys.lexemeSenses(lexemeId ?? "none"),
    queryFn: () => fetchLexemeSenses(lexemeId as string),
    enabled: enabled && Boolean(lexemeId),
    staleTime: TEN_MINUTES,
  });
}

export function useSenseDetail(senseId: string | null | undefined) {
  return useQuery({
    queryKey: dictionaryKeys.sense(senseId ?? "none"),
    queryFn: () => fetchSenseDetail(senseId as string),
    enabled: Boolean(senseId),
    staleTime: TEN_MINUTES,
  });
}

export function useSenseLinks(senseId: string | null | undefined) {
  return useQuery({
    queryKey: dictionaryKeys.links(senseId ?? "none"),
    queryFn: () => fetchSenseLinks(senseId as string),
    enabled: Boolean(senseId),
    staleTime: TEN_MINUTES,
  });
}

export function useKanji(literal: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: dictionaryKeys.kanji(literal ?? "none"),
    queryFn: () => fetchKanji(literal as string),
    enabled: enabled && Boolean(literal),
    staleTime: 30 * 60_000,
  });
}

/** Lấy nhiều chữ Hán một lượt (dùng chung cache với useKanji) */
export function useKanjiMany(literals: string[]) {
  return useQueries({
    queries: literals.map((literal) => ({
      queryKey: dictionaryKeys.kanji(literal),
      queryFn: () => fetchKanji(literal),
      staleTime: 30 * 60_000,
    })),
  });
}

/** Lấy nhiều nghĩa một lượt (dùng chung cache với useSenseDetail) */
export function useSensesMany(senseIds: string[]) {
  return useQueries({
    queries: senseIds.map((senseId) => ({
      queryKey: dictionaryKeys.sense(senseId),
      queryFn: () => fetchSenseDetail(senseId),
      staleTime: TEN_MINUTES,
    })),
  });
}

export function useSearchHistory(enabled: boolean) {
  // Lịch sử tra cần đăng nhập — guest không gọi
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: dictionaryKeys.history,
    queryFn: fetchSearchHistory,
    enabled: enabled && authenticated,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useGlossReportMutation() {
  return useMutation({ mutationFn: createGlossReport });
}

// Nguồn dữ liệu từ điển — khai báo ở use-sources.ts để dùng chung một cache
export { useSourcesQuery, useSourcesQuery as useSources } from "@/hooks/use-sources";
