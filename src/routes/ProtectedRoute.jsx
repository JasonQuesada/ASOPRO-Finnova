/**
 * @fileoverview Componente de ruta protegida por autenticación y rol.
 *
 * Actúa como guardia de navegación: intercepta el acceso a rutas privadas
 * y redirige al usuario según su estado de sesión y su rol en la aplicación.
 * Se integra con React Router v6 y consume el contexto de autenticación.
 *
 * @module ProtectedRoute
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * Guardia de ruta que protege el acceso a componentes según autenticación y rol.
 *
 * Evalúa el estado de autenticación en el siguiente orden:
 * 1. **Cargando sesión** → muestra un spinner mientras Firebase Auth inicializa.
 * 2. **Sin sesión** → redirige a `/login`.
 * 3. **Sin perfil cargado** → muestra un spinner mientras se lee el rol desde Firestore.
 * 4. **Rol no permitido** → redirige al dashboard correspondiente al rol del usuario.
 * 5. **Acceso autorizado** → renderiza los componentes hijos.
 *
 * @component
 * @param {Object}          props              - Props del componente.
 * @param {React.ReactNode} props.children     - Componente o árbol de componentes a renderizar
 *                                               si el usuario está autenticado y autorizado.
 * @param {string}          [props.allowedRole] - Rol requerido para acceder a la ruta
 *                                               (ej. `"teacher"` o `"student"`).
 *                                               Si se omite, cualquier usuario autenticado
 *                                               con rol definido puede acceder.
 * @returns {JSX.Element} Los hijos renderizados, una pantalla de carga o un `<Navigate>`.
 *
 * @example
 * // Ruta accesible solo para profesores
 * <Route
 *   path="/teacher"
 *   element={
 *     <ProtectedRoute allowedRole="teacher">
 *       <TeacherDashboard />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * @example
 * // Ruta accesible para cualquier usuario autenticado, sin restricción de rol
 * <Route
 *   path="/profile"
 *   element={
 *     <ProtectedRoute>
 *       <ProfilePage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth()

  // Guard 1: Firebase Auth aún no ha respondido con el estado inicial de sesión.
  // Se muestra un indicador de carga para evitar un destello de contenido no autorizado.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
      </div>
    )
  }

  // Guard 2: No hay usuario autenticado.
  // Se reemplaza la entrada en el historial para impedir volver atrás con el botón del navegador.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Guard 3: El usuario está autenticado pero su perfil de Firestore aún no se ha cargado.
  // Esto ocurre en el breve intervalo entre que Auth confirma la sesión y Firestore
  // responde con el documento del usuario (que contiene el rol).
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <p className="text-muted-foreground text-sm animate-pulse">Cargando perfil...</p>
      </div>
    )
  }

  // Guard 4: El usuario tiene un rol definido pero no coincide con el rol requerido por la ruta.
  // Se redirige al dashboard que le corresponde según su rol, evitando una pantalla de error.
  if (allowedRole && role !== allowedRole) {
    return role === 'teacher'
      ? <Navigate to="/teacher" replace />
      : <Navigate to="/student" replace />
  }

  // Acceso autorizado: el usuario está autenticado y su rol cumple el requisito de la ruta.
  return children
}