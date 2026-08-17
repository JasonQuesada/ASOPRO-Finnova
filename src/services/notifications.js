/**
 * ============================================================================
 * NOTIFICATIONS SERVICE
 * ============================================================================
 * Servicio encargado de gestionar todas las notificaciones
 * del sistema Finnova.
 *
 * Este módulo centraliza:
 *
 * - Creación de notificaciones.
 * - Notificaciones masivas.
 * - Escucha en tiempo real.
 * - Marcado de lectura.
 * - Tipificación de eventos.
 *
 * COLECCIÓN PRINCIPAL:
 *
 * notifications/{notificationId}
 *
 * ESTRUCTURA DE UNA NOTIFICACIÓN:
 *
 * {
 *   uid,
 *   type,
 *   title,
 *   message,
 *   read,
 *   createdAt,
 *   eventId?,
 *   loanId?,
 *   savingId?
 * }
 *
 * OBJETIVOS:
 *
 * ✓ Informar al estudiante de eventos importantes.
 * ✓ Mantener historial de acciones relevantes.
 * ✓ Mostrar alertas en tiempo real.
 * ✓ Gestionar estados de lectura.
 *
 * FLUJO GENERAL:
 *
 * Sistema
 *    ↓
 * createNotification()
 *    ↓
 * notifications/{id}
 *    ↓
 * subscribeToNotifications()
 *    ↓
 * UI actualizada automáticamente
 *    ↓
 * markAsRead()
 *
 * ============================================================================
 */

/**
 * Instancia global de Firestore.
 *
 * Permite interactuar con la base de datos
 * utilizada por toda la aplicación.
 */
import { db } from './firebase'

/**
 * Funciones del SDK de Firestore utilizadas
 * para gestionar notificaciones.
 *
 * collection()
 * → Referencia a colecciones.
 *
 * addDoc()
 * → Crear documentos.
 *
 * query()
 * → Construir consultas.
 *
 * where()
 * → Aplicar filtros.
 *
 * orderBy()
 * → Ordenar resultados.
 *
 * onSnapshot()
 * → Escuchar cambios en tiempo real.
 *
 * doc()
 * → Referencia a documentos específicos.
 *
 * updateDoc()
 * → Actualizar campos.
 *
 * serverTimestamp()
 * → Fecha generada por Firebase.
 */
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * ============================================================================
 * TIPOS DE NOTIFICACIÓN
 * ============================================================================
 *
 * Enumeración centralizada de todos los tipos
 * válidos de notificaciones del sistema.
 *
 * IMPORTANTE:
 *
 * Siempre utilizar estas constantes
 * en lugar de escribir strings manualmente.
 *
 * BENEFICIOS:
 *
 * ✓ Evita errores tipográficos.
 * ✓ Facilita mantenimiento.
 * ✓ Mejora autocompletado.
 * ✓ Centraliza configuraciones.
 *
 * EJEMPLO:
 *
 * createNotification(
 *   uid,
 *   NOTIFICATION_TYPES.NEW_EVENT,
 *   ...
 * )
 *
 * en lugar de:
 *
 * createNotification(
 *   uid,
 *   'new_event',
 *   ...
 * )
 * ============================================================================
 */
export const NOTIFICATION_TYPES = {

  /**
   * Nuevo evento financiero publicado.
   *
   * Se genera cuando el profesor
   * crea un evento disponible.
   */
  NEW_EVENT: 'new_event',

  /**
   * Evento finalizado.
   *
   * Se utiliza para informar que
   * un evento donde participó el estudiante
   * ya fue cerrado.
   */
  EVENT_FINISHED: 'event_finished',

  /**
   * Depósito acreditado.
   *
   * Puede representar:
   *
   * - Bonificaciones.
   * - Ingresos automáticos.
   * - Premios.
   * - Depósitos extraordinarios.
   */
  DEPOSIT: 'deposit',

  /**
   * Cobro realizado al balance.
   *
   * Puede representar:
   *
   * - Multas.
   * - Gastos inesperados.
   * - Cobros automáticos.
   */
  CHARGE: 'charge',

  /**
   * Recordatorio de pago próximo.
   *
   * Se envía antes de que
   * un préstamo venza.
   */
  LOAN_REMINDER: 'loan_reminder',

  /**
   * Préstamo vencido.
   *
   * Se genera cuando se supera
   * la fecha límite de pago.
   */
  LOAN_DUE: 'loan_due',

  /**
   * Interés generado por ahorro.
   *
   * Utilizado cuando una inversión
   * produce ganancias.
   */
  SAVING_INTEREST: 'saving_interest',

  /**
   * Notificación de bienvenida.
   *
   * Se crea únicamente durante
   * el primer acceso del usuario.
   */
  WELCOME: 'welcome',
}

/**
 * ============================================================================
 * CREAR NOTIFICACIÓN
 * ============================================================================
 *
 * Genera un nuevo documento dentro de:
 *
 * notifications/{notificationId}
 *
 * Esta función es utilizada por otros servicios
 * del sistema para registrar eventos importantes.
 *
 * RESPONSABILIDADES:
 *
 * ✓ Crear la notificación.
 * ✓ Asignar destinatario.
 * ✓ Registrar fecha.
 * ✓ Marcar como no leída.
 * ✓ Adjuntar datos opcionales.
 *
 * @param {string} uid
 * UID del usuario destinatario.
 *
 * @param {string} type
 * Tipo de notificación.
 *
 * @param {string} title
 * Título corto mostrado en UI.
 *
 * @param {string} message
 * Mensaje descriptivo.
 *
 * @param {Object} [extra]
 * Datos opcionales relacionados.
 *
 * Posibles campos:
 *
 * - eventId
 * - loanId
 * - savingId
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const createNotification = async (
  uid,
  type,
  title,
  message,
  extra = {}
) => {

  /**
   * Crear documento en Firestore.
   */
  await addDoc(
    collection(db, 'notifications'),
    {

      /**
       * Usuario destinatario.
       */
      uid,

      /**
       * Tipo de notificación.
       */
      type,

      /**
       * Título visible.
       */
      title,

      /**
       * Mensaje completo.
       */
      message,

      /**
       * Estado de lectura.
       *
       * Todas las notificaciones
       * inician como no leídas.
       */
      read: false,

      /**
       * Fecha generada por el servidor.
       *
       * Garantiza consistencia entre usuarios.
       */
      createdAt: serverTimestamp(),

      /**
       * Campos opcionales.
       *
       * Permiten relacionar la notificación
       * con entidades específicas.
       */
      ...extra,
    }
  )
}

/**
 * ============================================================================
 * NOTIFICAR A TODOS LOS ESTUDIANTES
 * ============================================================================
 *
 * Función utilizada principalmente cuando
 * un profesor publica un nuevo evento.
 *
 * Genera una notificación individual
 * para cada estudiante registrado.
 *
 * FLUJO:
 *
 * Lista de estudiantes
 *          ↓
 * map()
 *          ↓
 * createNotification()
 *          ↓
 * Promise.all()
 *          ↓
 * Finalización global
 *
 * IMPORTANTE:
 *
 * Todas las notificaciones se crean
 * en paralelo para mejorar rendimiento.
 *
 * @param {Array<string>} studentUids
 * Lista de UIDs de estudiantes.
 *
 * @param {string} eventId
 * Evento relacionado.
 *
 * @param {string} eventTitle
 * Nombre del evento.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const notifyAllStudents = async (
  studentUids,
  eventId,
  eventTitle
) => {

  /**
   * Crear una promesa por estudiante.
   */
  const promises = studentUids.map(uid =>

    createNotification(
      uid,
      NOTIFICATION_TYPES.NEW_EVENT,

      /**
       * Título mostrado al usuario.
       */
      '¡Nuevo evento disponible!',

      /**
       * Mensaje personalizado.
       */
      `El evento "${eventTitle}" ya está disponible. ¡Toma tu decisión!`,

      /**
       * Información adicional.
       */
      { eventId }
    )
  )

  /**
   * Esperar a que todas las notificaciones
   * hayan sido creadas correctamente.
   */
  await Promise.all(promises)
}

/**
 * ============================================================================
 * SUSCRIPCIÓN A NOTIFICACIONES
 * ============================================================================
 *
 * Escucha en tiempo real todas las
 * notificaciones de un estudiante.
 *
 * CARACTERÍSTICAS:
 *
 * ✓ Tiempo real.
 * ✓ Orden descendente.
 * ✓ Actualización automática.
 * ✓ Sin recargas de página.
 *
 * ORDEN:
 *
 * Más reciente
 *        ↓
 * Más antigua
 *
 * Esto permite mostrar primero
 * las notificaciones más importantes.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {Function} callback
 * Función que recibe el array actualizado.
 *
 * @returns {Function}
 * Función unsubscribe.
 * ============================================================================
 */
export const subscribeToNotifications = (
  uid,
  callback
) => {

  /**
   * Consulta:
   *
   * notifications
   * donde:
   *
   * uid == usuario actual
   *
   * ordenadas por:
   *
   * createdAt DESC
   */
  const q = query(
    collection(db, 'notifications'),

    where(
      'uid',
      '==',
      uid
    ),

    orderBy(
      'createdAt',
      'desc'
    )
  )

  /**
   * Escucha en tiempo real.
   *
   * Se ejecuta cuando:
   *
   * - Se crea una notificación.
   * - Se modifica una notificación.
   * - Se elimina una notificación.
   * - Se establece la suscripción.
   */
  return onSnapshot(q, (snapshot) => {

    /**
     * Convertir documentos Firestore
     * a objetos JavaScript normales.
     */
    const data =
      snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))

    /**
     * Entregar resultados
     * al componente suscrito.
     */
    callback(data)
  })
}

/**
 * ============================================================================
 * MARCAR NOTIFICACIÓN COMO LEÍDA
 * ============================================================================
 *
 * Actualiza el campo:
 *
 * read
 *
 * cambiándolo a:
 *
 * true
 *
 * Esto permite:
 *
 * ✓ Quitar badges.
 * ✓ Diferenciar leídas/no leídas.
 * ✓ Mejorar experiencia de usuario.
 *
 * @param {string} notificationId
 * ID del documento de notificación.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const markAsRead = async (notificationId) => {

  /**
   * Referencia al documento.
   */
  const ref = doc(
    db,
    'notifications',
    notificationId
  )

  /**
   * Actualizar estado de lectura.
   */
  await updateDoc(
    ref,
    {
      read: true
    }
  )
}