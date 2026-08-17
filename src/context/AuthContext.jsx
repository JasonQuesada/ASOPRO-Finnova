/**
 * @fileoverview Contexto global de autenticación de la aplicación.
 *
 * Provee el estado del usuario autenticado (objeto Firebase), su rol,
 * su nombre y un indicador de carga a todos los componentes hijos mediante
 * React Context. Combina dos suscripciones en tiempo real de Firebase:
 * `onAuthStateChanged` para detectar cambios de sesión y `onSnapshot`
 * para leer el perfil del usuario desde Firestore.
 *
 * @module AuthContext
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/services/firebase'

/**
 * Instancia del contexto de autenticación.
 *
 * No se exporta directamente; el acceso al contexto se realiza exclusivamente
 * a través del hook `useAuth` para garantizar que siempre se use dentro
 * de un `AuthProvider`.
 *
 * @type {React.Context<{user: import('firebase/auth').User|null, role: string|null, name: string|null, loading: boolean}|undefined>}
 */
const AuthContext = createContext()

/**
 * Proveedor del contexto de autenticación.
 *
 * Debe envolver la raíz de la aplicación (o al menos todas las rutas protegidas)
 * para que los componentes hijos puedan acceder al estado de autenticación
 * mediante el hook `useAuth`.
 *
 * Gestiona dos suscripciones encadenadas:
 * 1. `onAuthStateChanged` — detecta inicio y cierre de sesión en Firebase Auth.
 * 2. `onSnapshot` sobre `users/{uid}` — mantiene el rol y el nombre del usuario
 *    sincronizados en tiempo real desde Firestore.
 *
 * Cuando el usuario cierra sesión, ambas suscripciones se cancelan y el estado
 * se resetea a sus valores iniciales (`null`).
 *
 * @component
 * @param {Object}        props          - Props del componente.
 * @param {React.ReactNode} props.children - Árbol de componentes hijos que tendrán
 *                                          acceso al contexto de autenticación.
 * @returns {JSX.Element} El proveedor del contexto con el estado de autenticación inyectado.
 *
 * @example
 * // En el punto de entrada de la aplicación (main.jsx o App.jsx)
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export function AuthProvider({ children }) {
  /**
   * Objeto de usuario de Firebase Authentication.
   * Es `null` cuando no hay sesión activa.
   * @type {[import('firebase/auth').User|null, Function]}
   */
  const [user, setUser] = useState(null)

  /**
   * Rol del usuario autenticado, leído desde Firestore (`users/{uid}.role`).
   * Ejemplos de valores: `"teacher"`, `"student"`. Es `null` si no está definido.
   * @type {[string|null, Function]}
   */
  const [role, setRole] = useState(null)

  /**
   * Nombre del usuario autenticado, leído desde Firestore (`users/{uid}.name`).
   * Si no existe en Firestore, se usa `displayName` de Firebase Auth como fallback.
   * Es `null` si ninguna fuente lo provee.
   * @type {[string|null, Function]}
   */
  const [name, setName] = useState(null)

  /**
   * Indica si el proceso de verificación de sesión y carga de perfil está en curso.
   * Permanece en `true` hasta que Firebase Auth responde por primera vez,
   * evitando renderizados prematuros de rutas protegidas.
   * @type {[boolean, Function]}
   */
  const [loading, setLoading] = useState(true)

  /**
   * Efecto: orquesta las suscripciones a Firebase Auth y Firestore.
   *
   * Flujo de ejecución:
   * 1. Se suscribe a `onAuthStateChanged` para detectar cambios de sesión.
   * 2. Al iniciar sesión: cancela la suscripción de perfil previa (si existe),
   *    actualiza el estado `user` y abre una nueva suscripción `onSnapshot`
   *    al documento `users/{uid}` para obtener `role` y `name` en tiempo real.
   * 3. Al cerrar sesión: cancela la suscripción de perfil activa y resetea
   *    `user`, `role` y `name` a `null`.
   * 4. Al desmontar el proveedor: cancela ambas suscripciones para evitar
   *    memory leaks.
   *
   * @listens {onAuthStateChanged} auth
   * @listens {onSnapshot} users/{uid}
   */
  useEffect(() => {
    /**
     * Referencia a la función de cancelación de la suscripción al perfil de Firestore.
     * Se mantiene fuera del callback de Auth para poder cancelarla cuando cambie
     * el usuario autenticado o al desmontar el componente.
     * @type {Function|null}
     */
    let unsubscribeProfile = null

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {

      // Cancelar la suscripción al perfil del usuario anterior antes de procesar
      // el nuevo estado de autenticación, evitando lecturas cruzadas entre sesiones.
      if (unsubscribeProfile) unsubscribeProfile()

      // Sin usuario activo: resetear todo el estado y detener la carga
      if (!firebaseUser) {
        setUser(null)
        setRole(null)
        setName(null)
        setLoading(false)
        return
      }

      // Usuario autenticado: actualizar estado y suscribirse a su perfil en Firestore
      setUser(firebaseUser)

      const ref = doc(db, 'users', firebaseUser.uid)

      unsubscribeProfile = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data()
          // Leer rol y nombre desde Firestore; usar displayName de Auth como fallback para el nombre
          setRole(data?.role ?? null)
          setName(data?.name ?? firebaseUser.displayName ?? null)
          setLoading(false)
        },
        (err) => {
          // Error en la suscripción al perfil: registrar y detener la carga
          // para no bloquear la aplicación indefinidamente
          console.error('Error en suscripción de perfil:', err)
          setLoading(false)
        }
      )
    })

    // Limpieza: cancelar ambas suscripciones al desmontar el proveedor
    return () => {
      unsubscribeAuth()
      if (unsubscribeProfile) unsubscribeProfile()
    }
  }, [])

  return (
    // Exponer user, role, name y loading a todos los componentes hijos
    <AuthContext.Provider value={{ user, role, name, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook personalizado para consumir el contexto de autenticación.
 *
 * Simplifica el acceso al contexto y centraliza su consumo, evitando
 * importar y usar `useContext(AuthContext)` directamente en cada componente.
 *
 * @hook
 * @returns {{ user: import('firebase/auth').User|null, role: string|null, name: string|null, loading: boolean }}
 *   El estado actual de autenticación de la aplicación.
 *
 * @example
 * function MyComponent() {
 *   const { user, role, name, loading } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (!user)   return <Navigate to="/login" />;
 *
 *   return <p>Bienvenido, {name} ({role})</p>;
 * }
 */
export const useAuth = () => useContext(AuthContext)