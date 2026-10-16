/**
 * Tailwind cho NativeWind — màu lấy từ `src/theme/palette.ts` (qua CSS vars trong `global.css`)
 * nên UI không đổi màu khi chuyển sang className.
 *
 * Quy ước chuyển từ token cũ:
 * - spacing: xs=1(4px) sm=2(8px) md=3(12px) lg=4(16px) xl=5(20px) xxl=7(28px)
 * - radius:  khớp web (--radius 12px): sm=8 md=10 lg=12 xl=16 2xl=16(mặc định) pill=rounded-full
 * - chữ:     thang mặc định Tailwind (xs=12 sm=14 base=16 lg=18 xl=20 2xl=24) + text-hero=40
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: { DEFAULT: "rgb(var(--card) / <alpha-value>)", foreground: "rgb(var(--card-foreground) / <alpha-value>)" },
        popover: { DEFAULT: "rgb(var(--popover) / <alpha-value>)", foreground: "rgb(var(--popover-foreground) / <alpha-value>)" },
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", foreground: "rgb(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "rgb(var(--secondary) / <alpha-value>)", foreground: "rgb(var(--secondary-foreground) / <alpha-value>)" },
        muted: { DEFAULT: "rgb(var(--muted) / <alpha-value>)", foreground: "rgb(var(--muted-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", foreground: "rgb(var(--accent-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "rgb(var(--destructive) / <alpha-value>)", foreground: "rgb(var(--destructive-foreground) / <alpha-value>)" },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        // token riêng của app
        stamp: "rgb(var(--stamp) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        highlight: "rgb(var(--highlight) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        "text-faint": "rgb(var(--text-faint) / <alpha-value>)",
        "card-elevated": "rgb(var(--card-elevated) / <alpha-value>)",
        "primary-soft": "rgb(var(--primary-soft) / <alpha-value>)",
      },
      borderRadius: { sm: "8px", md: "10px", lg: "12px", xl: "16px" },
      fontSize: { hero: ["40px", "48px"] },
      fontFamily: { sans: ["Be Vietnam Pro"] },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
