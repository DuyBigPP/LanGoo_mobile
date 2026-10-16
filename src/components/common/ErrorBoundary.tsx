import React from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/Text";
import { translate } from "@/i18n";

interface State {
  error: Error | null;
}

function CrashFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
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
