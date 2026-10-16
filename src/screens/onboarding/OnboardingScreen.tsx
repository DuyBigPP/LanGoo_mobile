import * as React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Minus, Plus } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  ProgressBar,
  Screen,
  toastError,
  useToast,
} from "@/components/ui";
import { STUDY_LANGUAGE_ID, SUPPORT_LANGUAGE_ID } from "@/config/env";
import { useAuth } from "@/contexts/AuthContext";
import {
  queryKeys,
  useCreateProfileMutation,
  useUpdateSettingsMutation,
} from "@/hooks/use-profile";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";

type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const STEP_COUNT = 2;
const GOAL_PRESETS = [5, 10, 20, 30];
const GOAL_MIN = 5;
const GOAL_MAX = 100;
const GOAL_STEP = 5;
const DEFAULT_GOAL = 5;
/** Bỏ qua bước thiết lập -> mục tiêu mặc định 5 thẻ/ngày. */
const SKIP_GOAL = 5;

/**
 * Thiết lập hồ sơ đầu tiên — app Nhật-only nên ngôn ngữ CỐ ĐỊNH JA:
 * bước 1 đặt tên hồ sơ, bước 2 chọn mục tiêu thẻ/ngày.
 */
export function OnboardingScreen(_props: OnboardingScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createProfile = useCreateProfileMutation();
  const updateSettings = useUpdateSettingsMutation();

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [goal, setGoal] = React.useState(DEFAULT_GOAL);
  const [finishing, setFinishing] = React.useState(false);

  const submitting = finishing || createProfile.isPending || updateSettings.isPending;
  const userName = user?.display_name || user?.email || t("account.guest");

  const adjustGoal = (delta: number) => {
    setGoal(current => Math.min(GOAL_MAX, Math.max(GOAL_MIN, current + delta)));
  };

  /** Tạo hồ sơ JA + lưu mục tiêu, rồi làm mới cache để RootNavigator mở Tabs. */
  const handleFinish = async (goalValue: number) => {
    if (submitting) return;
    setFinishing(true);
    try {
      await createProfile.mutateAsync({
        name: name.trim() || t("onboarding.defaultName"),
        primary_language_id: STUDY_LANGUAGE_ID,
        secondary_language_id: null,
        support_language_id: SUPPORT_LANGUAGE_ID,
      });

      await updateSettings.mutateAsync({ daily_goal: goalValue });

      // Chốt cache hồ sơ ngay — RootNavigator thấy có hồ sơ sẽ tự chuyển sang Tabs.
      await queryClient.refetchQueries({ queryKey: queryKeys.profiles });
      show(t("onboarding.done"), { type: "success" });
    } catch (error) {
      toastError(ApiError.from(error).message);
    } finally {
      setFinishing(false);
    }
  };

  const stepLabel = t("onboarding.step", {
    current: step + 1,
    total: STEP_COUNT,
    label: step === 0 ? t("onboarding.steps.profile") : t("onboarding.steps.start"),
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title={t("onboarding.title")}
        scroll
        contentStyle={styles.content}
        testID="onboarding-screen"
      >
        <View style={styles.header}>
          <AppText variant="body" weight="medium">
            {t("onboarding.greeting", { name: userName })}
          </AppText>
          <AppText variant="caption" color="muted">
            {stepLabel}
          </AppText>
          <ProgressBar value={(step + 1) / STEP_COUNT} testID="onboarding-progress" />
        </View>

        <Card style={styles.card}>
          {step === 0 ? (
            /* Bước 1: tên hồ sơ (để trống sẽ dùng tên mặc định Học tiếng Nhật) */
            <View style={styles.stepBody}>
              <AppText variant="label">{t("onboarding.profileName")}</AppText>
              <Input
                value={name}
                onChangeText={setName}
                placeholder={t("onboarding.profileNamePlaceholder", { name: t("onboarding.defaultName") })}
                autoCapitalize="words"
                maxLength={80}
                testID="onboarding-name"
              />
              <AppText variant="caption">{t("onboarding.profileNameHint")}</AppText>
            </View>
          ) : (
            /* Bước 2: mục tiêu thẻ/ngày — preset + nút tăng/giảm thay cho Slider */
            <View style={styles.stepBody}>
              <AppText variant="label">{t("onboarding.studySetupQuestion")}</AppText>
              <AppText variant="caption">{t("onboarding.goalHint")}</AppText>

              <View style={styles.presets}>
                {GOAL_PRESETS.map(preset => (
                  <Button
                    key={preset}
                    label={t("onboarding.cardsPreset", { count: preset })}
                    variant={goal === preset ? "primary" : "outline"}
                    size="sm"
                    onPress={() => setGoal(preset)}
                    testID={`onboarding-goal-${preset}`}
                  />
                ))}
              </View>

              <View style={styles.stepper}>
                <IconButton
                  icon={<Minus size={20} color={theme.colors.text} />}
                  onPress={() => adjustGoal(-GOAL_STEP)}
                  accessibilityLabel={t("onboarding.goalDecrease")}
                  size="md"
                  variant="outline"
                  disabled={goal <= GOAL_MIN}
                  testID="onboarding-goal-minus"
                />
                <View style={styles.stepperValue}>
                  <AppText size="xxl" weight="bold">
                    {String(goal)}
                  </AppText>
                  <AppText variant="caption">{t("onboarding.cardsPerDay")}</AppText>
                </View>
                <IconButton
                  icon={<Plus size={20} color={theme.colors.text} />}
                  onPress={() => adjustGoal(GOAL_STEP)}
                  accessibilityLabel={t("onboarding.goalIncrease")}
                  size="md"
                  variant="outline"
                  disabled={goal >= GOAL_MAX}
                  testID="onboarding-goal-plus"
                />
              </View>
            </View>
          )}
        </Card>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button
              label={t("onboarding.back")}
              variant="ghost"
              onPress={() => setStep(0)}
              disabled={submitting}
              testID="onboarding-back"
            />
          ) : (
            <View />
          )}

          {step === 0 ? (
            <Button
              label={t("onboarding.next")}
              onPress={() => setStep(1)}
              testID="onboarding-next"
            />
          ) : (
            <View style={styles.footerRight}>
              <Button
                label={t("onboarding.skipSetup")}
                variant="ghost"
                size="sm"
                onPress={() => void handleFinish(SKIP_GOAL)}
                disabled={submitting}
                testID="onboarding-skip"
              />
              <Button
                label={t("onboarding.finish")}
                onPress={() => void handleFinish(goal)}
                loading={submitting}
                testID="onboarding-finish"
              />
            </View>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  header: { gap: spacing.sm },
  card: { gap: spacing.md },
  stepBody: { gap: spacing.sm },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  stepperValue: { alignItems: "center", gap: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginLeft: "auto",
  },
});
