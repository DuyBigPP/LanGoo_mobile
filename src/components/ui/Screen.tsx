import React from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { ChevronLeft } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import { IconButton } from "./IconButton";

export interface ScreenProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** true = bọc nội dung trong ScrollView. */
  scroll?: boolean;
  /** Kéo xuống để làm mới (chỉ có tác dụng khi `scroll`). */
  onRefresh?: () => void;
  /** Trạng thái đang làm mới của RefreshControl. */
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Khung màn hình: SafeAreaView + header tuỳ chọn (tiêu đề, nút quay lại, slot phải)
 * + vùng nội dung cuộn hoặc cố định.
 */
export function Screen({
  title,
  onBack,
  right,
  children,
  scroll = false,
  onRefresh,
  refreshing = false,
  contentStyle,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const showHeader = Boolean(title || onBack || right);

  // Màn trong tab: tab bar đã lo safe area đáy nên không cộng thêm.
  // Màn stack (context vắng) mới cần đệm đáy để không sát home indicator.
  const inTabs = React.useContext(BottomTabBarHeightContext) !== undefined;
  const bottomPad = inTabs ? 0 : insets.bottom;
  const bottomInsetStyle = bottomPad > 0 ? { paddingBottom: spacing.lg + bottomPad } : null;

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-background"
      testID={testID}
    >
      {showHeader ? (
        <View className="min-h-[52px] flex-row items-center gap-2 border-b border-border px-3">
          {onBack ? (
            <IconButton
              icon={<ChevronLeft size={22} color={theme.colors.text} />}
              onPress={onBack}
              accessibilityLabel={t("common.back")}
              size="sm"
              variant="ghost"
              testID={testID ? `${testID}-back` : undefined}
            />
          ) : null}
          <Text className="flex-1 text-lg font-semibold" numberOfLines={1}>
            {title ?? ""}
          </Text>
          <View className="flex-row items-center gap-2">{right}</View>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          contentContainerStyle={[contentStyle, bottomInsetStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors.card}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 p-4" style={[contentStyle, bottomInsetStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
