import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { X } from "lucide-react-native";
import { AddToCollectionSheet } from "@/components/dictionary/AddToCollectionSheet";
import { FuriganaText } from "@/components/common/FuriganaText";
import { SpeakButton } from "@/components/domain/SpeakButton";
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  IconButton,
  Skeleton,
} from "@/components/ui";
import { useDictionarySearch, useKanji, useLexemeSenses } from "@/hooks/use-dictionary";
import { useFurigana, useFuriganaPreference } from "@/hooks/use-furigana";
import { useTranslation } from "@/hooks/use-translation";
import { useT } from "@/i18n";
import { useAuth, useRequireAuth } from "@/contexts/AuthContext";
import { kanjiMeaningsEn, kanjiReadings } from "@/lib/kanji";
import { hasKanji } from "@/lib/furigana";
import { isSingleKanji } from "@/lib/lang";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";
import type { SearchHitDto } from "@/types/dictionary";

export interface LookupSheetProps {
  /** Chữ/từ cần tra; `null` là đóng phiếu. */
  query: string | null;
  onClose: () => void;
}

/** Số kết quả từ điển hiện trong phiếu tra nhanh (gọn, không phân trang). */
const MAX_RESULTS = 3;

/** Dữ liệu để mở sheet "Thêm vào sổ tay" từ một kết quả. */
interface AddTarget {
  senseId: string;
  surface: string;
  defaultMeaning: string;
}

/**
 * Phiếu tra nhanh dạng bottom sheet (bản mobile của LookupTooltip trên web):
 * mở khi người dùng nhấn giữ một chữ trong câu tiếng Nhật.
 * - Chữ đơn là kanji: kèm thẻ chữ Hán gọn (âm on/kun + nghĩa) — tải song song,
 *   không chặn phần kết quả từ điển.
 * - Tối đa 3 kết quả gọn: bấm mở SenseDetail, nút "Thêm vào bộ" mở AddToCollectionSheet.
 */
export function LookupSheet({ query, onClose }: LookupSheetProps) {
  // Giữ nội dung của lần tra gần nhất trong lúc sheet trượt xuống (tránh nháy trống)
  const [lastQuery, setLastQuery] = React.useState<string | null>(null);
  const { status } = useAuth();
  const requireAuth = useRequireAuth();
  const [addTarget, setAddTarget] = React.useState<AddTarget | null>(null);

  React.useEffect(() => {
    if (query !== null) setLastQuery(query);
  }, [query]);

  const contentQuery = query ?? lastQuery;

  return (
    <>
      <BottomSheet visible={query !== null} onClose={onClose} testID="lookup-sheet">
        {contentQuery !== null ? (
          <LookupContent
            query={contentQuery}
            onClose={onClose}
            onAdd={target => {
              // Guest: đóng sheet (Modal nằm trên cùng) rồi mới mở modal Login
              if (status !== "authenticated") onClose();
              requireAuth(() => setAddTarget(target));
            }}
          />
        ) : null}
      </BottomSheet>

      {/* Sheet thêm vào sổ tay — để riêng ngoài BottomSheet (tránh Modal lồng Modal) */}
      <AddToCollectionSheet
        visible={addTarget !== null}
        onClose={() => setAddTarget(null)}
        senseId={addTarget?.senseId ?? ""}
        surface={addTarget?.surface ?? ""}
        defaultMeaning={addTarget?.defaultMeaning ?? ""}
      />
    </>
  );
}

interface LookupContentProps {
  query: string;
  onClose: () => void;
  onAdd: (target: AddTarget) => void;
}

function LookupContent({ query, onClose, onAdd }: LookupContentProps) {
  const t = useT();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const singleKanji = isSingleKanji(query);
  // Từ/cụm có chữ Hán (không phải một kanji đơn — đã có thẻ chữ Hán): hiện furigana trên đầu như web
  const [furiganaEnabled] = useFuriganaPreference();
  const furigana = useFurigana(query, furiganaEnabled && !singleKanji);

  const search = useDictionarySearch({ q: query });
  // Chỉ tra thẻ chữ Hán khi chữ đang tra là một kanji đơn (endpoint /v1/kanji/{literal})
  const kanji = useKanji(singleKanji ? query : null);

  const hits = React.useMemo(
    () => (search.data?.pages ?? []).flatMap(page => page.data).slice(0, MAX_RESULTS),
    [search.data],
  );

  const readings = kanjiReadings(kanji.data);
  const meanings = kanjiMeaningsEn(kanji.data);

  // Đóng phiếu trước rồi mới đẩy màn chi tiết (phiếu là Modal, để mở sẽ che màn mới)
  const openSense = (hit: SearchHitDto) => {
    onClose();
    navigation.navigate("SenseDetail", { lexemeId: hit.lexeme_id, surface: hit.surface });
  };

  const openKanji = () => {
    onClose();
    navigation.navigate("KanjiDetail", { literal: query });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Đầu phiếu: chữ đang tra + loa đọc + nút đóng */}
      <View style={styles.header}>
        {furigana.status === "done" && hasKanji(query) ? (
          <View style={styles.flex} testID="lookup-query">
            <FuriganaText segments={furigana.segments} size={24} />
          </View>
        ) : (
          <AppText
            size="xxl"
            weight="bold"
            numberOfLines={1}
            style={styles.flex}
            testID="lookup-query"
          >
            {query}
          </AppText>
        )}
        <SpeakButton text={query} lang="ja" size="sm" testID="lookup-speak" />
        <IconButton
          icon={<X size={20} color={theme.colors.textMuted} />}
          onPress={onClose}
          accessibilityLabel={t("common.close")}
          size="sm"
          variant="ghost"
          testID="lookup-close"
        />
      </View>

      {/* Thẻ chữ Hán gọn — hiện trước, không chặn kết quả từ điển bên dưới */}
      {singleKanji ? (
        <Card style={styles.kanjiCard} testID="lookup-kanji">
          <View style={styles.kanjiRow}>
            <AppText size="xxl" weight="semibold">
              {query}
            </AppText>
            <View style={styles.kanjiInfo}>
              {kanji.isPending ? (
                <>
                  <Skeleton height={12} width="60%" />
                  <Skeleton height={12} width="40%" />
                </>
              ) : kanji.isError ? null : (
                <>
                  {readings.on.length > 0 ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {`${t("common.readingOn")}: ${readings.on.join("、")}`}
                    </AppText>
                  ) : null}
                  {readings.kun.length > 0 ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {`${t("common.readingKun")}: ${readings.kun.join("、")}`}
                    </AppText>
                  ) : null}
                  {meanings.length > 0 ? (
                    <AppText variant="caption" numberOfLines={2}>
                      {meanings.slice(0, 3).join("; ")}
                    </AppText>
                  ) : null}
                </>
              )}
            </View>
          </View>
          <Button
            label={t("dict.lookupKanjiDetail")}
            variant="outline"
            size="sm"
            onPress={openKanji}
            testID="lookup-kanji-open"
          />
        </Card>
      ) : null}

      {/* Kết quả từ điển */}
      {search.isPending ? (
        <View style={styles.stateRow} testID="lookup-loading">
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <AppText variant="caption">{t("dict.lookupSearching")}</AppText>
        </View>
      ) : search.isError ? (
        <View style={styles.stateRow} testID="lookup-error">
          <AppText variant="caption" style={styles.flex}>
            {t("dict.lookupConnectError")}
          </AppText>
          <Button
            label={search.isRefetching ? t("dict.lookupRefresh") : t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void search.refetch()}
            disabled={search.isRefetching}
            testID="lookup-retry"
          />
        </View>
      ) : hits.length > 0 ? (
        <View style={styles.results}>
          {hits.map((hit, index) => (
            <LookupResultRow
              key={`${hit.lexeme_id}-${hit.homograph_no ?? 0}-${index}`}
              hit={hit}
              index={index}
              onOpen={() => openSense(hit)}
              onAdd={onAdd}
            />
          ))}
        </View>
      ) : (
        <View style={styles.results}>
          <AppText variant="caption" testID="lookup-empty">
            {t("dict.lookupNotFound", { query })}
          </AppText>
          <LookupTranslation query={query} />
        </View>
      )}
    </ScrollView>
  );
}

/** Không có trong từ điển -> dịch máy cả cụm (như TranslationDetailDialog trên web). */
function LookupTranslation({ query }: { query: string }) {
  const t = useT();
  const translation = useTranslation(query, true);

  return (
    <Card style={styles.kanjiCard} testID="lookup-translation">
      <AppText variant="label">{t("dict.lookupTranslationTitle")}</AppText>
      {translation.status === "loading" ? (
        <AppText variant="caption">{t("dict.lookupTranslating")}</AppText>
      ) : translation.status === "error" ? (
        <View style={styles.stateRow}>
          <AppText variant="caption" color="danger" style={styles.flex}>
            {t("dict.lookupTranslateError")}
          </AppText>
          <Button label={t("common.retry")} variant="outline" size="sm" onPress={translation.refetch} />
        </View>
      ) : translation.result?.text ? (
        <AppText variant="body" selectable>
          {translation.result.text}
        </AppText>
      ) : null}
    </Card>
  );
}

interface LookupResultRowProps {
  hit: SearchHitDto;
  index: number;
  onOpen: () => void;
  onAdd: (target: AddTarget) => void;
}

/** Một kết quả gọn: mặt chữ + cách đọc + gloss VI đầu tiên; bấm mở chi tiết, có nút thêm vào bộ. */
function LookupResultRow({ hit, index, onOpen, onAdd }: LookupResultRowProps) {
  const t = useT();
  const senses = useLexemeSenses(hit.lexeme_id);
  const first =
    senses.data?.data.find(sense => sense.is_primary) ?? senses.data?.data[0] ?? null;
  const gloss = first?.gloss_vi ?? first?.gloss_en ?? first?.definition ?? null;

  return (
    <Card onPress={onOpen} testID={`lookup-result-${index}`} style={styles.resultCard}>
      <View style={styles.resultTop}>
        <AppText size="lg" weight="semibold" numberOfLines={1}>
          {hit.surface}
        </AppText>
        {hit.reading && hit.reading !== hit.surface ? (
          <AppText variant="caption" numberOfLines={1} style={styles.flex}>
            {hit.reading}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        <Button
          label={t("dict.lookupAdd")}
          variant="ghost"
          size="sm"
          disabled={!first}
          onPress={() => {
            if (!first) return;
            onAdd({
              senseId: first.sense_id,
              surface: hit.surface,
              defaultMeaning: gloss ?? "",
            });
          }}
          testID={`lookup-add-${index}`}
        />
      </View>
      <AppText variant="caption" numberOfLines={2}>
        {gloss ?? t("dict.lookupNoMeaning")}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  kanjiCard: { gap: spacing.sm },
  kanjiRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  kanjiInfo: { flex: 1, gap: 2 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 32 },
  results: { gap: spacing.sm },
  resultCard: { gap: spacing.xs, padding: spacing.md },
  resultTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
