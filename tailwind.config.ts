import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        field: {
          900: "#0a2010",
          800: "#122a18",
          700: "#1a4028",
          600: "#1e5c34",
          500: "#246b3c",
          400: "#2d8049",
          300: "#52b788",
          200: "#95d5b2",
          100: "#d8f3dc",
          50: "#f0fdf4",
        },
        gold: "#f5a623",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
