/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '380px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      colors: {
        phase: {
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#22c55e',
          yellow: '#eab308',
          wild: '#a855f7',
          skip: '#64748b',
          darkBg: '#0b1320',
          darkCard: '#152238',
          lightBg: '#f1f5f9',
          lightCard: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounceShort 0.5s ease-in-out infinite alternate',
        'card-deal': 'cardDeal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'glow-pulse': 'glowPulse 2s infinite',
      },
      keyframes: {
        bounceShort: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-6px)' }
        },
        cardDeal: {
          '0%': { transform: 'scale(0.5) translateY(50px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' }
        },
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.9))' }
        }
      }
    },
  },
  plugins: [],
}
