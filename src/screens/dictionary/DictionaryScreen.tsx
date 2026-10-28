import * as React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PenLine } from "lucide-react-native";
import { DictionaryHistoryList } from "@/components/dictionary/DictionaryHistoryList";
import { DictionaryResults } from "@/components/dictionary/DictionaryResults";
import {
  DictionarySearchBar,
  type SuggestionEntry,
} from "@/components/dictionary/DictionarySearchBar";
import { HandwritingSheet } from "@/components/dictionary/HandwritingSheet";
import { ReverseResults } from "@/components/dictionary/ReverseResults";
import { AppText, EmptyState, IconButton, Screen, SegmentedControl } from "@/components/ui";
import {
  useDeinflectionSearch,
  useDictionarySearch,
  useDictionarySuggestions,
  useSearchHistory,
} from "@/hooks/use-dictionary";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n";
import { detectLang, isSingleKanji, type LangMode } from "@/lib/lang";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme";
import type { SearchHitDto } from "@/types/dictionary";

type DictionaryScreenProps = BottomTabScreenProps<MainTabParamList, "Dictionary">;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const SUGGESTION_LIMIT = 6;
const DEBOUNCE_MS = 250;
/** Số dòng lịch sử hiện mỗi lượt cuộn (lần đầu + mỗi lần chạm đáy). */
const HISTORY_CHUNK = 10;

/**
 * Tab Tra từ: ô tra + gợi ý (kèm thể chia), kết quả nạp nối tiếp bằng "Tải thêm",
 * lịch sử tra (phân trang) và fallback dịch khi từ điển không khớp.
 */
export function DictionaryScreen({ route }: DictionaryScreenProps) {
  const t = useT();
  const theme = useTheme();
  const rootNavigation = useNavigation<RootNavigation>();
  const isGuest = useAuth().status !== "authenticated";

  const paramQ = route.params?.q;
  const [input, setInput] = React.useState(paramQ ?? "");
  const [submitted, setSubmitted] = React.useState((paramQ ?? "").trim());
  const [debounced, setDebounced] = React.useState((paramQ ?? "").trim());
  const [tab, setTab] = React.useState("results");
  // Chế độ ngôn ngữ ô tra: tự động / Nhật / Việt (app chỉ học tiếng Nhật -> không có "en")
  const [langMode, setLangMode] = React.useState<LangMode>("auto");
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

  /** Tra ngược Việt → Nhật: chọn tay "Việt" hoặc tự nhận diện có dấu tiếng Việt (như web). */
  const isReverseFor = (q: string) =>
    langMode === "vi" || (langMode === "auto" && detectLang(q) === "vi");
  const isReverse = isReverseFor(submitted);

  // Chế độ vi: không gợi ý / tra xuôi / lịch sử
  const suggestionEligible =
    tab === "results" &&
    debounced.length > 0 &&
    debounced !== submitted &&
    !isReverseFor(debounced);
  const suggestions = useDictionarySuggestions({ q: debounced, lang: "ja" }, suggestionEligible);
  const directItems = React.useMemo(() => suggestions.data?.data ?? [], [suggestions.data]);
  const directHasExact = directItems.some(hit => hit.is_exact);
  // Không có khớp chính xác -> thử thêm thể gốc (vd たおさない -> たおす)
  const deinflectSuggest = useDeinflectionSearch(
    debounced,
    suggestionEligible && suggestions.isSuccess && !directHasExact,
  );
  const suggestionItems = React.useMemo<SuggestionEntry[]>(() => {
    const merged: SuggestionEntry[] = directItems.map(hit => ({ hit, inflected: false }));
    if (
      deinflectSuggest.hit &&
      !merged.some(entry => entry.hit.lexeme_id === deinflectSuggest.hit?.lexeme_id)
    ) {
      merged.push({ hit: deinflectSuggest.hit, inflected: true });
    }
    return merged.slice(0, SUGGESTION_LIMIT);
  }, [directItems, deinflectSuggest.hit]);

  const search = useDictionarySearch(
    { q: submitted, lang: "ja" },
    tab === "results" && submitted.length > 0 && !isReverse,
  );
  const pages = React.useMemo(() => search.data?.pages ?? [], [search.data]);
  const allHits = React.useMemo(() => pages.flatMap(page => page.data), [pages]);

  // Không khớp từ điển -> thử thể gốc, vẫn không có mới fallback dịch
  const noHits = submitted.length > 0 && !isReverse && search.isSuccess && allHits.length === 0;
  const deinflectSearch = useDeinflectionSearch(
    submitted,
    tab === "results" && !isReverse && search.isSuccess,
  );
  // Thể gốc đưa thẳng lên đầu kết quả (không tách mục riêng)
  const deinflectHit = deinflectSearch.hit;
  const displayHits =
    deinflectHit && !allHits.some(hit => hit.lexeme_id === deinflectHit.lexeme_id)
      ? [deinflectHit, ...allHits]
      : allHits;
  const showTranslation = noHits && displayHits.length === 0 && deinflectSearch.done;

  const history = useSearchHistory(tab === "history");
  const historyItems = React.useMemo(() => history.data?.data ?? [], [history.data]);
  // Lịch sử: API trả hết một lượt -> cuộn vô hạn bằng cách hiện dần từng khối
  const historyVisibleItems = React.useMemo(
    () => historyItems.slice(0, Math.min(historyVisible, historyItems.length)),
    [historyItems, historyVisible],
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

  /** Chốt chữ nhận dạng từ nét vẽ -> điền vào ô tra, tìm luôn rồi đóng sheet */
  const handleInkPick = (text: string) => {
    runSearch(text);
    setHandwritingOpen(false);
  };

  const handleClear = () => {
    setInput("");
    setSubmitted("");
    setDebounced("");
  };

  const openSense = (hit: SearchHitDto) => {
    rootNavigation.navigate("SenseDetail", { lexemeId: hit.lexeme_id, surface: hit.surface });
  };

  const pickSuggestion = (hit: SearchHitDto) => {
    runSearch(hit.surface);
    openSense(hit);
  };

  /** Ô tra + gợi ý + chuyển tab — dùng chung cho cả hai chế độ cuộn. */
  const topBlock = (
    <View className="gap-3">
      <DictionarySearchBar
        input={input}
        onInputChange={setInput}
        onClear={handleClear}
        onSubmit={() => runSearch(input)}
        langMode={langMode}
        onLangModeChange={setLangMode}
        detectedInput={detectLang(input)}
        suggestions={suggestionEligible ? suggestionItems : []}
        onPickSuggestion={pickSuggestion}
      />
      <SegmentedControl
        options={[
          { value: "results", label: t("dict.tabResults") },
          { value: "history", label: t("dict.tabHistory") },
        ]}
        value={tab}
        onChange={value => setTab(value === "history" ? "history" : "results")}
        testID="dict-tabs"
      />
    </View>
  );

  return (
    <Screen
      title={t("dict.title")}
      right={
        <IconButton
          icon={<PenLine size={20} color={theme.colors.primary} />}
          onPress={() => setHandwritingOpen(true)}
          accessibilityLabel={t("dict.inkTitle")}
          testID="handwriting-open"
        />
      }
      contentClassName="p-0"
      testID="dictionary-screen"
    >
      {tab === "history" ? (
        <DictionaryHistoryList
          header={topBlock}
          history={history}
          allItems={historyItems}
          visibleItems={historyVisibleItems}
          isGuest={isGuest}
          onShowMore={showMoreHistory}
          onPick={runSearch}
          onLogin={() => rootNavigation.navigate("Login")}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 p-4"
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
          ) : isReverse ? (
            <>
              <AppText variant="caption" testID="dict-searching-for">
                {t("dict.searchingFor", { query: submitted })}
              </AppText>
              <ReverseResults
                query={submitted}
                onPickJa={text => {
                  setLangMode("ja");
                  runSearch(text);
                }}
              />
            </>
          ) : (
            <DictionaryResults
              query={submitted}
              search={search}
              pageCount={pages.length}
              hits={displayHits}
              loading={search.isPending || (allHits.length === 0 && !deinflectSearch.done)}
              kanjiLiteral={isSingleKanji(submitted) ? submitted.trim() : null}
              showTranslation={showTranslation}
              onOpenSense={openSense}
            />
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
