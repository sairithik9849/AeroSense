/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Aviation Dark" Palette
        background: '#09090b', // Very dark zinc (almost black)
        surface: '#18181b',    // Slightly lighter (for sidebars/cards)
        border: '#27272a',     // Borders
        
        // Status Colors (for the Hazard System)
        safe: '#10b981',       // Emerald 500
        caution: '#f59e0b',    // Amber 500
        danger: '#ef4444',     // Red 500
        
        // Accent (Tech Blue)
        accent: '#3b82f6',     // Blue 500
      },
      fontFamily: {
        // Use system fonts that look technical
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'], // Good for data numbers
      }
    },
  },
  plugins: [],
}