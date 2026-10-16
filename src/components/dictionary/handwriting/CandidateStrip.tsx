import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import type { KanjiCandidate } from "@/lib/kanji-ink";
import { radius, spacing, useTheme } from "@/theme";

/** Cạnh một ô gợi ý (nhỏ gọn như bản web). */
export const CANDIDATE_SIZE = 40;

export interface CandidateStripProps {
  candidates: KanjiCandidate[];
  onPick: (char: string) => void;
}

/**
 * Hàng gợi ý nhỏ cuộn ngang phía trên khung vẽ (mirror web): ô đầu viền primary = khả năng cao nhất.
 * Luôn chừa đúng chiều cao một hàng để khung vẽ không nhảy khi gợi ý xuất hiện.
 */
export function CandidateStrip({ candidates, onPick }: CandidateStripProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <View style={styles.strip} testID="handwriting-candidates">
      {candidates.length === 0 ? (
        <AppText variant="caption" center>
          {t("dict.inkHint")}
        </AppText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {candidates.map((candidate, index) => (
            <Pressable
              key={`${candidate.char}-${index}`}
              testID={`handwriting-candidate-${index}`}
              onPress={() => onPick(candidate.char)}
              accessibilityRole="button"
              accessibilityLabel={candidate.char}
              accessibilityHint={t("dict.confidence", { percent: (candidate.score * 100).toFixed(1) })}
              className="active:opacity-85"
              style={[
                styles.candidate,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: index === 0 ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <AppText size="lg" weight="semibold">
                {candidate.char}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { height: CANDIDATE_SIZE, justifyContent: "center" },
  row: { gap: spacing.sm, alignItems: "center" },
  candidate: {
    width: CANDIDATE_SIZE,
    height: CANDIDATE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
