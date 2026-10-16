import * as React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError } from "@/api/client";
import {
  AppText,
  Badge,
  Button,
  Card,
  Flag,
  Input,
  Screen,
  toastError,
  useToast,
} from "@/components/ui";
import { STUDY_LANGUAGE_ID, SUPPORT_LANGUAGE_ID } from "@/config/env";
import {
  queryKeys,
  useCreateProfileMutation,
  useProfilesQuery,
  useUpdateProfileMutation,
} from "@/hooks/use-profile";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { spacing } from "@/theme";

type ProfileFormScreenProps = NativeStackScreenProps<RootStackParamList, "ProfileForm">;

/**
 * Tạo/sửa hồ sơ học: chỉ nhập tên, ngôn ngữ cố định JA (app Nhật-only).
 * Tạo mới -> invalidate danh sách; sửa -> mutation tự làm mới cache.
 */
export function ProfileFormScreen({ navigation, route }: ProfileFormScreenProps) {
  const t = useT();
  const { show } = useToast();
  const queryClient = useQueryClient();

  const profiles = useProfilesQuery();
  const createProfile = useCreateProfileMutation();
  const updateProfile = useUpdateProfileMutation();

  const profileId = route.params?.profileId;
  const isEdit = Boolean(profileId);
  const editing = profileId ? profiles.data?.data.find(item => item.id === profileId) : undefined;

  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const hydratedRef = React.useRef(false);

  // Điền sẵn tên khi mở chế độ sửa (chỉ một lần, tránh ghi đè lúc người dùng đang gõ).
  React.useEffect(() => {
    if (!isEdit || !editing || hydratedRef.current) return;
    setName(editing.name);
    hydratedRef.current = true;
  }, [isEdit, editing]);

  const pending = createProfile.isPending || updateProfile.isPending;
  const notFound = isEdit && !profiles.isPending && !editing;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("errors.fieldRequired"));
      return;
    }
    setError(undefined);

    try {
      if (isEdit && profileId) {
        await updateProfile.mutateAsync({ id: profileId, patch: { name: trimmed } });
        show(t("profile.saved"), { type: "success" });
      } else {
        await createProfile.mutateAsync({
          name: trimmed,
          primary_language_id: STUDY_LANGUAGE_ID,
          secondary_language_id: null,
          support_language_id: SUPPORT_LANGUAGE_ID,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.profiles });
        show(t("profile.created", { name: trimmed }), { type: "success" });
      }
      navigation.goBack();
    } catch (err) {
      toastError(ApiError.from(err).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title={isEdit ? t("profile.formEditTitle") : t("profile.formCreateTitle")}
        onBack={() => navigation.goBack()}
        scroll
        contentStyle={styles.content}
        testID="profile-form"
      >
        {notFound ? (
          /* Hồ sơ cần sửa không còn trong danh sách (đã bị xoá ở nơi khác) */
          <Card style={styles.card}>
            <AppText variant="caption" center>
              {t("profile.loadError")}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={() => void profiles.refetch()}
              style={styles.retry}
              testID="profile-form-retry"
            />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <AppText variant="caption">{t("profile.formDesc")}</AppText>
              <Input
                label={t("profile.formName")}
                value={name}
                onChangeText={setName}
                placeholder={t("profile.formNamePlaceholder")}
                autoCapitalize="words"
                error={error}
                maxLength={80}
                testID="profile-form-name"
              />
            </Card>

            {/* Ngôn ngữ học cố định JA — chỉ hiển thị để thông tin, không cho chọn */}
            <Card>
              <View style={styles.languageRow}>
                <Flag code="ja" size="lg" />
                <View style={styles.languageInfo}>
                  <AppText variant="body" weight="semibold">
                    {t("onboarding.japanese")}
                  </AppText>
                  <AppText variant="caption">{t("profile.fixedLanguageNote")}</AppText>
                </View>
                <Badge>{t("profile.formPrimary")}</Badge>
              </View>
            </Card>

            <Button
              label={isEdit ? t("profile.submitEdit") : t("profile.submitCreate")}
              onPress={() => void handleSubmit()}
              loading={pending}
              fullWidth
              testID="profile-form-submit"
            />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  card: { gap: spacing.md },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  languageInfo: { flex: 1, gap: 2 },
  retry: { alignSelf: "center" },
});
