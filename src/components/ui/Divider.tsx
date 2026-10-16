import { type StyleProp, type ViewStyle } from "react-native";
import { Separator } from "@/components/reusables/separator";

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Đường kẻ mảnh theo màu viền của theme — lõi là Separator của React Native Reusables. */
export function Divider({ style, testID }: DividerProps) {
  return <Separator className="self-stretch" style={style} testID={testID} />;
}
