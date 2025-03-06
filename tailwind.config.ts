import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        health: {
          light: "#dddddd",
          normal: "#999999",
          dark: "#555555",
          verydark: "#333333",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
