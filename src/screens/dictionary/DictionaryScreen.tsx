import * as React from "react";
import {
  ActivityIndicator,
  Clipboard,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronDown,
  Copy,
  CornerDownRight,
  Languages,
  PenLine,
  Search,
  X,
} from "lucide-react-native";
import { HandwritingSheet } from "@/components/dictionary/HandwritingSheet";
import { KanjiCard } from "@/components/dictionary/KanjiCard";
import { SpeakButton } from "@/components/domain/SpeakButton";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Flag,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useDeinflectionSearch,
  useDictionarySearch,
  useDictionarySuggestions,
  useLexemeSenses,
  useSearchHistory,
} from "@/hooks/use-dictionary";
import { useTranslation } from "@/hooks/use-translation";
import { useT } from "@/i18n";
import { posLabel, surfaceKindLabel } from "@/lib/dictionary-labels";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { isSingleKanji } from "@/lib/lang";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";
import type { SearchHitDto, SearchHistoryItemDto } from "@/types/dictionary";

type DictionaryScreenProps = BottomTabScreenProps<MainTabParamList, "Dictionary">;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 250;
/** Số dòng lịch sử hiện mỗi lượt cuộn (lần đầu + mỗi lần chạm đáy). */
const HISTORY_CHUNK = 10;

/** Thiếu khoá i18n cho nhãn nút tra ngược — dùng tạm tiếng Việt (đã ghi trong báo cáo). */
/** Thiếu khoá i18n cho trạng thái lịch sử trống — dùng tạm tiếng Việt (đã ghi trong báo cáo). */
const HISTORY_EMPTY = "Chưa có lịch sử tra từ. Những lần tra khi đã đăng nhập sẽ hiện ở đây.";
/** Thiếu khoá i18n cho nhãn từ đồng âm — dùng tạm tiếng Việt (đã ghi trong báo cáo). */

/**
 * Tab Tra từ: ô tra + gợi ý (kèm thể chia), kết quả nạp nối tiếp bằng "Tải thêm",
 * lịch sử tra (phân trang) và fallback dịch khi từ điển không khớp.
 */
export function DictionaryScreen({ route }: DictionaryScreenProps) {
  const t = useT();
  const theme = useTheme();
  const rootNavigation = useNavigation<RootNavigation>();

  const paramQ = route.params?.q;
  const [input, setInput] = React.useState(paramQ ?? "");
  const [submitted, setSubmitted] = React.useState((paramQ ?? "").trim());
  const [debounced, setDebounced] = React.useState((paramQ ?? "").trim());
  const [tab, setTab] = React.useState("results");
  const [handwritingOpen, setHandwritingOpen] = React.useState(false);
  // Số dòng lịch sử đang hiện (cuộn vô hạn — tăng dần theo HISTORY_CHUNK)
  const [historyVisible, setHistoryVisible] = React.useState(HISTORY_CHUNK);

  // Điều hướng từ màn khác (kanji/reverse) truyền q -> tra luôn
  React.useEffect(() => {
    if (!paramQ) return;
    setInput(paramQ);
    setSubmitted(paramQ.trim());
    setTab("results");
  }, [paramQ]);

  // Debounce 250ms trước khi gọi gợi ý
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const suggestionEligible =
    tab === "results" && debounced.length > 0 && debounced !== submitted;
  const suggestions = useDictionarySuggestions({ q: debounced, lang: "ja" }, suggestionEligible);
  const directItems = React.useMemo(() => suggestions.data?.data ?? [], [suggestions.data]);
  const directHasExact = directItems.some(hit => hit.is_exact);
  // Không có khớp chính xác -> thử thêm thể gốc (vd たおさない -> たおす)
  const deinflectSuggest = useDeinflectionSearch(
    debounced,
    suggestionEligible && suggestions.isSuccess && !directHasExact,
  );
  const suggestionItems = React.useMemo(() => {
    const merged = directItems.map(hit => ({ hit, inflected: false }));
    if (
      deinflectSuggest.hit &&
      !merged.some(entry => entry.hit.lexeme_id === deinflectSuggest.hit?.lexeme_id)
    ) {
      merged.push({ hit: deinflectSuggest.hit, inflected: true });
    }
    return merged.slice(0, SUGGESTION_LIMIT);
  }, [directItems, deinflectSuggest.hit]);
  const showSuggestions = suggestionEligible && suggestionItems.length > 0;

  const search = useDictionarySearch(
    { q: submitted, lang: "ja" },
    tab === "results" && submitted.length > 0,
  );
  const pages = React.useMemo(() => search.data?.pages ?? [], [search.data]);
  const allHits = React.useMemo(() => pages.flatMap(page => page.data), [pages]);

  // Không khớp từ điển -> thử thể gốc, vẫn không có mới fallback dịch
  const noHits = submitted.length > 0 && search.isSuccess && allHits.length === 0;
  const deinflectSearch = useDeinflectionSearch(submitted, tab === "results" && search.isSuccess);
  const deinflectSection =
    deinflectSearch.hit &&
    !allHits.some(hit => hit.lexeme_id === deinflectSearch.hit?.lexeme_id)
      ? deinflectSearch.hit
      : null;
  const showTranslation = noHits && !deinflectSection && deinflectSearch.done;

  const history = useSearchHistory(tab === "history");
  const historyItems = React.useMemo(() => history.data?.data ?? [], [history.data]);
  // Lịch sử: API trả hết một lượt -> cuộn vô hạn bằng cách hiện dần từng khối
  const historyShown = Math.min(historyVisible, historyItems.length);
  const historyHasMore = historyShown < historyItems.length;
  const historyVisibleItems = React.useMemo(
    () => historyItems.slice(0, historyShown),
    [historyItems, historyShown],
  );

  // Đổi tab -> hiện lại từ khối đầu tiên
  React.useEffect(() => {
    setHistoryVisible(HISTORY_CHUNK);
  }, [tab]);

  /** Chạm đáy danh sách lịch sử -> hiện thêm một khối (dữ liệu đã có sẵn ở client). */
  const showMoreHistory = React.useCallback(() => {
    setHistoryVisible(current => Math.min(current + HISTORY_CHUNK, historyItems.length));
  }, [historyItems.length]);

  const runSearch = React.useCallback((raw: string) => {
    const next = raw.trim();
    if (!next) return;
    setInput(raw);
    setSubmitted(next);
    setTab("results");
  }, []);

  const handleSubmit = () => runSearch(input);

  /** Chốt chữ nhận dạng từ nét vẽ -> điền vào ô tra, tìm luôn rồi đóng sheet */
  const handleInkPick = (char: string) => {
    setInput(char);
    runSearch(char);
    setHandwritingOpen(false);
  };

  const handleClear = () => {
    setInput("");
    setSubmitted("");
    setDebounced("");
  };

  const pickSuggestion = (hit: SearchHitDto) => {
    runSearch(hit.surface);
    rootNavigation.navigate("SenseDetail", { lexemeId: hit.lexeme_id, surface: hit.surface });
  };

  const openSense = (hit: SearchHitDto) => {
    rootNavigation.navigate("SenseDetail", { lexemeId: hit.lexeme_id, surface: hit.surface });
  };

  const kanjiQuery = isSingleKanji(submitted) ? submitted.trim() : null;

  /** Ô tra + gợi ý + chuyển tab — dùng chung cho cả hai chế độ cuộn. */
  const topBlock = (
    <>
      {/* Ô tra + gợi ý */}
      <View style={styles.searchBlock}>
        <Input
          value={input}
          onChangeText={setInput}
          placeholder={t("dict.searchPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          rightSlot={
            input ? (
              <IconButton
                icon={<X size={18} color={theme.colors.textMuted} />}
                onPress={handleClear}
                accessibilityLabel={t("dict.searchClear")}
                size="sm"
                testID="dict-clear"
              />
            ) : undefined
          }
          testID="dict-input"
        />
        <Button
          label={t("dict.searchSubmit")}
          size="sm"
          icon={<Search size={16} color={theme.colors.onPrimary} />}
          onPress={handleSubmit}
          disabled={!input.trim()}
          fullWidth
          testID="dict-submit"
        />
        {showSuggestions ? (
          <Card padded={false} testID="dict-suggestions">
            {suggestionItems.map((entry, index) => (
              <Pressable
                key={`${entry.hit.lexeme_id}-${entry.hit.surface_kind}-${index}`}
                onPress={() => pickSuggestion(entry.hit)}
                accessibilityRole="button"
                accessibilityLabel={entry.hit.surface}
                testID={`dict-suggestion-${index}`}
                style={({ pressed }) => [styles.suggestionRow, pressed ? styles.rowPressed : null]}
              >
                <Flag code="jp" size="sm" />
                <AppText variant="body" weight="medium" numberOfLines={1}>
                  {entry.hit.surface}
                </AppText>
                {entry.hit.reading && entry.hit.reading !== entry.hit.surface ? (
                  <AppText variant="caption" numberOfLines={1}>
                    {entry.hit.reading}
                  </AppText>
                ) : null}
                {entry.inflected ? (
                  <Chip testID="dict-suggestion-inflected">{t("dict.deinflectChip")}</Chip>
                ) : null}
                {posLabel(entry.hit.pos) ? (
                  <View style={styles.suggestionPos}>
                    <Chip>{posLabel(entry.hit.pos)}</Chip>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </Card>
        ) : null}
      </View>

      <SegmentedControl
        options={[
          { value: "results", label: t("dict.tabResults") },
          { value: "history", label: t("dict.tabHistory") },
        ]}
        value={tab}
        onChange={value => setTab(value === "history" ? "history" : "results")}
        testID="dict-tabs"
      />
    </>
  );

  /** Chân danh sách lịch sử: báo đã hiện hết khi không còn dòng nào để nạp thêm. */
  const historyFooter =
    historyItems.length > 0 && !historyHasMore ? (
      <AppText variant="caption" center testID="dict-history-end">
        {t("dict.allLoaded", { count: formatNumber(historyItems.length) })}
      </AppText>
    ) : null;

  return (
    <Screen
      title={t("dict.title")}
      right={
        <>
          <IconButton
            icon={<PenLine size={20} color={theme.colors.primary} />}
            onPress={() => setHandwritingOpen(true)}
            accessibilityLabel={t("dict.inkTitle")}
            testID="handwriting-open"
          />
          <IconButton
            icon={<Languages size={20} color={theme.colors.primary} />}
            onPress={() => rootNavigation.navigate("ReverseLookup")}
            accessibilityLabel={t("dict.reverseTitle")}
            testID="dict-open-reverse"
          />
        </>
      }
      contentStyle={styles.screenContent}
      testID="dictionary-screen"
    >
      {tab === "history" ? (
        /* Lịch sử: cuộn vô hạn — chạm đáy hiện thêm một khối (dữ liệu đã có sẵn ở client) */
        <FlatList
          data={historyVisibleItems}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <HistoryRow item={item} index={index} onPick={runSearch} />
          )}
          ListHeaderComponent={
            <>
              {topBlock}
              {historyItems.length > 0 ? (
                <SectionHeader title={t("dict.historyTitle")} count={historyItems.length} />
              ) : null}
            </>
          }
          ListEmptyComponent={
            history.isPending ? (
              <Card testID="dict-history-loading">
                {[0, 1, 2, 3].map(index => (
                  <View key={index} style={styles.historySkeleton}>
                    <Skeleton height={14} width="45%" />
                    <Skeleton height={12} width="35%" />
                  </View>
                ))}
              </Card>
            ) : history.isError ? (
              <Card style={styles.section}>
                <AppText variant="caption" center>
                  {t("dict.loadError")}
                </AppText>
                <Button
                  label={t("common.retry")}
                  variant="outline"
                  size="sm"
                  onPress={() => void history.refetch()}
                  style={styles.center}
                />
              </Card>
            ) : (
              <EmptyState title={t("dict.historyTitle")} description={HISTORY_EMPTY} />
            )
          }
          ListFooterComponent={historyFooter}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={showMoreHistory}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={history.isRefetching}
              onRefresh={() => void history.refetch()}
              tintColor={theme.colors.primary}
            />
          }
          testID="dict-history"
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={search.isRefetching}
              onRefresh={() => {
                if (submitted) void search.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {topBlock}

          {submitted.length === 0 ? (
            <EmptyState
              title={t("dict.emptyTitle")}
              description={t("dict.emptyHint")}
              testID="dict-empty"
            />
          ) : (
            <>
            {/* Tra một chữ Hán: thẻ kanji đầy đủ (âm đọc, nghĩa, số nét, bộ, JLPT) */}
            {kanjiQuery ? <KanjiCard literal={kanjiQuery} /> : null}

            {search.isPending ? (
              <Card testID="dict-results-loading">
                {[0, 1, 2, 3, 4].map(index => (
                  <View key={index} style={styles.resultSkeleton}>
                    <Skeleton height={18} width="35%" />
                    <Skeleton height={12} width="60%" />
                  </View>
                ))}
              </Card>
            ) : search.isError ? (
              <Card style={styles.section}>
                <AppText variant="caption" center>
                  {t("dict.loadError")}
                </AppText>
                <Button
                  label={search.isRefetching ? t("dict.retrying") : t("common.retry")}
                  variant="outline"
                  size="sm"
                  onPress={() => void search.refetch()}
                  disabled={search.isRefetching}
                  style={styles.center}
                />
              </Card>
            ) : (
              <>
                {/* Thể chia của từ — backend không có entry cho dạng đang tra */}
                {deinflectSection ? (
                  <View style={styles.section} testID="dict-deinflect">
                    <View style={styles.deinflectHeader}>
                      <CornerDownRight size={16} color={theme.colors.primary} />
                      <AppText variant="subtitle" style={styles.flex}>
                        {t("dict.deinflectTitle")}
                      </AppText>
                      <AppText variant="caption" numberOfLines={1}>
                        {t("dict.deinflectFrom", { from: submitted })}
                      </AppText>
                    </View>
                    <ResultRow
                      hit={deinflectSection}
                      testID="dict-deinflect-result"
                      onPress={() => openSense(deinflectSection)}
                    />
                  </View>
                ) : null}

                {allHits.length > 0 ? (
                  <View style={styles.section} testID="dict-results-panel">
                    <SectionHeader
                      title={t("dict.results")}
                      right={
                        <AppText variant="caption">
                          {t("dict.resultsCount", { count: allHits.length, query: submitted })}
                        </AppText>
                      }
                    />
                    <View style={styles.resultList}>
                      {allHits.map((hit, index) => (
                        <ResultRow
                          key={`${hit.lexeme_id}-${hit.homograph_no ?? 0}-${hit.surface_kind}-${index}`}
                          hit={hit}
                          testID={`dict-result-${index}`}
                          onPress={() => openSense(hit)}
                        />
                      ))}
                    </View>
                    {/* Nạp nối tiếp theo next_cursor bằng "Tải thêm" (như bản web, không phân trang) */}
                    <View style={styles.resultsFooter} testID="dict-results-footer">
                      {search.hasNextPage ? (
                        <Button
                          label={
                            search.isFetchingNextPage ? t("common.loading") : t("common.loadMore")
                          }
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
                      ) : pages.length > 1 ? (
                        <AppText variant="caption" center testID="dict-results-end">
                          {t("dict.allLoaded", { count: formatNumber(allHits.length) })}
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
                  <Card style={styles.section}>
                    <AppText variant="caption" center>
                      {t("dict.noResults", { query: submitted })}
                    </AppText>
                  </Card>
                )}

                {showTranslation ? <TranslationFallback query={submitted} /> : null}
              </>
            )}
            </>
          )}
        </ScrollView>
      )}

      {/* Vẽ chữ Hán để nhận dạng — sheet trượt lên, chốt gợi ý thì tra luôn */}
      <HandwritingSheet
        visible={handwritingOpen}
        onClose={() => setHandwritingOpen(false)}
        onPick={handleInkPick}
      />
    </Screen>
  );
}

interface ResultRowProps {
  hit: SearchHitDto;
  testID: string;
  onPress: () => void;
}

/** Một kết quả: mặt chữ, cách đọc, từ loại + gloss xem trước từ nghĩa đầu tiên.
 *  Kèm nhãn "gần đúng", tần suất, đồng âm và loại mặt chữ (như bản web). */
function ResultRow({ hit, testID, onPress }: ResultRowProps) {
  const t = useT();
  const senses = useLexemeSenses(hit.lexeme_id);
  const first = senses.data?.data[0];
  const gloss = first?.gloss_vi ?? first?.gloss_en ?? first?.definition ?? null;
  // Chỉ giữ huy hiệu "Đã duyệt" — badge "Máy" đã bỏ như bản web
  const reviewed = Boolean(first?.gloss_vi_reviewed);
  const pos = posLabel(hit.pos);
  const kind = surfaceKindLabel(hit.surface_kind);
  const homograph = hit.homograph_no != null && hit.homograph_no > 1 ? hit.homograph_no : null;

  return (
    <Card onPress={onPress} testID={testID} style={styles.resultCard}>
      <View style={styles.resultTop}>
        <Flag code="jp" size="sm" />
        <AppText size="lg" weight="semibold" numberOfLines={1} style={styles.resultSurface}>
          {hit.surface}
        </AppText>
        {hit.reading && hit.reading !== hit.surface ? (
          <AppText variant="caption" numberOfLines={1}>
            {hit.reading}
          </AppText>
        ) : null}
        {pos ? <Chip>{pos}</Chip> : null}
        {/* Kết quả không khớp chính xác -> nhãn "gần đúng" */}
        {!hit.is_exact ? (
          <AppText variant="caption" testID={`${testID}-near-match`}>
            {t("dict.nearMatch")}
          </AppText>
        ) : null}
        {/* Loa đọc mặt chữ — đẩy về bên phải dòng (như bản web) */}
        <View style={styles.resultSpeak}>
          <SpeakButton text={hit.surface} lang="ja" size="sm" />
        </View>
      </View>
      {reviewed ? (
        <View style={styles.badgeRow}>
          <Badge tone="success">{t("dict.reviewed")}</Badge>
        </View>
      ) : null}
      {gloss ? (
        <AppText variant="caption" numberOfLines={2}>
          {gloss}
        </AppText>
      ) : senses.isPending ? (
        <Skeleton height={12} width="70%" />
      ) : null}
      {/* Tần suất · đồng âm · loại mặt chữ */}
      {hit.frequency_rank != null || homograph != null || kind ? (
        <View style={styles.resultMeta}>
          {hit.frequency_rank != null ? (
            <AppText variant="caption" size="xs">
              {t("dict.frequency", { rank: hit.frequency_rank })}
            </AppText>
          ) : null}
          {homograph != null ? (
            <AppText variant="caption" size="xs">
              {t("dict.homophone", { no: homograph })}
            </AppText>
          ) : null}
          {kind ? (
            <AppText variant="caption" size="xs">
              {kind}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** Một dòng lịch sử tra từ — chạm để tra lại từ đó. */
function HistoryRow({
  item,
  index,
  onPick,
}: {
  item: SearchHistoryItemDto;
  index: number;
  onPick: (query: string) => void;
}) {
  const t = useT();

  return (
    <Card padded={false} testID={`dict-history-${index}`}>
      <Pressable
        onPress={() => onPick(item.raw_query)}
        accessibilityRole="button"
        accessibilityLabel={item.raw_query}
        style={({ pressed }) => [styles.historyRow, pressed ? styles.rowPressed : null]}
      >
        <AppText variant="body" weight="medium" numberOfLines={1} style={styles.flex}>
          {item.raw_query}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {item.result_count != null
            ? `${formatNumber(item.result_count)} ${t("dict.results").toLowerCase()} · `
            : ""}
          {formatRelativeTime(item.created_at)}
        </AppText>
      </Pressable>
    </Card>
  );
}

/** Card dịch fallback (client-side) khi từ điển không có kết quả nào khớp. */
function TranslationFallback({ query }: { query: string }) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const translation = useTranslation(query, true);

  const handleCopy = () => {
    if (!translation.result?.text) return;
    Clipboard.setString(translation.result.text);
    show(t("common.copied"), { type: "success" });
  };

  return (
    <Card style={styles.section} testID="dict-translation-fallback">
      <View style={styles.translationHeader}>
        <Languages size={16} color={theme.colors.primary} />
        <AppText variant="subtitle" style={styles.flex}>
          {t("dict.lookupTranslationTitle")}
        </AppText>
      </View>
      {translation.status === "loading" ? (
        <AppText variant="caption">{t("dict.lookupTranslating")}</AppText>
      ) : translation.status === "error" ? (
        <View style={styles.translationError}>
          <AppText variant="caption" color="danger" style={styles.flex}>
            {t("dict.lookupTranslateError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={translation.refetch}
          />
        </View>
      ) : translation.result?.text ? (
        <>
          <AppText variant="body">{translation.result.text}</AppText>
          <Button
            label={t("dict.lookupCopy")}
            variant="outline"
            size="sm"
            icon={<Copy size={14} color={theme.colors.text} />}
            onPress={handleCopy}
            testID="dict-translation-copy"
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { padding: 0 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  searchBlock: { gap: spacing.sm },
  section: { gap: spacing.sm },
  center: { alignSelf: "center" },
  rowPressed: { opacity: 0.85 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionPos: { marginLeft: "auto" },
  resultList: { gap: spacing.sm },
  resultsFooter: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  resultCard: { gap: spacing.sm },
  resultTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  resultSpeak: { marginLeft: "auto" },
  resultSurface: { flexShrink: 1 },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  resultSkeleton: { gap: spacing.sm, paddingVertical: spacing.sm },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historySkeleton: { gap: spacing.sm, paddingVertical: spacing.sm },
  deinflectHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  translationHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  translationError: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
