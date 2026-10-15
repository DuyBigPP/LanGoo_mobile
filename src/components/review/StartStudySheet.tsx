import * as React from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Play, Sparkles } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  ProgressBar,
  SegmentedControl,
  useToast,
} from "@/components/ui";
import { useCreateQuizMutation, useStartQuizMutation } from "@/hooks/use-quizzes";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";
import type { QuizQuestionType } from "@/types/api";

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type StudyMode = "flashcard" | "quiz";

export interface StartStudySheetProps {
  visible: boolean;
  onClose: () => void;
  /** null = học tất cả sổ tay */
  collection: { id: string; name: string } | null;
}

/** Flashcard lấy cả hàng đợi đến hạn (API mặc định 20) — không cho chọn số câu. */
const FLASHCARD_LIMIT = 20;
const QUESTION_COUNTS = ["5", "10", "15", "20"] as const;

/**
 * Quiz v2 — người dùng chọn 1–3 dạng câu hỏi (checkbox).
 * BE tự trộn luân phiên các dạng + tự trộn 3 dạng con trong slot trắc nghiệm;
 * không còn chọn độ khó / phong cách câu / ngữ cảnh.
 */
const QUESTION_TYPE_VALUES: QuizQuestionType[] = ["multiple_choice", "fill_blank", "matching"];
const QUESTION_TYPE_LABEL_KEYS: Record<QuizQuestionType, string> = {
  multiple_choice: "review.quizTypeMc",
  fill_blank: "review.quizTypeFill",
  matching: "review.quizTypeMatching",
};

/** Dòng mô tả đổi dần khi đang tạo đề (kiểu "thinking" của Claude) */
const GENERATING_STEP_KEYS = [
  "review.generatingStep1",
  "review.generatingStep2",
  "review.generatingStep3",
  "review.generatingStep4",
] as const;

/** Câu nhắc cooldown (giống bản web) */
const cooldownMessage = (seconds: number) => `Vừa tạo quiz xong — đợi ${seconds}s rồi thử lại nhé.`;

/**
 * Bottom sheet bắt đầu phiên học (mirror web StartStudyDialog):
 * - Flashcard: mở màn lật thẻ với hàng đợi /srs/due.
 * - Quiz AI v2: chọn 1–3 dạng câu hỏi + số câu rồi mở phiên tương ứng.
 */
export function StartStudySheet({ visible, onClose, collection }: StartStudySheetProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();
  const createQuiz = useCreateQuizMutation();
  const startQuiz = useStartQuizMutation();

  const [mode, setMode] = React.useState<StudyMode>("flashcard");
  const [questionTypes, setQuestionTypes] = React.useState<QuizQuestionType[]>([
    "multiple_choice",
  ]);
  const [count, setCount] = React.useState<string>("20");
  const [cooldown, setCooldown] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [stepIndex, setStepIndex] = React.useState(0);

  /** Đang chờ BE sinh đề (create + start) */
  const generating = createQuiz.isPending || startQuiz.isPending;

  // Mở sheet -> về mặc định (mirror web)
  React.useEffect(() => {
    if (!visible) return;
    setMode("flashcard");
    setQuestionTypes(["multiple_choice"]);
    setCount("20");
    setCooldown(0);
    setProgress(0);
    setStepIndex(0);
  }, [visible]);

  // Thanh tiến trình thuần FE: chạy nhanh lúc đầu, chậm dần và giữ ở 90% tới khi BE xong
  // (không biết tiến độ thật -> chạm 90% rồi bò từ từ, xong mới nhảy 100%)
  React.useEffect(() => {
    if (!generating) {
      setProgress(0);
      setStepIndex(0);
      return;
    }
    setProgress(value => (value > 0 ? value : 4));
    const timer = setInterval(() => {
      setProgress(value => {
        if (value >= 90) return 90;
        const remaining = 90 - value;
        return Math.min(90, value + Math.max(0.35, remaining * 0.07));
      });
    }, 220);
    return () => clearInterval(timer);
  }, [generating]);

  // Dòng mô tả đổi dần để người dùng biết vẫn đang chạy
  React.useEffect(() => {
    if (!generating) return;
    const timer = setInterval(
      () => setStepIndex(index => (index + 1) % GENERATING_STEP_KEYS.length),
      2600,
    );
    return () => clearInterval(timer);
  }, [generating]);

  // Chữ "Đang tạo đề quiz…" nhấp nháy — thay cho class .shimmer-text của web
  const shimmer = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!generating) return;
    shimmer.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [generating, shimmer]);

  // Dòng mô tả mờ đi rồi hiện lại mỗi lần đổi bước (thay cho fade-in của web)
  const stepFade = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!generating) return;
    stepFade.setValue(0);
    Animated.timing(stepFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [generating, stepIndex, stepFade]);

  // Đếm ngược khi máy chủ yêu cầu chờ giữa hai lần tạo quiz
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const modeOptions = React.useMemo(
    () => [
      { value: "flashcard", label: t("review.modeFlashcard") },
      { value: "quiz", label: t("review.modeQuiz") },
    ],
    [t],
  );

  const countOptions = React.useMemo(
    () =>
      QUESTION_COUNTS.map(value => ({
        value,
        label: t("review.questionCountValue", { count: value }),
      })),
    [t],
  );

  const pending = createQuiz.isPending || startQuiz.isPending;

  const toggleQuestionType = (value: QuizQuestionType, checked: boolean) => {
    setQuestionTypes(previous => {
      if (checked) return previous.includes(value) ? previous : [...previous, value];
      return previous.filter(item => item !== value);
    });
  };

  /** Cho thanh tiến trình chạy hết (100%) rồi mới đóng sheet cho mượt mắt */
  const finishWithProgress = async () => {
    setProgress(100);
    await new Promise(resolve => setTimeout(resolve, 320));
    onClose();
  };

  const handleStart = async () => {
    // Flashcard: lật thẻ từ hàng đợi ôn tập (/srs/due) — không cần chọn số câu
    if (mode === "flashcard") {
      onClose();
      navigation.navigate("Flashcard", { collectionId: collection?.id, limit: FLASHCARD_LIMIT });
      return;
    }

    if (questionTypes.length === 0) {
      show(t("review.pickAtLeastOneType"), { type: "error" });
      return;
    }

    // Quiz AI: sinh đề từ bộ sưu tập rồi mở phiên học tương ứng
    try {
      const quiz = await createQuiz.mutateAsync({
        collection_id: collection?.id,
        question_count: Number(count),
        question_types: questionTypes,
      });

      // Bấm đúp trong cooldown -> BE trả lại quiz cũ: vào thẳng phiên đang làm nếu có
      const inProgress = quiz.reused ? quiz.latest_session : null;
      if (inProgress?.id && inProgress.status === "in_progress") {
        show(t("review.quizReady"), { type: "success" });
        await finishWithProgress();
        navigation.navigate("QuizSession", { sessionId: inProgress.id });
        return;
      }

      const started = await startQuiz.mutateAsync(quiz.id);
      show(t("review.quizReady"), { type: "success" });
      await finishWithProgress();
      navigation.navigate("QuizSession", { sessionId: started.session.id });
    } catch (error) {
      const apiError = ApiError.from(error);
      if (apiError.code === "QUIZ_GENERATION_COOLDOWN") {
        const seconds = Number(
          (apiError.details as { retry_after_s?: number } | undefined)?.retry_after_s ?? 15,
        );
        setCooldown(seconds);
        show(cooldownMessage(seconds), { type: "error" });
      } else if (apiError.code === "QUIZ_SCOPE_CHANGED") {
        // Hồ sơ/ngôn ngữ đổi giữa lúc AI đang tạo -> phải tạo lại
        show(t("review.quizScopeChanged"), { type: "error" });
      } else if (apiError.code === "QUIZ_NOT_ENOUGH_ITEMS") {
        const details = apiError.details as { available?: number; required?: number } | undefined;
        show(t("review.quizNotEnoughItems", { available: details?.available ?? "?", required: details?.required ?? "?" }), {
          type: "error",
        });
      } else if (apiError.code === "AI_QUOTA_EXCEEDED") {
        show(t("review.aiQuotaExceeded"), { type: "error" });
      } else if (apiError.code === "COLLECTION_NOT_FOUND") {
        show(t("review.collectionMissing"), { type: "error" });
      } else if (apiError.code === "AI_PROVIDER_UNAVAILABLE") {
        show(t("review.quizProviderUnavailable"), { type: "error" });
      } else {
        show(apiError.message, { type: "error" });
      }
    }
  };

  // Đang tạo đề thì không cho đóng (nút X / bấm nền / nút back) để không mất tiến trình
  const handleClose = () => {
    if (generating) return;
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t("review.startTitle")}
      testID="start-study"
    >
      {generating ? (
        <View style={styles.generating} testID="quiz-generating">
          <View style={styles.generatingHead}>
            <View style={[styles.sparkBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Sparkles size={24} color={theme.colors.primary} />
            </View>
            <Animated.View style={{ opacity: shimmer }}>
              <AppText variant="label" center>
                {t("review.generating")}
              </AppText>
            </Animated.View>
            <Animated.View style={{ opacity: stepFade }} testID="quiz-generating-step">
              <AppText variant="caption" size="xs" center>
                {t(GENERATING_STEP_KEYS[stepIndex])}
              </AppText>
            </Animated.View>
          </View>
          <View style={styles.progressBlock}>
            <ProgressBar value={progress / 100} testID="quiz-generating-progress" />
            <View style={styles.progressMeta}>
              <AppText variant="caption" size="xs">
                {t("review.generatingHint")}
              </AppText>
              <AppText variant="caption" size="xs" testID="quiz-generating-percent">
                {`${Math.round(progress)}%`}
              </AppText>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Chip>{collection?.name ?? t("review.allNotebooks")}</Chip>

          <View style={styles.field}>
            <AppText variant="label">{t("review.mode")}</AppText>
            <SegmentedControl
              options={modeOptions}
              value={mode}
              onChange={value => setMode(value as StudyMode)}
              testID="start-study-mode"
            />
          </View>

          <AppText variant="caption">
            {mode === "flashcard" ? t("review.flashcardHint") : t("review.quizHint")}
          </AppText>

          {mode === "quiz" ? (
            <>
              <View style={styles.field}>
                <AppText variant="label">{t("review.questionTypes")}</AppText>
                <View
                  style={[
                    styles.typeGroup,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                  ]}
                >
                  {QUESTION_TYPE_VALUES.map(value => (
                    <Checkbox
                      key={value}
                      checked={questionTypes.includes(value)}
                      onCheckedChange={checked => toggleQuestionType(value, checked)}
                      label={t(QUESTION_TYPE_LABEL_KEYS[value])}
                      testID={`quiz-type-${value}`}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <AppText variant="label">{t("review.questionCount")}</AppText>
                <SegmentedControl
                  options={countOptions}
                  value={count}
                  onChange={setCount}
                  testID="start-study-count"
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      <View style={styles.actions}>
        {generating ? (
          <Button label={t("review.generating")} disabled loading testID="study-start" />
        ) : (
          <>
            <Button
              label={t("common.cancel")}
              variant="outline"
              onPress={onClose}
              testID="study-cancel"
            />
            <Button
              label={
                cooldown > 0 ? t("review.waiting", { seconds: cooldown }) : t("review.start")
              }
              icon={<Play size={16} color={theme.colors.onPrimary} />}
              onPress={() => void handleStart()}
              disabled={pending || cooldown > 0}
              loading={pending}
              testID="study-start"
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  field: { gap: spacing.xs },
  typeGroup: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generating: { gap: spacing.xl, paddingVertical: spacing.lg },
  generatingHead: { alignItems: "center", gap: spacing.sm },
  sparkBox: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBlock: { gap: spacing.sm },
  progressMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
