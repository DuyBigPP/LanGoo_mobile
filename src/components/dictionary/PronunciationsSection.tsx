import { View } from "react-native";
import { AppText, Chip, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import type { SenseDetailDto } from "@/types/dictionary";

/** Một cách đọc của từ (mirror SensePronunciationDto bên web). */
export type SensePronunciationItem = SenseDetailDto["pronunciations"][number];

export interface PronunciationsSectionProps {
  pronunciations: SensePronunciationItem[];
}

/**
 * Khối "Phát âm" của từ (mirror PronunciationsSection bên web):
 * chip /IPA/ kèm nhãn vùng miền; có dòng nhưng thiếu dữ liệu thì báo chưa có.
 * Web không có nút loa ở đây nên bản mobile cũng không thêm.
 */
export function PronunciationsSection({ pronunciations }: PronunciationsSectionProps) {
  const t = useT();

  if (pronunciations.length === 0) return null;

  const hasData = pronunciations.some(item => item.ipa || item.dialect);

  return (
    <View className="gap-2" testID="sense-pronunciations">
      <SectionHeader title={t("dict.sectionPronunciation")} />
      {hasData ? (
        <View className="flex-row flex-wrap items-center gap-2">
          {pronunciations.map(pronunciation => (
            <Chip key={pronunciation.id}>
              {pronunciation.ipa ? (
                <AppText size="sm">{`/${pronunciation.ipa}/`}</AppText>
              ) : null}
              {pronunciation.dialect ? (
                <AppText size="xs" color="muted" className="uppercase tracking-[0.6px]">
                  {pronunciation.dialect}
                </AppText>
              ) : null}
            </Chip>
          ))}
        </View>
      ) : (
        <AppText variant="caption">{t("dict.noPronunciation")}</AppText>
      )}
    </View>
  );
}
