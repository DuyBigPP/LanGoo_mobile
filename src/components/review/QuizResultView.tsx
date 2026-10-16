import React from "react";
import { StyleSheet, View } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { AppText, Button, Card, Chip, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import type { QuizItem } from "./quiz-model";

export interface QuizResultViewProps {
  kind: string;
  /** Điểm 0–100 (null khi chưa có). */
  score: number | null | undefined;
  correctCount: number;
  itemCount: number;
  abandoned: boolean;
  wrongItems: QuizItem[];
  wrongLoading: boolean;
  onBack: () => void;
  onNewSession: () => void;
  onBackToDictionary: () => void;
}

/** Kết quả phiên (đã chốt): loại bài, điểm, số câu đúng, các câu sai (mirror web SessionSummary). */
export function QuizResultView({
  kind,
  score,
  correctCount,
  itemCount,
  abandoned,
  wrongItems,
  wrongLoading,
  onBack,
  onNewSession,
  onBackToDictionary,
}: QuizResultViewProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <Screen
      title={t("review.summaryTitle")}
      onBack={onBack}
      scroll
      contentStyle={styles.content}
      testID="quiz-result"
    >
      <Card>
        <Chip>
          {kind === "quiz"
            ? t("review.kindQuiz")
            : kind === "practice"
              ? t("review.kindPractice")
              : t("review.kindReview")}
        </Chip>
        <View style={styles.scoreCell}>
          <AppText variant="caption">{t("review.score")}</AppText>
          <AppText variant="title">
            {score != null ? `${Math.round(score)} ${t("review.scoreUnit")}` : "—"}
          </AppText>
        </View>
        <View style={styles.scoreCell}>
          <AppText variant="title" testID="quiz-result-score">
            {`${correctCount}/${itemCount}`}
          </AppText>
          <AppText variant="caption">{t("review.correctCount")}</AppText>
        </View>
        {abandoned ? <AppText variant="caption">{t("review.abandonedNote")}</AppText> : null}
      </Card>

      <Card>
        <SectionHeader title={t("review.wrongAnswers")} count={wrongItems.length} />
        {wrongLoading ? (
          <View style={styles.wrongLoading}>
            <Skeleton height={16} width="70%" />
            <Skeleton height={16} width="50%" />
          </View>
        ) : wrongItems.length === 0 ? (
          <View style={styles.noWrong}>
            <CheckCircle2 size={18} color={theme.colors.primary} />
            <AppText variant="caption">{t("review.noWrong")}</AppText>
          </View>
        ) : (
          wrongItems.map(item => (
            <View key={item.id} style={styles.wrongRow}>
              <View style={styles.wrongInfo}>
                <AppText variant="body" weight="semibold" numberOfLines={2}>
                  {item.promptText}
                </AppText>
                <AppText variant="caption">
                  {`${t("review.correctAnswer")} ${item.correctAnswer || t("common.notAvailable")}`}
                </AppText>
              </View>
              <XCircle size={16} color={theme.colors.danger} />
            </View>
          ))
        )}
      </Card>

      <Button
        label={t("review.newSession")}
        variant="outline"
        onPress={onNewSession}
        fullWidth
        testID="quiz-back-collections"
      />
      <Button
        label={t("review.backToDictionary")}
        onPress={onBackToDictionary}
        fullWidth
        testID="quiz-back-dictionary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  scoreCell: { gap: spacing.xs },
  wrongLoading: { gap: spacing.sm },
  noWrong: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  wrongRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  wrongInfo: { flex: 1, gap: 2 },
});
