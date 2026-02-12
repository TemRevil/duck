/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'shadow-grey': '#32292f',
        'pearl-aqua': '#99e1d9',
        'mint-cream': '#f0f7f4',
        'tropical-teal': '#70abaf',
        'taupe-grey': '#705d56',
        'premium-dark': '#0a0a0c',
        'card-dark': '#121214',
      },
      fontFamily: {
        primary: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
