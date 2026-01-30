/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}" // <--- CRUCIAL: Detecta cambios en tu UI package
  ],
  theme: {
    extend: {
      colors: {
        // Aquí definiremos los colores del tema dark low-contrast luego
      }
    },
  },
  plugins: [],
  darkMode: 'class', // Usaremos clases para el modo oscuro
}