/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          pink: '#F8A4D8',
          'pink-light': '#FDE8F5',
          'pink-dark': '#E077B8',
          lilac: '#D8B4F8',
          'lilac-light': '#F3EAFF',
          'lilac-dark': '#B886E8',
          cream: '#FFFBF9',
          yellow: '#FEF3C7',
          mint: '#D1FAE5',
        },
        brand: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F8A4D8',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        festive: ['Fredoka', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(216, 180, 248, 0.25), 0 2px 6px -1px rgba(248, 164, 216, 0.15)',
        'float': '0 20px 30px -10px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
