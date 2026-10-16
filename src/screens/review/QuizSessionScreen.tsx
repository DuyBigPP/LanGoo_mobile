import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { QuizQuestionView } from "@/components/review/QuizQuestionView";
import { QuizResultView } from "@/components/review/QuizResultView";
import {
  MAX_ELAPSED_MS,
  toQuizItem,
  type QuestionPayload,
} from "@/components/review/quiz-model";
import {
  AppText,
  Button,
  Card,
  ProgressBar,
  Screen,
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
import { spacing, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "QuizSession">;

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
    return (
      <QuizResultView
        kind={data.session.kind}
        score={data.session.score}
        correctCount={data.session.correct_count ?? 0}
        itemCount={data.session.item_count}
        abandoned={data.session.status === "abandoned"}
        wrongItems={(wrongItems.data ?? []).map(toQuizItem)}
        wrongLoading={wrongItems.isPending}
        onBack={goToCollections}
        onNewSession={goToCollections}
        onBackToDictionary={() => navigation.navigate("Tabs", { screen: "Dictionary" })}
      />
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
            <QuizQuestionView
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
  feedback: { gap: spacing.sm, marginTop: spacing.lg },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  preparing: { paddingVertical: spacing.lg },
});
