import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight } from "lucide-react-native";
import { AppText, Button, Card, Chip, Skeleton } from "@/components/ui";
import { useKanji } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { kanjiMeaningsEn, kanjiReadings } from "@/lib/kanji";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";

/** Số nghĩa tiếng Anh hiện trên thẻ — bản web cũng cắt còn 4. */
const MAX_MEANINGS = 4;

export interface KanjiCardProps {
  literal: string;
  testID?: string;
}

/**
 * Thẻ kanji đầy đủ (port web `KanjiCard.tsx`) — hiện khi tra thẳng một chữ Hán:
 * âm đọc (Hán–Việt/On/Kun), nghĩa, số nét, bộ và cấp JLPT; bấm để mở chi tiết chữ Hán.
 * Tự ẩn khi API lỗi hoặc không có dữ liệu (như bản web).
 */
export function KanjiCard({ literal, testID = "dict-kanji-card" }: KanjiCardProps) {
  const t = useT();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const kanji = useKanji(literal);

  const openDetail = () => navigation.navigate("KanjiDetail", { literal });

  if (kanji.isPending) {
    return (
      <Card style={styles.card} testID={`${testID}-loading`}>
        <AppText variant="subtitle">{t("dict.sectionKanji")}</AppText>
        <View style={styles.body}>
          <Skeleton height={80} width={80} radius={radius.lg} />
          <View style={styles.info}>
            <Skeleton height={16} width="70%" />
            <Skeleton height={12} width="50%" />
          </View>
        </View>
      </Card>
    );
  }

  if (kanji.isError || !kanji.data) return null;

  const data = kanji.data;
  const readings = kanjiReadings(data);
  const meanings = kanjiMeaningsEn(data);
  const jlpt = data.jlpt_new ?? data.jlpt_old ?? null;
  const radicalName = data.radical?.name_vi ? ` — ${data.radical.name_vi}` : "";

  return (
    <Card padded={false} style={styles.card} testID={testID}>
      {/* Đầu thẻ: tiêu đề + gợi ý bấm mở chi tiết */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <AppText variant="subtitle" style={styles.flex}>
          {t("dict.sectionKanji")}
        </AppText>
        <AppText variant="caption">{t("dict.kanjiCardHint")}</AppText>
      </View>

      {/* Chữ lớn + chips + nghĩa + âm đọc; cả khối bấm được để mở chi tiết */}
      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={`${t("dict.kanjiDetailTitle")} ${data.literal}`}
        testID="dict-kanji-button"
        style={({ pressed }) => [styles.body, pressed ? styles.pressed : null]}
      >
        <View
          style={[
            styles.charBox,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
        >
          <AppText size="hero" weight="semibold">
            {data.literal}
          </AppText>
        </View>

        <View style={styles.info}>
          <View style={styles.chipRow}>
            {data.stroke_count != null ? (
              <Chip>{t("dict.strokes", { count: data.stroke_count })}</Chip>
            ) : null}
            {jlpt != null ? <Chip>{t("dict.jlptLevel", { level: jlpt })}</Chip> : null}
            {data.radical?.char ? (
              <Chip>{`${t("dict.radical")} ${data.radical.char}${radicalName}`}</Chip>
            ) : null}
          </View>

          {meanings.length > 0 ? (
            <AppText variant="body">{meanings.slice(0, MAX_MEANINGS).join(", ")}</AppText>
          ) : null}

          <View style={styles.readingList}>
            {readings.vietnam.length > 0 ? (
              <ReadingLine
                label={t("dict.hanViet")}
                values={readings.vietnam}
                testID="dict-kanji-vietnam"
              />
            ) : null}
            {readings.on.length > 0 ? (
              <ReadingLine label={t("common.readingOn")} values={readings.on} testID="dict-kanji-on" />
            ) : null}
            {readings.kun.length > 0 ? (
              <ReadingLine
                label={t("common.readingKun")}
                values={readings.kun}
                testID="dict-kanji-kun"
              />
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Nút mở chi tiết chữ Hán (web hiện hàng "Xem chi tiết hơn" có mũi tên) */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          label={t("dict.kanjiDetailTitle")}
          variant="outline"
          size="sm"
          iconRight={<ChevronRight size={16} color={theme.colors.text} />}
          onPress={openDetail}
          fullWidth
          testID="dict-kanji-open"
        />
      </View>
    </Card>
  );
}

/** Một dòng âm đọc trên thẻ: nhãn mờ + giá trị đậm (kiểu "On: セン、ショウ"). */
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
    <AppText variant="caption" numberOfLines={2} testID={testID}>
      {`${label}: `}
      <AppText variant="caption" weight="medium">
        {values.join("、")}
      </AppText>
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  charBox: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  info: { flex: 1, gap: spacing.sm },
  chipRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  readingList: { gap: 2 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
