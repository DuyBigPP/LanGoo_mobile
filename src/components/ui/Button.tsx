import React from "react";
import { ActivityIndicator, type StyleProp, type ViewStyle } from "react-native";
import {
  Button as ReusablesButton,
  buttonTextVariants,
  buttonVariants,
} from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type ReusablesVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ReusablesSize = "sm" | "default" | "lg";

/** Biến thể cũ của app → variant của Reusables. */
const VARIANT_MAP: Record<ButtonVariant, ReusablesVariant> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
};

/**
 * Cỡ cũ → size của Reusables, kèm class giữ đúng hình học cũ:
 * minHeight 44/48/54 (chuẩn vùng chạm a11y) và padding ngang 12/16/20.
 */
const SIZE_MAP: Record<ButtonSize, { size: ReusablesSize; className: string; text: string }> = {
  sm: { size: "sm", className: "min-h-[44px] px-3", text: "text-sm" },
  md: { size: "default", className: "min-h-[48px] px-4", text: "text-base" },
  lg: { size: "lg", className: "min-h-[54px] px-5", text: "text-lg" },
};

/** Ghi đè nhỏ để không đổi giao diện cũ: nút outline nền trong suốt. */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "",
  outline: "bg-transparent dark:bg-transparent",
  ghost: "",
  danger: "",
};

/**
 * Màu chữ theo từng biến thể — khai báo tường minh (không phụ thuộc TextClassContext
 * của Reusables) để nhãn luôn tương phản đúng với nền của biến thể.
 */
const LABEL_CLASS: Record<ButtonVariant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
  ghost: "text-primary",
  danger: "text-white",
};

/**
 * Trạng thái khoá: KHÔNG dùng `opacity-50` của Reusables (mờ cả nền lẫn chữ nên chữ
 * primary-foreground gần đen chìm vào nền tối). Thay bằng nền chính ở 70% độ đậm:
 * nền vẫn đúng tông (icon truyền từ màn vẫn đọc được) mà chữ giữ nguyên độ tương phản.
 */
const DISABLED_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary/70",
  secondary: "bg-secondary/70",
  outline: "border-border bg-transparent dark:bg-transparent",
  ghost: "bg-transparent",
  danger: "bg-destructive/70",
};
const DISABLED_LABEL_CLASS: Record<ButtonVariant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-muted-foreground",
  ghost: "text-muted-foreground",
  danger: "text-white",
};

/** Màu ripple Android: trắng mờ trên nền đậm, chàm mờ trên nền sáng. */
const RIPPLE_ON_FILLED = "rgba(255, 255, 255, 0.28)";
const RIPPLE_ON_LIGHT = "rgba(28, 58, 140, 0.14)";
const RIPPLE_ON_DARK = "rgba(255, 255, 255, 0.14)";

/** Nút bấm đa dụng — lõi là Reusables Button, 5 biến thể cũ map sang variant/size của Reusables. */
export function Button({
  label,
  variant = "primary",
  size = "md",
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  testID,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const blocked = disabled || loading;
  const rVariant = VARIANT_MAP[variant];
  const rSize = SIZE_MAP[size].size;
  const filled = variant === "primary" || variant === "danger";

  const spinnerColor = filled ? theme.colors.onPrimary : theme.colors.primary;

  // Ripple Android: nền đậm dùng trắng mờ, nền trong dùng màu theo theme
  const rippleColor = filled
    ? RIPPLE_ON_FILLED
    : theme.mode === "dark"
      ? RIPPLE_ON_DARK
      : RIPPLE_ON_LIGHT;

  // Class dựng từ buttonVariants của Reusables rồi ghi đè hình học cũ;
  // phần trùng với ReusablesButton được tailwind-merge gộp lại.
  // `opacity-100` khi khoá để ghi đè `opacity-50` mặc định của Reusables (xem DISABLED_CLASS).
  const buttonClass = cn(
    buttonVariants({ variant: rVariant, size: rSize }),
    "gap-2 rounded-xl",
    SIZE_MAP[size].className,
    fullWidth ? "self-stretch" : "self-start",
    blocked ? "opacity-100" : null,
    blocked ? DISABLED_CLASS[variant] : VARIANT_CLASS[variant],
  );

  return (
    <ReusablesButton
      variant={rVariant}
      size={rSize}
      className={buttonClass}
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      android_ripple={{ color: rippleColor }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={style}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : icon}
      <Text
        className={cn(
          buttonTextVariants({ variant: rVariant, size: rSize }),
          SIZE_MAP[size].text,
          "font-semibold",
          blocked ? DISABLED_LABEL_CLASS[variant] : LABEL_CLASS[variant],
        )}
      >
        {label}
      </Text>
      {!loading ? iconRight : null}
    </ReusablesButton>
  );
}
