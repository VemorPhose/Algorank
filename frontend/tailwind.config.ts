import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1b2021",
        paper: "#8d99ae",
        panel: "#fff1d0",
        coral: "#bb4430",
        lemon: "#fff1d0",
        aqua: "#417b5a",
        violet: "#5f6f8f",
        grass: "#417b5a",
      },
      boxShadow: {
        block: "8px 8px 0 #1b2021",
        "block-sm": "4px 4px 0 #1b2021",
        "block-lg": "12px 12px 0 #1b2021",
        header: "0 6px 0 #1b2021",
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
