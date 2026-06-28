import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#d8dee8",
        leaf: "#1f8a70",
        sun: "#f2a93b",
        berry: "#b94b6f"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
