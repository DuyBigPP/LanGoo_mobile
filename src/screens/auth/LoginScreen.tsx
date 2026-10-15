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

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

/** Kiểm tra email tối giản — đủ bắt lỗi thiếu @ hoặc tên miền. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Backend yêu cầu mật khẩu tối thiểu 8 ký tự (khớp web) — dùng hằng số dưới
 * hiện ghi "8 ký tự" nên dùng tạm chuỗi tiếng Việt (đã ghi trong báo cáo).
 */
const PASSWORD_MIN = 8;

interface FieldErrors {
  email?: string;
  password?: string;
}

/** Màn đăng nhập: form email + mật khẩu, lỗi hiện qua toast và từng ô nhập. */
export function LoginScreen({ navigation }: LoginScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Nút "Tiếp" trên bàn phím ở ô email sẽ focus sang ô mật khẩu
  const passwordRef = React.useRef<TextInput>(null);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = t("auth.emailRequired");
    else if (!EMAIL_PATTERN.test(trimmedEmail)) next.email = t("auth.emailInvalid");

    if (!password) next.password = t("auth.passwordRequired");
    else if (password.length < PASSWORD_MIN) {
      next.password = t("auth.passwordMin");
    }
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      show(t("auth.loginSuccess", { name: email.trim() }), { type: "success" });
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
      <Screen scroll contentStyle={styles.content} testID="login-screen">
        {/* Đầu màn: thương hiệu + dòng giới thiệu ngắn */}
        <View style={styles.brand}>
          <AppText size="hero" weight="bold" color="primary" center>
            Langoo
          </AppText>
          <AppText variant="body" color="muted" center>
            Học từ vựng tiếng Nhật
          </AppText>
        </View>

        <Card style={styles.card}>
          <AppText variant="title">{t("auth.loginTitle")}</AppText>

          <Input
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
            testID="login-email"
          />

          <Input
            ref={passwordRef}
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.passwordPlaceholder")}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => void handleSubmit()}
            textContentType="password"
            error={errors.password}
            testID="login-password"
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
                testID="login-password-toggle"
              />
            }
          />

          <Button
            label={t("auth.loginAction")}
            onPress={() => void handleSubmit()}
            loading={submitting}
            fullWidth
            testID="login-submit"
          />
        </Card>

        <View style={styles.footer}>
          <AppText variant="caption">{t("auth.noAccount")}</AppText>
          <Button
            label={t("auth.registerNow")}
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate("Register")}
            testID="login-register-link"
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
  },
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
