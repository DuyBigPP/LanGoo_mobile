import { StyleSheet, View } from "react-native";
import { Flag } from "lucide-react-native";
import { dictionaryLanguage, glossSpeakLang } from "@/components/dictionary/dictionary-language";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Badge, IconButton, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
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
      <View style={styles.section}>
        <SectionHeader title={t("dict.sectionMeaning")} />
        <AppText variant="caption">{t("dict.lookupNoMeaning")}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={t("dict.sectionMeaning")} />
      <View style={styles.list}>
        {glosses.map(gloss => {
          const language = dictionaryLanguage(gloss.language_id);
          const speakLang = glossSpeakLang(gloss.language_id);
          return (
            <View key={gloss.id} style={styles.row} testID={`gloss-${gloss.id}`}>
              <AppText variant="caption" style={styles.rank}>
                {gloss.rank}
              </AppText>
              <View style={styles.body}>
                <AppText variant="body" weight="medium">
                  {gloss.text}
                </AppText>
                <View style={styles.badgeRow}>
                  {gloss.reviewed ? <Badge>{t("dict.reviewed")}</Badge> : null}
                  {language ? (
                    <AppText size="xs" color="muted" style={styles.langCode}>
                      {language.code}
                    </AppText>
                  ) : null}
                </View>
                {gloss.detail ? <AppText variant="caption">{gloss.detail}</AppText> : null}
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

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  rank: { width: 16, marginTop: 2 },
  body: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  langCode: { textTransform: "uppercase", letterSpacing: 0.6 },
});
