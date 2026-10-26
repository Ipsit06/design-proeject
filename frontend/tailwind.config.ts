import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#F7F8F5',
        card: '#FFFFFF',
        forest: {
          DEFAULT: '#28674F',
          dark: '#1e4f3c',
          light: '#338163',
        },
        sage: {
          DEFAULT: '#E7F0E9',
          light: '#f1f6f2',
          dark: '#c8dacb',
        },
        ink: {
          DEFAULT: '#242B26',
          secondary: '#727A73',
          muted: '#9CA39E',
        },
        line: '#E2E6E0',
        status: {
          success: '#2E7D32',
          successBg: '#E8F5E9',
          warning: '#B45309',
          warningBg: '#FEF3C7',
          error: '#C53030',
          errorBg: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        card: '0 2px 8px rgba(36,43,38,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
