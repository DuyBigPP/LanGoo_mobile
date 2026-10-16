import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { cn } from "@/lib/utils";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import type { KanjiCandidate } from "@/lib/kanji-ink";

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

  return (
    <View className="h-10 justify-center" testID="handwriting-candidates">
      {candidates.length === 0 ? (
        <AppText variant="caption" center>
          {t("dict.inkHint")}
        </AppText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-2"
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
              className={cn(
                "h-10 w-10 items-center justify-center rounded-md border bg-card active:opacity-85",
                index === 0 ? "border-primary" : "border-border",
              )}
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
