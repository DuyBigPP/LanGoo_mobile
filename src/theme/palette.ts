/** Bảng màu light/dark (chuyển từ oklch của web index.css sang sRGB). */

export interface Palette {
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  /** Đỏ logo — dùng cho highlight từ đang tra trong câu ví dụ */
  brand: string;
  /** Đỏ cam dấu kiểm duyệt (token `stamp` của web) */
  stamp: string;
  text: string;
  textMuted: string;
  textFaint: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  highlight: string;
  overlay: string;
}

export const lightPalette: Palette = {
  background: "#F1F5FA",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  border: "#DBE4F1",
  primary: "#23418F",
  primarySoft: "#E3ECF9",
  onPrimary: "#F8FAFD",
  brand: "#fc3603",
  stamp: "#D33E25",
  text: "#192645",
  textMuted: "#62718B",
  textFaint: "#94A3B8",
  danger: "#E74328",
  dangerSoft: "#FEE2E2",
  success: "#16A34A",
  warning: "#D97706",
  highlight: "#FDE047",
  overlay: "rgba(15, 23, 42, 0.45)",
};

export const darkPalette: Palette = {
  background: "#141921",
  card: "#1F252F",
  cardElevated: "#1F252F",
  border: "#363D4B",
  primary: "#A1BAF2",
  primarySoft: "#272E3A",
  onPrimary: "#101725",
  brand: "#fc3603",
  stamp: "#FB836D",
  text: "#EBF1F8",
  textMuted: "#B1BAC7",
  textFaint: "#6B7488",
  danger: "#F56F57",
  dangerSoft: "#3A1D1D",
  success: "#4ADE80",
  warning: "#FBBF24",
  highlight: "#FDE047",
  overlay: "rgba(0, 0, 0, 0.55)",
};
