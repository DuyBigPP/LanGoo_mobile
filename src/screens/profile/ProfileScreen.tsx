import * as React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronRight,
  Database,
  ExternalLink,
  LogIn,
  LogOut,
  MessageSquareWarning,
  UserPlus,
} from "lucide-react-native";
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  ListRow,
  ProgressBar,
  Screen,
  SectionHeader,
  Skeleton,
  useToast,
} from "@/components/ui";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { SettingsSection, ThemeModeControl } from "@/components/profile/SettingsSection";
import { useAuth, useRequireAuth } from "@/contexts/AuthContext";
import { useMeStatsQuery, useSrsStatsQuery } from "@/hooks/use-stats";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const JLPT_URL = "https://www.jlptgrade.site";

/**
 * Tab Hồ sơ (mirror web /profile): guest thấy thẻ đăng nhập/đăng ký + giao diện/ngôn ngữ + liên kết công khai;
 * người đã đăng nhập thấy tài khoản, thống kê, cài đặt và thẻ "Khác".
 * XP/cấp độ/thành tích bị ẩn như web. App chỉ học tiếng Nhật nên bỏ phần quản lý nhiều hồ sơ học.
 */
export function ProfileScreen() {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();
  const { user, logout, status } = useAuth();
  const requireAuth = useRequireAuth();

  const srsStats = useSrsStatsQuery();
  const meStats = useMeStatsQuery();

  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const srs = srsStats.data;
  const me = meStats.data;
  const statsFailed = meStats.isError || srsStats.isError;

  // SRS là nguồn cho số lượt ôn hôm nay; me/today dùng cho mục tiêu ngày
  const reviewsToday = srs?.reviews_today ?? 0;
  const goal = me?.today.goal ?? 0;
  const goalPercent = goal > 0 ? Math.min(1, reviewsToday / goal) : 0;
  const accuracy =
    srs?.accuracy_7d != null
      ? Math.round(Math.min(100, srs.accuracy_7d <= 1 ? srs.accuracy_7d * 100 : srs.accuracy_7d))
      : null;

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    show(t("account.loggedOut"), { type: "success" });
  };

  const handleRetryStats = () => {
    void meStats.refetch();
    void srsStats.refetch();
  };

  if (status !== "authenticated") {
    return (
      <Screen title={t("profile.title")} scroll contentStyle={styles.content} testID="profile-screen">
        <Card style={styles.guestCard} testID="profile-guest">
          <Button
            label={t("auth.loginAction")}
            icon={<LogIn size={16} color={theme.colors.onPrimary} />}
            onPress={() => navigation.navigate("Login")}
            fullWidth
            testID="profile-login"
          />
          <Button
            label={t("auth.registerAction")}
            variant="outline"
            icon={<UserPlus size={16} color={theme.colors.text} />}
            onPress={() => navigation.navigate("Register")}
            fullWidth
            testID="profile-register"
          />
          <ThemeModeControl />
          <View style={styles.row}>
            <AppText variant="label" style={styles.rowInfo}>
              {t("language.label")}
            </AppText>
            <LanguageToggle testID="profile-language-toggle" />
          </View>
        </Card>
        <Card padded={false}>
          <ListRow
            title={t("sources.title")}
            left={<Database size={18} color={theme.colors.textMuted} />}
            right={<ChevronRight size={18} color={theme.colors.textFaint} />}
            onPress={() => navigation.navigate("Sources")}
            testID="profile-link-sources"
          />
          <Divider />
          <ListRow
            title={t("nav.feedback")}
            left={<MessageSquareWarning size={18} color={theme.colors.textMuted} />}
            right={<ChevronRight size={18} color={theme.colors.textFaint} />}
            onPress={() => requireAuth(() => navigation.navigate("Feedback"))}
            testID="profile-link-feedback"
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t("profile.title")} scroll contentStyle={styles.content} testID="profile-screen">
      {/* (a) Thẻ tài khoản + nút đăng xuất (có hộp thoại xác nhận) */}
      <Card testID="profile-account">
        <View style={styles.row}>
          <Avatar name={user?.display_name || user?.email || undefined} />
          <View style={styles.rowInfo}>
            <AppText variant="body" weight="semibold" numberOfLines={1}>
              {user?.display_name || user?.email || t("account.guest")}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {user?.email ?? ""}
            </AppText>
          </View>
          <Button
            label={t("account.logout")}
            variant="outline"
            size="sm"
            icon={<LogOut size={16} color={theme.colors.danger} />}
            onPress={() => setLogoutOpen(true)}
            testID="profile-logout"
          />
        </View>
      </Card>

      {statsFailed ? (
        /* Lỗi tải số liệu — một khối lỗi chung như web */
        <Card>
          <View style={styles.statsError}>
            <AppText variant="caption" center>
              {t("stats.loadError")}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={handleRetryStats}
              testID="profile-stats-retry"
            />
          </View>
        </Card>
      ) : (
        <>
          {/* (b) Hôm nay: thẻ đến hạn / đã ôn / học mới / đang học + mục tiêu ngày */}
          <View>
            <SectionHeader
              title={t("stats.title")}
              right={
                me ? (
                  <>
                    <Chip>{t("stats.goalChip", { goal: formatNumber(me.today.goal) })}</Chip>
                    <Chip>
                      {me.today.met_goal
                        ? t("stats.goalReached")
                        : t("stats.goalTarget", { goal: formatNumber(me.today.goal) })}
                    </Chip>
                  </>
                ) : undefined
              }
            />
            <Card>
              <View style={styles.statsGrid}>
                <StatCell
                  label={t("stats.dueCards")}
                  value={srs?.due_now}
                  hint={t("stats.readyToReview")}
                  loading={srsStats.isPending}
                />
                <StatCell
                  label={t("stats.reviewedToday")}
                  value={reviewsToday}
                  hint={
                    goal > 0
                      ? reviewsToday >= goal
                        ? t("stats.goalReached")
                        : t("stats.goalTarget", { goal: formatNumber(goal) })
                      : undefined
                  }
                  loading={srsStats.isPending}
                />
                <StatCell
                  label={t("stats.newToday")}
                  value={srs?.new_introduced_today}
                  loading={srsStats.isPending}
                />
                <StatCell
                  label={t("stats.learning")}
                  value={srs?.learning}
                  loading={srsStats.isPending}
                />
              </View>
              {!srsStats.isPending && me ? (
                <View style={styles.goalRow}>
                  <ProgressBar
                    value={goalPercent}
                    style={styles.goalBar}
                    testID="profile-goal-bar"
                  />
                  <AppText variant="caption">{`${formatNumber(reviewsToday)}/${formatNumber(goal)}`}</AppText>
                </View>
              ) : null}
            </Card>
          </View>

          {/* (c) Tổng quan: chuỗi ngày + từ đã lưu + tổng lượt ôn + độ chính xác 7 ngày */}
          <View>
            <SectionHeader title={t("stats.overview")} />
            <Card>
              <View style={styles.statsGrid}>
                <StatCell
                  label={t("stats.streakCurrent")}
                  value={me?.streak_current}
                  unit={t("stats.dayUnit")}
                  loading={meStats.isPending}
                />
                <StatCell
                  label={t("stats.streakLongest")}
                  value={me?.streak_longest}
                  unit={t("stats.dayUnit")}
                  loading={meStats.isPending}
                />
                <StatCell
                  label={t("stats.savedWords")}
                  value={me?.items_learned}
                  unit={t("stats.wordUnit")}
                  loading={meStats.isPending}
                />
                <StatCell
                  label={t("stats.totalReviews")}
                  value={me?.reviews_total}
                  unit={t("stats.reviewUnit")}
                  loading={meStats.isPending}
                />
              </View>

              {!meStats.isPending && !srsStats.isPending && me ? (
                <AppText variant="caption">
                  {t("stats.accuracy", {
                    value: accuracy != null ? `${accuracy}%` : t("stats.notEnoughData"),
                  })}
                </AppText>
              ) : null}
            </Card>
          </View>
        </>
      )}

      {/* (d) Cài đặt học tập + giao diện + ngôn ngữ + phiên bản */}
      <SettingsSection />

      {/* (e) Khác: Góp ý / Nguồn dữ liệu / JLPT (liên kết ngoài) */}
      <Card padded={false}>
        <ListRow
          title={t("nav.feedback")}
          left={<MessageSquareWarning size={18} color={theme.colors.textMuted} />}
          right={<ChevronRight size={18} color={theme.colors.textFaint} />}
          onPress={() => navigation.navigate("Feedback")}
          testID="profile-link-feedback"
        />
        <Divider />
        <ListRow
          title={t("sources.title")}
          left={<Database size={18} color={theme.colors.textMuted} />}
          right={<ChevronRight size={18} color={theme.colors.textFaint} />}
          onPress={() => navigation.navigate("Sources")}
          testID="profile-link-sources"
        />
        <Divider />
        <ListRow
          title={t("nav.jlpt")}
          left={<ExternalLink size={18} color={theme.colors.textMuted} />}
          right={<ChevronRight size={18} color={theme.colors.textFaint} />}
          onPress={() => void Linking.openURL(JLPT_URL)}
          testID="profile-link-jlpt"
        />
      </Card>

      {/* Hộp thoại xác nhận đăng xuất */}
      <Dialog
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={t("account.logout")}
        testID="profile-logout-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setLogoutOpen(false) },
          { label: t("account.logout"), variant: "danger", onPress: () => void handleLogout() },
        ]}
      >
        <AppText variant="body">{t("account.logoutConfirm")}</AppText>
      </Dialog>
    </Screen>
  );
}

/** Một ô thống kê nhỏ: giá trị lớn + nhãn + gợi ý; hiện skeleton khi đang tải. */
function StatCell({
  label,
  value,
  unit,
  hint,
  loading = false,
}: {
  label: string;
  value?: number;
  unit?: string;
  hint?: string;
  loading?: boolean;
}) {
  const t = useT();

  if (loading) {
    return (
      <View style={styles.statCell}>
        <Skeleton width={48} height={22} />
        <Skeleton width={72} height={12} />
      </View>
    );
  }

  return (
    <View style={styles.statCell}>
      <AppText variant="title">
        {value === undefined
          ? t("common.notAvailable")
          : `${formatNumber(value)}${unit ? ` ${unit}` : ""}`}
      </AppText>
      <AppText variant="caption">{label}</AppText>
      {hint ? (
        <AppText variant="caption" color="faint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowInfo: { flex: 1, gap: spacing.xs },
  statsError: { gap: spacing.md, alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.lg,
  },
  statCell: {
    width: "50%",
    gap: spacing.xs,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  goalBar: { flex: 1 },
  guestCard: { gap: spacing.lg },
});
