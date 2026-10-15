import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Search } from "lucide-react-native";
import { KanjiStrokePlayer } from "@/components/dictionary/KanjiStrokePlayer";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Button, Card, Chip, SectionHeader, Skeleton } from "@/components/ui";
import { useKanji } from "@/hooks/use-dictionary";
import { translate, useT } from "@/i18n";
import { kanjiMeaningsEn, kanjiReadings } from "@/lib/kanji";
import { radius, spacing, useTheme } from "@/theme";
import type { KanjiComponentDto, KanjiPartDto } from "@/types/dictionary";

/** Nhãn âm đọc — dùng khoá i18n common.reading* */
const READING_LABEL_KEYS = {
  kun: "common.readingKun",
  on: "common.readingOn",
  nanori: "common.readingNanori",
};
/** Thiếu khoá i18n cho lỗi tải chữ Hán — dùng tạm tiếng Việt (đã ghi trong báo cáo). */
const KANJI_LOAD_ERROR = "Không tải được dữ liệu chữ Hán.";

/** Vị trí thành phần trong chữ — khớp mã backend với khoá dict.pos*. */
const POSITION_KEYS: Record<string, string> = {
  top: "dict.posTop",
  bottom: "dict.posBottom",
  left: "dict.posLeft",
  right: "dict.posRight",
  inside: "dict.posInside",
  outside: "dict.posOutside",
  center: "dict.posCenter",
  kamae: "dict.posEnclose",
};

function positionLabel(position: string | null): string | null {
  if (!position) return null;
  const key = POSITION_KEYS[position];
  return key ? translate(key) : position;
}

export interface KanjiDetailContentProps {
  /** Chữ Hán cần hiện chi tiết */
  literal: string;
  /** Có thì hiện nút "Tra từ chứa chữ này" ở cuối (như bản web). */
  onSearchWords?: () => void;
}

/**
 * Nội dung chi tiết một chữ Hán: chữ lớn + Hán–Việt, chips thông tin, thứ tự nét,
 * âm đọc Kun/On/Nanori, nghĩa, bộ thủ và cây thành phần.
 * Dùng chung cho màn chi tiết chữ Hán và tab "Hán tự" trong chi tiết nghĩa
 * (không kèm khung Screen/ScrollView để nhúng được vào màn khác).
 */
export function KanjiDetailContent({ literal, onSearchWords }: KanjiDetailContentProps) {
  const t = useT();
  const theme = useTheme();
  const kanji = useKanji(literal);
  const data = kanji.data;

  const readings = kanjiReadings(data);
  const nanori = data?.nanori ?? [];
  const meanings = kanjiMeaningsEn(data);
  const jlpt = data?.jlpt_new ?? data?.jlpt_old ?? null;
  const tree = data?.components ?? null;
  const parts = data?.parts ?? [];
  const hasTree = Boolean(tree && tree.children.length > 0);

  if (kanji.isPending) {
    return (
      <View style={styles.skeletonWrap}>
        <Skeleton height={88} width={88} radius={radius.lg} />
        <Skeleton height={20} width="40%" />
        <Skeleton height={60} width="100%" />
      </View>
    );
  }

  if (kanji.isError || !data) {
    return (
      <Card style={styles.section}>
        <AppText variant="caption" center>
          {KANJI_LOAD_ERROR}
        </AppText>
        <Button
          label={t("common.retry")}
          variant="outline"
          size="sm"
          onPress={() => void kanji.refetch()}
          style={styles.center}
        />
      </Card>
    );
  }

  return (
    <View style={styles.content}>
      {/* Chữ lớn + Hán–Việt */}
      <View style={styles.heroRow}>
        <View
          style={[
            styles.heroBox,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
        >
          <AppText size="hero" weight="semibold">
            {data.literal}
          </AppText>
        </View>
        <View style={styles.heroInfo}>
          {readings.vietnam.length > 0 ? (
            <AppText variant="subtitle">{`「${readings.vietnam.join(", ")}」`}</AppText>
          ) : null}
          <SpeakButton text={data.literal} lang="ja" />
        </View>
      </View>

      {/* Chips thông tin */}
      <View style={styles.chipRow}>
        {data.stroke_count != null ? (
          <Chip>{t("dict.strokes", { count: data.stroke_count })}</Chip>
        ) : null}
        {jlpt != null ? <Chip>{t("dict.jlptLevel", { level: jlpt })}</Chip> : null}
        {data.grade != null ? <Chip>{t("dict.grade", { grade: data.grade })}</Chip> : null}
        {data.frequency_rank != null ? (
          <Chip>{t("dict.frequency", { rank: data.frequency_rank })}</Chip>
        ) : null}
      </View>

      {/* Thứ tự nét — đặt ngay sau chữ lớn/chips (như bản web để cạnh chữ) và
          tiếp nối chip số nét phía trên; component tự ẩn nếu không có dữ liệu */}
      <KanjiStrokePlayer literal={data.literal} />

      {/* Âm đọc */}
      <View style={styles.section}>
        <SectionHeader title={t("dict.sectionPronunciation")} />
        {readings.kun.length > 0 || readings.on.length > 0 || nanori.length > 0 ? (
          <View style={styles.readingList}>
            {readings.kun.length > 0 ? (
              <ReadingLine label={t(READING_LABEL_KEYS.kun)} values={readings.kun} testID="kun" />
            ) : null}
            {readings.on.length > 0 ? (
              <ReadingLine label={t(READING_LABEL_KEYS.on)} values={readings.on} testID="on" />
            ) : null}
            {nanori.length > 0 ? (
              <ReadingLine label={t(READING_LABEL_KEYS.nanori)} values={nanori} testID="nanori" />
            ) : null}
          </View>
        ) : (
          <AppText variant="caption">{t("dict.readingsEmpty")}</AppText>
        )}
      </View>

      {/* Nghĩa (dữ liệu KanjiDict trả tiếng Anh) */}
      {meanings.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={t("dict.sectionMeaning")} />
          {meanings.map(meaning => (
            <AppText key={meaning} variant="body">{`• ${meaning}`}</AppText>
          ))}
        </View>
      ) : null}

      {/* Bộ thủ */}
      {data.radical?.char ? (
        <View style={styles.section}>
          <SectionHeader title={t("dict.radical")} />
          <Card style={styles.radicalCard}>
            <View
              style={[
                styles.radicalBox,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            >
              <AppText size="xl" weight="semibold">
                {data.radical.char}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {data.radical.name_vi ?? `Bộ ${data.radical.char}`}
              </AppText>
              {data.radical.meaning_vi ? (
                <AppText variant="caption">
                  {t("dict.radicalMeaning", { meaning: data.radical.meaning_vi })}
                </AppText>
              ) : null}
            </View>
          </Card>
        </View>
      ) : null}

      {/* Kanji breakdown: cây thành phần KanjiVG, fallback KRADFILE (parts) */}
      <View style={styles.section}>
        <SectionHeader title={t("dict.breakdownTitle")} />
        {hasTree && tree ? (
          <View style={styles.breakdownList} testID="kanji-breakdown">
            {tree.children.map((component, index) => (
              <BreakdownNode
                key={`${component.char}-${component.position ?? index}`}
                component={component}
              />
            ))}
          </View>
        ) : parts.length > 0 ? (
          <View style={styles.breakdownList} testID="kanji-breakdown">
            {parts.map((part, index) => (
              <PartNode key={`${part.char}-${index}`} part={part} />
            ))}
          </View>
        ) : (
          <AppText variant="caption">{t("dict.breakdownEmpty")}</AppText>
        )}
      </View>

      {onSearchWords ? (
        <Button
          label={t("dict.searchWordsWith")}
          icon={<Search size={16} color={theme.colors.onPrimary} />}
          onPress={onSearchWords}
          fullWidth
          testID="kanji-search-words"
        />
      ) : null}
    </View>
  );
}

/** Một dòng âm đọc (Kun/On/Nanori). */
function ReadingLine({
  label,
  values,
  testID,
}: {
  label: string;
  values: string[];
  testID: string;
}) {
  return (
    <View style={styles.readingLine} testID={`kanji-reading-${testID}`}>
      <AppText variant="label" color="muted" style={styles.readingLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.flex}>
        {values.join(" ; ")}
      </AppText>
    </View>
  );
}

/** Một node trong cây thành phần chữ Hán (đệ quy theo `children`). */
function BreakdownNode({ component }: { component: KanjiComponentDto }) {
  const t = useT();
  const theme = useTheme();
  const details = [
    positionLabel(component.position),
    component.original ? t("dict.breakdownOriginal", { char: component.original }) : null,
    component.stroke_count > 0 ? t("dict.strokes", { count: component.stroke_count }) : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <View testID={`kanji-component-${component.char}`} style={styles.nodeWrap}>
      <View style={styles.nodeRow}>
        <View
          style={[
            styles.nodeChar,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
        >
          <AppText size="lg" weight="semibold">
            {component.char}
          </AppText>
        </View>
        <View style={styles.flex}>
          {component.name_vi || component.meaning_vi ? (
            <AppText variant="body" weight="medium" numberOfLines={1}>
              {component.name_vi ?? component.meaning_vi}
              {component.name_vi && component.meaning_vi ? ` · ${component.meaning_vi}` : ""}
            </AppText>
          ) : null}
          {details.length > 0 ? (
            <AppText variant="caption" numberOfLines={1}>
              {details.join(" · ")}
            </AppText>
          ) : null}
        </View>
        {component.is_radical ? <Chip>{t("dict.compRadical")}</Chip> : null}
        {component.is_phonetic ? <Chip>{t("dict.compPhonetic")}</Chip> : null}
      </View>
      {component.children.length > 0 ? (
        <View style={[styles.children, { borderLeftColor: theme.colors.border }]}>
          {component.children.map((child, index) => (
            <BreakdownNode key={`${child.char}-${child.position ?? index}`} component={child} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Node fallback từ `parts` (KRADFILE) khi chưa có cây thành phần. */
function PartNode({ part }: { part: KanjiPartDto }) {
  const t = useT();
  const theme = useTheme();

  return (
    <View style={styles.nodeRow} testID={`kanji-part-${part.char}`}>
      <View
        style={[
          styles.nodeChar,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
        ]}
      >
        <AppText size="lg" weight="semibold">
          {part.char}
        </AppText>
      </View>
      <View style={styles.flex}>
        {part.name_vi || part.meaning_vi ? (
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {part.name_vi ?? part.meaning_vi}
            {part.name_vi && part.meaning_vi ? ` · ${part.meaning_vi}` : ""}
          </AppText>
        ) : null}
        {part.radical_number != null ? (
          <AppText variant="caption">{`#${part.radical_number}`}</AppText>
        ) : null}
      </View>
      {part.is_radical ? <Chip>{t("dict.compRadical")}</Chip> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  center: { alignSelf: "center" },
  section: { gap: spacing.sm },
  skeletonWrap: { gap: spacing.md },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  heroBox: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  heroInfo: { flex: 1, alignItems: "flex-start", gap: spacing.sm },
  chipRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  readingList: { gap: spacing.sm },
  readingLine: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  readingLabel: { width: 76 },
  radicalCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  radicalBox: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
  },
  breakdownList: { gap: spacing.md },
  nodeWrap: { gap: spacing.sm },
  nodeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  nodeChar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  children: {
    marginLeft: spacing.lg,
    paddingLeft: spacing.md,
    borderLeftWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
