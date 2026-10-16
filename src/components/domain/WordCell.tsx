import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { AppText, Flag } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface WordCellProps {
  /** Mặt chữ (từ gốc hoặc biến thể). */
  surface: string;
  /** Cách đọc (kana/romaji) — tuỳ chọn. */
  reading?: string;
  /** Mã ngôn ngữ để hiện cờ: ja/en/vi (hoặc jp/gb/vn). */
  langCode?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
}

/** Ô từ vựng: cờ ngôn ngữ + từ + cách đọc + slot phải tuỳ chọn. */
export function WordCell({ surface, reading, langCode, right, style, className, testID }: WordCellProps) {
  return (
    <View className={cn("flex-row items-center gap-3", className)} style={style} testID={testID}>
      {langCode ? <Flag code={langCode} size="sm" /> : null}
      <View className="flex-1 gap-0.5">
        <AppText size="lg" weight="semibold" numberOfLines={1}>
          {surface}
        </AppText>
        {reading ? (
          <AppText variant="caption" numberOfLines={1}>
            {reading}
          </AppText>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
