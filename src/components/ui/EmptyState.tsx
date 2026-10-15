import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { useTheme } from "@/theme";
import { AppText } from "./Text";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Trạng thái rỗng: icon trong vòng tròn + tiêu đề + mô tả + nút hành động (tuỳ chọn). */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  // useTheme chỉ để lấy màu icon lucide (giá trị JS truyền vào prop `color`)
  const theme = useTheme();

  return (
    <View className="items-center justify-center gap-2 px-7 py-7" style={style} testID={testID}>
      <View className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-soft">
        {icon ?? <Inbox size={34} color={theme.colors.primary} />}
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" center className="max-w-[340px]">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-2">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
