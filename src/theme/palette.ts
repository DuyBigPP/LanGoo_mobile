/** Bảng màu light/dark (lấy tinh thần từ web: primary chàm #1C3A8C). */

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
  background: "#F5F7FB",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  border: "#E2E8F0",
  primary: "#1C3A8C",
  primarySoft: "#E4EAF9",
  onPrimary: "#FFFFFF",
  brand: "#fc3603",
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  success: "#16A34A",
  warning: "#D97706",
  highlight: "#FDE047",
  overlay: "rgba(15, 23, 42, 0.45)",
};

export const darkPalette: Palette = {
  background: "#0F1117",
  card: "#151820",
  cardElevated: "#1B1F2A",
  border: "#2A3040",
  primary: "#8FA8F0",
  primarySoft: "#232B45",
  onPrimary: "#0F1117",
  brand: "#fc3603",
  text: "#E7EAF3",
  textMuted: "#9AA4B8",
  textFaint: "#6B7488",
  danger: "#F87171",
  dangerSoft: "#3A1D1D",
  success: "#4ADE80",
  warning: "#FBBF24",
  highlight: "#FDE047",
  overlay: "rgba(0, 0, 0, 0.55)",
};
