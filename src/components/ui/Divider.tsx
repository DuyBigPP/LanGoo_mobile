import { type StyleProp, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/reusables/separator";

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
  testID?: string;
}

/** Đường kẻ mảnh theo màu viền của theme — lõi là Separator của React Native Reusables. */
export function Divider({ style, className, testID }: DividerProps) {
  return <Separator className={cn("self-stretch", className)} style={style} testID={testID} />;
}
