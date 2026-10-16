import { View } from "react-native";
import { Flag } from "lucide-react-native";
import { dictionaryLanguage, glossSpeakLang } from "@/components/dictionary/dictionary-language";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Badge, IconButton, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import type { SenseGlossDto } from "@/types/dictionary";

export interface GlossesSectionProps {
  /** Nghĩa của từ — đã sắp xếp sẵn (tiếng Việt lên đầu, sau đó theo rank) như màn hình. */
  glosses: SenseGlossDto[];
  /** Bấm cờ để báo lỗi nghĩa này (mở sheet báo lỗi). */
  onReport: (gloss: SenseGlossDto) => void;
}

/**
 * Khối "Nghĩa" trong chi tiết nghĩa (mirror GlossesSection bên web):
 * số thứ tự + nội dung + huy hiệu duyệt + mã ngôn ngữ + loa đọc + nút báo lỗi.
 */
export function GlossesSection({ glosses, onReport }: GlossesSectionProps) {
  const t = useT();
  const theme = useTheme();

  if (glosses.length === 0) {
    return (
      <View className="gap-2">
        <SectionHeader title={t("dict.sectionMeaning")} />
        <AppText variant="caption">{t("dict.lookupNoMeaning")}</AppText>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <SectionHeader title={t("dict.sectionMeaning")} />
      <View className="gap-2">
        {glosses.map(gloss => {
          const language = dictionaryLanguage(gloss.language_id);
          const speakLang = glossSpeakLang(gloss.language_id);
          return (
            <View key={gloss.id} className="flex-row items-start gap-2" testID={`gloss-${gloss.id}`}>
              <AppText variant="caption" className="mt-0.5 w-4">
                {gloss.rank}
              </AppText>
              <View className="flex-1 gap-0.5">
                <AppText variant="body" weight="medium" selectable>
                  {gloss.text}
                </AppText>
                <View className="flex-row flex-wrap items-center gap-1">
                  {gloss.reviewed ? <Badge>{t("dict.reviewed")}</Badge> : null}
                  {language ? (
                    <AppText size="xs" color="muted" className="uppercase tracking-[0.6px]">
                      {language.code}
                    </AppText>
                  ) : null}
                </View>
                {gloss.detail ? (
                  <AppText variant="caption" selectable>
                    {gloss.detail}
                  </AppText>
                ) : null}
              </View>
              {/* Loa đọc từng gloss theo ngôn ngữ của gloss (như bản web) */}
              {speakLang ? <SpeakButton text={gloss.text} lang={speakLang} size="sm" /> : null}
              <IconButton
                icon={<Flag size={14} color={theme.colors.textMuted} />}
                onPress={() => onReport(gloss)}
                accessibilityLabel={t("dict.reportAria")}
                size="sm"
                variant="ghost"
                testID={`gloss-report-${gloss.id}`}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
