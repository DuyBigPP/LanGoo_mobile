import * as React from "react";
import { View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  toastError,
  useToast,
} from "@/components/ui";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { APP_VERSION } from "@/config/env";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { useTheme, useThemeControls } from "@/theme";

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

function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
}

/** Chế độ giao diện: theo hệ thống / sáng / tối (theme lưu cục bộ trên máy) — dùng cho cả guest. */
export function ThemeModeControl({ testID = "settings-theme" }: { testID?: string }) {
  const t = useT();
  const { theme, manual, toggle, resetToSystem } = useThemeControls();
  const themeValue = manual ? theme.mode : "system";

  const handleThemeChange = (value: string) => {
    if (value === "system") {
      resetToSystem();
      return;
    }
    // toggle() đổi chế độ hiện tại; chỉ gọi khi khác để tránh nhảy hai lần.
    if (theme.mode !== value) toggle();
  };

  return (
    <SegmentedControl
      options={[
        { value: "system", label: t("settings.themeSystem") },
        { value: "light", label: t("settings.themeLight") },
        { value: "dark", label: t("settings.themeDark") },
      ]}
      value={themeValue}
      onChange={handleThemeChange}
      testID={testID}
    />
  );
}

/** Khối Cài đặt trong Hồ sơ (mirror web ProfileSettingsSection): mục tiêu, SRS, múi giờ, giao diện, ngôn ngữ, phiên bản. */
export function SettingsSection() {
  const t = useT();
  const { show } = useToast();
  const settings = useSettingsQuery();
  const updateSettings = useUpdateSettingsMutation();

  const [goal, setGoal] = React.useState(DEFAULT_GOAL);
  const [newPerDay, setNewPerDay] = React.useState(DEFAULT_NEW_PER_DAY);
  const [reviewPerDay, setReviewPerDay] = React.useState(DEFAULT_REVIEW_PER_DAY);
  const [timezone, setTimezone] = React.useState("");
  const hydratedRef = React.useRef(false);

  // Nạp giá trị từ máy chủ đúng một lần để không ghi đè lúc người dùng đang chỉnh.
  React.useEffect(() => {
    if (!settings.data || hydratedRef.current) return;
    setGoal(settings.data.daily_goal ?? DEFAULT_GOAL);
    setNewPerDay(settings.data.srs_new_per_day ?? DEFAULT_NEW_PER_DAY);
    setReviewPerDay(settings.data.srs_review_per_day ?? DEFAULT_REVIEW_PER_DAY);
    setTimezone(settings.data.timezone ?? deviceTimezone());
    hydratedRef.current = true;
  }, [settings.data]);

  const handleSave = async () => {
    try {
      const tz = timezone.trim();
      await updateSettings.mutateAsync({
        daily_goal: goal,
        srs_new_per_day: newPerDay,
        srs_review_per_day: reviewPerDay,
        ...(tz ? { timezone: tz } : {}),
      });
      show(t("settings.saved"), { type: "success" });
    } catch (error) {
      // Múi giờ sai định dạng IANA sẽ bị máy chủ từ chối và hiện ở đây
      toastError(ApiError.from(error).message);
    }
  };

  return (
    <View testID="profile-settings">
      <SectionHeader title={t("settings.title")} />
      {settings.isPending ? (
        <Card className="gap-4">
          <Skeleton height={18} width="50%" />
          <Skeleton height={44} />
          <Skeleton height={44} />
        </Card>
      ) : settings.isError ? (
        <Card className="gap-4">
          <AppText variant="caption" center>
            {t("settings.loadError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void settings.refetch()}
            className="self-center"
            testID="settings-retry"
          />
        </Card>
      ) : (
        <Card className="gap-4">
          <NumberStepper
            label={t("settings.dailyGoal")}
            value={goal}
            unit={t("settings.dailyGoalUnit", { count: goal })}
            onChange={setGoal}
            config={GOAL_CONFIG}
            testID="settings-daily-goal"
          />
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

          {/* Múi giờ IANA: gõ tay hoặc lấy theo máy */}
          <View className="gap-2">
            <Input
              label={t("settings.timezone")}
              value={timezone}
              onChangeText={setTimezone}
              autoCapitalize="none"
              autoCorrect={false}
              testID="settings-timezone"
            />
            <AppText variant="caption">{t("settings.timezoneHint")}</AppText>
            <Button
              label={t("settings.useDevice")}
              variant="outline"
              size="sm"
              onPress={() => setTimezone(deviceTimezone())}
              className="self-center"
              testID="settings-timezone-device"
            />
          </View>

          <Button
            label={t("settings.save")}
            onPress={() => void handleSave()}
            loading={updateSettings.isPending}
            fullWidth
            testID="settings-save"
          />
        </Card>
      )}

      {/* Giao diện + ngôn ngữ + phiên bản: cục bộ, không phụ thuộc máy chủ */}
      <Card className="mt-4 gap-4">
        <AppText variant="label">{t("settings.themeMode")}</AppText>
        <ThemeModeControl />
        <View className="flex-row items-center justify-between gap-2">
          <AppText variant="label">{t("language.label")}</AppText>
          <LanguageToggle testID="profile-language-toggle" />
        </View>
        <AppText variant="caption" center>
          {t("settings.appVersion", { version: APP_VERSION })}
        </AppText>
      </Card>
    </View>
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
  const t = useT();
  const clamp = (next: number) => Math.min(config.max, Math.max(config.min, next));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption">{unit}</AppText>
      </View>
      <View className="flex-row items-center justify-center gap-5">
        <IconButton
          icon={<Minus size={18} color={theme.colors.text} />}
          onPress={() => onChange(clamp(value - config.step))}
          accessibilityLabel={t("settings.decrease", { label })}
          size="sm"
          variant="outline"
          disabled={value <= config.min}
          testID={testID ? `${testID}-minus` : undefined}
        />
        <AppText variant="title" className="min-w-[56px] text-center">
          {String(value)}
        </AppText>
        <IconButton
          icon={<Plus size={18} color={theme.colors.text} />}
          onPress={() => onChange(clamp(value + config.step))}
          accessibilityLabel={t("settings.increase", { label })}
          size="sm"
          variant="outline"
          disabled={value >= config.max}
          testID={testID ? `${testID}-plus` : undefined}
        />
      </View>
    </View>
  );
}
