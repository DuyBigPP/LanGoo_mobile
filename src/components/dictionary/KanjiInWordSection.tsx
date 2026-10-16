import { Pressable, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { AppText, Card, Divider, SectionHeader } from "@/components/ui";
import { useKanji } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { kanjiReadings } from "@/lib/kanji";
import { useTheme } from "@/theme";

export interface KanjiInWordSectionProps {
  /** Từ đang xem — dùng cho tiêu đề "Chữ Hán trong {surface}" */
  surface: string;
  /** Các chữ Hán có trong từ (đã lọc trùng) */
  chars: string[];
  /** Bấm "Xem chi tiết hơn" -> mở tab Hán tự với chữ này. */
  onOpenKanji: (char: string) => void;
}

/**
 * Khối "Chữ Hán trong {từ}" (mirror cột phụ bên web): mỗi chữ một dòng gọn
 * kèm Hán–Việt, âm On, số nét và lối mở thẳng tab Hán tự.
 */
export function KanjiInWordSection({ surface, chars, onOpenKanji }: KanjiInWordSectionProps) {
  const t = useT();

  if (chars.length === 0) return null;

  return (
    <View className="gap-2" testID="kanji-of-word">
      <SectionHeader title={t("dict.kanjiIn", { surface })} />
      <Card padded={false}>
        {chars.map((char, index) => (
          <View key={char}>
            {index > 0 ? <Divider /> : null}
            <KanjiInWordRow literal={char} onOpen={() => onOpenKanji(char)} />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Một chữ Hán trong từ — dữ liệu lấy từ cache chung với tab Hán tự. */
function KanjiInWordRow({ literal, onOpen }: { literal: string; onOpen: () => void }) {
  const t = useT();
  const theme = useTheme();
  const kanji = useKanji(literal);
  const data = kanji.data;
  const readings = kanjiReadings(data);
  // Web hiện "On …" + số nét; mobile dùng nhãn i18n cho rõ nghĩa
  const details = [
    readings.on.length > 0 ? `${t("common.readingOn")} ${readings.on.join("、")}` : null,
    data?.stroke_count != null ? t("dict.strokes", { count: data.stroke_count }) : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <View className="flex-row items-start gap-3 p-3" testID={`kanji-in-word-${literal}`}>
      <View className="h-12 w-12 items-center justify-center rounded-md border border-border bg-background">
        <AppText size="xl" weight="semibold">
          {literal}
        </AppText>
      </View>
      <View className="flex-1">
        {readings.vietnam.length > 0 ? (
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {`「${readings.vietnam.join(", ")}」`}
          </AppText>
        ) : null}
        {details.length > 0 ? (
          <AppText variant="caption" numberOfLines={1}>
            {details.join(" · ")}
          </AppText>
        ) : null}
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t("dict.seeMore")}
          testID={`kanji-in-word-open-${literal}`}
          className="mt-1 flex-row items-center gap-1 active:opacity-70"
        >
          <AppText variant="caption" color="primary" weight="medium">
            {t("dict.seeMore")}
          </AppText>
          <ArrowRight size={12} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
