import React from "react";
import { StatusBar, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colorScheme } from "nativewind";
import { PortalHost } from "@rn-primitives/portal";
import "../global.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/i18n";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "@/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ClipboardLookup } from "@/components/dictionary/ClipboardLookup";
import { subscribeConnectivity } from "@/lib/netinfo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

// React Query biết trạng thái mạng thật (netinfo chưa link → mặc định online)
onlineManager.setEventListener((setOnline) => subscribeConnectivity(setOnline));

/** Đồng bộ chế độ sáng/tối của app sang NativeWind (`dark:` hoạt động theo class). */
function NativeWindThemeSync() {
  const theme = useTheme();
  React.useEffect(() => {
    colorScheme.set(theme.mode);
  }, [theme.mode]);
  return null;
}

/** Bọc NavigationContainer theo theme của app. */
function ThemedNavigation() {
  const theme = useTheme();
  const navTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <View className="flex-1">
        <OfflineBanner />
        <RootNavigator />
        <ClipboardLookup />
      </View>
    </NavigationContainer>
  );
}

/** App gốc — thứ tự provider: i18n → theme → query → toast → auth → navigation. */
export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AuthProvider>
                <NativeWindThemeSync />
                <ThemedNavigation />
                {/* Portal cho dialog/select/tooltip của Reusables */}
                <PortalHost />
              </AuthProvider>
            </ToastProvider>
          </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
