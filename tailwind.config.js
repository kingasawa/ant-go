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
        // Accent color — driven by CSS variables in globals.css
        accent: {
          DEFAULT:  "rgb(var(--tw-accent) / <alpha-value>)",
          light:    "rgb(var(--tw-accent-light) / <alpha-value>)",
          dark:     "rgb(var(--tw-accent-dark) / <alpha-value>)",
          contrast: "rgb(var(--tw-accent-contrast) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}

