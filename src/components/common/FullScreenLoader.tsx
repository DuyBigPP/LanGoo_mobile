import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/Text";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";

/** Màn chờ toàn màn hình (đang kiểm tra phiên / tải dữ liệu boot). */
export function FullScreenLoader({ label }: { label?: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  // Sau 4s vẫn chờ → gợi ý máy chủ đang khởi động (cold start)
  const [waking, setWaking] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setWaking(true), 4000);
    return () => clearTimeout(id);
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      {waking ? (
        <AppText variant="caption" color="muted" center style={styles.label}>
          {t("guards.serverWaking")}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: {
    marginTop: 4,
  },
});
