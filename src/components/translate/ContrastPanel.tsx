import React from "react";
import { ActivityIndicator, View } from "react-native";
import { FuriganaText } from "@/components/common/FuriganaText";
import { Switch } from "@/components/reusables/switch";
import { AppText, Card } from "@/components/ui";
import { useFurigana } from "@/hooks/use-furigana";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";

export interface ContrastPanelProps {
  japanese: string;
  other: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
}

/**
 * Panel "Phân tích" kiểu Mazii (port web `ContrastPanel`): câu tiếng Nhật có furigana
 * + bên còn lại (bản dịch hoặc văn bản nguồn) ở dưới. Công tắc dùng Switch của React Native Reusables.
 */
export function ContrastPanel({ japanese, other, enabled, onEnabledChange }: ContrastPanelProps) {
  const t = useT();
  const theme = useTheme();
  const furigana = useFurigana(japanese, enabled);

  return (
    <Card testID="translate-contrast">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <AppText variant="label">{t("translatePage.contrastTitle")}</AppText>
          <View className="flex-row items-center gap-2">
            <AppText variant="caption">{t("translatePage.furigana")}</AppText>
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
              accessibilityLabel={t("translatePage.furigana")}
              testID="translate-furigana-switch"
            />
          </View>
        </View>

        {enabled ? (
          furigana.status === "loading" ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="caption">{t("translatePage.furiganaLoading")}</AppText>
            </View>
          ) : furigana.status === "error" ? (
            <AppText variant="caption" color="danger">
              {t("translatePage.furiganaError")}
            </AppText>
          ) : (
            <FuriganaText segments={furigana.segments} />
          )
        ) : (
          <AppText variant="body" selectable>
            {japanese}
          </AppText>
        )}
        {other ? (
          <AppText variant="caption" selectable>
            {other}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
