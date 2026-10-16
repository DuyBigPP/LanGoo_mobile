import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";
import { HIT_SLOP, useTheme } from "@/theme";

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  /** Bắt buộc — nút chỉ có icon nên cần nhãn cho screen reader. */
  accessibilityLabel: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline";
  shape?: "circle" | "rounded";
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Kích cỡ gốc (px) — dùng cho bán kính ripple Android. */
const SIZES = { sm: 36, md: 44 } as const;
/** Cùng kích cỡ đó bằng class (36px = h-9, 44px = h-11). */
const SIZE_CLASS = { sm: "h-9 w-9", md: "h-11 w-11" } as const;

/** Màu ripple Android: chàm mờ trên nền sáng, trắng mờ trên nền tối. */
const RIPPLE_ON_LIGHT = "rgba(28, 58, 140, 0.14)";
const RIPPLE_ON_DARK = "rgba(255, 255, 255, 0.14)";

/** Nút chỉ có icon — tròn hoặc bo góc, hitSlop bù đủ 44px cho cỡ sm. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = "md",
  variant = "ghost",
  shape = "circle",
  disabled = false,
  testID,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const dimension = SIZES[size];

  // Ripple Android: nút tròn dùng borderless cho cảm giác chạm tự nhiên
  const rippleColor = theme.mode === "dark" ? RIPPLE_ON_DARK : RIPPLE_ON_LIGHT;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      android_ripple={
        shape === "circle"
          ? { color: rippleColor, borderless: true, radius: dimension / 2 }
          : { color: rippleColor }
      }
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className={cn(
        "items-center justify-center self-start active:bg-secondary",
        SIZE_CLASS[size],
        shape === "circle" ? "rounded-full" : "rounded-lg",
        variant === "outline" && "border border-border",
        disabled && "opacity-40",
      )}
      style={style}
    >
      {icon}
    </Pressable>
  );
}
