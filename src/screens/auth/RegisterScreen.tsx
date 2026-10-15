import * as React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Eye, EyeOff } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  Screen,
  toastError,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, "Register">;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Backend yêu cầu mật khẩu tối thiểu 8 ký tự (khớp web) — dùng hằng số dưới
 * hiện ghi "8 ký tự" nên dùng tạm chuỗi tiếng Việt (đã ghi trong báo cáo).
 */
const PASSWORD_MIN = 8;
const DISPLAY_NAME_MAX = 50;

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/** Màn tạo tài khoản: tên hiển thị (tuỳ chọn) + email + mật khẩu + nhập lại. */
export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { register } = useAuth();

  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Nút "Tiếp" trên bàn phím đi lần lượt: tên → email → mật khẩu → nhập lại
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmRef = React.useRef<TextInput>(null);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = displayName.trim();
    if (trimmedName.length > DISPLAY_NAME_MAX) next.displayName = t("auth.displayNameMax");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = t("auth.emailRequired");
    else if (!EMAIL_PATTERN.test(trimmedEmail)) next.email = t("auth.emailInvalid");

    if (!password) next.password = t("auth.passwordRequired");
    else if (password.length < PASSWORD_MIN) {
      next.password = t("auth.passwordMin");
    }

    if (!confirmPassword) next.confirmPassword = t("auth.confirmRequired");
    else if (confirmPassword !== password) next.confirmPassword = t("auth.confirmMismatch");
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (next.displayName || next.email || next.password || next.confirmPassword) return;

    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
      });
      show(t("auth.registerSuccess"), { type: "success" });
    } catch (error) {
      toastError(ApiError.from(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title={t("auth.registerTitle")}
        onBack={() => navigation.goBack()}
        scroll
        contentStyle={styles.content}
        testID="register-screen"
      >
        {/* Đầu màn: thương hiệu + lời mời đăng ký */}
        <View style={styles.brand}>
          <AppText size="hero" weight="bold" color="primary" center>
            Langoo
          </AppText>
          <AppText variant="body" color="muted" center>
            {t("auth.registerSubtitle")}
          </AppText>
        </View>

        <Card style={styles.card}>
          <Input
            label={t("auth.displayName")}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t("auth.displayNamePlaceholder")}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
            textContentType="nickname"
            error={errors.displayName}
            testID="register-name"
          />

          <Input
            ref={emailRef}
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            textContentType="emailAddress"
            error={errors.email}
            testID="register-email"
          />

          <Input
            ref={passwordRef}
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.passwordPlaceholder")}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmRef.current?.focus()}
            textContentType="newPassword"
            error={errors.password}
            testID="register-password"
            rightSlot={
              <IconButton
                icon={
                  showPassword ? (
                    <EyeOff size={18} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.colors.textMuted} />
                  )
                }
                onPress={() => setShowPassword(value => !value)}
                accessibilityLabel={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                size="sm"
                testID="register-password-toggle"
              />
            }
          />

          <Input
            ref={confirmRef}
            label={t("auth.confirmPassword")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("auth.passwordConfirmPlaceholder")}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
            textContentType="newPassword"
            error={errors.confirmPassword}
            testID="register-confirm-password"
          />

          <Button
            label={t("auth.registerAction")}
            onPress={() => void handleSubmit()}
            loading={submitting}
            fullWidth
            testID="register-submit"
          />
        </Card>

        <View style={styles.footer}>
          <AppText variant="caption">{t("auth.hasAccount")}</AppText>
          <Button
            label={t("auth.loginNow")}
            variant="ghost"
            size="sm"
            onPress={() => navigation.goBack()}
            testID="register-login-link"
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  brand: { gap: spacing.xs },
  card: { gap: spacing.md },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
