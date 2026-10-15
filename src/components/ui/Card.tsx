import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Card as ReusablesCard } from "@/components/reusables/card";
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
 * Lõi là Card của Reusables; bỏ gap/py mặc định (6/6) và bo góc 16 cho đúng khối cũ.
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
    "gap-0 overflow-hidden rounded-2xl border-border bg-card py-0",
    padded && "p-4",
  );

  if (!onPress) {
    return (
      <ReusablesCard className={cardClass} style={style} testID={testID}>
        {children}
      </ReusablesCard>
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
