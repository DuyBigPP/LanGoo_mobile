import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AddToCollectionSheet } from "@/components/dictionary/AddToCollectionSheet";
import { GlossesSection } from "@/components/dictionary/GlossesSection";
import { KanjiInWordSection } from "@/components/dictionary/KanjiInWordSection";
import { PronunciationsSection } from "@/components/dictionary/PronunciationsSection";
import { ReportGlossSheet } from "@/components/dictionary/ReportGlossSheet";
import { SenseLinksSection } from "@/components/dictionary/SenseLinksSection";
import { SenseExamples } from "@/components/dictionary/sense/SenseExamples";
import { SenseHeader } from "@/components/dictionary/sense/SenseHeader";
import { SenseKanjiTab } from "@/components/dictionary/sense/SenseKanjiTab";
import { SenseListCard } from "@/components/dictionary/sense/SenseListCard";
import {
  AppText,
  Button,
  Card,
  Chip,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useKanjiMany,
  useLexemeSenses,
  useSenseDetail,
  useSenseLinks,
} from "@/hooks/use-dictionary";
import { useLookupSheet } from "@/hooks/use-lookup-sheet";
import { useRequireAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n";
import { copyText } from "@/lib/clipboard";
import { formKindLabel, posLabel } from "@/lib/dictionary-labels";
import { kanjiReadings } from "@/lib/kanji";
import { isHanChar } from "@/lib/lang";
import type { RootStackParamList } from "@/navigation/types";
import { spacing } from "@/theme";
import type { SenseGlossDto } from "@/types/dictionary";

type SenseDetailScreenProps = NativeStackScreenProps<RootStackParamList, "SenseDetail">;

/**
 * Màn chi tiết nghĩa — bố cục hai tab (Từ vựng / Hán tự) như bản web:
 * đầu mục (từ, cách đọc, Hán–Việt, chips thông tin, nút hỏi AI/sao chép),
 * danh sách nghĩa của từ (thu gọn khi quá dài), gloss, ví dụ, dạng từ,
 * phát âm, liên kết nghĩa và chữ Hán trong từ; tab Hán tự nhúng chi tiết chữ Hán.
 */
export function SenseDetailScreen({ navigation, route }: SenseDetailScreenProps) {
  const t = useT();
  const { show } = useToast();
  const requireAuth = useRequireAuth();
  const { lexemeId, senseId, surface: routeSurface } = route.params;
  const { openLookup, lookupSheet } = useLookupSheet();
  const [overrideId, setOverrideId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [tab, setTab] = React.useState("vocab");
  const [kanjiSel, setKanjiSel] = React.useState<string | null>(null);
  // Nghĩa đang báo lỗi (null = đóng sheet báo lỗi)
  const [reportGloss, setReportGloss] = React.useState<SenseGlossDto | null>(null);

  const initialSenses = useLexemeSenses(lexemeId);
  const initialList = initialSenses.data?.data ?? [];
  // Nghĩa ban đầu: ưu tiên sense_id có sẵn, ngược lại lấy nghĩa chính của lexeme
  const resolvedSenseId =
    overrideId ??
    senseId ??
    initialList.find(sense => sense.is_primary)?.sense_id ??
    initialList[0]?.sense_id ??
    null;

  const detail = useSenseDetail(resolvedSenseId);
  const links = useSenseLinks(resolvedSenseId);
  const listLexemeId = detail.data?.card.lexeme_id ?? lexemeId;
  const listSenses = useLexemeSenses(listLexemeId);
  const senses = listSenses.data?.data ?? [];
  const card = detail.data?.card;
  const surface = card?.lemma ?? routeSurface ?? "";

  const glosses = React.useMemo(() => {
    const list = [...(detail.data?.glosses ?? [])];
    // Tiếng Việt (language_id = 3) lên trước, sau đó theo rank
    return list.sort(
      (a, b) => Number(b.language_id === 3) - Number(a.language_id === 3) || a.rank - b.rank,
    );
  }, [detail.data]);

  const forms = detail.data?.forms ?? [];
  const defaultMeaning = card?.gloss_vi ?? card?.gloss_en ?? card?.definition ?? "";

  // Các chữ Hán có trong từ (tab Hán tự + khối "Chữ Hán trong từ")
  const kanjiChars = React.useMemo(
    () => [...new Set(Array.from(surface).filter(char => isHanChar(char)))],
    [surface],
  );
  const activeKanji = kanjiSel ?? kanjiChars[0] ?? null;

  // Hán–Việt của cả từ — lấy từ dữ liệu chữ Hán (dùng chung cache với tab Hán tự)
  const kanjiQueries = useKanjiMany(kanjiChars);
  const vietnamReadings = React.useMemo(() => {
    const out: string[] = [];
    for (const query of kanjiQueries) {
      for (const value of kanjiReadings(query.data).vietnam) {
        if (!out.includes(value)) out.push(value);
      }
    }
    return out;
  }, [kanjiQueries]);

  const handleCopySurface = () => {
    if (!surface) return;
    copyText(surface);
    show(t("common.copied"), { type: "success" });
  };

  const handleAskAi = () =>
    requireAuth(() => {
      // Giống web `/chat?ask=…&sense=…` — chỉ kèm sense khi đã xác định được nghĩa
      navigation.navigate("Tabs", {
        screen: "Chat",
        params: { ask: surface, sense: resolvedSenseId ?? undefined },
      });
    });

  const handleSearchWords = (char: string) => {
    navigation.navigate("Tabs", { screen: "Dictionary", params: { q: char } });
  };

  const openKanjiTab = (char: string) => {
    setKanjiSel(char);
    setTab("kanji");
  };

  const tabOptions = [
    { value: "vocab", label: t("dict.tabVocab") },
    ...(kanjiChars.length > 0 ? [{ value: "kanji", label: t("dict.tabKanji") }] : []),
  ];

  return (
    <Screen
      title={t("dict.detailTitle")}
      onBack={() => navigation.goBack()}
      scroll
      contentStyle={styles.content}
      testID="sense-detail"
    >
      {detail.isPending ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={28} width="45%" />
          <Skeleton height={14} width="65%" />
          <Skeleton height={90} width="100%" />
        </View>
      ) : detail.isError ? (
        <Card style={styles.section}>
          <AppText variant="caption" center>
            {t("dict.detailError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void detail.refetch()}
            style={styles.center}
          />
        </Card>
      ) : detail.data ? (
        <>
          <SenseHeader
            surface={surface}
            card={card}
            vietnamReadings={vietnamReadings}
            pos={posLabel(card?.pos)}
            onAskAi={handleAskAi}
            onCopy={handleCopySurface}
          />

          {/* Tab Từ vựng | Hán tự — chỉ hiện khi từ có chữ Hán (khác web vẫn hiện tab đơn) */}
          {kanjiChars.length > 0 ? (
            <SegmentedControl
              options={tabOptions}
              value={tab}
              onChange={setTab}
              testID="sense-tabs"
            />
          ) : null}

          {tab === "kanji" && activeKanji ? (
            <SenseKanjiTab
              chars={kanjiChars}
              active={activeKanji}
              onSelect={setKanjiSel}
              onSearchWords={handleSearchWords}
            />
          ) : (
            <>
              {/* Các nghĩa của từ — bấm để đổi nghĩa đang xem; key theo từ để đặt lại trạng thái thu gọn */}
              {senses.length > 0 ? (
                <SenseListCard
                  key={listLexemeId}
                  surface={surface}
                  senses={senses}
                  activeSenseId={resolvedSenseId}
                  onSelect={setOverrideId}
                />
              ) : null}

              {/* Nghĩa (gloss) — kèm nút báo lỗi từng gloss */}
              <GlossesSection
                glosses={glosses}
                onReport={gloss => requireAuth(() => setReportGloss(gloss))}
              />

              <SenseExamples
                examples={detail.data.examples ?? []}
                surface={surface}
                onLookup={openLookup}
              />

              {/* Dạng từ */}
              {forms.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title={t("dict.sectionForms")} />
                  <View style={styles.formRow}>
                    {forms.map(form => {
                      const kind = formKindLabel(form.kind);
                      return (
                        <Chip key={form.id}>
                          {kind ? `${kind}: ${form.form_text}` : form.form_text}
                        </Chip>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Các cách đọc của từ */}
              <PronunciationsSection pronunciations={detail.data.pronunciations ?? []} />

              {/* Liên kết nghĩa khác ngôn ngữ — bấm để nhảy sang nghĩa đó */}
              <SenseLinksSection links={links.data?.data ?? []} onSelect={setOverrideId} />

              {/* Chữ Hán trong từ — mở thẳng tab Hán tự */}
              <KanjiInWordSection
                surface={surface}
                chars={kanjiChars}
                onOpenKanji={openKanjiTab}
              />
            </>
          )}

          <Button
            label={t("dict.addToCollection")}
            onPress={() => requireAuth(() => setAddOpen(true))}
            disabled={!resolvedSenseId}
            fullWidth
            testID="sense-add"
          />
        </>
      ) : null}

      <AddToCollectionSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        senseId={resolvedSenseId ?? ""}
        surface={surface}
        defaultMeaning={defaultMeaning}
      />

      {/* Sheet báo lỗi nghĩa — mở từ nút cờ ở từng gloss */}
      <ReportGlossSheet
        visible={reportGloss !== null}
        gloss={reportGloss}
        onClose={() => setReportGloss(null)}
      />

      {/* Phiếu tra nhanh — mở khi nhấn giữ một chữ trong câu ví dụ */}
      {lookupSheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  center: { alignSelf: "center" },
  section: { gap: spacing.sm },
  skeletonWrap: { gap: spacing.md },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
