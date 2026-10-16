import { type StyleProp, type ViewStyle } from "react-native";
import {
  Avatar as ReusablesAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/reusables/avatar";
import { cn } from "@/lib/utils";
import { AppText, type TextSize } from "./Text";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name?: string;
  /** Có ảnh thì hiện ảnh, không thì lấy chữ cái đầu của `name`. */
  uri?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
}

/** Cỡ cũ 32/40/56 → class size-8/10/14; cỡ chữ chữ cái đầu 13/15/20. */
const SIZE_CLASS: Record<AvatarSize, string> = { sm: "size-8", md: "size-10", lg: "size-14" };
const INITIALS_SIZE: Record<AvatarSize, TextSize> = { sm: "sm", md: "md", lg: "xl" };

/** Lấy 1–2 chữ cái đầu của tên (hỗ trợ tên nhiều từ). */
function initialsOf(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Avatar tròn — ảnh nếu có, ngược lại hiển thị chữ cái đầu trên nền primarySoft.
 * Lõi là Avatar/AvatarImage/AvatarFallback của Reusables.
 */
export function Avatar({ name, uri, size = "md", style, className, testID }: AvatarProps) {
  return (
    <ReusablesAvatar
      alt={name ?? ""}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={name}
      className={cn("bg-primary-soft", SIZE_CLASS[size], className)}
      style={style}
    >
      {uri ? (
        <AvatarImage source={{ uri }} />
      ) : (
        <AvatarFallback className="bg-primary-soft">
          <AppText weight="semibold" color="primary" size={INITIALS_SIZE[size]}>
            {initialsOf(name)}
          </AppText>
        </AvatarFallback>
      )}
    </ReusablesAvatar>
  );
}
