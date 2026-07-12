import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Mylopaws design system (SKILL section 8) ──────────────────────
        plum: { DEFAULT: '#6B1A47', dark: '#4E1335', tint: '#E7D3DF', soft: '#F5E9F0' },
        mint: '#A5EBE3',
        butter: '#F8DE64',
        success: '#1F9D55',
        danger: '#E5484D',
        // `ink` is #111111 (page titles). `ink-soft` retained for internal ops screens.
        ink: { DEFAULT: '#111111', soft: '#6E6478' },
        body: '#333333',
        muted: '#7A7A7A',
        line: '#E5E5E5',
        surface: { DEFAULT: '#FFFFFF', alt: '#F7F7F7' },

        // ── Legacy aliases — used only by internal /ops and /homes screens ──
        // Kept so those out-of-scope screens don't regress during the rebuild.
        magenta: { DEFAULT: '#691A47', dark: '#4E1335' },
        night: '#413A5E',
        brass: '#EFCA58',
        cream: '#FBF7F2',
      },
      fontFamily: {
        // Geometric sans throughout. No serifs (SKILL section 2).
        sans: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
        // `display` retained as a non-serif alias for legacy screens.
        display: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: '28px',
        card: '16px',
        input: '12px',
        sheet: '24px',
        xl2: '1.25rem', // legacy
      },
      boxShadow: {
        card: '0 2px 12px rgba(17,17,17,0.06)',
        floating: '0 4px 20px rgba(17,17,17,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
