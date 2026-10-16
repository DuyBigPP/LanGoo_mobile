import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useT } from "@/i18n";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { spacing } from "@/theme";
import type { SearchHistoryItemDto } from "@/types/dictionary";

export interface HistoryRowProps {
  item: SearchHistoryItemDto;
  index: number;
  onPick: (query: string) => void;
}

/** Một dòng lịch sử tra từ — chạm để tra lại từ đó. */
export function HistoryRow({ item, index, onPick }: HistoryRowProps) {
  const t = useT();

  return (
    <Card padded={false} testID={`dict-history-${index}`}>
      <Pressable
        onPress={() => onPick(item.raw_query)}
        accessibilityRole="button"
        accessibilityLabel={item.raw_query}
        className="active:opacity-85"
        style={styles.row}
      >
        <AppText variant="body" weight="medium" numberOfLines={1} style={styles.query}>
          {item.raw_query}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {item.result_count != null
            ? `${formatNumber(item.result_count)} ${t("dict.results").toLowerCase()} · `
            : ""}
          {formatRelativeTime(item.created_at)}
        </AppText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  query: { flex: 1 },
});
