/**
 * ============================================================================
 * EVENTS SERVICE
 * ============================================================================
 * Servicio encargado de gestionar la creación y consulta de eventos
 * financieros dentro de la plataforma.
 *
 * Este módulo centraliza toda la interacción con la colección:
 *
 * events/
 *
 * Además coordina operaciones relacionadas con:
 *
 * - Perfil del profesor que crea el evento.
 * - Registro del evento en teachers/{uid}.
 * - Generación de notificaciones para estudiantes.
 * - Consulta global de eventos.
 *
 * BENEFICIOS:
 *
 * - Mantiene la lógica de Firestore separada de los componentes.
 * - Evita duplicación de código.
 * - Facilita mantenimiento y escalabilidad.
 * - Centraliza reglas de negocio relacionadas con eventos.
 *
 * FUNCIONALIDADES DISPONIBLES:
 *
 * 1. createEvent()
 *    → Crea un nuevo evento financiero.
 *
 * 2. getEvents()
 *    → Obtiene todos los eventos registrados.
 *
 * FLUJO GENERAL DE CREACIÓN:
 *
 * Profesor
 *      ↓
 * createEvent()
 *      ↓
 * events/{eventId}
 *      ↓
 * teachers/{uid}.eventsCreated
 *      ↓
 * Notificaciones para estudiantes
 * ============================================================================
 */

/**
 * Instancia principal de Firestore.
 *
 * Se utiliza para acceder a la base de datos
 * configurada en Firebase.
 */
import { db } from './firebase'

/**
 * Funciones oficiales de Firestore utilizadas
 * por este servicio.
 *
 * collection():
 * Obtiene una referencia a una colección.
 *
 * doc():
 * Obtiene referencia a un documento específico.
 *
 * addDoc():
 * Crea automáticamente un nuevo documento con ID generado.
 *
 * getDocs():
 * Obtiene múltiples documentos de una colección.
 *
 * updateDoc():
 * Actualiza campos específicos de un documento.
 *
 * arrayUnion():
 * Agrega elementos a un array evitando duplicados.
 *
 * serverTimestamp():
 * Genera una marca de tiempo usando el reloj del servidor.
 * Es más confiable que usar Date.now() del cliente.
 */
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * Servicio encargado de generar notificaciones
 * masivas para estudiantes.
 *
 * Se utiliza cuando un profesor crea un nuevo evento,
 * permitiendo informar automáticamente a todos los estudiantes.
 */
import { notifyAllStudents } from './notifications'

/**
 * ============================================================================
 * CREAR EVENTO
 * ============================================================================
 *
 * Crea un nuevo evento financiero dentro de la colección:
 *
 * events/{eventId}
 *
 * Además:
 *
 * 1. Registra el evento en el perfil del profesor.
 * 2. Obtiene todos los estudiantes existentes.
 * 3. Genera una notificación para cada estudiante.
 *
 * ESTRUCTURA GENERAL DEL FLUJO:
 *
 * Profesor
 *      ↓
 * Crear evento
 *      ↓
 * events/{eventId}
 *      ↓
 * teachers/{uid}.eventsCreated
 *      ↓
 * Notificaciones masivas
 *
 * IMPORTANTE:
 *
 * El objeto recibido debe incluir:
 *
 * teacherId
 *
 * ya que es necesario para actualizar
 * el documento del profesor correspondiente.
 *
 * @param {Object} event
 * Datos completos del evento.
 *
 * Ejemplo:
 *
 * {
 *   teacherId: 'abc123',
 *   title: 'Compra de Laptop',
 *   description: '...',
 *   amount: 50000,
 *   status: 'active',
 *   type: 'purchase'
 * }
 *
 * @returns {Promise<DocumentReference>}
 * Referencia al documento creado.
 * ============================================================================
 */
export const createEvent = async (event) => {

  /**
   * --------------------------------------------------------------------------
   * PASO 1:
   * CREAR DOCUMENTO DEL EVENTO
   * --------------------------------------------------------------------------
   *
   * Se crea automáticamente un nuevo documento
   * dentro de:
   *
   * events/
   *
   * Firestore genera el ID de manera automática.
   *
   * También se agrega:
   *
   * createdAt
   *
   * utilizando el reloj del servidor.
   *
   * Esto garantiza consistencia incluso si
   * el dispositivo del usuario tiene la hora incorrecta.
   */
  const eventRef = await addDoc(
    collection(db, 'events'),
    {
      ...event,

      /**
       * Fecha de creación generada por Firebase.
       */
      createdAt: serverTimestamp(),
    }
  )

  /**
   * --------------------------------------------------------------------------
   * PASO 2:
   * REGISTRAR EVENTO EN EL PERFIL DEL PROFESOR
   * --------------------------------------------------------------------------
   *
   * Cada profesor mantiene una lista de eventos
   * creados dentro de:
   *
   * teachers/{uid}.eventsCreated
   *
   * Esto permite:
   *
   * - Consultar eventos creados por un profesor.
   * - Generar estadísticas futuras.
   * - Mantener trazabilidad.
   */

  /**
   * Referencia al documento del profesor.
   */
  const teacherRef =
    doc(
      db,
      'teachers',
      event.teacherId
    )

  /**
   * Agregar el ID del evento al arreglo.
   *
   * arrayUnion():
   *
   * - Evita duplicados.
   * - Conserva elementos existentes.
   * - Agrega únicamente el nuevo ID.
   */
  await updateDoc(
    teacherRef,
    {
      eventsCreated: arrayUnion(eventRef.id),
    }
  )

  /**
   * --------------------------------------------------------------------------
   * PASO 3:
   * OBTENER TODOS LOS ESTUDIANTES
   * --------------------------------------------------------------------------
   *
   * Para notificar a todos los participantes potenciales,
   * se consulta la colección:
   *
   * students/
   */

  /**
   * Obtener todos los documentos de estudiantes.
   */
  const studentsSnap =
    await getDocs(
      collection(db, 'students')
    )

  /**
   * Extraer únicamente los IDs de los estudiantes.
   *
   * Cada ID corresponde al UID del usuario.
   */
  const studentUids =
    studentsSnap.docs.map(d => d.id)

  /**
   * --------------------------------------------------------------------------
   * PASO 4:
   * NOTIFICAR A TODOS LOS ESTUDIANTES
   * --------------------------------------------------------------------------
   *
   * Se genera una notificación para cada estudiante.
   *
   * El servicio notifyAllStudents() se encarga
   * internamente de crear los documentos necesarios.
   *
   * Información enviada:
   *
   * - Lista de estudiantes.
   * - ID del evento creado.
   * - Título del evento.
   */
  await notifyAllStudents(
    studentUids,
    eventRef.id,
    event.title
  )

  /**
   * Retornar referencia del evento recién creado.
   *
   * Esto permite al componente consumidor:
   *
   * - Obtener el ID generado.
   * - Navegar a otra pantalla.
   * - Realizar operaciones adicionales.
   */
  return eventRef
}

/**
 * ============================================================================
 * OBTENER TODOS LOS EVENTOS
 * ============================================================================
 *
 * Recupera todos los documentos almacenados
 * dentro de:
 *
 * events/
 *
 * Esta función es utilizada principalmente por:
 *
 * - Dashboard del profesor.
 * - Listados administrativos.
 * - Estadísticas futuras.
 *
 * FLUJO:
 *
 * 1. Consultar colección completa.
 * 2. Obtener documentos.
 * 3. Transformar Snapshot → Array JS.
 * 4. Incluir el ID del documento.
 * 5. Retornar resultado.
 *
 * IMPORTANTE:
 *
 * Firestore no incluye automáticamente
 * el ID dentro de data().
 *
 * Por eso se agrega manualmente:
 *
 * {
 *   id: d.id,
 *   ...d.data()
 * }
 *
 * @returns {Promise<Array>}
 * Lista de eventos.
 * ============================================================================
 */
export const getEvents = async () => {

  /**
   * Obtener todos los documentos
   * de la colección events.
   */
  const snapshot =
    await getDocs(
      collection(db, 'events')
    )

  /**
   * Transformar documentos Firestore
   * en objetos JavaScript normales.
   *
   * Cada evento incluirá:
   *
   * {
   *   id,
   *   title,
   *   description,
   *   amount,
   *   type,
   *   status,
   *   ...
   * }
   */
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))
}

/**
 * Elimina un evento puntual de la base de datos.
 * @param {string} eventId - ID del documento del evento
 */
export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, 'events', eventId))
}

/**
 * Elimina TODOS los eventos registrados.
 * Usado por el botón "Borrar todos los eventos".
 */
export const deleteAllEvents = async () => {
  const snapshot = await getDocs(collection(db, 'events'))
  await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'events', d.id))))
}