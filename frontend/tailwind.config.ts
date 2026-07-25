import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "320px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Gamification accents — exclusive to streak/secondary stat tiles, never the brand primary.
        streak: {
          DEFAULT: "hsl(var(--streak))",
          foreground: "hsl(var(--streak-foreground))",
          tint: "hsl(var(--streak-tint))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          tint: "hsl(var(--info-tint))",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
          tint: "hsl(var(--highlight-tint))",
        },
        // Primitive brand scale (see globals.css --green-50..900). Prefer semantic
        // tokens above (primary/accent/success) in components; use green-* only
        // when a specific step of the ramp is needed (e.g. chart series, hover tints).
        green: {
          50: "hsl(var(--green-50))",
          100: "hsl(var(--green-100))",
          200: "hsl(var(--green-200))",
          300: "hsl(var(--green-300))",
          400: "hsl(var(--green-400))",
          500: "hsl(var(--green-500))",
          600: "hsl(var(--green-600))",
          700: "hsl(var(--green-700))",
          800: "hsl(var(--green-800))",
          900: "hsl(var(--green-900))",
        },
      },
      fontFamily: {
        display: ["var(--font-newsreader)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        premium: "0 18px 42px rgba(20, 30, 55, 0.10)",
        glow: "0 0 0 2px hsl(var(--primary) / 0.22), 0 10px 24px hsl(var(--primary) / 0.16)",
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
        control: "var(--shadow-control)",
      },
      transitionDuration: {
        micro: "180ms",
        standard: "260ms",
      },
      transitionTimingFunction: {
        "out-standard": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
