import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/Text";
import { translate } from "@/i18n";
import { useTheme } from "@/theme";

interface State {
  error: Error | null;
}

function CrashFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppText variant="title" center>
        {translate("errors.crashTitle")}
      </AppText>
      <AppText variant="caption" color="muted" center>
        {__DEV__ ? error.message : translate("errors.unknown")}
      </AppText>
      <Button label={translate("common.retry")} onPress={onRetry} />
    </View>
  );
}

/** Bắt lỗi render toàn app — nút "Thử lại" reset state để mount lại cây con. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <CrashFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
});
