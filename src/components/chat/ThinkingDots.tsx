import * as React from "react";
import { Animated, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

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
    <View style={styles.row} testID="chat-thinking">
      <View style={styles.dots}>
        {[first, second, third].map((value, index) => (
          <Animated.View
            key={index}
            style={[styles.dot, { backgroundColor: theme.colors.textMuted }, dotAnimatedStyle(value)]}
          />
        ))}
      </View>
      <AppText variant="caption">{t("chat.thinking")}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dots: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
});
