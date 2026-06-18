import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f5f7fb",
        panel: "#ffffff",
        coral: "#ff5c39",
        lemon: "#ffd84d",
        aqua: "#2bd9c4",
        violet: "#6d5dfc",
        grass: "#4ade80",
      },
      boxShadow: {
        block: "8px 8px 0 #111827",
        "block-sm": "4px 4px 0 #111827",
        "block-lg": "12px 12px 0 #111827",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
