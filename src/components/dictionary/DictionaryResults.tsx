import React from "react";
import { ActivityIndicator, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { KanjiCard } from "@/components/dictionary/KanjiCard";
import { ResultRow } from "@/components/dictionary/ResultRow";
import { TranslationFallback } from "@/components/dictionary/TranslationFallback";
import { AppText, Button, Card, SectionHeader, Skeleton } from "@/components/ui";
import type { useDictionarySearch } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { useTheme } from "@/theme";
import type { SearchHitDto } from "@/types/dictionary";

export interface DictionaryResultsProps {
  /** Từ khoá đã chốt (đã bấm Tra). */
  query: string;
  search: ReturnType<typeof useDictionarySearch>;
  /** Số trang đã nạp (để biết có hiện dòng "đã tải hết" hay không). */
  pageCount: number;
  /** Kết quả, đã chèn thể gốc (たおさない -> たおす, 勉強する -> 勉強) lên đầu nếu có. */
  hits: SearchHitDto[];
  /** Đang tra hoặc chưa thử xong thể gốc -> skeleton (không chớp "không tìm thấy"). */
  loading: boolean;
  /** Một chữ Hán đơn -> kèm thẻ chữ Hán. */
  kanjiLiteral: string | null;
  showTranslation: boolean;
  onOpenSense: (hit: SearchHitDto) => void;
}

/** Kết quả tra xuôi (JA): thẻ kanji, danh sách + "Tải thêm", dịch dự phòng. */
export function DictionaryResults({
  query,
  search,
  pageCount,
  hits,
  loading,
  kanjiLiteral,
  showTranslation,
  onOpenSense,
}: DictionaryResultsProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <>
      {/* Tra một chữ Hán: thẻ kanji đầy đủ (âm đọc, nghĩa, số nét, bộ, JLPT) */}
      {kanjiLiteral ? <KanjiCard literal={kanjiLiteral} /> : null}

      {loading ? (
        <Card testID="dict-results-loading">
          {[0, 1, 2, 3, 4].map(index => (
            <View key={index} className="gap-2 py-2">
              <Skeleton height={18} width="35%" />
              <Skeleton height={12} width="60%" />
            </View>
          ))}
        </Card>
      ) : search.isError ? (
        <Card className="gap-2">
          <AppText variant="caption" center>
            {t("dict.loadError")}
          </AppText>
          <Button
            label={search.isRefetching ? t("dict.retrying") : t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void search.refetch()}
            disabled={search.isRefetching}
            className="self-center"
          />
        </Card>
      ) : (
        <>
          {hits.length > 0 ? (
            <View className="gap-2" testID="dict-results-panel">
              <SectionHeader
                title={t("dict.results")}
                right={
                  <AppText variant="caption">
                    {t("dict.resultsCount", { count: hits.length, query })}
                  </AppText>
                }
              />
              <View className="gap-2">
                {hits.map((hit, index) => (
                  <ResultRow
                    key={`${hit.lexeme_id}-${hit.homograph_no ?? 0}-${hit.surface_kind}-${index}`}
                    hit={hit}
                    testID={`dict-result-${index}`}
                    onPress={() => onOpenSense(hit)}
                  />
                ))}
              </View>
              {/* Nạp nối tiếp theo next_cursor bằng "Tải thêm" (như bản web, không phân trang) */}
              <View className="items-center gap-2 pt-2" testID="dict-results-footer">
                {search.hasNextPage ? (
                  <Button
                    label={search.isFetchingNextPage ? t("common.loading") : t("common.loadMore")}
                    variant="outline"
                    size="sm"
                    icon={
                      search.isFetchingNextPage ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <ChevronDown size={16} color={theme.colors.text} />
                      )
                    }
                    onPress={() => void search.fetchNextPage()}
                    disabled={search.isFetchingNextPage}
                    testID="dict-load-more"
                  />
                ) : pageCount > 1 ? (
                  <AppText variant="caption" center testID="dict-results-end">
                    {t("dict.allLoaded", { count: formatNumber(hits.length) })}
                  </AppText>
                ) : null}
                {search.isFetchNextPageError ? (
                  <AppText variant="caption" color="danger" center>
                    {t("dict.loadMoreError")}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : (
            <Card className="gap-2">
              <AppText variant="caption" center>
                {t("dict.noResults", { query })}
              </AppText>
            </Card>
          )}

          {showTranslation ? <TranslationFallback query={query} /> : null}
        </>
      )}
    </>
  );
}
