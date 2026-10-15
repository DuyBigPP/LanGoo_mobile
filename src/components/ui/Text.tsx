import { Platform, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { cva } from "class-variance-authority";
import { Text as ReusablesText } from "@/components/reusables/text";
import { cn } from "@/lib/utils";
import { fontSize, fontWeight } from "@/theme";

/** Biến thể chữ dùng chung toàn app. */
export type TextVariant = "title" | "subtitle" | "body" | "caption" | "label" | "mono";
/** Màu chữ theo ngữ nghĩa (lấy từ palette của theme). */
export type TextColor =
  | "default"
  | "muted"
  | "faint"
  | "primary"
  | "danger"
  | "success"
  | "onPrimary";
export type TextWeight = keyof typeof fontWeight;
export type TextSize = keyof typeof fontSize;

export interface AppTextProps extends Omit<TextProps, "style"> {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  size?: TextSize;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  /** Class Tailwind thêm vào (NativeWind) — gộp sau cùng nên ghi đè được. */
  className?: string;
}

const MONO_FONT = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

/**
 * Token cũ → class (theo docs/NATIVEWIND_MIGRATION.md).
 * Lưu ý: KHÔNG dùng `text-hero` — tailwind-merge xếp nó vào nhóm màu nên bị class màu ghi đè mất;
 * `text-[40px]` giữ đúng cỡ chữ 40 của token hero.
 */
const appTextVariants = cva("", {
  variants: {
    variant: {
      title: "text-xl font-bold",
      subtitle: "text-lg font-semibold",
      body: "text-base font-normal",
      caption: "text-sm font-normal",
      label: "text-sm font-semibold",
      mono: "text-sm",
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      faint: "text-text-faint",
      primary: "text-primary",
      danger: "text-destructive",
      success: "text-success",
      onPrimary: "text-primary-foreground",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      xxl: "text-2xl",
      hero: "text-[40px]",
    },
    center: {
      true: "text-center",
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

/**
 * Chữ chuẩn của app — mọi văn bản nên đi qua đây để đồng bộ font/màu.
 * Lõi là Text của Reusables; `caption` mặc định dùng màu dịu hơn nếu không truyền `color`.
 */
export function AppText({
  variant = "body",
  color,
  weight,
  size,
  center,
  style,
  className,
  ...rest
}: AppTextProps) {
  const resolvedColor = color ?? (variant === "caption" ? "muted" : "default");

  return (
    <ReusablesText
      {...rest}
      className={cn(
        appTextVariants({ variant, color: resolvedColor, weight, size, center }),
        className,
      )}
      // Font chữ mono là tên font theo nền tảng — Tailwind không có utility tương ứng
      style={[variant === "mono" ? { fontFamily: MONO_FONT } : null, style]}
    />
  );
}
