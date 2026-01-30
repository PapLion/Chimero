import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // Importamos los estilos de Tailwind que creamos antes

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)