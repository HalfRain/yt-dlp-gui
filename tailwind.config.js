/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-navy': '#0B0E14',
        'graphite': '#1E293B',
        'slate-border': '#334155',
        'slate-muted': '#94A3B8',
        'fog-white': '#F8FAFC',
        'electric-cyan': '#22D3EE',
        'sky-bright': '#38BDF8',
        'amber-warm': '#F97316',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
