/** Token kích thước & chữ — dùng thống nhất toàn app. */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Khớp web: --radius 12px; sm 8, md 10, lg 12, xl 16 (tailwind.config.js borderRadius). */
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

/** Thang chữ mặc định Tailwind (xs 12 … 2xl 24) + hero 40 riêng của app. */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  hero: 40,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/** Chiều cao tối thiểu vùng chạm (chuẩn a11y). */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
