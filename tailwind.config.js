/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        round: ['"Baloo 2"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        drift: {
          deep: '#1c6fd6',
          mid: '#3fa9f5',
          shallow: '#7fd4ff',
          foam: '#eafaff',
          sun: '#ffd23f',
        },
      },
    },
  },
  plugins: [],
};
