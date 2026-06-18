/** @type {import('tailwindcss').Config} */
// Subset del config de packages/web. La landing es monocromática (slate + indigo
// literales de Tailwind), así que NO necesita el sistema de tokens HSL del app.
// Solo necesita las familias tipográficas (incl. hebreo/griego para los mocks).
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        bible: ['Crimson Pro', 'serif'],
        hebrew: ['Ezra SIL', 'Ezra SIL SR', 'SBL Hebrew', 'Times New Roman', 'serif'],
        greek: ['SBL Greek', 'GFS Didot', 'Gentium Plus', 'Gentium', 'Times New Roman', 'serif'],
        reading: ['Source Serif 4', 'Source Serif Pro', 'Charter', 'Iowan Old Style', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
