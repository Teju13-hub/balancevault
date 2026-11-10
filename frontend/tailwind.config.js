/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Lavender Dream Palette (Final Source of Truth)
        'main-bg': '#F8F5FC',
        'primary-lavender': '#E9DDF8',
        'pastel-lavender': '#E9DDF8',
        'soft-lavender': '#DCCBF2',
        'secondary-lilac': '#DCCBF2',
        'deep-purple': '#514568',
        'deep-purple-hover': '#433856',
        'accent-purple': '#9B83C7',
        'white': '#FFFFFF',
        'white-card': '#FFFFFF',

        // Typography & Structure
        'main-text': '#30283D',
        'primary-text': '#30283D',
        'secondary-text': '#81758F',
        'app-border': '#EAE2F2',
        'border': '#EAE2F2',
        'borders': '#EAE2F2',

        // Semantic status colors preserved
        'app-success': '#23875A',
        'app-warning': '#D69B36',
        'app-error': '#D95353',
        'app-info': '#5689B8',

        // Compatibility aliases to ensure complete coverage
        'pastel-mint': '#E9DDF8',
        'soft-sage': '#DCCBF2',
        'sage-green': '#9B83C7',
        'light-bg': '#F8F5FC',
        'deep-sage': '#514568',
        'deep-sage-hover': '#433856',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(48, 40, 61, 0.05), 0 1px 4px -1px rgba(48, 40, 61, 0.03)',
        'card': '0 4px 16px -4px rgba(48, 40, 61, 0.06), 0 2px 6px -2px rgba(48, 40, 61, 0.03)',
        'modal': '0 12px 36px -6px rgba(48, 40, 61, 0.12), 0 4px 12px -2px rgba(48, 40, 61, 0.06)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
