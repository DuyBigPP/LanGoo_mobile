import * as React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Copy, Search } from "lucide-react-native";
import { KanjiStrokePlayer } from "@/components/dictionary/KanjiStrokePlayer";
import { KanjiBreakdown } from "@/components/dictionary/kanji/KanjiBreakdown";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Button, Card, Chip, IconButton, SectionHeader, Skeleton, useToast } from "@/components/ui";
import { useKanji } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { copyText } from "@/lib/clipboard";
import { kanjiMeaningsEn, kanjiReadings } from "@/lib/kanji";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme";

export interface KanjiDetailContentProps {
  /** Chữ Hán cần hiện chi tiết */
  literal: string;
  /** Có thì hiện nút "Tra từ chứa chữ này" ở cuối (như bản web). */
  onSearchWords?: () => void;
}

/**
 * Nội dung chi tiết một chữ Hán: chữ lớn + Hán–Việt, chips thông tin, thứ tự nét,
 * âm đọc Kun/On/Nanori, nghĩa, bộ thủ và phân tích thành phần (đồ thị + cây).
 * Dùng chung cho màn chi tiết chữ Hán và tab "Hán tự" trong chi tiết nghĩa
 * (không kèm khung Screen/ScrollView để nhúng được vào màn khác).
 */
export function KanjiDetailContent({ literal, onSearchWords }: KanjiDetailContentProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const kanji = useKanji(literal);
  const data = kanji.data;

  const readings = kanjiReadings(data);
  const nanori = data?.nanori ?? [];
  const meanings = kanjiMeaningsEn(data);
  const jlpt = data?.jlpt_new ?? data?.jlpt_old ?? null;

  if (kanji.isPending) {
    return (
      <View className="gap-3">
        <Skeleton height={88} width={88} className="rounded-lg" />
        <Skeleton height={20} width="40%" />
        <Skeleton height={60} width="100%" />
      </View>
    );
  }

  if (kanji.isError || !data) {
    return (
      <Card className="gap-2">
        <AppText variant="caption" center>
          {t("dict.kanjiLoadError")}
        </AppText>
        <Button
          label={t("common.retry")}
          variant="outline"
          size="sm"
          onPress={() => void kanji.refetch()}
          className="self-center"
        />
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {/* Chữ lớn + Hán–Việt */}
      <View className="flex-row items-center gap-4">
        <View
          className="h-[88px] w-[88px] items-center justify-center rounded-lg border border-border bg-background"
        >
          <AppText size="hero" weight="semibold">
            {data.literal}
          </AppText>
        </View>
        <View className="flex-1 items-start gap-2">
          {readings.vietnam.length > 0 ? (
            <AppText variant="subtitle">{`「${readings.vietnam.join(", ")}」`}</AppText>
          ) : null}
          <View className="flex-row items-center gap-2">
            <SpeakButton text={data.literal} lang="ja" />
            <IconButton
              icon={<Copy size={16} color={theme.colors.textMuted} />}
              accessibilityLabel={t("dict.copyKanji")}
              onPress={() => {
                copyText(data.literal);
                show(t("dict.lookupCopied"), { type: "success" });
              }}
              size="sm"
              variant="outline"
              testID="kanji-copy"
            />
          </View>
        </View>
      </View>

      {/* Chips thông tin */}
      <View className="flex-row flex-wrap items-center gap-2">
        {data.stroke_count != null ? (
          <Chip>{t("dict.strokes", { count: data.stroke_count })}</Chip>
        ) : null}
        {jlpt != null ? <Chip>{t("dict.jlptLevel", { level: jlpt })}</Chip> : null}
        {data.grade != null ? <Chip>{t("dict.grade", { grade: data.grade })}</Chip> : null}
        {data.frequency_rank != null ? (
          <Chip>{t("dict.frequency", { rank: data.frequency_rank })}</Chip>
        ) : null}
      </View>

      {/* Thứ tự nét — component tự ẩn nếu không có dữ liệu */}
      <KanjiStrokePlayer literal={data.literal} />

      {/* Âm đọc */}
      <View className="gap-2">
        <SectionHeader title={t("dict.sectionPronunciation")} />
        {readings.kun.length > 0 || readings.on.length > 0 || nanori.length > 0 ? (
          <View className="gap-2">
            <ReadingLine label={t("common.readingKun")} values={readings.kun} testID="kun" />
            <ReadingLine label={t("common.readingOn")} values={readings.on} testID="on" />
            <ReadingLine label={t("common.readingNanori")} values={nanori} testID="nanori" />
          </View>
        ) : (
          <AppText variant="caption">{t("dict.readingsEmpty")}</AppText>
        )}
      </View>

      {/* Nghĩa (dữ liệu KanjiDict trả tiếng Anh) */}
      {meanings.length > 0 ? (
        <View className="gap-2">
          <SectionHeader title={t("dict.sectionMeaning")} />
          {meanings.map(meaning => (
            <AppText key={meaning} variant="body" selectable>{`• ${meaning}`}</AppText>
          ))}
        </View>
      ) : null}

      {/* Bộ thủ */}
      {data.radical?.char ? (
        <View className="gap-2">
          <SectionHeader title={t("dict.radical")} />
          <Card className="flex-row items-center gap-3">
            <View
              className="h-[48px] w-[48px] items-center justify-center rounded-md border border-border bg-background"
            >
              <AppText size="xl" weight="semibold">
                {data.radical.char}
              </AppText>
            </View>
            <View className="flex-1">
              <AppText variant="body" weight="medium">
                {data.radical.name_vi ?? `${t("dict.radical")} ${data.radical.char}`}
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

      {/* Phân tích: đồ thị thành phần + cây KanjiVG (fallback KRADFILE) — chạm node mở chữ đó */}
      <KanjiBreakdown
        literal={data.literal}
        tree={data.components ?? null}
        parts={data.parts ?? []}
        radical={data.radical?.char ?? null}
        onOpenKanji={char => navigation.push("KanjiDetail", { literal: char })}
      />

      {/* Số từ đang dùng chữ này (mirror web "kanjiUsedIn") */}
      <View className="gap-2">
        <SectionHeader title={t("dict.kanjiUsedIn")} />
        <AppText variant={data.used_in_forms > 0 ? "body" : "caption"} testID="kanji-used-in-forms">
          {data.used_in_forms > 0
            ? t("dict.usedInForms", { count: data.used_in_forms })
            : t("dict.noForms")}
        </AppText>
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

/** Một dòng âm đọc (Kun/On/Nanori); không có giá trị thì không hiện. */
function ReadingLine({ label, values, testID }: { label: string; values: string[]; testID: string }) {
  if (values.length === 0) return null;
  return (
    <View className="flex-row items-start gap-3" testID={`kanji-reading-${testID}`}>
      <AppText variant="label" color="muted" className="w-[76px]">
        {label}
      </AppText>
      <AppText variant="body" className="flex-1" selectable>
        {values.join(" ; ")}
      </AppText>
    </View>
  );
}
