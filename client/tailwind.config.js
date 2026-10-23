/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FBF5EC',
        sand: {
          DEFAULT: '#F6EEDF',
          deep: '#F1E9DA',
        },
        line: {
          DEFAULT: '#EADFCF',
          strong: '#DCCFB9',
        },
        navy: '#14213D',
        slate: '#6B6F7B',
        body: '#4A5468',
        track: '#C8442B',
        gold: '#E9B44C',
        verified: {
          DEFAULT: '#1F6B44',
          soft: '#E6F3EA',
        },
        pending: {
          DEFAULT: '#8A5F0A',
          soft: '#FBEFCF',
        },
        unverified: {
          DEFAULT: '#6B6F7B',
          soft: '#F1E9DA',
        },
        danger: {
          50: '#FBEAE6',
          100: '#F6D8D1',
          500: '#B33C25',
          600: '#A33122',
          700: '#8A291C',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      maxWidth: {
        container: '1200px',
      },
      boxShadow: {
        card: '0 20px 40px -30px rgba(20, 33, 61, 0.35)',
        lift: '0 24px 50px -28px rgba(20, 33, 61, 0.4)',
      },
      borderRadius: {
        card: '1.25rem',
        tile: '0.875rem',
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
