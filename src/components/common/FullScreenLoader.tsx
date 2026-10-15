import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/Text";
import { useTheme } from "@/theme";

/** Màn chờ toàn màn hình (đang kiểm tra phiên / tải dữ liệu boot). */
export function FullScreenLoader({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? (
        <AppText variant="caption" color="muted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  label: {
    marginTop: 4,
  },
});
