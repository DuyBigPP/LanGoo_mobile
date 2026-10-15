import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkPalette, lightPalette, type Palette } from "./palette";
import { fontSize, fontWeight, radius, spacing } from "./tokens";

export interface Theme {
  mode: "light" | "dark";
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
}

const lightTheme: Theme = {
  mode: "light",
  colors: lightPalette,
  spacing,
  radius,
  fontSize,
  fontWeight,
};

const darkTheme: Theme = {
  mode: "dark",
  colors: darkPalette,
  spacing,
  radius,
  fontSize,
  fontWeight,
};

interface ThemeContextValue {
  theme: Theme;
  /** true = người dùng tự chọn chế độ (không theo hệ thống) */
  manual: boolean;
  toggle: () => void;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Provider theme: mặc định theo hệ thống, có thể ghi đè thủ công. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [manualMode, setManualMode] = useState<"light" | "dark" | null>(null);

  const mode = manualMode ?? (systemScheme === "dark" ? "dark" : "light");

  const toggle = useCallback(() => {
    setManualMode(current => {
      const effective = current ?? (systemScheme === "dark" ? "dark" : "light");
      return effective === "dark" ? "light" : "dark";
    });
  }, [systemScheme]);

  const resetToSystem = useCallback(() => setManualMode(null), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === "dark" ? darkTheme : lightTheme,
      manual: manualMode !== null,
      toggle,
      resetToSystem,
    }),
    [mode, manualMode, toggle, resetToSystem],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme phải dùng trong <ThemeProvider>");
  return context.theme;
}

export function useThemeControls(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeControls phải dùng trong <ThemeProvider>");
  return context;
}
