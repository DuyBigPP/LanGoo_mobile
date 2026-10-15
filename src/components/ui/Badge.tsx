import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { Badge as ReusablesBadge } from "@/components/reusables/badge";
import { cn } from "@/lib/utils";
import { AppText } from "./Text";

export type BadgeTone = "default" | "success" | "warning";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Màu viền/chữ theo tone — token trong `global.css`, không hardcode hex. */
const TONE_BORDER: Record<BadgeTone, string> = {
  default: "border-muted-foreground",
  success: "border-success",
  warning: "border-warning",
};

const TONE_TEXT: Record<BadgeTone, string> = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
};

/**
 * Con dấu nhỏ kiểu StampBadge trên web: chữ in hoa, viền mảnh
 * — dùng cho trạng thái nghĩa (MÁY / ĐÃ DUYỆT), nhãn phụ.
 * Lõi là Badge của Reusables (variant `outline`), giữ đúng hình học cũ qua className.
 */
export function Badge({ children, tone = "default", style, testID }: BadgeProps) {
  const content =
    typeof children === "string" || typeof children === "number" ? (
      <AppText
        size="xs"
        weight="semibold"
        className={cn("uppercase tracking-[0.8px]", TONE_TEXT[tone])}
      >
        {String(children)}
      </AppText>
    ) : (
      children
    );

  return (
    <ReusablesBadge
      variant="outline"
      className={cn("self-start rounded-lg border-[1.5px] px-2 py-[1px]", TONE_BORDER[tone])}
      style={style}
      testID={testID}
    >
      {content}
    </ReusablesBadge>
  );
}
