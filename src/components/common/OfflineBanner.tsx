import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/Text";
import { useI18n } from "@/i18n";
import { subscribeConnectivity } from "@/lib/netinfo";

/** Banner offline đầu app (netinfo chưa link → luôn coi là online, banner ẩn). */
export function OfflineBanner() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => subscribeConnectivity(setOnline), []);

  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      className="gap-0.5 bg-danger-soft px-4 pb-2"
      style={{ paddingTop: insets.top + 8 }}
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
