/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb", // Azul moderno
        secondary: "#64748b",
        background: "#f8fafc",
        card: "#ffffff",
        accent: "#22c55e", // Verde para destaque
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
