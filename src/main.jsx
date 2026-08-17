/**
 * @fileoverview Punto de entrada principal de la aplicación.
 *
 * Monta el árbol de React en el elemento `#root` del DOM, envuelve
 * la aplicación en `React.StrictMode` para detectar problemas en
 * desarrollo y provee el contexto global de autenticación mediante `AuthProvider`.
 *
 * @module main
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'

/**
 * Monta la aplicación en el nodo raíz del DOM.
 *
 * Jerarquía de providers:
 * - `React.StrictMode`  — activa advertencias adicionales y detección de
 *                         efectos secundarios en modo desarrollo. No afecta producción.
 * - `AuthProvider`      — provee el estado global de autenticación (usuario, rol,
 *                         nombre y estado de carga) a todo el árbol de componentes.
 * - `App`               — componente raíz que contiene el enrutador y las rutas.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)