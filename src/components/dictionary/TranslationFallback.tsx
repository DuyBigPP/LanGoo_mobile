import React from "react";
import { StyleSheet, View } from "react-native";
import { Copy, Languages } from "lucide-react-native";
import { FuriganaText } from "@/components/common/FuriganaText";
import { AppText, Button, Card, useToast } from "@/components/ui";
import { useFurigana, useFuriganaPreference } from "@/hooks/use-furigana";
import { useTranslation } from "@/hooks/use-translation";
import { useT } from "@/i18n";
import { copyText } from "@/lib/clipboard";
import { spacing, useTheme } from "@/theme";

/** Card dịch fallback (client-side) khi từ điển không có kết quả nào khớp. */
export function TranslationFallback({ query }: { query: string }) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const translation = useTranslation(query, true);
  // Tra tiếng Nhật không ra: kèm furigana của chính cụm đã nhập (như web TranslationDetailDialog)
  const [furiganaEnabled] = useFuriganaPreference();
  const furigana = useFurigana(query, furiganaEnabled);

  const handleCopy = () => {
    if (!translation.result?.text) return;
    copyText(translation.result.text);
    show(t("common.copied"), { type: "success" });
  };

  return (
    <Card style={styles.card} testID="dict-translation-fallback">
      <View style={styles.header}>
        <Languages size={16} color={theme.colors.primary} />
        <AppText variant="subtitle" style={styles.title}>
          {t("dict.lookupTranslationTitle")}
        </AppText>
      </View>
      {furigana.status === "done" ? <FuriganaText segments={furigana.segments} size={20} /> : null}
      {translation.status === "loading" ? (
        <AppText variant="caption">{t("dict.lookupTranslating")}</AppText>
      ) : translation.status === "error" ? (
        <View style={styles.error}>
          <AppText variant="caption" color="danger" style={styles.title}>
            {t("dict.lookupTranslateError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={translation.refetch}
          />
        </View>
      ) : translation.result?.text ? (
        <>
          <AppText variant="body" selectable>
            {translation.result.text}
          </AppText>
          <Button
            label={t("dict.lookupCopy")}
            variant="outline"
            size="sm"
            icon={<Copy size={14} color={theme.colors.text} />}
            onPress={handleCopy}
            testID="dict-translation-copy"
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1 },
  error: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
