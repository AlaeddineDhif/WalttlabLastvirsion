/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        // Primary system — actions, selections, links, analytics, focus.
        // Scale derived from the logo navy (#023867): 600 is the exact ink,
        // lighter steps for tints and dark-mode chrome, darker for hover.
        brand: {
          50: '#F0F5FA',
          100: '#DEEBF7',
          200: '#BEDBF4',
          300: '#8EC3F1',
          400: '#419FF1',
          500: '#0559A3',
          600: '#023867',
          700: '#032D51',
          800: '#04233E',
          900: '#041B2F'
        },
        // Quiet accent — the logo cyan (#79CBCD). Decorative fills and
        // secondary chart series; 400 is the exact ink.
        accent: {
          50: '#F5F9FA',
          100: '#EAF5F5',
          200: '#D4ECED',
          300: '#B6E0E2',
          400: '#79CBCD',
          500: '#50BFC3',
          600: '#37A6A9',
          700: '#2D8C8F',
          800: '#247275',
          900: '#1D5B5E'
        },
        // Energy system — measured energy, normal operating state, savings.
        // Reserved for data, never for chrome.
        energy: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D'
        },
        // Product surfaces.
        ink: '#0F172A',
        canvas: '#F8FAFC',
        canvasAlt: '#F1F5F9',
        sidebar: '#334155',
        sidebarAlt: '#475569'
      },
      boxShadow: {
        // Near-flat elevation for panels; real elevation only for floating UI.
        card: '0 1px 2px rgba(15,23,42,0.04)',
        floating: '0 8px 24px rgba(15,23,42,0.12)',
        dark: '0 1px 2px rgba(2,6,23,0.35)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
};
