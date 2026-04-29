import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        unisalar: ["UniSalar", "sans-serif"],
      },
      keyframes: {
        "pop-in": {
          "0%":   { transform: "scale(0.4)", opacity: "0" },
          "70%":  { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
