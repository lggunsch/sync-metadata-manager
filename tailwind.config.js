/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow:  '#F6FA00',
          navy:    '#060D1A',
          'navy-1': '#0B1525',
          'navy-2': '#111E33',
          'navy-3': '#1A2C45',
          gray:    '#6E85A0',
          'gray-lt': '#B0BFD0',
        },
      },
    },
  },
  plugins: [],
}