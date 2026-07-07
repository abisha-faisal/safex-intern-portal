import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0A1628", // deepest navy, headings
          800: "#101B34",
          700: "#16233F",
          600: "#243350",
        },
        navy: {
          DEFAULT: "#12224A", // primary brand
          50: "#EEF2FA",
          100: "#DCE4F3",
          200: "#B6C6E6",
          300: "#8FA7D9",
          400: "#5B7FC4",
          500: "#2F5AA8",
          600: "#1E3F82",
          700: "#12224A",
          800: "#0C1A3B",
          900: "#08122A",
        },
        signal: {
          DEFAULT: "#2E6BE6", // interactive blue accent (from logo gradient)
          50: "#EAF1FE",
          100: "#D3E2FD",
          400: "#5488F0",
          500: "#2E6BE6",
          600: "#1E52C4",
        },
        teal: {
          DEFAULT: "#4FA79E", // secondary muted teal accent
          50: "#EAF6F4",
          100: "#D2ECE8",
          400: "#6FBBB2",
          500: "#4FA79E",
          600: "#3A8880",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          sunk: "#F6F7FA",
          raised: "#FFFFFF",
          muted: "#F0F2F6",
        },
        border: {
          DEFAULT: "#E3E7EE",
          strong: "#CBD2DF",
        },
        status: {
          pending: "#9A6A1E",
          pendingBg: "#FBF1E1",
          progress: "#1E52C4",
          progressBg: "#E9F0FD",
          complete: "#1D7A5C",
          completeBg: "#E5F5EE",
          blocked: "#B23A48",
          blockedBg: "#FBEAEC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        sx: "3px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 22, 40, 0.04), 0 1px 0 rgba(10, 22, 40, 0.03)",
        panel: "0 4px 16px rgba(10, 22, 40, 0.08), 0 1px 2px rgba(10, 22, 40, 0.06)",
        popover: "0 8px 24px rgba(10, 22, 40, 0.12), 0 2px 6px rgba(10, 22, 40, 0.08)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
