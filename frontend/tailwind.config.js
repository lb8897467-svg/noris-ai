/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        noris: {
          50: "#e6f4fa",
          100: "#cce9f4",
          200: "#99d3e9",
          300: "#66bddd",
          400: "#33a8d2",
          500: "#0088cc",
          600: "#0077b3",
          700: "#006699",
          800: "#004466",
          900: "#002233",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        slideInRight: { from: { transform: "translateX(100%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};
