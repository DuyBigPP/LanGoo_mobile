import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/Text";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme";
import { subscribeConnectivity } from "@/lib/netinfo";

/** Banner offline đầu app (netinfo chưa link → luôn coi là online, banner ẩn). */
export function OfflineBanner() {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => subscribeConnectivity(setOnline), []);

  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: theme.colors.dangerSoft, paddingTop: insets.top + 8 },
      ]}
    >
      <AppText variant="label" color="danger">
        {t("pwa.offlineTitle")}
      </AppText>
      <AppText variant="caption" color="danger">
        {t("pwa.offlineHint")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 8, gap: 2 },
});
