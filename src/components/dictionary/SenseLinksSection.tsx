import { Pressable, StyleSheet, View } from "react-native";
import { dictionaryLanguage } from "@/components/dictionary/dictionary-language";
import { AppText, Chip, Flag, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing } from "@/theme";
import type { SenseLinkDto } from "@/types/dictionary";

export interface SenseLinksSectionProps {
  links: SenseLinkDto[];
  /** Chọn một liên kết -> xem nghĩa tương ứng (đổi nghĩa đang xem). */
  onSelect: (senseId: string) => void;
}

/**
 * Khối "Liên kết nghĩa khác ngôn ngữ" (mirror LinksSection bên web):
 * mỗi liên kết là một chip cờ + từ + cách đọc, bấm để nhảy sang nghĩa đó.
 */
export function SenseLinksSection({ links, onSelect }: SenseLinksSectionProps) {
  const t = useT();

  if (links.length === 0) return null;

  return (
    <View style={styles.section} testID="sense-links">
      <SectionHeader title={t("dict.sectionLinks")} />
      <View style={styles.chipRow}>
        {links.map(link => {
          const language = dictionaryLanguage(link.language_id);
          return (
            <Pressable
              key={link.sense_id}
              onPress={() => onSelect(link.sense_id)}
              accessibilityRole="button"
              accessibilityLabel={link.lemma}
              testID={`sense-link-${link.sense_id}`}
              className="active:opacity-70"
            >
              <Chip>
                {language ? <Flag code={language.flagCode} size="sm" /> : null}
                <AppText variant="body" weight="medium">
                  {link.lemma}
                </AppText>
                {link.reading && link.reading !== link.lemma ? (
                  <AppText variant="caption">{link.reading}</AppText>
                ) : null}
              </Chip>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chipRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  pressed: { opacity: 0.7 },
});
