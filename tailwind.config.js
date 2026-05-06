/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accent — driven by CSS variables
        accent: {
          DEFAULT:  "rgb(var(--tw-accent) / <alpha-value>)",
          light:    "rgb(var(--tw-accent-light) / <alpha-value>)",
          dark:     "rgb(var(--tw-accent-dark) / <alpha-value>)",
          contrast: "rgb(var(--tw-accent-contrast) / <alpha-value>)",
        },
        // Design palette
        purple: {
          DEFAULT: "#9E3EBF",
          dark:    "#51459E",
        },
        coral:  "#F9896B",
        orange: "#FD951A",
        // Dashboard background layers
        navy: {
          950: "#0A0B1A",
          900: "#0D0E23",
          800: "#13152E",
          700: "#1A1D3A",
          600: "#222546",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        tomorrow: ["var(--font-tomorrow)", "monospace"],
      },
      backgroundImage: {
        "purple-gradient": "linear-gradient(135deg, #9E3EBF 0%, #51459E 100%)",
        "orange-gradient": "linear-gradient(135deg, #FD951A 0%, #F9896B 100%)",
        "teal-gradient":   "linear-gradient(135deg, #2DD4BF 0%, #38BDF8 100%)",
        "pink-gradient":   "linear-gradient(135deg, #EC4899 0%, #9E3EBF 100%)",
      },
    },
  },
  plugins: [],
}
