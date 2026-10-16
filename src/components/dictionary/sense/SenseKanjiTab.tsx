import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { KanjiDetailContent } from "@/components/dictionary/KanjiDetailContent";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";

export interface SenseKanjiTabProps {
  /** Các chữ Hán có trong từ. */
  chars: string[];
  active: string;
  onSelect: (char: string) => void;
  onSearchWords: (char: string) => void;
}

/** Tab Hán tự: chọn chữ (khi có nhiều chữ) + chi tiết chữ Hán đang chọn. */
export function SenseKanjiTab({ chars, active, onSelect, onSearchWords }: SenseKanjiTabProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <>
      {/* Nhiều chữ Hán -> cho chọn chữ đang xem (như web) */}
      {chars.length > 1 ? (
        <View style={styles.picker}>
          <AppText variant="caption">{t("dict.chooseKanji")}</AppText>
          <View style={styles.pickerRow}>
            {chars.map(char => {
              const selected = active === char;
              return (
                <Pressable
                  key={char}
                  onPress={() => onSelect(char)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`sense-kanji-${char}`}
                  style={[
                    styles.choice,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                    },
                  ]}
                >
                  <AppText
                    size="lg"
                    weight="semibold"
                    style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}
                  >
                    {char}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <KanjiDetailContent literal={active} onSearchWords={() => onSearchWords(active)} />
    </>
  );
}

const styles = StyleSheet.create({
  picker: { gap: spacing.sm },
  pickerRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 10,
  },
});
