/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F8FA',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#0B1B2B',
          muted: '#52606D',
          subtle: '#7B8794',
        },
        line: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        brand: {
          50: '#EEF6F7',
          100: '#D8ECEF',
          200: '#B2DCE2',
          300: '#81C4CC',
          400: '#4BA5AF',
          500: '#2C8792',
          600: '#1F6F7A',
          700: '#1B5A63',
          800: '#194A52',
          900: '#173E45',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#047857',
          700: '#065F46',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#B45309',
          700: '#92400E',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 27, 43, 0.04), 0 12px 32px -24px rgba(11, 27, 43, 0.24)',
        lift: '0 2px 4px rgba(11, 27, 43, 0.04), 0 18px 40px -28px rgba(11, 27, 43, 0.3)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [],
};
