import * as React from "react";
import { View } from "react-native";
import { Shuffle } from "lucide-react-native";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Button, Input } from "@/components/ui";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
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
    <View className="gap-3">
      <View className="flex-row items-center justify-center gap-1">
        <Shuffle size={14} color={theme.colors.textMuted} />
        <AppText variant="caption">{hint}</AppText>
      </View>
      <View className="flex-row items-center justify-center gap-2">
        <AppText variant="title" center testID="quiz-question" className="shrink">
          {item.promptText}
        </AppText>
        {item.promptText.trim() ? (
          <SpeakButton text={item.promptText} lang="ja" size="sm" testID="quiz-speak" />
        ) : null}
      </View>

      {showContext ? (
        <View
          className="gap-1 rounded-md border border-border bg-background px-3 py-2"
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
        <View className="gap-2">
          {item.options.map(option => (
            <Button
              key={option.index}
              label={`${String.fromCharCode(65 + option.index)}. ${option.text}`}
              variant="outline"
              fullWidth
              onPress={() => onSubmit({ option_index: option.index })}
              disabled={disabled || submitting}
              className="justify-start"
              testID={`quiz-option-${option.index}`}
            />
          ))}
        </View>
      ) : null}

      {isTyping ? (
        <View className="flex-row items-start gap-2">
          <Input
            value={typed}
            onChangeText={setTyped}
            placeholder={t("review.typingQuizPlaceholder")}
            maxLength={200}
            testID="quiz-answer"
            className="flex-1"
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
        <View className="gap-3">
          <View className="flex-row gap-2">
            <View className="flex-1 gap-2">
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
                    className="self-stretch"
                    testID={`quiz-match-left-${left.index}`}
                  />
                );
              })}
            </View>
            <View className="flex-1 gap-2">
              {item.right.map(right => (
                <Button
                  key={right.index}
                  label={right.text}
                  variant={usedRights.has(right.index) ? "secondary" : "outline"}
                  size="sm"
                  onPress={() => handlePickRight(right.index)}
                  disabled={disabled || submitting || selectedLeft == null}
                  className="self-stretch"
                  testID={`quiz-match-right-${right.index}`}
                />
              ))}
            </View>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <AppText variant="caption">
              {t("review.matched", { done: paired, total: item.left.length })}
            </AppText>
            <View className="flex-row items-center gap-2">
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
