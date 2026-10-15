import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "@/theme";
import { AppText, Flag } from "@/components/ui";

export interface WordCellProps {
  /** Mặt chữ (từ gốc hoặc biến thể). */
  surface: string;
  /** Cách đọc (kana/romaji) — tuỳ chọn. */
  reading?: string;
  /** Mã ngôn ngữ để hiện cờ: ja/en/vi (hoặc jp/gb/vn). */
  langCode?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Ô từ vựng: cờ ngôn ngữ + từ + cách đọc + slot phải tuỳ chọn. */
export function WordCell({ surface, reading, langCode, right, style, testID }: WordCellProps) {
  return (
    <View style={[styles.row, style]} testID={testID}>
      {langCode ? <Flag code={langCode} size="sm" /> : null}
      <View style={styles.body}>
        <AppText size="lg" weight="semibold" numberOfLines={1}>
          {surface}
        </AppText>
        {reading ? (
          <AppText variant="caption" numberOfLines={1}>
            {reading}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  body: { flex: 1, gap: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
