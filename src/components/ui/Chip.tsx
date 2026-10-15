import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./Text";

export interface ChipProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Nhãn nhỏ — viền + nền dịu, bo góc 4px theo bản web (NativeWind: token ở `global.css`).
 * Con là chuỗi/số sẽ tự động được bọc bằng AppText cho đúng font.
 */
export function Chip({ children, style, testID }: ChipProps) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <AppText size="xs" weight="medium" color="muted">
        {String(children)}
      </AppText>
    ) : (
      children
    );

  return (
    <View
      className="flex-row items-center gap-1 self-start rounded-[4px] border border-border bg-background px-2 py-[3px]"
      style={style}
      testID={testID}
    >
      {content}
    </View>
  );
}
