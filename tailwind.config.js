/**
 * Tailwind cho NativeWind — màu lấy từ `src/theme/palette.ts` (qua CSS vars trong `global.css`)
 * nên UI không đổi màu khi chuyển sang className.
 *
 * Quy ước chuyển từ token cũ:
 * - spacing: xs=1(4px) sm=2(8px) md=3(12px) lg=4(16px) xl=5(20px) xxl=7(28px)
 * - radius:  sm=rounded-lg(8) md=rounded-xl(12) lg=rounded-2xl(16) xl=rounded-[20px] pill=rounded-full
 * - chữ:     text-xs=11 text-sm=13 text-base=15 text-lg=17 text-xl=20 text-2xl=28 text-hero=40
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
        brand: "rgb(var(--brand) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        highlight: "rgb(var(--highlight) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        "text-faint": "rgb(var(--text-faint) / <alpha-value>)",
        "card-elevated": "rgb(var(--card-elevated) / <alpha-value>)",
        "primary-soft": "rgb(var(--primary-soft) / <alpha-value>)",
      },
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "18px"],
        base: ["15px", "22px"],
        lg: ["17px", "24px"],
        xl: ["20px", "28px"],
        "2xl": ["28px", "36px"],
        hero: ["40px", "48px"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
