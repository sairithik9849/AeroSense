/** @type {import('tailwindcss').Config} */
// Tailwind v4: the design tokens (colors, fonts, radius) live in src/index.css
// under the @theme block. This file only configures content sources.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
