import * as React from "react";
import { uuidv7 } from "@/lib/uuid";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2 } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { fetchDue, postReview } from "@/api/srs";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Button, ProgressBar, Screen, Skeleton, useToast } from "@/components/ui";
import type { SpeakLang } from "@/hooks/use-speech";
import { useActiveProfile } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";
import type { CreateReviewDto, DueItemDto, DueResultDto } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Flashcard">;

const DEFAULT_LIMIT = 20;
const MAX_ELAPSED_MS = 3_600_000;

const RATING_OPTIONS: { rating: 1 | 2 | 3 | 4; labelKey: string }[] = [
  { rating: 1, labelKey: "review.ratingAgain" },
  { rating: 2, labelKey: "review.ratingHard" },
  { rating: 3, labelKey: "review.ratingGood" },
  { rating: 4, labelKey: "review.ratingEasy" },
];

function toSpeakLang(code: string): SpeakLang {
  if (code === "vi") return "vi";
  if (code === "en") return "en";
  return "ja";
}

/**
 * Phiên Flashcard lật thẻ (port web FlashcardPlayer):
 * hàng đợi /srs/due phân trang cursor + xoá thẻ đã chấm khỏi cache (optimistic)
 * + kiểm tra lại hàng đợi sau khi hết snapshot.
 */
export function FlashcardScreen({ navigation, route }: Props) {
  const collectionId = route.params?.collectionId;
  const limit = route.params?.limit ?? DEFAULT_LIMIT;
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const { profileId } = useActiveProfile();

  // Key gồm scope hồ sơ/ngôn ngữ: đổi scope là hàng đợi tách riêng
  const dueKey = React.useMemo(
    () => ["srs", "due", profileId ?? "all", collectionId ?? "all", limit] as const,
    [profileId, collectionId, limit],
  );

  const due = useInfiniteQuery({
    queryKey: dueKey,
    queryFn: ({ pageParam }) =>
      fetchDue({ collection_id: collectionId, limit, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.next_cursor,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const review = useMutation({
    mutationFn: (input: CreateReviewDto) => postReview(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["me-stats"] });
    },
  });

  const [index, setIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [answered, setAnswered] = React.useState(0);
  const [lastFeedback, setLastFeedback] = React.useState<string | null>(null);
  const shownAt = React.useRef(Date.now());
  // Chống lặp: sau mỗi câu trả lời chỉ kiểm tra lại hàng đợi từ trang đầu 1 lần
  const recheckedAtRef = React.useRef(0);

  const queue = React.useMemo(
    () => due.data?.pages.flatMap(page => page.data) ?? [],
    [due.data],
  );
  // counts của trang mới nhất (sau filter/cap trước limit/cursor)
  const pages = due.data?.pages;
  const counts = pages && pages.length > 0 ? pages[pages.length - 1].counts : null;
  const card = queue[index];
  const exhausted = due.isSuccess && index >= queue.length;
  const finished =
    due.isSuccess &&
    exhausted &&
    !due.hasNextPage &&
    !due.isFetchingNextPage &&
    recheckedAtRef.current === answered;

  // Tách sẵn để effect chỉ phụ thuộc giá trị (không phụ thuộc cả object `due`)
  const dueHasNextPage = due.hasNextPage;
  const dueFetchingNextPage = due.isFetchingNextPage;
  const dueFetchNextPage = due.fetchNextPage;

  // Hết trang hiện tại: nối tiếp bằng cursor; hết snapshot thì kiểm tra lại từ trang đầu
  React.useEffect(() => {
    if (!exhausted) return;
    if (dueHasNextPage) {
      if (!dueFetchingNextPage) void dueFetchNextPage();
      return;
    }
    if (answered > 0 && recheckedAtRef.current !== answered) {
      recheckedAtRef.current = answered;
      setIndex(0);
      void queryClient.resetQueries({ queryKey: dueKey });
    }
  }, [exhausted, dueHasNextPage, dueFetchingNextPage, dueFetchNextPage, dueKey, answered, queryClient]);

  /** Bỏ thẻ vừa chấm khỏi snapshot đang giữ (không để sibling cũ nằm chờ) */
  const removeCardFromCache = React.useCallback(
    (srsId: string) => {
      queryClient.setQueryData<InfiniteData<DueResultDto>>(
        dueKey,
        (previous: InfiniteData<DueResultDto> | undefined) =>
        previous
          ? {
              ...previous,
              pages: previous.pages.map(page => ({
                ...page,
                data: page.data.filter(item => item.srs_id !== srsId),
              })),
            }
          : previous,
      );
    },
    [queryClient, dueKey],
  );

  // Đổi thẻ -> về mặt trước, đếm lại thời gian hiển thị
  React.useEffect(() => {
    setFlipped(false);
    shownAt.current = Date.now();
  }, [index]);

  // Đổi hồ sơ -> bắt đầu lại phiên với hàng đợi mới
  React.useEffect(() => {
    setIndex(0);
    setAnswered(0);
    setLastFeedback(null);
    recheckedAtRef.current = 0;
  }, [profileId]);

  const submit = React.useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      if (!card || review.isPending) return;
      review.mutate(
        {
          face_id: card.face_id,
          direction: card.direction,
          rating,
          elapsed_ms: Math.min(Date.now() - shownAt.current, MAX_ELAPSED_MS),
          mode: "flashcard",
          client_review_id: uuidv7(),
          collection_id: collectionId,
        },
        {
          onSuccess: result => {
            setAnswered(count => count + 1);
            const days = result.srs.interval_days;
            const when =
              days <= 0
                ? t("review.reviewInMinutes")
                : days === 1
                  ? t("review.reviewInOneDay")
                  : t("review.reviewInDays", { days });
            setLastFeedback(t("review.lastRated", { when }));
            // Thẻ đã chấm rời snapshot -> thẻ kế tiếp đã nằm ngay tại index hiện tại
            removeCardFromCache(card.srs_id);
            setFlipped(false);
            shownAt.current = Date.now();
          },
          onError: error => {
            const apiError = ApiError.from(error);
            if (apiError.code === "SRS_ITEM_UNAVAILABLE") {
              show(t("review.skippedCard"), { type: "info" });
              removeCardFromCache(card.srs_id);
              setFlipped(false);
              shownAt.current = Date.now();
            } else {
              show(apiError.message, { type: "error" });
            }
          },
        },
      );
    },
    [card, review, collectionId, removeCardFromCache, show, t],
  );

  const total = queue.length;
  const progress = total > 0 ? answered / total : 0;

  const restart = () => {
    recheckedAtRef.current = 0;
    setIndex(0);
    setAnswered(0);
    setLastFeedback(null);
    void queryClient.resetQueries({ queryKey: dueKey });
  };

  return (
    <Screen
      title={t("review.flashTitle")}
      onBack={() => navigation.goBack()}
      right={
        <AppText variant="caption" testID="flash-progress">
          {`${answered}/${total}`}
        </AppText>
      }
      scroll
      contentStyle={styles.content}
      testID="flashcard-screen"
    >
      <ProgressBar value={progress} testID="flash-progress-bar" />
      {counts ? (
        <AppText variant="caption" center testID="flash-counts">
          {t("review.dueCounts", {
            review: counts.review,
            learning: counts.learning,
            new: counts.new,
          })}
        </AppText>
      ) : null}

      <View
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        {due.isPending ? (
          <View style={styles.loading}>
            <Skeleton height={300} radius={radius.lg} />
            <Skeleton height={16} width="55%" />
          </View>
        ) : due.isError ? (
          <View style={styles.centerBox}>
            <AppText variant="body" center>
              {t("review.flashQueueError")}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={() => void due.refetch()}
              testID="flash-retry"
            />
          </View>
        ) : finished ? (
          <View style={styles.centerBox} testID="flash-done">
            <CheckCircle2 size={28} color={theme.colors.primary} />
            <AppText variant="subtitle" center>
              {answered > 0
                ? t("review.flashDone", { count: answered })
                : t("review.flashEmpty")}
            </AppText>
            <AppText variant="caption" center>
              {answered > 0 ? t("review.flashDoneHint") : t("review.flashEmptyHint")}
            </AppText>
            <View style={styles.doneActions}>
              <Button
                label={t("review.studyMore")}
                variant="outline"
                onPress={restart}
                testID="flash-restart"
              />
              <Button
                label={t("review.exit")}
                onPress={() => navigation.goBack()}
                testID="flash-exit"
              />
            </View>
          </View>
        ) : !card ? (
          // Đang nối tiếp trang sau / kiểm tra lại hàng đợi
          <View style={styles.loading} testID="flash-loading-next">
            <Skeleton height={300} radius={radius.lg} />
          </View>
        ) : (
          <View style={styles.player}>
            <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped(value => !value)} />

            {flipped ? (
              <View style={styles.ratingRow}>
                {RATING_OPTIONS.map(option => (
                  <Button
                    key={option.rating}
                    label={t(option.labelKey)}
                    variant="outline"
                    size="sm"
                    onPress={() => submit(option.rating)}
                    disabled={review.isPending}
                    style={styles.ratingButton}
                    testID={`flash-rating-${option.rating}`}
                  />
                ))}
              </View>
            ) : (
              <AppText variant="caption" center>
                {t("review.flipReveal")}
              </AppText>
            )}

            {lastFeedback ? (
              <AppText variant="caption" center testID="flash-feedback">
                {lastFeedback}
              </AppText>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

/** Thẻ lật 3D: mặt trước là đề (JA + loa), mặt sau là nghĩa (VI + loa). */
function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: DueItemDto;
  flipped: boolean;
  onFlip: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [flipped, progress]);

  const frontRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const faceStyle = { backgroundColor: theme.colors.card, borderColor: theme.colors.border };

  return (
    <Pressable
      onPress={onFlip}
      accessibilityRole="button"
      accessibilityLabel={flipped ? t("review.flipBack") : t("review.flipReveal")}
      testID="flash-card"
      style={styles.flipWrap}
    >
      {/* Mặt trước: từ tiếng Nhật */}
      <Animated.View
        pointerEvents={flipped ? "none" : "auto"}
        style={[
          styles.flipFace,
          faceStyle,
          { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
        ]}
      >
        <AppText variant="caption" color="muted" center>
          {card.instruction}
        </AppText>
        <AppText size="hero" weight="bold" center numberOfLines={2}>
          {card.prompt.text}
        </AppText>
        {card.prompt.reading && card.prompt.reading !== card.prompt.text ? (
          <AppText variant="body" color="muted" center>
            {card.prompt.reading}
          </AppText>
        ) : null}
        <View style={styles.speakRow}>
          <SpeakButton
            text={card.prompt.text}
            lang={toSpeakLang(card.language.code)}
            testID="flash-speak-front"
          />
        </View>
      </Animated.View>

      {/* Mặt sau: nghĩa tiếng Việt */}
      <Animated.View
        pointerEvents={flipped ? "auto" : "none"}
        style={[
          styles.flipFace,
          faceStyle,
          { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
      >
        <AppText variant="caption" color="muted" center>
          {t("review.answer")}
        </AppText>
        <AppText variant="title" center numberOfLines={4}>
          {card.answer.text}
        </AppText>
        <View style={styles.speakRow}>
          <SpeakButton text={card.answer.text} lang="vi" testID="flash-speak-back" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  loading: { gap: spacing.md },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  doneActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  player: { gap: spacing.lg },
  flipWrap: { height: 300 },
  flipFace: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backfaceVisibility: "hidden",
  },
  speakRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xs },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  ratingButton: { flexGrow: 1, flexBasis: "45%" },
});
