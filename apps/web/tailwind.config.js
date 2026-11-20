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
        soft: "0 1px 0 0 rgba(10, 72, 72, 0.08), 0 8px 24px -12px rgba(10, 72, 72, 0.25)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        "rise": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "translateY(-48px)", opacity: "0" },
        },
        "wiggle": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        // A small press-and-settle that never grows past the element's box.
        "confirm": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 420ms cubic-bezier(.2,.9,.3,1.2) both",
        "rise": "rise 320ms ease-out both",
        "float-up": "float-up 1100ms ease-out forwards",
        "wiggle": "wiggle 300ms ease-in-out 2",
        "confirm": "confirm 280ms ease-out both",
        "sheet-up": "sheet-up 260ms cubic-bezier(.2,.9,.3,1) both",
      },
    },
  },
  plugins: [],
};
