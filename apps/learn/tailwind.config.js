/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,html}'],
  theme: {
    extend: {
      colors: {
        error: '#b91c1c',
        warning: '#b45309',
        success: '#15803d',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
