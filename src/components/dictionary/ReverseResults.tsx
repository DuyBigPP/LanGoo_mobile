import { View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { AppText, Badge, Button, Card, SectionHeader, Skeleton } from "@/components/ui";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { useReverseLookup } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import type { ReverseJaHitDto } from "@/types/dictionary";

interface ReverseResultsProps {
  query: string;
  /** Chạm một từ Nhật -> tra xuôi từ đó. */
  onPickJa: (text: string) => void;
}

/** Kết quả tra ngược Việt → Nhật, hiện inline trong tab Tra từ (endpoint công khai, guest dùng được). */
export function ReverseResults({ query, onPickJa }: ReverseResultsProps) {
  const t = useT();
  const reverse = useReverseLookup(query, query.length > 0);
  const hits = reverse.data?.ja ?? [];

  if (reverse.isPending) {
    return (
      <Card testID="reverse-loading">
        <View className="gap-3">
          {[0, 1, 2].map(index => (
            <View key={index} className="gap-2 py-1">
              <Skeleton height={18} width="40%" />
              <Skeleton height={12} width="65%" />
            </View>
          ))}
        </View>
      </Card>
    );
  }
  if (reverse.isError) {
    return (
      <Card>
        <View className="items-center gap-3">
          <AppText variant="caption" center>
            {t("dict.loadError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void reverse.refetch()}
          />
        </View>
      </Card>
    );
  }
  if (hits.length === 0) {
    return (
      <Card testID="reverse-no-results">
        <AppText variant="caption" center>
          {t("dict.reverseEmpty", { query })}
        </AppText>
      </Card>
    );
  }
  return (
    <View className="gap-2" testID="reverse-results">
      <SectionHeader title={t("dict.reverseJa")} count={hits.length} />
      <View className="gap-3">
        {hits.map((hit, index) => (
          <ReverseJaRow
            key={`${hit.text}-${index}`}
            hit={hit}
            index={index}
            onPress={() => onPickJa(hit.text)}
          />
        ))}
      </View>
    </View>
  );
}

interface ReverseJaRowProps {
  hit: ReverseJaHitDto;
  index: number;
  onPress: () => void;
}

/** Một từ tiếng Nhật tra được — chạm để tra xuôi từ đó. */
function ReverseJaRow({ hit, index, onPress }: ReverseJaRowProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${hit.text}, ${t("dict.detailTitle")}`}
      testID={`reverse-ja-${index}`}
    >
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <AppText size="lg" weight="semibold" numberOfLines={1} className="flex-1">
            {hit.text}
          </AppText>
          {hit.exact_sense ? (
            <View className="self-center">
              <Badge tone="success">{t("dict.reverseExact")}</Badge>
            </View>
          ) : null}
          <SpeakButton text={hit.text} lang="ja" size="sm" testID={`reverse-speak-${index}`} />
          <ArrowUpRight size={14} color={theme.colors.textMuted} />
        </View>
        {hit.via_lemma ? (
          <AppText variant="caption">{t("dict.reverseVia", { lemma: hit.via_lemma })}</AppText>
        ) : null}
        {hit.sense_hint ? (
          <AppText variant="caption" color="muted">
            {hit.sense_hint}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
