import React from "react";
import { Pressable } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useT } from "@/i18n";
import { formatNumber, formatRelativeTime } from "@/lib/format";
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
        className="min-h-[52px] flex-row items-center gap-2 px-4 py-3 active:opacity-85"
      >
        <AppText variant="body" weight="medium" numberOfLines={1} className="flex-1">
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
