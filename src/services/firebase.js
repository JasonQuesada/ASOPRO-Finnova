/**
 * ============================================================================
 * FIREBASE CONFIGURATION
 * ============================================================================
 * Archivo encargado de inicializar y exportar
 * los servicios principales de Firebase utilizados
 * por toda la aplicación.
 *
 * Este archivo funciona como el punto central
 * de conexión entre React y Firebase.
 *
 * SERVICIOS CONFIGURADOS:
 *
 * 1. Firebase App
 *    → Inicialización principal del proyecto.
 *
 * 2. Firestore Database
 *    → Base de datos NoSQL en tiempo real.
 *
 * 3. Firebase Authentication
 *    → Gestión de usuarios y sesiones.
 *
 * IMPORTANTE:
 *
 * Toda la aplicación utiliza las instancias
 * exportadas desde este archivo.
 *
 * Esto garantiza:
 *
 * - Una única configuración.
 * - Reutilización de servicios.
 * - Mantenimiento simplificado.
 * - Evitar inicializaciones duplicadas.
 *
 * ESTRUCTURA GENERAL:
 *
 * Firebase Config
 *        ↓
 * initializeApp()
 *        ↓
 * ┌───────────────┬───────────────┐
 * │               │               │
 * Firestore      Auth         Otros servicios
 * │               │
 * db            auth
 * ============================================================================
 */

/**
 * Funciones principales del SDK de Firebase.
 *
 * initializeApp():
 * Crea una nueva instancia de Firebase.
 *
 * getApps():
 * Devuelve todas las aplicaciones Firebase
 * actualmente inicializadas.
 *
 * getApp():
 * Obtiene una aplicación Firebase ya existente.
 *
 * IMPORTANTE:
 *
 * Estas funciones permiten evitar
 * inicializaciones duplicadas que podrían
 * generar errores en desarrollo o producción.
 */
import {
  initializeApp,
  getApps,
  getApp
} from 'firebase/app'

/**
 * Servicio de Firestore.
 *
 * Permite acceder a la base de datos
 * utilizada por toda la aplicación.
 */
import { getFirestore } from 'firebase/firestore'

/**
 * Servicio de autenticación.
 *
 * Permite:
 * - Login.
 * - Logout.
 * - Manejo de sesiones.
 * - Estado de autenticación.
 */
import { getAuth } from 'firebase/auth'

/**
 * ============================================================================
 * CONFIGURACIÓN DE FIREBASE
 * ============================================================================
 *
 * Objeto de configuración requerido por Firebase
 * para conectar la aplicación con el proyecto
 * creado dentro de Firebase Console.
 *
 * IMPORTANTE:
 *
 * Ninguna credencial se encuentra escrita
 * directamente en el código fuente.
 *
 * Todas las variables provienen de:
 *
 * .env
 *
 * utilizando:
 *
 * import.meta.env
 *
 * Esto permite:
 *
 * ✓ Mayor seguridad.
 * ✓ Diferentes configuraciones por entorno.
 * ✓ Fácil despliegue.
 * ✓ Evitar exposición accidental de datos.
 *
 * En Vite todas las variables accesibles
 * desde el cliente deben iniciar con:
 *
 * VITE_
 *
 * Ejemplo:
 *
 * VITE_FIREBASE_API_KEY=xxxxxxxx
 * ============================================================================
 */
const firebaseConfig = {

  /**
   * Clave pública de acceso al proyecto Firebase.
   *
   * Identifica qué proyecto utilizar.
   */
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  /**
   * Dominio autorizado para autenticación.
   *
   * Utilizado principalmente por:
   * - Google Login
   * - OAuth
   * - Firebase Auth
   */
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  /**
   * Identificador único del proyecto Firebase.
   *
   * Se utiliza internamente para conectar
   * Firestore y otros servicios.
   */
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  /**
   * Bucket de almacenamiento.
   *
   * Utilizado por Firebase Storage
   * para archivos e imágenes.
   *
   * Actualmente puede no estar siendo utilizado,
   * pero queda preparado para futuras funciones.
   */
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  /**
   * Identificador del servicio de mensajería.
   *
   * Utilizado por Firebase Cloud Messaging (FCM).
   *
   * Permite notificaciones push en caso de
   * implementarse en el futuro.
   */
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  /**
   * Identificador único de la aplicación.
   *
   * Firebase lo utiliza para distinguir
   * aplicaciones registradas dentro del proyecto.
   */
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * ============================================================================
 * INICIALIZACIÓN SEGURA DE FIREBASE
 * ============================================================================
 *
 * Firebase solamente debe inicializarse UNA VEZ.
 *
 * Problema común:
 *
 * Si initializeApp() se ejecuta múltiples veces,
 * Firebase genera errores como:
 *
 * "Firebase App named '[DEFAULT]' already exists"
 *
 * Para evitarlo:
 *
 * 1. Revisamos si ya existe una aplicación.
 * 2. Si existe:
 *      usamos getApp()
 * 3. Si no existe:
 *      ejecutamos initializeApp()
 *
 * Esto es especialmente importante en:
 *
 * - Hot Reload de Vite.
 * - Desarrollo local.
 * - Renderizados múltiples.
 * ============================================================================
 */
const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)

/**
 * ============================================================================
 * FIRESTORE DATABASE
 * ============================================================================
 *
 * Instancia global de Firestore.
 *
 * Será utilizada en toda la aplicación para:
 *
 * - Crear documentos.
 * - Leer documentos.
 * - Actualizar documentos.
 * - Escuchar cambios en tiempo real.
 *
 * Ejemplo:
 *
 * import { db } from '@/services/firebase'
 *
 * const ref = doc(db, 'users', uid)
 * ============================================================================
 */
export const db =
  getFirestore(app)

/**
 * ============================================================================
 * FIREBASE AUTHENTICATION
 * ============================================================================
 *
 * Instancia global de autenticación.
 *
 * Será utilizada para:
 *
 * - Login con Google.
 * - Login con email.
 * - Logout.
 * - Escuchar cambios de sesión.
 *
 * Ejemplo:
 *
 * import { auth } from '@/services/firebase'
 *
 * auth.currentUser
 * ============================================================================
 */
export const auth =
  getAuth(app)

/**
 * ============================================================================
 * EXPORTACIÓN PRINCIPAL
 * ============================================================================
 *
 * Se exporta también la instancia completa
 * de Firebase App.
 *
 * Esto permite reutilizarla en otros servicios
 * que puedan requerir acceso directo a la aplicación.
 *
 * Ejemplo futuro:
 *
 * import app from '@/services/firebase'
 *
 * getStorage(app)
 * getMessaging(app)
 * etc.
 * ============================================================================
 */
export default app