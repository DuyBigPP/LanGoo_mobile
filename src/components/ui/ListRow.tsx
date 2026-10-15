import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./Text";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const ROW_CLASS = "min-h-14 flex-row items-center gap-3 px-4 py-3";

/**
 * Hàng trong danh sách — có `onPress` thì thành hàng bấm được (đổi nền khi nhấn).
 * `left` (icon) luôn nằm trước tiêu đề, `right` (badge + mũi tên) nằm cuối hàng;
 * hai ô này `shrink-0` + canh giữa dọc để tiêu đề dài không đẩy lệch icon/mũi tên.
 */
export function ListRow({ title, subtitle, left, right, onPress, testID, style }: ListRowProps) {
  const content = (
    <>
      {left ? (
        <View className="shrink-0 self-center items-center justify-center">{left}</View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <AppText variant="body" weight="medium" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? (
        <View className="shrink-0 flex-row items-center gap-2 self-center">{right}</View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View className={ROW_CLASS} style={style} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`${ROW_CLASS} active:bg-primary-soft`}
      style={style}
    >
      {content}
    </Pressable>
  );
}
