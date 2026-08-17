/**
 * ============================================================================
 * AUTHENTICATION SERVICE
 * ============================================================================
 * Servicio encargado de centralizar todas las operaciones
 * relacionadas con la autenticación de usuarios mediante Firebase Auth.
 *
 * Este archivo actúa como una capa de abstracción entre
 * los componentes React y Firebase.
 *
 * BENEFICIOS:
 * - Evita repetir lógica de autenticación.
 * - Mantiene el código más limpio.
 * - Facilita futuros cambios de proveedor de autenticación.
 * - Centraliza el acceso a Firebase Auth.
 *
 * FUNCIONALIDADES DISPONIBLES:
 *
 * 1. login()
 *    → Inicio de sesión con email y contraseña.
 *
 * 2. loginWithGoogle()
 *    → Inicio de sesión mediante Google OAuth.
 *
 * 3. logout()
 *    → Cierre de sesión.
 * ============================================================================
 */

/**
 * Funciones oficiales de Firebase Authentication.
 *
 * signInWithEmailAndPassword():
 * Permite autenticar usuarios utilizando correo y contraseña.
 *
 * signOut():
 * Finaliza la sesión actual.
 *
 * GoogleAuthProvider():
 * Configura el proveedor de autenticación de Google.
 *
 * signInWithPopup():
 * Abre una ventana emergente para autenticación OAuth.
 */
import {
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'

/**
 * Instancia global de Firebase Auth.
 *
 * Esta instancia se configura dentro del archivo firebase.js
 * y representa el servicio de autenticación principal
 * utilizado por toda la aplicación.
 */
import { auth } from './firebase'

/**
 * ============================================================================
 * LOGIN CON EMAIL Y CONTRASEÑA
 * ============================================================================
 *
 * Permite autenticar un usuario utilizando
 * credenciales tradicionales.
 *
 * Flujo:
 *
 * 1. Recibe email y contraseña.
 * 2. Firebase valida las credenciales.
 * 3. Si son correctas:
 *    - Crea o restaura la sesión.
 *    - Retorna el usuario autenticado.
 * 4. Si son incorrectas:
 *    - Firebase lanza una excepción.
 *
 * NOTA:
 * Actualmente la aplicación utiliza Google Login,
 * pero esta función queda disponible para futuras
 * ampliaciones del sistema.
 *
 * @param {string} email
 * Correo electrónico del usuario.
 *
 * @param {string} password
 * Contraseña del usuario.
 *
 * @returns {Promise<Object>}
 * Usuario autenticado de Firebase.
 * ============================================================================
 */
export const login = async (email, password) => {

  /**
   * Firebase devuelve un objeto AuthResult
   * que contiene información de la sesión.
   */
  const result =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    )

  /**
   * Retornar únicamente el usuario autenticado.
   */
  return result.user
}

/**
 * ============================================================================
 * LOGIN CON GOOGLE
 * ============================================================================
 *
 * Permite iniciar sesión utilizando una cuenta
 * de Google mediante OAuth.
 *
 * Flujo:
 *
 * 1. Crear proveedor de Google.
 * 2. Abrir popup de autenticación.
 * 3. Usuario selecciona una cuenta.
 * 4. Google valida la identidad.
 * 5. Firebase crea/restaura la sesión.
 * 6. Retorna el usuario autenticado.
 *
 * Este es el método principal utilizado
 * actualmente por la aplicación.
 *
 * @returns {Promise<Object>}
 * Usuario autenticado de Firebase.
 * ============================================================================
 */
export const loginWithGoogle = async () => {

  /**
   * Crear proveedor OAuth de Google.
   *
   * Este objeto contiene la configuración
   * necesaria para iniciar autenticación
   * mediante cuentas Google.
   */
  const provider =
    new GoogleAuthProvider()

  /**
   * Abrir ventana emergente de autenticación.
   *
   * El usuario selecciona una cuenta
   * y concede permisos si es necesario.
   */
  const result =
    await signInWithPopup(
      auth,
      provider
    )

  /**
   * Retornar únicamente el usuario autenticado.
   */
  return result.user
}

/**
 * ============================================================================
 * CERRAR SESIÓN
 * ============================================================================
 *
 * Finaliza completamente la sesión actual.
 *
 * Flujo:
 *
 * 1. Firebase elimina la sesión local.
 * 2. Se dispara onAuthStateChanged().
 * 3. AuthContext detecta el cambio.
 * 4. user pasa a null.
 * 5. Las rutas protegidas reaccionan automáticamente.
 * 6. El usuario vuelve al flujo público.
 *
 * IMPORTANTE:
 * Esta función no realiza navegación.
 *
 * La redirección ocurre posteriormente
 * desde los componentes que la invocan.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const logout = async () => {

  /**
   * Cerrar sesión actual.
   *
   * Firebase elimina:
   * - Token de acceso.
   * - Información de sesión local.
   * - Estado de autenticación activo.
   */
  await signOut(auth)
}