/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        appBg: "#020617",
        panel: "#0f172a",
        panelSoft: "#111827",
        accent: "#14b8a6",
      },
    },
  },
  plugins: [],
};
