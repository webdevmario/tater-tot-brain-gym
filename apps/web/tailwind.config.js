/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', "system-ui", "sans-serif"],
        body: ['"Nunito"', "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FDF9F0",
          100: "#FAF1DC",
          200: "#F4E3B8",
        },
        spud: {
          50: "#FFF5E6",
          100: "#FDE5B8",
          200: "#F9CC7A",
          300: "#F2B04A",
          400: "#E89020",
          500: "#C77315",
        },
        teal: {
          50: "#E8F4F4",
          100: "#B8DEDE",
          200: "#7CC1C1",
          300: "#44A0A0",
          400: "#1F7F7F",
          500: "#0F5F5F",
          600: "#0A4848",
        },
        coral: {
          400: "#F06B5D",
          500: "#E54936",
        },
      },
      boxShadow: {
        pop: "0 4px 0 0 rgba(15, 95, 95, 0.9)",
        popSm: "0 2px 0 0 rgba(15, 95, 95, 0.9)",
      },
    },
  },
  plugins: [],
};
