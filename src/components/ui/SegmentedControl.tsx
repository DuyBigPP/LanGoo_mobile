import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";
import { AppText } from "./Text";

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Tab phân đoạn — chọn 1 trong n, không cần thư viện native. */
export function SegmentedControl({
  options,
  value,
  onChange,
  testID,
  style,
}: SegmentedControlProps) {
  return (
    <View
      className="flex-row items-center gap-0.5 rounded-xl border border-border bg-background p-[3px]"
      style={style}
      testID={testID}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            className={cn(
              "min-h-10 flex-1 items-center justify-center rounded-lg border border-transparent px-2",
              selected && "border-border bg-card",
            )}
          >
            <AppText
              size="sm"
              weight={selected ? "semibold" : "medium"}
              color={selected ? "primary" : "muted"}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
