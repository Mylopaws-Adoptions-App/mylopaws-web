import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        magenta: { DEFAULT: '#691A47', dark: '#4E1335' },
        night: '#413A5E',
        brass: '#EFCA58',
        cream: '#FBF7F2',
        ink: { DEFAULT: '#2B2233', soft: '#6E6478' },
        line: '#EEE5DC',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
export default config;
