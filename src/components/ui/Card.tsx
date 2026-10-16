import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { TextClassContext } from "@/components/reusables/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Màu ripple Android khi thẻ bấm được: chàm mờ trên nền sáng, trắng mờ trên nền tối. */
const RIPPLE_ON_LIGHT = "rgba(28, 58, 140, 0.14)";
const RIPPLE_ON_DARK = "rgba(255, 255, 255, 0.14)";

/**
 * Khối nội dung bo góc — nền card + viền mảnh; có `onPress` thì thành nút bấm.
 * Dựng thẳng View (+ TextClassContext của Reusables Card) thay vì bọc ReusablesCard: Card gốc có `gap-6`,
 * nếu đè bằng class `gap-0` thì nó thắng cả `style={{ gap }}` mà các màn truyền vào → nội dung dính nhau.
 * Không đặt class gap nào ở đây để `style.gap` của màn hình có tác dụng.
 */
export function Card({
  children,
  padded = true,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: CardProps) {
  const theme = useTheme();
  const cardClass = cn(
    "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5",
    padded && "p-4",
  );

  if (!onPress) {
    return (
      <TextClassContext.Provider value="text-card-foreground">
        <View className={cardClass} style={style} testID={testID}>
          {children}
        </View>
      </TextClassContext.Provider>
    );
  }

  // Thẻ bấm được: giữ nguyên class của Card nhưng đặt trên Pressable
  // để còn ripple + trạng thái nhấn + role button như trước.
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.mode === "dark" ? RIPPLE_ON_DARK : RIPPLE_ON_LIGHT }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(cardClass, "active:opacity-90")}
      style={style}
    >
      {children}
    </Pressable>
  );
}
