import { type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { Skeleton as ReusablesSkeleton } from "@/components/reusables/skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Bán kính bo góc; mặc định 8 (radius.sm cũ) — truyền số khác sẽ ghi đè bằng style. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
}

/**
 * Khối xám nhấp nháy — placeholder khi nội dung đang tải.
 * Lõi là Skeleton của Reusables (`animate-pulse`); màu nền đổi về `border` như bản cũ.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius: cornerRadius,
  style,
  className,
  testID,
}: SkeletonProps) {
  return (
    <ReusablesSkeleton
      testID={testID}
      className={cn("bg-border", cornerRadius === undefined && "rounded-sm", className)}
      style={[
        { width, height },
        cornerRadius !== undefined ? { borderRadius: cornerRadius } : null,
        style,
      ]}
    />
  );
}
