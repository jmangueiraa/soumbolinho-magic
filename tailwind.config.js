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
        chiclete: {
          DEFAULT: '#ff3399',
          light: '#ff66b2',
          dark: '#e61e80',
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f8a4d8',
          400: '#f472b6',
          500: '#ff3399',
          600: '#e61e80',
          700: '#cc1470',
          800: '#9d174d',
          900: '#831843',
        },
        turquesa: {
          DEFAULT: '#00a8e8',
          light: '#38bdf8',
          dark: '#0096c7',
          50: '#f0fdfa',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#00a8e8',
          600: '#0284c7',
          700: '#0369a1',
        },
        brand: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F8A4D8',
          400: '#F472B6',
          500: '#ff3399',
          600: '#e61e80',
          700: '#cc1470',
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
