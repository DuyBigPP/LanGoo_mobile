import { type StyleProp, type ViewStyle } from "react-native";
import { vars } from "nativewind";
import { Progress } from "@/components/reusables/progress";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** Tiến độ 0..1 (giá trị ngoài khoảng sẽ được kẹp lại). */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
}

/**
 * Thanh tiến độ mảnh — màu fill mặc định là primary của theme.
 * Lõi là Progress của Reusables (giá trị 0..100); hình học cũ (cao 6, bo tròn height/2)
 * và màu động truyền qua prop được giữ bằng style/vars.
 */
export function ProgressBar({
  value,
  height = 6,
  color,
  trackColor,
  style,
  className,
  testID,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);

  return (
    <Progress
      value={percent}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className={cn("w-full", !trackColor && "bg-border", className)}
      // Màu fill động (prop `color`) truyền qua CSS var — reusables chỉ nhận class cho indicator
      indicatorClassName={color ? "bg-[--progress-fill]" : "bg-primary"}
      style={[
        color ? vars({ "--progress-fill": color }) : null,
        trackColor ? { backgroundColor: trackColor } : null,
        { height, borderRadius: height / 2 },
        style,
      ]}
    />
  );
}
