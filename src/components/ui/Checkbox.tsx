import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Checkbox as ReusablesCheckbox } from "@/components/reusables/checkbox";
import { Text } from "@/components/reusables/text";
import { cn } from "@/lib/utils";
import { HIT_SLOP } from "@/theme";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Ô tick có nhãn (mirror web shadcn Checkbox + Label) — cả hàng bấm được
 * cho dễ chạm; nhãn để trống nếu chỉ cần ô tick.
 * Lõi là Checkbox của Reusables; cả hàng vẫn là vùng chạm nên ô tick chỉ hiển thị.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  style,
  testID,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      className={cn(
        "min-h-8 flex-row items-center gap-2 py-1",
        disabled ? "opacity-50" : "active:opacity-70",
      )}
      style={style}
    >
      <ReusablesCheckbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        // Ô tick nằm trong hàng đã bấm được → không nhận chạm, không lặp node a11y
        pointerEvents="none"
        accessible={false}
        className="size-5 border-[1.5px]"
      />
      {label ? <Text className="text-sm">{label}</Text> : null}
    </Pressable>
  );
}
