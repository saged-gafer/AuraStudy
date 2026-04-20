/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flow: {
          indigo: '#6366f1',
          slate: '#0f172a',
          accent: '#818cf8',
        }
      },
    },
  },
  plugins: [],
}
