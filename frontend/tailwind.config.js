/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mandatory Mint & Sage Palette
        'pastel-mint': '#D9F0E4',
        'soft-sage': '#B7DCC8',
        'sage-green': '#8BBFA6',
        'light-bg': '#F5FAF6',
        'deep-sage': '#426B55',
        'deep-sage-hover': '#355644',

        // Supporting Colors
        'primary-text': '#24372C',
        'secondary-text': '#74877B',
        'app-border': '#E1EBE3',
        'app-success': '#23875A',
        'app-warning': '#D69B36',
        'app-error': '#D95353',
        'app-info': '#5689B8',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(36, 55, 44, 0.05), 0 1px 4px -1px rgba(36, 55, 44, 0.03)',
        'card': '0 4px 16px -4px rgba(36, 55, 44, 0.06), 0 2px 6px -2px rgba(36, 55, 44, 0.03)',
        'modal': '0 12px 36px -6px rgba(36, 55, 44, 0.12), 0 4px 12px -2px rgba(36, 55, 44, 0.06)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}

