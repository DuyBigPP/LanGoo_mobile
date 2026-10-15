import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2, Shuffle, XCircle } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { LookupText } from "@/components/domain/LookupText";
import { SpeakButton } from "@/components/domain/SpeakButton";
import {
  AppText,
  Button,
  Card,
  Input,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useAnswerMutation,
  useFinishMutation,
  useSessionQuery,
  useSessionWrongItemsQuery,
} from "@/hooks/use-sessions";
import { useLookupSheet } from "@/hooks/use-lookup-sheet";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";
import type { QuizContextDto, SessionItemDto, SessionQuizPromptDto } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "QuizSession">;

const MAX_ELAPSED_MS = 3_600_000;

/** View-model gọn cho màn hình — chuẩn hoá từ SessionItemDto (word prompt / quiz prompt). */
interface QuizItem {
  id: string;
  ordinal: number;
  kind: string;
  promptText: string;
  options: { text: string; index: number }[];
  left: { text: string; index: number }[];
  right: { text: string; index: number }[];
  /** M11.1: câu ngữ cảnh kèm vị trí từ khoá (v2: `target`, cũ: phẳng `start/end`) */
  context: QuizContextDto | null;
  answered: boolean;
  correctAnswer: string;
}

function toQuizItem(item: SessionItemDto): QuizItem {
  const prompt = item.prompt;
  // Word prompt có `question`, quiz prompt có `text` — phân biệt bằng `in`
  const wordPrompt = "question" in prompt ? prompt : null;
  const quizPrompt = wordPrompt ? null : (prompt as SessionQuizPromptDto);
  const options = (wordPrompt ? wordPrompt.options : quizPrompt?.options) ?? [];
  // Ghép cặp: BE cũ trả `left/right`, v2 có thể chỉ trả `options[].side`
  const quizOptions = quizPrompt?.options ?? [];
  const left = quizPrompt?.left ?? quizOptions.filter(option => option.side === "left");
  const right = quizPrompt?.right ?? quizOptions.filter(option => option.side === "right");
  const answer = item.correct_answer;

  return {
    id: item.id,
    ordinal: item.ordinal,
    kind: wordPrompt ? wordPrompt.kind : (quizPrompt?.kind ?? "multiple_choice"),
    promptText: wordPrompt ? wordPrompt.question.text : (quizPrompt?.text ?? ""),
    options,
    left,
    right,
    context: quizPrompt?.context ?? null,
    answered: Boolean(item.answered_at),
    correctAnswer: answer?.text ?? answer?.accepted?.join(" / ") ?? "",
  };
}

interface QuestionPayload {
  option_index?: number;
  answer_text?: string;
  pairs?: { left_index: number; right_index: number }[];
}

/**
 * Phiên quiz AI (mirror web SessionPlayer + QuizPromptCard/SessionPromptCard):
 * trả lời từng câu, chấm ở server, xem đúng/sai rồi tiếp tục; hết câu -> tự chốt phiên.
 */
export function QuizSessionScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { openLookup, lookupSheet } = useLookupSheet();

  const session = useSessionQuery(sessionId);
  const answer = useAnswerMutation(sessionId);
  const finish = useFinishMutation(sessionId);

  const data = session.data;
  const completed =
    data?.session.status === "completed" || data?.session.status === "abandoned";
  const wrongItems = useSessionWrongItemsQuery(sessionId, completed);

  const [feedback, setFeedback] = React.useState<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  // Thẻ bị máy chủ tạm nghỉ (burying) — bỏ qua, không trả lời được trong phiên này
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [answeredCount, setAnsweredCount] = React.useState(0);
  const startRef = React.useRef(Date.now());
  const initializedSessionRef = React.useRef<string | null>(null);

  const items = React.useMemo(() => (data?.items ?? []).map(toQuizItem), [data?.items]);
  const current = items.find(item => !item.answered && !skipped.has(item.id)) ?? null;
  const settled = items.length > 0 && items.every(item => item.answered || skipped.has(item.id));

  // Tiến độ lấy từ server một lần cho mỗi phiên
  React.useEffect(() => {
    const id = data?.session.id;
    if (!id || initializedSessionRef.current === id) return;
    initializedSessionRef.current = id;
    setAnsweredCount(data?.session.answered_count ?? 0);
  }, [data?.session]);

  // Mỗi câu mới -> đếm lại thời gian trả lời
  React.useEffect(() => {
    startRef.current = Date.now();
  }, [current?.id]);

  // Không còn câu trả lời được mà phiên chưa chốt -> tự kết thúc (mirror web)
  React.useEffect(() => {
    if (!data || !settled || data.session.status !== "in_progress") return;
    if (finish.isPending || finish.isSuccess) return;
    finish.mutate();
  }, [data, settled, finish]);

  const handleSubmit = (payload: QuestionPayload) => {
    if (!current || answer.isPending || feedback) return;
    const itemId = current.id;
    answer.mutate(
      {
        ordinal: current.ordinal,
        ...payload,
        elapsed_ms: Math.min(Date.now() - startRef.current, MAX_ELAPSED_MS),
      },
      {
        onSuccess: result => {
          // useAnswerMutation đã vá cache (thay item đã chấm + session mới)
          setAnsweredCount(result.session.answered_count);
          setFeedback({
            isCorrect: result.item.is_correct ?? false,
            correctAnswer:
              result.item.correct_answer?.text ??
              result.item.correct_answer?.accepted?.join(" / ") ??
              "",
          });
        },
        onError: error => {
          const apiError = ApiError.from(error);
          if (apiError.code === "SRS_ITEM_UNAVAILABLE") {
            setSkipped(previous => new Set(previous).add(itemId));
            show(t("review.skippedCardLong"), { type: "info" });
          } else {
            show(apiError.message, { type: "error" });
          }
        },
      },
    );
  };

  const goToCollections = () => navigation.navigate("Tabs", { screen: "Collections" });

  if (session.isPending) {
    return (
      <Screen
        title={t("review.sessionTitle")}
        onBack={() => navigation.goBack()}
        contentStyle={styles.content}
        testID="quiz-session"
      >
        <View style={styles.loading}>
          <Skeleton height={20} width="40%" />
          <Skeleton height={140} />
        </View>
      </Screen>
    );
  }

  if (session.isError || !data) {
    return (
      <Screen
        title={t("review.sessionTitle")}
        onBack={() => navigation.goBack()}
        contentStyle={styles.content}
        testID="quiz-session"
      >
        <Card style={styles.errorCard}>
          <AppText variant="body" center>
            {t("review.cantLoad")}
          </AppText>
          <Button
            label={t("review.backToSetup")}
            variant="outline"
            size="sm"
            onPress={() => navigation.goBack()}
            style={styles.retry}
            testID="quiz-back"
          />
        </Card>
      </Screen>
    );
  }

  // ===== Kết quả phiên (đã chốt) =====
  if (completed && !feedback) {
    const wrong = (wrongItems.data ?? []).map(toQuizItem);
    const correctCount = data.session.correct_count ?? 0;
    return (
      <Screen
        title={t("review.summaryTitle")}
        onBack={goToCollections}
        scroll
        contentStyle={styles.content}
        testID="quiz-result"
      >
        <Card>
          <View style={styles.scoreCell}>
            <AppText variant="title" testID="quiz-result-score">
              {`${correctCount}/${data.session.item_count}`}
            </AppText>
            <AppText variant="caption">{t("review.correctCount")}</AppText>
          </View>
          {data.session.status === "abandoned" ? (
            <AppText variant="caption">{t("review.abandonedNote")}</AppText>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title={t("review.wrongAnswers")} count={wrong.length} />
          {wrongItems.isPending ? (
            <View style={styles.wrongLoading}>
              <Skeleton height={16} width="70%" />
              <Skeleton height={16} width="50%" />
            </View>
          ) : wrong.length === 0 ? (
            <View style={styles.noWrong}>
              <CheckCircle2 size={18} color={theme.colors.primary} />
              <AppText variant="caption">{t("review.noWrong")}</AppText>
            </View>
          ) : (
            wrong.map(item => (
              <View key={item.id} style={styles.wrongRow}>
                <View style={styles.wrongInfo}>
                  <AppText variant="body" weight="semibold" numberOfLines={2}>
                    {item.promptText}
                  </AppText>
                  <AppText variant="caption">
                    {`${t("review.correctAnswer")} ${
                      item.correctAnswer || t("common.notAvailable")
                    }`}
                  </AppText>
                </View>
                <XCircle size={16} color={theme.colors.danger} />
              </View>
            ))
          )}
        </Card>

        <Button
          label={t("study.backToStudy")}
          onPress={goToCollections}
          fullWidth
          testID="quiz-back-collections"
        />
      </Screen>
    );
  }

  // ===== Đang làm bài =====
  const total = data.session.item_count;
  const progress = total > 0 ? answeredCount / total : 0;
  const progressLabel = `${answeredCount}/${total}${
    skipped.size > 0 ? t("review.skipped", { count: skipped.size }) : ""
  }`;

  return (
    <Screen
      title={t("review.sessionTitle")}
      onBack={() => navigation.goBack()}
      right={
        <AppText variant="caption" testID="quiz-progress">
          {progressLabel}
        </AppText>
      }
      scroll
      contentStyle={styles.content}
      testID="quiz-session"
    >
      <View style={styles.headerRow}>
        <AppText variant="caption" style={styles.headerNote}>
          {t("review.quizNoSchedule")}
        </AppText>
        {!settled ? (
          <Button
            label={t("review.earlyFinish")}
            variant="ghost"
            size="sm"
            onPress={() => finish.mutate(undefined, { onSuccess: () => setFeedback(null) })}
            disabled={finish.isPending}
            testID="quiz-finish"
          />
        ) : null}
      </View>
      <ProgressBar value={progress} testID="quiz-progress-bar" />

      <Card>
        {current ? (
          <>
            <QuestionView
              key={current.id}
              item={current}
              submitting={answer.isPending}
              disabled={Boolean(feedback)}
              onSubmit={handleSubmit}
              onLookup={openLookup}
            />

            {feedback ? (
              <View style={styles.feedback} testID="quiz-feedback">
                <View style={styles.feedbackRow}>
                  {feedback.isCorrect ? (
                    <CheckCircle2 size={18} color={theme.colors.success} />
                  ) : (
                    <XCircle size={18} color={theme.colors.danger} />
                  )}
                  <AppText
                    variant="body"
                    weight="semibold"
                    color={feedback.isCorrect ? "primary" : "danger"}
                  >
                    {feedback.isCorrect ? t("review.correct") : t("review.incorrect")}
                  </AppText>
                </View>
                {!feedback.isCorrect ? (
                  <AppText variant="caption">
                    {`${t("review.correctAnswer")} ${
                      feedback.correctAnswer || t("common.notAvailable")
                    }`}
                  </AppText>
                ) : null}
                <Button
                  label={settled ? t("review.seeResults") : t("review.continueLabel")}
                  onPress={() => setFeedback(null)}
                  fullWidth
                  testID="quiz-next"
                />
              </View>
            ) : null}
          </>
        ) : (
          <AppText variant="caption" center style={styles.preparing}>
            {t("review.preparing")}
          </AppText>
        )}
      </Card>

      {/* Phiếu tra nhanh — mở khi nhấn giữ một chữ trong câu ngữ cảnh */}
      {lookupSheet}
    </Screen>
  );
}

/** Đề bài một câu: trắc nghiệm (nút chọn), điền từ (ô nhập) hoặc ghép cặp. */
function QuestionView({
  item,
  submitting,
  disabled,
  onSubmit,
  onLookup,
}: {
  item: QuizItem;
  submitting: boolean;
  disabled: boolean;
  onSubmit: (payload: QuestionPayload) => void;
  onLookup: (char: string, index: number) => void;
}) {
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
      <View style={styles.questionHead}>
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
          <ContextSentence
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

/**
 * Câu ngữ cảnh + highlight từ khoá.
 * Offset là CODE POINT (không phải UTF-16), `end` exclusive — cắt bằng Array.from
 * để không lệch khi câu có ký tự ngoài BMP (emoji, kanji hiếm).
 * Từng ký tự nhấn giữ được để tra nhanh (xem LookupText) — offset của đoạn
 * highlight được cộng bù để index trả về luôn tính theo cả câu.
 */
function ContextSentence({
  sentence,
  start,
  end,
  onLookup,
}: {
  sentence: string;
  start: number | null;
  end: number | null;
  onLookup: (char: string, index: number) => void;
}) {
  const theme = useTheme();
  const chars = Array.from(sentence);
  const from = typeof start === "number" ? Math.max(0, Math.min(chars.length, start)) : -1;
  const to = typeof end === "number" ? Math.max(0, Math.min(chars.length, end)) : -1;

  if (from < 0 || to <= from) {
    return (
      <AppText variant="caption" center>
        <LookupText text={sentence} onLookup={onLookup} />
      </AppText>
    );
  }

  return (
    <AppText variant="caption" center>
      <LookupText text={chars.slice(0, from).join("")} onLookup={onLookup} />
      <AppText
        variant="caption"
        weight="semibold"
        color="primary"
        testID="quiz-context-target"
        style={[styles.contextMark, { backgroundColor: theme.colors.primarySoft }]}
      >
        <LookupText
          text={chars.slice(from, to).join("")}
          onLookup={(char, index) => onLookup(char, from + index)}
        />
      </AppText>
      <LookupText
        text={chars.slice(to).join("")}
        onLookup={(char, index) => onLookup(char, to + index)}
      />
    </AppText>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  loading: { gap: spacing.md },
  errorCard: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerNote: { flexShrink: 1 },
  question: { gap: spacing.md },
  questionHead: {
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
  contextMark: { borderRadius: 4 },
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
  feedback: { gap: spacing.sm, marginTop: spacing.lg },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  preparing: { paddingVertical: spacing.lg },
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
