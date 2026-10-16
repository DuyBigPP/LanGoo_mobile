import { type StyleProp, type ViewStyle } from "react-native";
import { Tabs, TabsList, TabsTrigger } from "@/components/reusables/tabs";
import { Text } from "@/components/reusables/text";
import { cn } from "@/lib/utils";

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
  className?: string;
}

/**
 * Tab phân đoạn — chọn 1 trong n. Lõi là Tabs của React Native Reusables (giống Tabs shadcn bên web);
 * API giữ nguyên. Nhãn 1 dòng, tự co nhẹ nếu quá chật.
 */
export function SegmentedControl({ options, value, onChange, testID, style, className }: SegmentedControlProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className="gap-0">
      <TabsList className={cn("mr-0 h-auto w-full", className)} style={style} testID={testID}>
        {options.map(option => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            accessibilityLabel={option.label}
            testID={testID ? `${testID}-${option.value}` : undefined}
            className="h-auto min-h-10 flex-1"
          >
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {option.label}
            </Text>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
