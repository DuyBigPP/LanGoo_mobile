import * as React from "react";
import { Animated, View } from "react-native";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";

/** 3 chấm nhấp nháy khi chờ chữ đầu tiên của trợ lý. */
export function ThinkingDots() {
  const theme = useTheme();
  const t = useT();
  const first = React.useRef(new Animated.Value(0)).current;
  const second = React.useRef(new Animated.Value(0)).current;
  const third = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const values = [first, second, third];
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((values.length - 1 - index) * 160),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [first, second, third]);

  const dotAnimatedStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
  });

  return (
    <View className="flex-row items-center gap-2" testID="chat-thinking">
      <View className="flex-row items-center gap-1">
        {[first, second, third].map((value, index) => (
          <Animated.View
            key={index}
            style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.textMuted }, dotAnimatedStyle(value)]}
          />
        ))}
      </View>
      <AppText variant="caption">{t("chat.thinking")}</AppText>
    </View>
  );
}
