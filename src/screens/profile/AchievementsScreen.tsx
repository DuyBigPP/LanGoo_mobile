import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BookOpen,
  CheckCheck,
  Clock,
  Dumbbell,
  Flame,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { ApiError } from "@/api/client";
import type { AchievementItemDto } from "@/api/gamification";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Screen,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAchievementsQuery, useMarkAchievementsSeenMutation } from "@/hooks/use-gamification";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Achievements">;

/** BE trả emoji — map sang icon lucide (không render emoji trong UI, mirror web). */
const ICON_MAP: Record<string, LucideIcon> = {
  "💪": Dumbbell,
  "🏅": Medal,
  "🎯": Target,
  "🔥": Flame,
  "⭐": Star,
  "🏆": Trophy,
  "📚": BookOpen,
  "⚡": Zap,
  "⏱": Clock,
  "⏰": Clock,
};

const CATEGORY_KEYS: Record<string, string> = {
  milestone: "achievements.categoryMilestone",
  quiz: "achievements.categoryQuiz",
  streak: "achievements.categoryStreak",
  review: "achievements.categoryReview",
};

/**
 * Màn Thành tích (port từ web /achievements):
 * danh sách thành tích kèm tiến độ + đánh dấu đã xem.
 * Thành tích đã đạt xếp lên trước (giữ nguyên thứ tự BE trong từng nhóm — web không sắp thêm).
 */
export function AchievementsScreen({ navigation }: Props) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();

  const achievements = useAchievementsQuery();
  const markSeen = useMarkAchievementsSeenMutation();

  const data = achievements.data;
  const items = React.useMemo(() => {
    const list = data?.data ?? [];
    return [...list].sort(
      (a, b) => Number(Boolean(b.unlocked_at)) - Number(Boolean(a.unlocked_at)),
    );
  }, [data]);
  const unlockedCount = items.filter(item => Boolean(item.unlocked_at)).length;

  const handleMarkSeen = async () => {
    try {
      await markSeen.mutateAsync(undefined);
      show(t("achievements.markedSeen"), { type: "success" });
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  return (
    <Screen
      title={t("achievements.title")}
      onBack={() => navigation.goBack()}
      scroll
      contentStyle={styles.content}
      testID="achievements-screen"
    >
      <Card padded={false} testID="achievements-list">
        {/* Đầu danh sách: số đã mở + số chưa xem + nút đánh dấu đã xem */}
        <View style={styles.header}>
          <View style={styles.headerChips}>
            {data ? (
              <Chip>
                {t("achievements.unlockedCount", {
                  count: unlockedCount,
                  total: items.length,
                })}
              </Chip>
            ) : null}
            {data && data.unseen_count > 0 ? (
              <Badge tone="warning">
                {t("achievements.newCount", { count: data.unseen_count })}
              </Badge>
            ) : null}
          </View>
          {data && data.unseen_count > 0 ? (
            <Button
              label={t("achievements.markAllSeen")}
              variant="outline"
              size="sm"
              icon={<CheckCheck size={14} color={theme.colors.text} />}
              onPress={() => void handleMarkSeen()}
              loading={markSeen.isPending}
              testID="mark-seen"
            />
          ) : null}
        </View>
        <Divider />

        {achievements.isPending ? (
          <View>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={radius.md} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="55%" height={16} />
                  <Skeleton width="75%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : achievements.isError ? (
          <View style={styles.stateBlock}>
            <AppText variant="caption" center>
              {t("achievements.loadError")}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={() => void achievements.refetch()}
              testID="achievements-retry"
            />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Trophy size={34} color={theme.colors.primary} />}
            title={t("achievements.empty")}
            description={t("achievements.emptyHint")}
            testID="achievements-empty"
          />
        ) : (
          items.map((item, index) => (
            <View key={item.code}>
              {index > 0 ? <Divider /> : null}
              <AchievementRow item={item} index={index} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

/** Một thành tích: icon, tên + nhãn loại + trạng thái, mô tả, XP + tiến độ. */
function AchievementRow({ item, index }: { item: AchievementItemDto; index: number }) {
  const t = useT();
  const theme = useTheme();

  const Icon = achievementIcon(item.icon);
  const unlocked = Boolean(item.unlocked_at);
  const categoryKey =
    CATEGORY_KEYS[item.category.toLowerCase()] ?? "achievements.categoryDefault";

  return (
    <View style={styles.row} testID={`achievement-${index}`}>
      <View
        style={[
          styles.iconWrap,
          unlocked
            ? { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft }
            : { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
        ]}
      >
        <Icon size={20} color={unlocked ? theme.colors.primary : theme.colors.textMuted} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="body" weight="semibold">
            {item.name_vi}
          </AppText>
          <Chip>{t(categoryKey)}</Chip>
          {unlocked ? <Badge tone="success">{t("achievements.unlocked")}</Badge> : null}
        </View>
        {item.description ? <AppText variant="caption">{item.description}</AppText> : null}
      </View>

      <View style={styles.trailing}>
        <AppText variant="caption">{t("achievements.xpReward", { xp: item.xp_reward })}</AppText>
        {!unlocked ? (
          <AppText variant="caption" testID="achievement-progress">
            {t("achievements.progress", { value: item.progress })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** Backend trả emoji — map sang icon lucide, mặc định Sparkles (mirror web). */
function achievementIcon(icon: string | null): LucideIcon {
  if (icon && ICON_MAP[icon]) return ICON_MAP[icon];
  return Sparkles;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skeletonBody: { flex: 1, gap: spacing.sm },
  stateBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: spacing.xs },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  trailing: { alignItems: "flex-end", gap: 2 },
});
