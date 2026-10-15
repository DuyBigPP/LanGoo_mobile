import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./Text";

export interface SectionHeaderProps {
  title: string;
  count?: number;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Tiêu đề mục — dùng phía trên danh sách; kèm số lượng và slot phải tuỳ chọn. */
export function SectionHeader({ title, count, right, style, testID }: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-center justify-between gap-2" style={style} testID={testID}>
      <View className="shrink flex-row items-center gap-1">
        <AppText variant="subtitle">{title}</AppText>
        {count !== undefined ? (
          <AppText variant="caption" color="muted">{`(${count})`}</AppText>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
