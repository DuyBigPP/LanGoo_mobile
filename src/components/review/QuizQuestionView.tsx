import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Shuffle } from "lucide-react-native";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Button, Input } from "@/components/ui";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";
import { QuizContextSentence } from "./QuizContextSentence";
import type { QuestionPayload, QuizItem } from "./quiz-model";

export interface QuizQuestionViewProps {
  item: QuizItem;
  submitting: boolean;
  disabled: boolean;
  onSubmit: (payload: QuestionPayload) => void;
  onLookup: (char: string, index: number) => void;
}

/** Đề bài một câu: trắc nghiệm (nút chọn), điền từ (ô nhập) hoặc ghép cặp. */
export function QuizQuestionView({
  item,
  submitting,
  disabled,
  onSubmit,
  onLookup,
}: QuizQuestionViewProps) {
  const t = useT();
  const theme = useTheme();
  const [typed, setTyped] = React.useState("");
  const [selectedLeft, setSelectedLeft] = React.useState<number | null>(null);
  const [pairs, setPairs] = React.useState<Record<number, number>>({});

  const isMatching = item.kind === "matching";
  const isTyping =
    !isMatching &&
    (item.kind === "typing" || item.kind === "fill_blank" || item.options.length === 0);
  const isChoice = !isMatching && !isTyping;

  const hint = isChoice
    ? t("review.pickAnswer")
    : isTyping
      ? t("review.typeAnswer")
      : t("review.matchHint");

  // Ngữ cảnh: v2 trả `target: {start,end,text}`; M11.1 cũ trả phẳng `start`/`end`
  const contextSentence = item.context?.sentence?.trim() ?? "";
  const contextStart = item.context?.target?.start ?? item.context?.start ?? null;
  const contextEnd = item.context?.target?.end ?? item.context?.end ?? null;
  // Câu ngữ cảnh đã nằm trong đề bài (câu điền từ) thì không render lần hai
  const showContext = contextSentence.length > 0 && !item.promptText.includes(contextSentence);
  const contextSource = item.context?.attribution || item.context?.source || "";

  const usedRights = new Set(Object.values(pairs));
  const paired = item.left.filter(left => pairs[left.index] != null).length;
  const complete = item.left.length > 0 && paired === item.left.length;

  const handlePickRight = (rightIndex: number) => {
    if (selectedLeft == null) return;
    setPairs(previous => {
      const next: Record<number, number> = {};
      for (const [left, right] of Object.entries(previous)) {
        if (Number(right) !== rightIndex) next[Number(left)] = Number(right);
      }
      next[selectedLeft] = rightIndex;
      return next;
    });
    setSelectedLeft(null);
  };

  return (
    <View style={styles.question}>
      <View style={styles.head}>
        <Shuffle size={14} color={theme.colors.textMuted} />
        <AppText variant="caption">{hint}</AppText>
      </View>
      <View style={styles.promptRow}>
        <AppText variant="title" center testID="quiz-question" style={styles.promptText}>
          {item.promptText}
        </AppText>
        {item.promptText.trim() ? (
          <SpeakButton text={item.promptText} lang="ja" size="sm" testID="quiz-speak" />
        ) : null}
      </View>

      {showContext ? (
        <View
          style={[
            styles.context,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
          testID="quiz-context"
        >
          <QuizContextSentence
            sentence={contextSentence}
            start={contextStart}
            end={contextEnd}
            onLookup={onLookup}
          />
          {item.context?.origin === "generated" ? (
            <AppText variant="caption" size="xs" center>
              {t("review.contextAiGenerated")}
            </AppText>
          ) : item.context?.origin === "dictionary" && contextSource ? (
            <AppText variant="caption" size="xs" center>
              {t("review.contextSource", { source: contextSource })}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {isChoice ? (
        <View style={styles.options}>
          {item.options.map(option => (
            <Button
              key={option.index}
              label={`${String.fromCharCode(65 + option.index)}. ${option.text}`}
              variant="outline"
              fullWidth
              onPress={() => onSubmit({ option_index: option.index })}
              disabled={disabled || submitting}
              style={styles.optionButton}
              testID={`quiz-option-${option.index}`}
            />
          ))}
        </View>
      ) : null}

      {isTyping ? (
        <View style={styles.typingRow}>
          <Input
            value={typed}
            onChangeText={setTyped}
            placeholder={t("review.typingQuizPlaceholder")}
            maxLength={200}
            testID="quiz-answer"
            style={styles.typingInput}
          />
          <Button
            label={t("review.check")}
            onPress={() => {
              if (typed.trim()) onSubmit({ answer_text: typed.trim() });
            }}
            disabled={!typed.trim() || disabled || submitting}
            testID="quiz-answer-submit"
          />
        </View>
      ) : null}

      {isMatching ? (
        <View style={styles.matching}>
          <View style={styles.matchGrid}>
            <View style={styles.matchColumn}>
              {item.left.map(left => {
                const chosenText = item.right.find(right => right.index === pairs[left.index])
                  ?.text;
                return (
                  <Button
                    key={left.index}
                    label={chosenText ? `${left.text} → ${chosenText}` : left.text}
                    variant={selectedLeft === left.index ? "secondary" : "outline"}
                    size="sm"
                    onPress={() => setSelectedLeft(left.index)}
                    disabled={disabled || submitting}
                    style={styles.matchButton}
                    testID={`quiz-match-left-${left.index}`}
                  />
                );
              })}
            </View>
            <View style={styles.matchColumn}>
              {item.right.map(right => (
                <Button
                  key={right.index}
                  label={right.text}
                  variant={usedRights.has(right.index) ? "secondary" : "outline"}
                  size="sm"
                  onPress={() => handlePickRight(right.index)}
                  disabled={disabled || submitting || selectedLeft == null}
                  style={styles.matchButton}
                  testID={`quiz-match-right-${right.index}`}
                />
              ))}
            </View>
          </View>
          <View style={styles.matchFooter}>
            <AppText variant="caption">
              {t("review.matched", { done: paired, total: item.left.length })}
            </AppText>
            <View style={styles.matchActions}>
              <Button
                label={t("review.reset")}
                variant="ghost"
                size="sm"
                onPress={() => {
                  setPairs({});
                  setSelectedLeft(null);
                }}
                disabled={disabled || submitting || paired === 0}
              />
              <Button
                label={t("review.check")}
                size="sm"
                onPress={() =>
                  onSubmit({
                    pairs: item.left.map(left => ({
                      left_index: left.index,
                      right_index: pairs[left.index],
                    })),
                  })
                }
                disabled={!complete || disabled || submitting}
                testID="quiz-answer"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  question: { gap: spacing.md },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  promptText: { flexShrink: 1 },
  context: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  options: { gap: spacing.sm },
  optionButton: { justifyContent: "flex-start" },
  typingRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  typingInput: { flex: 1 },
  matching: { gap: spacing.md },
  matchGrid: { flexDirection: "row", gap: spacing.sm },
  matchColumn: { flex: 1, gap: spacing.sm },
  matchButton: { alignSelf: "stretch" },
  matchFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  matchActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
