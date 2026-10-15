import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Đường kẻ mảnh 1 hairline theo màu viền của theme. */
export function Divider({ style, testID }: DividerProps) {
  return (
    <View
      className="self-stretch bg-border"
      // hairlineWidth phụ thuộc mật độ điểm ảnh từng máy — Tailwind không có utility tương ứng
      style={[{ height: StyleSheet.hairlineWidth }, style]}
      testID={testID}
    />
  );
}
