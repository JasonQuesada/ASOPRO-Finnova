/**
 * @fileoverview Componente de ruta pública con redirección automática por rol.
 *
 * Actúa como guardia inverso al de `ProtectedRoute`: impide que un usuario
 * ya autenticado acceda a rutas públicas (como `/login` o `/register`)
 * y lo redirige automáticamente al dashboard que le corresponde según su rol.
 *
 * @module PublicRoute
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Guardia de ruta pública que redirige a usuarios autenticados a su dashboard.
 *
 * Evalúa el estado de autenticación en el siguiente orden:
 * 1. **Cargando sesión** → muestra un spinner mientras Firebase Auth inicializa.
 * 2. **Autenticado con rol** → redirige al dashboard correspondiente (`/teacher` o `/student`).
 * 3. **Sin sesión o sin rol** → renderiza los componentes hijos (la ruta pública).
 *
 * @component
 * @param {Object}          props          - Props del componente.
 * @param {React.ReactNode} props.children - Página o componente público a renderizar
 *                                          cuando el usuario no está autenticado.
 * @returns {JSX.Element} Los hijos renderizados, una pantalla de carga o un `<Navigate>`.
 *
 * @example
 * // Ruta de login: redirige al dashboard si ya hay sesión activa
 * <Route
 *   path="/login"
 *   element={
 *     <PublicRoute>
 *       <LoginPage />
 *     </PublicRoute>
 *   }
 * />
 */
export default function PublicRoute({ children }) {
  const { user, role, loading } = useAuth()

  // Guard 1: Firebase Auth aún no ha respondido con el estado inicial de sesión.
  // Se muestra un indicador de carga para evitar un destello del contenido público
  // antes de saber si el usuario ya tiene sesión activa.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <p className="text-muted-foreground text-sm animate-pulse">
          Cargando...
        </p>
      </div>
    )
  }

  // Guard 2: El usuario está autenticado y su perfil ya fue cargado desde Firestore.
  // Se requiere que `role` también esté definido para evitar una redirección prematura
  // en el intervalo entre que Auth confirma la sesión y Firestore entrega el perfil.
  if (user && role) {
    return role === 'teacher'
      ? <Navigate to="/teacher" replace />
      : <Navigate to="/student" replace />
  }

  // Acceso permitido: no hay sesión activa o el perfil aún no tiene rol definido.
  // Se renderiza el contenido público (ej. pantalla de login).
  return children
}