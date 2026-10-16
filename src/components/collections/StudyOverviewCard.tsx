import React from "react";
import { StyleSheet, View } from "react-native";
import { Play } from "lucide-react-native";
import { AppText, Button, Card, Skeleton } from "@/components/ui";
import type { useSrsStatsQuery } from "@/hooks/use-stats";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { spacing, useTheme } from "@/theme";

export interface StudyOverviewCardProps {
  stats: ReturnType<typeof useSrsStatsQuery>;
  onStartAll: () => void;
}

/** Tổng quan ôn tập hôm nay: 4 ô số liệu SRS + nút "Ôn tập hôm nay" (học tất cả sổ tay). */
export function StudyOverviewCard({ stats, onStartAll }: StudyOverviewCardProps) {
  const t = useT();
  const theme = useTheme();
  const loading = stats.isPending;

  return (
    <Card testID="study-overview">
      <View style={styles.grid}>
        <StatCell label={t("study.dueToday")} value={stats.data?.due_now} unit={t("study.cardUnit")} loading={loading} />
        <StatCell label={t("study.learning")} value={stats.data?.learning} unit={t("study.cardUnit")} loading={loading} />
        <StatCell
          label={t("study.newToday")}
          value={stats.data?.new_introduced_today}
          unit={t("study.cardUnit")}
          loading={loading}
        />
        <StatCell
          label={t("study.reviewedToday")}
          value={stats.data?.reviews_today}
          unit={t("study.reviewUnit")}
          loading={loading}
        />
      </View>
      <Button
        label={t("study.startToday")}
        icon={<Play size={18} color={theme.colors.onPrimary} />}
        onPress={onStartAll}
        fullWidth
        style={styles.startButton}
        testID="start-study-all"
      />
    </Card>
  );
}

/** Một ô thống kê nhỏ: giá trị lớn + nhãn; hiện skeleton khi đang tải. */
function StatCell({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value?: number;
  unit: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.cell}>
        <Skeleton width={48} height={24} />
        <Skeleton width={84} height={12} />
      </View>
    );
  }
  return (
    <View style={styles.cell}>
      <AppText variant="title">{`${formatNumber(value ?? 0)} ${unit}`}</AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg },
  cell: { width: "50%", gap: spacing.xs },
  startButton: { marginTop: spacing.lg },
});
