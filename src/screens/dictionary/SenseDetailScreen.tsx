import * as React from "react";
import { Clipboard, Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Bot, ChevronDown, ChevronRight, ChevronUp, Copy } from "lucide-react-native";
import { AddToCollectionSheet } from "@/components/dictionary/AddToCollectionSheet";
import { GlossesSection } from "@/components/dictionary/GlossesSection";
import { KanjiDetailContent } from "@/components/dictionary/KanjiDetailContent";
import { KanjiInWordSection } from "@/components/dictionary/KanjiInWordSection";
import { PronunciationsSection } from "@/components/dictionary/PronunciationsSection";
import { ReportGlossSheet } from "@/components/dictionary/ReportGlossSheet";
import { SenseLinksSection } from "@/components/dictionary/SenseLinksSection";
import { LookupText } from "@/components/domain/LookupText";
import { SpeakButton } from "@/components/domain/SpeakButton";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
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
import { useT } from "@/i18n";
import { formKindLabel, posLabel } from "@/lib/dictionary-labels";
import { findExampleTarget } from "@/lib/example-highlight";
import { kanjiReadings } from "@/lib/kanji";
import { isHanChar } from "@/lib/lang";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";
import type { SenseCardDto, SenseExampleDto, SenseGlossDto } from "@/types/dictionary";

type SenseDetailScreenProps = NativeStackScreenProps<RootStackParamList, "SenseDetail">;

/** Số nghĩa hiện trước khi thu gọn (như bản web). */
const SENSE_PREVIEW_COUNT = 6;
/** Quá ngưỡng này mà chưa gộp nhóm -> thu gọn danh sách nghĩa (tránh từ 40-60 nghĩa đổ hết một lượt). */
const SENSE_COLLAPSE_THRESHOLD = 10;

/**
 * Màn chi tiết nghĩa — bố cục hai tab (Từ vựng / Hán tự) như bản web:
 * đầu mục (từ, cách đọc, Hán–Việt, chips thông tin, nút hỏi AI/sao chép),
 * danh sách nghĩa của từ (thu gọn khi quá dài), gloss, ví dụ, dạng từ,
 * phát âm, liên kết nghĩa và chữ Hán trong từ; tab Hán tự nhúng chi tiết chữ Hán.
 */
export function SenseDetailScreen({ navigation, route }: SenseDetailScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { lexemeId, senseId, surface: routeSurface } = route.params;
  const { openLookup, lookupSheet } = useLookupSheet();
  const [overrideId, setOverrideId] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = React.useState(false);
  const [tab, setTab] = React.useState("vocab");
  const [kanjiSel, setKanjiSel] = React.useState<string | null>(null);
  // Lưới an toàn: danh sách nghĩa quá dài (chưa được gộp nhóm) -> thu gọn bớt
  const [showAllSenses, setShowAllSenses] = React.useState(false);
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

  const examples = detail.data?.examples ?? [];
  const forms = detail.data?.forms ?? [];
  const pronunciations = detail.data?.pronunciations ?? [];
  const pos = posLabel(card?.pos);
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

  const collapsibleSenses = senses.length > SENSE_COLLAPSE_THRESHOLD;
  const visibleSenses =
    collapsibleSenses && !showAllSenses ? senses.slice(0, SENSE_PREVIEW_COUNT) : senses;

  // Đổi lexeme (qua liên kết nghĩa) -> thu gọn lại danh sách nghĩa
  React.useEffect(() => {
    setShowAllSenses(false);
  }, [listLexemeId]);

  const handleCopySurface = () => {
    if (!surface) return;
    Clipboard.setString(surface);
    show(t("common.copied"), { type: "success" });
  };

  const handleAskAi = () => {
    // Giống web `/chat?ask=…&sense=…` — chỉ kèm sense khi đã xác định được nghĩa
    navigation.navigate("Tabs", {
      screen: "Chat",
      params: { ask: surface, sense: resolvedSenseId ?? undefined },
    });
  };

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
          {/* Đầu mục: từ, cách đọc, Hán–Việt, chips thông tin + hành động */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <AppText size="xxl" weight="bold" numberOfLines={2} style={styles.flex}>
                {surface}
              </AppText>
              <SpeakButton text={surface} lang="ja" />
            </View>
            <View style={styles.metaRow}>
              {card?.reading && card.reading !== surface ? (
                <AppText variant="caption">{card.reading}</AppText>
              ) : null}
              {card?.romanization ? (
                <AppText variant="caption">{card.romanization}</AppText>
              ) : null}
              {/* Hán–Việt của cả từ (ghép từ dữ liệu chữ Hán của các chữ trong từ) */}
              {vietnamReadings.length > 0 ? (
                <AppText variant="body" weight="semibold">{`「${vietnamReadings.join(", ")}」`}</AppText>
              ) : null}
              {pos ? <Chip>{pos}</Chip> : null}
              {card?.frequency_rank != null ? (
                <Chip>{t("dict.frequency", { rank: card.frequency_rank })}</Chip>
              ) : null}
              {card?.register ? <Chip>{card.register}</Chip> : null}
              {card?.domain ? <Chip>{card.domain}</Chip> : null}
              {card?.gloss_vi_reviewed ? <Badge>{t("dict.reviewed")}</Badge> : null}
            </View>
            {/* Hành động như web: hỏi trợ lý AI kèm nghĩa đang xem, sao chép mặt chữ */}
            <View style={styles.actionRow}>
              <Button
                label={t("dict.askAi")}
                icon={<Bot size={16} color={theme.colors.text} />}
                variant="outline"
                size="sm"
                onPress={handleAskAi}
                disabled={!surface}
                testID="sense-ask-ai"
              />
              <Button
                label={t("dict.copyWord")}
                icon={<Copy size={16} color={theme.colors.text} />}
                variant="outline"
                size="sm"
                onPress={handleCopySurface}
                disabled={!surface}
                testID="sense-copy-word"
              />
            </View>
          </View>

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
            <>
              {/* Nhiều chữ Hán -> cho chọn chữ đang xem (như web) */}
              {kanjiChars.length > 1 ? (
                <View style={styles.kanjiPicker}>
                  <AppText variant="caption">{t("dict.chooseKanji")}</AppText>
                  <View style={styles.kanjiPickerRow}>
                    {kanjiChars.map(char => {
                      const selected = activeKanji === char;
                      return (
                        <Pressable
                          key={char}
                          onPress={() => setKanjiSel(char)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          testID={`sense-kanji-${char}`}
                          style={[
                            styles.kanjiChoice,
                            {
                              borderColor: selected ? theme.colors.primary : theme.colors.border,
                              backgroundColor: selected
                                ? theme.colors.primary
                                : theme.colors.background,
                            },
                          ]}
                        >
                          <AppText
                            size="lg"
                            weight="semibold"
                            style={{
                              color: selected ? theme.colors.onPrimary : theme.colors.text,
                            }}
                          >
                            {char}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <KanjiDetailContent
                literal={activeKanji}
                onSearchWords={() => handleSearchWords(activeKanji)}
              />
            </>
          ) : (
            <>
              {/* Các nghĩa của từ — bấm để đổi nghĩa đang xem; quá 10 nghĩa thì thu gọn */}
              {senses.length > 0 ? (
                <Card padded={false} testID="sense-list">
                  <View style={styles.listHeader}>
                    <AppText variant="label" color="muted">
                      {t("dict.sensesOf", { surface })}
                    </AppText>
                  </View>
                  {visibleSenses.map((sense, index) => (
                    <SenseGroupItem
                      key={sense.sense_id}
                      sense={sense}
                      activeSenseId={resolvedSenseId}
                      expanded={Boolean(expandedGroups[sense.sense_id])}
                      withDivider={index > 0}
                      onToggle={() =>
                        setExpandedGroups(previous => ({
                          ...previous,
                          [sense.sense_id]: !previous[sense.sense_id],
                        }))
                      }
                      onSelect={setOverrideId}
                    />
                  ))}
                  {collapsibleSenses ? (
                    <Pressable
                      onPress={() => setShowAllSenses(value => !value)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllSenses }}
                      testID="sense-show-more"
                      style={({ pressed }) => [styles.showMore, pressed ? styles.rowPressed : null]}
                    >
                      {showAllSenses ? (
                        <ChevronUp size={14} color={theme.colors.primary} />
                      ) : (
                        <ChevronDown size={14} color={theme.colors.primary} />
                      )}
                      <AppText variant="caption" color="primary" weight="medium">
                        {showAllSenses
                          ? t("dict.showFewerSenses")
                          : t("dict.showMoreSenses", { count: senses.length - SENSE_PREVIEW_COUNT })}
                      </AppText>
                    </Pressable>
                  ) : null}
                </Card>
              ) : null}

              {/* Nghĩa (gloss) — kèm nút báo lỗi từng gloss */}
              <GlossesSection glosses={glosses} onReport={setReportGloss} />

              {/* Ví dụ — thiếu khoá dict.examples, dùng tạm dict.sectionExample (đã ghi trong báo cáo) */}
              {examples.length > 0 ? (
                <View style={styles.section}>
                  <SectionHeader title={t("dict.sectionExample")} />
                  {examples.map(example => {
                    const translation = exampleTranslation(example);
                    return (
                      <Card key={example.id} style={styles.exampleCard}>
                        <View style={styles.exampleTop}>
                          <View style={styles.flex}>
                            <AppText variant="body">
                              <ExampleSentence
                                text={example.text}
                                target={surface}
                                onLookup={openLookup}
                              />
                            </AppText>
                            {translation ? (
                              <AppText variant="caption">{translation}</AppText>
                            ) : null}
                          </View>
                          {/* Loa đọc từng ví dụ (như bản web) */}
                          <SpeakButton text={example.text} lang="ja" size="sm" />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              ) : null}

              {/* Dạng từ — thiếu khoá dict.forms, dùng tạm dict.sectionForms (đã ghi trong báo cáo) */}
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
              <PronunciationsSection pronunciations={pronunciations} />

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
            onPress={() => setAddOpen(true)}
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

/** Bản dịch ví dụ ưu tiên tiếng Việt, sau đó tiếng Anh. */
function exampleTranslation(example: SenseExampleDto): string | null {
  return example.translation.vi ?? example.translation.en ?? null;
}

/**
 * Câu ví dụ + highlight từ đang tra bằng màu đỏ logo (offset theo code point).
 * Từng ký tự nhấn giữ được để tra nhanh (xem LookupText); không tìm thấy từ
 * trong câu thì vẫn render bình thường, chỉ không highlight.
 */
function ExampleSentence({
  text,
  target,
  onLookup,
}: {
  text: string;
  target: string;
  onLookup: (char: string, index: number) => void;
}) {
  const theme = useTheme();
  const range = target ? findExampleTarget(text, target) : null;
  if (!range) return <LookupText text={text} onLookup={onLookup} />;

  const chars = Array.from(text);
  return (
    <>
      <LookupText text={chars.slice(0, range.start).join("")} onLookup={onLookup} />
      <AppText testID="example-target" weight="semibold" style={{ color: theme.colors.brand }}>
        <LookupText
          text={chars.slice(range.start, range.end).join("")}
          onLookup={(char, index) => onLookup(char, range.start + index)}
        />
      </AppText>
      <LookupText
        text={chars.slice(range.end).join("")}
        onLookup={(char, index) => onLookup(char, range.end + index)}
      />
    </>
  );
}

/** Một dòng nghĩa (dùng cho cả nghĩa cha lẫn nghĩa con). */
function SenseRow({
  sense,
  active,
  indent = false,
  onSelect,
}: {
  sense: SenseCardDto;
  active: boolean;
  indent?: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const title = sense.gloss_vi ?? sense.gloss_en ?? sense.lemma;
  const sub = sense.gloss_vi ? sense.gloss_en : null;

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`sense-row-${sense.sense_id}`}
      style={({ pressed }) => [
        styles.senseRow,
        indent ? styles.senseRowIndent : null,
        active ? { backgroundColor: theme.colors.primarySoft } : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <AppText variant="caption" color={active ? "primary" : "muted"}>
        {sense.sense_no}
      </AppText>
      <View style={styles.flex}>
        <AppText
          variant={indent ? "caption" : "body"}
          weight={indent ? "regular" : "medium"}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {sub ? (
          <AppText variant="caption" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

interface SenseGroupItemProps {
  sense: SenseCardDto;
  activeSenseId: string | null;
  expanded: boolean;
  withDivider: boolean;
  onToggle: () => void;
  onSelect: (senseId: string) => void;
}

/**
 * Nghĩa cha có thể kèm nhóm nghĩa con: hiện group_heading + nút "N nghĩa khác"
 * thu gọn; mở ra render từng nghĩa con (chọn được như nghĩa cha).
 */
function SenseGroupItem({
  sense,
  activeSenseId,
  expanded,
  withDivider,
  onToggle,
  onSelect,
}: SenseGroupItemProps) {
  const t = useT();
  const theme = useTheme();
  const children = sense.sub_senses ?? [];

  return (
    <View testID={`sense-item-${sense.sense_id}`}>
      {withDivider ? <Divider /> : null}
      <SenseRow
        sense={sense}
        active={activeSenseId === sense.sense_id}
        onSelect={() => onSelect(sense.sense_id)}
      />
      {children.length > 0 ? (
        <>
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            testID={`sense-group-toggle-${sense.sense_id}`}
            style={({ pressed }) => [styles.groupToggle, pressed ? styles.rowPressed : null]}
          >
            {expanded ? (
              <ChevronDown size={14} color={theme.colors.textMuted} />
            ) : (
              <ChevronRight size={14} color={theme.colors.textMuted} />
            )}
            <AppText variant="caption" numberOfLines={1} style={styles.flex}>
              {sense.group_heading ?? t("dict.senseGroup")}
            </AppText>
            <AppText variant="caption">{t("dict.subSenses", { count: children.length })}</AppText>
          </Pressable>
          {expanded ? (
            <View testID={`sense-group-list-${sense.sense_id}`}>
              {children.map(child => (
                <SenseRow
                  key={child.sense_id}
                  sense={child}
                  indent
                  active={activeSenseId === child.sense_id}
                  onSelect={() => onSelect(child.sense_id)}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  center: { alignSelf: "center" },
  section: { gap: spacing.sm },
  skeletonWrap: { gap: spacing.md },
  header: { gap: spacing.sm },
  headerTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  actionRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  listHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  senseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  senseRowIndent: { paddingLeft: spacing.xxl },
  rowPressed: { opacity: 0.85 },
  groupToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  showMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  exampleCard: { gap: spacing.xs },
  exampleTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  kanjiPicker: { gap: spacing.sm },
  kanjiPickerRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  kanjiChoice: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 10,
  },
});
