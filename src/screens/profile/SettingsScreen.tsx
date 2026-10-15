import * as React from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Minus, Plus } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  IconButton,
  Screen,
  SegmentedControl,
  Skeleton,
  toastError,
  useToast,
} from "@/components/ui";
import { APP_VERSION } from "@/config/env";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme, useThemeControls } from "@/theme";

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, "Settings">;

/** Giá trị mặc định khi máy chủ chưa có cài đặt (giống bản web). */
const DEFAULT_GOAL = 20;
const DEFAULT_NEW_PER_DAY = 20;
const DEFAULT_REVIEW_PER_DAY = 200;

interface StepperConfig {
  min: number;
  max: number;
  step: number;
}

const GOAL_CONFIG: StepperConfig = { min: 5, max: 100, step: 5 };
const NEW_CONFIG: StepperConfig = { min: 1, max: 9999, step: 5 };
const REVIEW_CONFIG: StepperConfig = { min: 1, max: 9999, step: 10 };

/** Thiếu khoá settings.themeSystem / settings.themeMode — dùng tạm nhãn tiếng Việt. */
const THEME_SYSTEM_LABEL = "Hệ thống";
const THEME_MODE_LABEL = "Giao diện";

/** Màn Cài đặt học tập: mục tiêu ngày, giới hạn SRS, chế độ giao diện, phiên bản app. */
export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const t = useT();
  const { theme, manual, toggle, resetToSystem } = useThemeControls();
  const { show } = useToast();
  const settings = useSettingsQuery();
  const updateSettings = useUpdateSettingsMutation();

  const [goal, setGoal] = React.useState(DEFAULT_GOAL);
  const [newPerDay, setNewPerDay] = React.useState(DEFAULT_NEW_PER_DAY);
  const [reviewPerDay, setReviewPerDay] = React.useState(DEFAULT_REVIEW_PER_DAY);
  const hydratedRef = React.useRef(false);

  // Nạp giá trị từ máy chủ đúng một lần để không ghi đè lúc người dùng đang chỉnh.
  React.useEffect(() => {
    if (!settings.data || hydratedRef.current) return;
    setGoal(settings.data.daily_goal ?? DEFAULT_GOAL);
    setNewPerDay(settings.data.srs_new_per_day ?? DEFAULT_NEW_PER_DAY);
    setReviewPerDay(settings.data.srs_review_per_day ?? DEFAULT_REVIEW_PER_DAY);
    hydratedRef.current = true;
  }, [settings.data]);

  const themeValue = manual ? theme.mode : "system";

  const handleThemeChange = (value: string) => {
    if (value === "system") {
      resetToSystem();
      return;
    }
    // toggle() đổi chế độ hiện tại; chỉ gọi khi khác để tránh nhảy hai lần.
    if (theme.mode !== value) toggle();
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        daily_goal: goal,
        srs_new_per_day: newPerDay,
        srs_review_per_day: reviewPerDay,
      });
      show(t("settings.saved"), { type: "success" });
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  return (
    <Screen
      title={t("settings.title")}
      onBack={() => navigation.goBack()}
      scroll
      onRefresh={() => void settings.refetch()}
      refreshing={settings.isRefetching}
      contentStyle={styles.content}
      testID="settings-screen"
    >
      {settings.isPending ? (
        <Card style={styles.card}>
          <Skeleton height={18} width="50%" />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </Card>
      ) : settings.isError ? (
        <Card style={styles.card}>
          <AppText variant="caption" center>
            {t("settings.loadError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void settings.refetch()}
            style={styles.retry}
            testID="settings-retry"
          />
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <NumberStepper
              label={t("settings.dailyGoal")}
              value={goal}
              unit={t("settings.dailyGoalUnit", { count: goal })}
              onChange={setGoal}
              config={GOAL_CONFIG}
              testID="settings-daily-goal"
            />
          </Card>

          <Card style={styles.card}>
            <NumberStepper
              label={t("settings.newPerDay")}
              value={newPerDay}
              unit={`${formatNumber(newPerDay)} ${t("study.cardUnit")}`}
              onChange={setNewPerDay}
              config={NEW_CONFIG}
              testID="settings-new-per-day"
            />
            <NumberStepper
              label={t("settings.reviewPerDay")}
              value={reviewPerDay}
              unit={`${formatNumber(reviewPerDay)} ${t("study.reviewUnit")}`}
              onChange={setReviewPerDay}
              config={REVIEW_CONFIG}
              testID="settings-review-per-day"
            />
          </Card>

          {/* Chế độ giao diện: theo hệ thống / sáng / tối (theme lưu cục bộ trên máy) */}
          <Card style={styles.card}>
            <AppText variant="label">{THEME_MODE_LABEL}</AppText>
            <SegmentedControl
              options={[
                { value: "system", label: THEME_SYSTEM_LABEL },
                { value: "light", label: t("theme.light") },
                { value: "dark", label: t("theme.dark") },
              ]}
              value={themeValue}
              onChange={handleThemeChange}
              testID="settings-theme"
            />
          </Card>

          <Button
            label={t("settings.save")}
            onPress={() => void handleSave()}
            loading={updateSettings.isPending}
            fullWidth
            testID="settings-save"
          />
          <AppText variant="caption" center>
            {t("settings.appVersion", { version: APP_VERSION })}
          </AppText>
        </>
      )}
    </Screen>
  );
}

/** Stepper số: nhãn + đơn vị, nút − / + kẹp trong [min, max]. */
function NumberStepper({
  label,
  value,
  unit,
  onChange,
  config,
  testID,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  config: StepperConfig;
  testID?: string;
}) {
  const theme = useTheme();
  const clamp = (next: number) => Math.min(config.max, Math.max(config.min, next));

  return (
    <View style={styles.stepper}>
      <View style={styles.stepperHeader}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption">{unit}</AppText>
      </View>
      <View style={styles.stepperControls}>
        <IconButton
          icon={<Minus size={18} color={theme.colors.text} />}
          onPress={() => onChange(clamp(value - config.step))}
          accessibilityLabel={`Giảm ${label}`}
          size="sm"
          variant="outline"
          disabled={value <= config.min}
          testID={testID ? `${testID}-minus` : undefined}
        />
        <AppText variant="title" style={styles.stepperValue}>
          {String(value)}
        </AppText>
        <IconButton
          icon={<Plus size={18} color={theme.colors.text} />}
          onPress={() => onChange(clamp(value + config.step))}
          accessibilityLabel={`Tăng ${label}`}
          size="sm"
          variant="outline"
          disabled={value >= config.max}
          testID={testID ? `${testID}-plus` : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  card: { gap: spacing.lg },
  retry: { alignSelf: "center" },
  stepper: { gap: spacing.sm },
  stepperHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  stepperValue: { minWidth: 56, textAlign: "center" },
});
