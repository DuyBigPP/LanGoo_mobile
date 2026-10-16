import React from "react";
import { ActivityIndicator, View } from "react-native";
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
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? (
        <AppText variant="caption" color="muted" className="mt-1">
          {label}
        </AppText>
      ) : null}
      {waking ? (
        <AppText variant="caption" color="muted" center className="mt-1">
          {t("guards.serverWaking")}
        </AppText>
      ) : null}
    </View>
  );
}
