import * as React from "react";
import { Linking, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Check, Copy, ExternalLink } from "lucide-react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Screen,
  Skeleton,
  toastError,
} from "@/components/ui";
import { useSourcesQuery } from "@/hooks/use-sources";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { copyText } from "@/lib/clipboard";
import { spacing, useTheme } from "@/theme";
import type { SourceDto, SourceUsageDto } from "@/types/api";

type SourcesScreenProps = NativeStackScreenProps<RootStackParamList, "Sources">;

/** Các trường usage của nguồn + nhãn dịch tương ứng. */
const USAGE_FIELDS: Array<{ key: keyof SourceUsageDto; labelKey: string }> = [
  { key: "lexemes", labelKey: "sources.lexemes" },
  { key: "senses", labelKey: "sources.senses" },
  { key: "glosses", labelKey: "sources.glosses" },
  { key: "concepts", labelKey: "sources.concepts" },
  { key: "concept_glosses", labelKey: "sources.conceptGlosses" },
  { key: "kanji", labelKey: "sources.kanji" },
  { key: "examples", labelKey: "sources.examples" },
];

const COPIED_RESET_MS = 1500;

/** Màn Nguồn dữ liệu: license/attribution/usage từng nguồn + link và credit. */
export function SourcesScreen({ navigation }: SourcesScreenProps) {
  const t = useT();
  const sources = useSourcesQuery();

  return (
    <Screen
      title={t("sources.title")}
      onBack={() => navigation.goBack()}
      scroll
      onRefresh={() => void sources.refetch()}
      refreshing={sources.isRefetching}
      contentStyle={styles.content}
      testID="sources-screen"
    >
      <AppText variant="caption">{t("sources.hint")}</AppText>

      {sources.isPending ? (
        <Card style={styles.card}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <Skeleton height={16} width="50%" />
              <Skeleton height={12} width="80%" />
            </View>
          ))}
        </Card>
      ) : sources.isError ? (
        <Card style={styles.card}>
          <AppText variant="caption" center>
            {t("errors.generic")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void sources.refetch()}
            style={styles.retry}
            testID="sources-retry"
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {(sources.data?.data ?? []).map(source => (
            <SourceCard key={source.id} source={source} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** Một nguồn dữ liệu: tên, license, attribution, usage, link gốc và nút sao chép credit. */
function SourceCard({ source }: { source: SourceDto }) {
  const t = useT();
  const theme = useTheme();
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn timer khi thẻ bị gỡ khỏi màn hình
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const usageParts = USAGE_FIELDS.map(field => ({
    count: source.usage?.[field.key] ?? 0,
    label: t(field.labelKey),
  }))
    .filter(entry => entry.count > 0)
    .map(entry => `${entry.label} ${formatNumber(entry.count)}`);

  const handleCopy = () => {
    copyText(source.credit_line);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  const handleOpen = () => {
    if (!source.url) return;
    Linking.openURL(source.url).catch(() => toastError(t("errors.generic")));
  };

  return (
    <Card testID={`source-${source.code}`}>
      <View style={styles.sourceHeader}>
        <AppText variant="body" weight="semibold" style={styles.sourceName}>
          {source.name}
        </AppText>
        {source.license ? <Chip>{source.license}</Chip> : null}
        {source.version ? (
          <AppText variant="caption">{`v${source.version}`}</AppText>
        ) : null}
      </View>

      <AppText variant="caption">{source.attribution}</AppText>

      {usageParts.length > 0 ? (
        <AppText variant="caption">{usageParts.join(" · ")}</AppText>
      ) : null}

      <View style={styles.sourceActions}>
        {source.url ? (
          <Button
            label={t("sources.visit")}
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={14} color={theme.colors.primary} />}
            onPress={handleOpen}
            testID={`source-open-${source.code}`}
          />
        ) : null}
        <Button
          label={copied ? t("dict.lookupCopied") : t("sources.copyCredit")}
          variant="ghost"
          size="sm"
          icon={
            copied ? (
              <Check size={14} color={theme.colors.success} />
            ) : (
              <Copy size={14} color={theme.colors.textMuted} />
            )
          }
          onPress={handleCopy}
          testID={`source-copy-${source.code}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  card: { gap: spacing.md },
  list: { gap: spacing.sm },
  skeletonRow: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sourceName: { flexShrink: 1 },
  sourceActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
