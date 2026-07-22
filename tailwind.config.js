/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Bebas Neue"', "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        dark: {
          bg: "#0a0a0a",
          card: "#1c1c1e",
          surface: "#2a2a2c",
        },
        brand: {
          yellow: "#F5B041",
          red: "#E74C3C",
        },
      },
    },
  },
  plugins: [],
};
