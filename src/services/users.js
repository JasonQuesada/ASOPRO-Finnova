/**
 * ============================================================================
 * USERS SERVICE
 * ============================================================================
 *
 * Servicio encargado de administrar la información base
 * de los usuarios dentro del sistema.
 *
 * Este módulo centraliza toda la lógica relacionada con:
 *
 * ✓ Creación de usuarios.
 * ✓ Creación de perfiles de estudiantes.
 * ✓ Creación de perfiles de profesores.
 * ✓ Consulta de información general del usuario.
 * ✓ Actualización del nombre del usuario.
 * ✓ Gestión de estudiantes.
 *
 * ESTRUCTURA DE COLECCIONES:
 *
 * users/{uid}
 * ├─ Información global del usuario
 * ├─ Nombre
 * ├─ Correo
 * ├─ Rol
 * └─ Fecha de creación
 *
 * students/{uid}
 * ├─ Balance
 * ├─ Historial de decisiones
 * └─ Información específica del estudiante
 *
 * teachers/{uid}
 * ├─ Eventos creados
 * └─ Información específica del profesor
 *
 * FLUJO GENERAL:
 *
 * Login con Google
 *        ↓
 * Determinar whitelist
 *        ↓
 * createBaseUser()
 *        ↓
 * Determinar / actualizar rol
 *        ↓
 * createStudentProfile()
 *          ó
 * createTeacherProfile()
 *
 * ============================================================================
 */

import { db } from './firebase'

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore'


/**
 * ============================================================================
 * CREAR / ACTUALIZAR USUARIO BASE
 * ============================================================================
 *
 * Crea el documento principal del usuario dentro de:
 *
 * users/{uid}
 *
 * Este documento representa la identidad global
 * del usuario dentro de la plataforma.
 *
 * CONTIENE:
 *
 * ✓ UID
 * ✓ Email
 * ✓ Nombre
 * ✓ Rol
 * ✓ Fecha de creación
 *
 * COMPORTAMIENTO:
 *
 * USUARIO NUEVO:
 *
 * - Crea el documento.
 * - Asigna el rol recibido.
 * - Retorna true.
 *
 * USUARIO EXISTENTE:
 *
 * - Conserva todos sus datos actuales.
 * - Compara el rol existente con el rol autorizado.
 * - Si el rol es diferente, actualiza solamente `role`.
 * - Retorna false.
 *
 * Esto permite que el rol determinado por las whitelist
 * permanezca sincronizado con users/{uid}.role.
 *
 * Ejemplo:
 *
 * Usuario existente:
 *
 * role: "teacher"
 *
 * Login actual:
 *
 * role: "student"
 *
 * Resultado:
 *
 * role: "student"
 *
 * IMPORTANTE:
 *
 * No se modifica:
 *
 * - name
 * - email
 * - uid
 * - createdAt
 * - otros campos existentes
 *
 * @param {Object} firebaseUser
 * Usuario autenticado proveniente de Firebase Auth.
 *
 * @param {string} role
 * Rol asignado al usuario.
 *
 * Valores permitidos:
 *
 * - teacher
 * - student
 *
 * @returns {Promise<boolean>}
 *
 * true  → usuario nuevo creado.
 * false → usuario ya existente.
 *
 * ============================================================================
 */
export const createBaseUser = async (firebaseUser, role) => {

  /**
   * ==========================================================================
   * VALIDAR ROL
   * ==========================================================================
   *
   * Evita guardar accidentalmente un rol inválido
   * dentro de la colección users.
   */
  if (role !== 'teacher' && role !== 'student') {
    throw new Error(
      `Rol inválido: ${role}`
    )
  }

  /**
   * ==========================================================================
   * REFERENCIA AL DOCUMENTO
   * ==========================================================================
   *
   * users/{uid}
   */
  const ref = doc(
    db,
    'users',
    firebaseUser.uid
  )

  /**
   * ==========================================================================
   * OBTENER DOCUMENTO ACTUAL
   * ==========================================================================
   */
  const snap = await getDoc(ref)

  /**
   * ==========================================================================
   * USUARIO EXISTENTE
   * ==========================================================================
   */
  if (snap.exists()) {

    /**
     * Obtener información actual.
     */
    const currentData = snap.data()

    /**
     * ================================================================
     * EL ROL YA ES CORRECTO
     * ================================================================
     *
     * No hacemos ninguna escritura innecesaria.
     */
    if (currentData.role === role) {
      return false
    }

    /**
     * ================================================================
     * EL ROL CAMBIÓ
     * ================================================================
     *
     * Actualizamos ÚNICAMENTE el campo role.
     *
     * Esto evita sobrescribir:
     *
     * - nombre
     * - correo
     * - fecha de creación
     * - información adicional
     * - configuraciones futuras
     */
    await updateDoc(ref, {
      role
    })

    /**
     * Registro para desarrollo.
     */
    console.log(
      'Rol de usuario actualizado:',
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        previousRole: currentData.role ?? null,
        newRole: role
      }
    )

    /**
     * El usuario ya existía.
     */
    return false
  }

  /**
   * ==========================================================================
   * USUARIO NUEVO
   * ==========================================================================
   *
   * El documento no existe.
   *
   * Creamos toda la información base.
   */
  await setDoc(ref, {

    /**
     * Identificador único del usuario.
     */
    uid: firebaseUser.uid,

    /**
     * Correo obtenido desde Google.
     */
    email: firebaseUser.email,

    /**
     * Nombre visible.
     *
     * Prioridad:
     *
     * 1. displayName de Google.
     * 2. Prefijo del correo.
     *
     * Ejemplo:
     *
     * juan@gmail.com
     *
     * →
     *
     * juan
     */
    name:
      firebaseUser.displayName?.trim()
      || firebaseUser.email.split('@')[0],

    /**
     * Rol asignado por Login.jsx.
     */
    role,

    /**
     * Fecha de creación.
     */
    createdAt: serverTimestamp(),
  })

  /**
   * Registro para desarrollo.
   */
  console.log(
    'Usuario base creado:',
    {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      role
    }
  )

  /**
   * Indicar que el usuario fue creado.
   *
   * Login.jsx utiliza este valor para decidir
   * si debe crear la notificación de bienvenida.
   */
  return true
}


/**
 * ============================================================================
 * CREAR PERFIL DE ESTUDIANTE
 * ============================================================================
 *
 * Crea el documento:
 *
 * students/{uid}
 *
 * Este documento almacena toda la información
 * financiera específica del estudiante.
 *
 * DATOS INICIALES:
 *
 * balance   = 100,000
 * decisions = []
 *
 * IMPORTANTE:
 *
 * El balance inicial de ₡100,000 es una regla
 * de negocio definida por el sistema.
 *
 * Todos los estudiantes comienzan
 * con exactamente ese monto.
 *
 * Si el perfil ya existe:
 *
 * - No se modifica.
 * - No se sobrescribe.
 * - No se reinicia el balance.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @returns {Promise<void>}
 *
 * ============================================================================
 */
export const createStudentProfile = async (uid) => {

  /**
   * ==========================================================================
   * REFERENCIA
   * ==========================================================================
   *
   * students/{uid}
   */
  const ref = doc(
    db,
    'students',
    uid
  )

  /**
   * ==========================================================================
   * VERIFICAR EXISTENCIA
   * ==========================================================================
   */
  const snap = await getDoc(ref)

  /**
   * ==========================================================================
   * EVITAR SOBRESCRIBIR
   * ==========================================================================
   *
   * Protege:
   *
   * ✓ Balance acumulado.
   * ✓ Decisiones tomadas.
   * ✓ Datos futuros.
   */
  if (snap.exists()) {
    return
  }

  /**
   * ==========================================================================
   * CREAR PERFIL
   * ==========================================================================
   */
  await setDoc(ref, {

    /**
     * UID propietario del perfil.
     */
    uid,

    /**
     * Balance inicial.
     */
    balance: 100000,

    /**
     * Historial de decisiones.
     */
    decisions: [],

    /**
     * Fecha de creación.
     */
    createdAt: serverTimestamp(),
  })
}


/**
 * ============================================================================
 * CREAR PERFIL DE PROFESOR
 * ============================================================================
 *
 * Crea el documento:
 *
 * teachers/{uid}
 *
 * Este documento almacena información
 * específica de los profesores.
 *
 * DATOS INICIALES:
 *
 * eventsCreated = []
 *
 * Si el documento ya existe:
 *
 * - No se modifica.
 * - No se sobrescribe.
 *
 * @param {string} uid
 * UID del profesor.
 *
 * @returns {Promise<void>}
 *
 * ============================================================================
 */
export const createTeacherProfile = async (uid) => {

  /**
   * ==========================================================================
   * REFERENCIA
   * ==========================================================================
   *
   * teachers/{uid}
   */
  const ref = doc(
    db,
    'teachers',
    uid
  )

  /**
   * ==========================================================================
   * CONSULTAR DOCUMENTO ACTUAL
   * ==========================================================================
   */
  const snap = await getDoc(ref)

  /**
   * ==========================================================================
   * EVITAR SOBRESCRIBIR
   * ==========================================================================
   */
  if (snap.exists()) {
    return
  }

  /**
   * ==========================================================================
   * CREAR PERFIL INICIAL
   * ==========================================================================
   */
  await setDoc(ref, {

    /**
     * UID del profesor.
     */
    uid,

    /**
     * IDs de eventos creados.
     *
     * Inicia vacío.
     */
    eventsCreated: [],

    /**
     * Fecha de creación.
     */
    createdAt: serverTimestamp(),
  })
}


/**
 * ============================================================================
 * OBTENER USUARIO
 * ============================================================================
 *
 * Recupera la información base almacenada en:
 *
 * users/{uid}
 *
 * Esta función NO consulta perfiles específicos
 * de estudiantes o profesores.
 *
 * Devuelve:
 *
 * ✓ UID
 * ✓ Nombre
 * ✓ Email
 * ✓ Rol
 * ✓ Fecha de creación
 *
 * @param {string} uid
 * UID del usuario.
 *
 * @returns {Promise<Object|null>}
 *
 * ============================================================================
 */
export const getUser = async (uid) => {

  /**
   * ==========================================================================
   * REFERENCIA
   * ==========================================================================
   *
   * users/{uid}
   */
  const ref = doc(
    db,
    'users',
    uid
  )

  /**
   * ==========================================================================
   * LEER DOCUMENTO
   * ==========================================================================
   */
  const snap = await getDoc(ref)

  /**
   * ==========================================================================
   * RESULTADO
   * ==========================================================================
   */
  return snap.exists()
    ? snap.data()
    : null
}


/**
 * ============================================================================
 * ACTUALIZAR NOMBRE DE USUARIO
 * ============================================================================
 *
 * Actualiza el nombre visible del usuario en:
 *
 * users/{uid}
 *
 * Este es el único campo editable por el usuario
 * desde su perfil.
 *
 * No afecta:
 *
 * - autenticación de Google
 * - email
 * - UID
 * - rol
 * - historial
 *
 * @param {string} uid
 * UID del usuario.
 *
 * @param {string} name
 * Nuevo nombre.
 *
 * @returns {Promise<void>}
 *
 * ============================================================================
 */
export const updateUserName = async (uid, name) => {

  /**
   * Referencia al usuario.
   */
  const ref = doc(
    db,
    'users',
    uid
  )

  /**
   * Actualizar solamente el nombre.
   */
  await updateDoc(
    ref,
    {
      name: name.trim()
    }
  )
}


/**
 * ============================================================================
 * OBTENER TODOS LOS ESTUDIANTES
 * ============================================================================
 *
 * Obtiene todos los documentos de users
 * cuyo role sea "student".
 *
 * Se utiliza principalmente en:
 *
 * - Panel de profesores.
 * - Gestión de usuarios.
 * - Gestión de eventos.
 *
 * @returns {Promise<Array>}
 *
 * ============================================================================
 */
export const getAllStudents = async () => {

  /**
   * Query:
   *
   * users
   * WHERE role == "student"
   */
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student')
  )

  /**
   * Ejecutar consulta.
   */
  const snap = await getDocs(q)

  /**
   * Convertir documentos a objetos.
   */
  return snap.docs.map(
    (studentDoc) => ({
      uid: studentDoc.id,
      ...studentDoc.data()
    })
  )
}


/**
 * ============================================================================
 * ELIMINAR ESTUDIANTE
 * ============================================================================
 *
 * Elimina por completo el registro de un estudiante.
 *
 * BORRA:
 *
 * users/{uid}
 * students/{uid}
 *
 * Además elimina registros relacionados
 * donde el estudiante esté asociado mediante uid.
 *
 * IMPORTANTE:
 *
 * NO elimina la cuenta de Firebase Authentication.
 *
 * Si el usuario vuelve a iniciar sesión,
 * Login.jsx podrá recrear sus documentos.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @returns {Promise<void>}
 *
 * ============================================================================
 */
export const deleteStudent = async (uid) => {

  /**
   * ==========================================================================
   * CREAR BATCH
   * ==========================================================================
   *
   * Permite ejecutar las operaciones
   * de forma atómica.
   */
  const batch = writeBatch(db)

  /**
   * ==========================================================================
   * BORRAR DOCUMENTOS PRINCIPALES
   * ==========================================================================
   */
  batch.delete(
    doc(
      db,
      'users',
      uid
    )
  )

  batch.delete(
    doc(
      db,
      'students',
      uid
    )
  )

  /**
   * ==========================================================================
   * BORRAR REGISTROS RELACIONADOS
   * ==========================================================================
   *
   * Colecciones donde se utiliza el campo uid
   * para relacionar al estudiante.
   */
  const relatedCollections = [
    'loans',
    'savings',
    'notifications',
    'transactions'
  ]

  /**
   * Consultar cada colección relacionada.
   */
  for (const collectionName of relatedCollections) {

    const relatedQuery = query(
      collection(
        db,
        collectionName
      ),
      where(
        'uid',
        '==',
        uid
      )
    )

    const relatedSnap = await getDocs(
      relatedQuery
    )

    /**
     * Agregar cada documento al batch.
     */
    relatedSnap.forEach(
      (relatedDoc) => {
        batch.delete(
          relatedDoc.ref
        )
      }
    )
  }

  /**
   * ==========================================================================
   * QUITAR ESTUDIANTE DE EVENTOS
   * ==========================================================================
   *
   * Busca eventos donde el UID del estudiante
   * aparezca dentro de participants.
   */
  const eventsSnap = await getDocs(
    collection(
      db,
      'events'
    )
  )

  eventsSnap.forEach(
    (eventDoc) => {

      const participants =
        eventDoc.data().participants

      /**
       * Si el estudiante participa en el evento,
       * quitar su UID.
       */
      if (
        Array.isArray(participants)
        &&
        participants.includes(uid)
      ) {

        batch.update(
          eventDoc.ref,
          {
            participants: arrayRemove(uid)
          }
        )
      }
    }
  )

  /**
   * ==========================================================================
   * EJECUTAR BATCH
   * ==========================================================================
   *
   * Todas las operaciones se ejecutan
   * de forma atómica.
   */
  await batch.commit()
}


/**
 * ============================================================================
 * ELIMINAR TODOS LOS ESTUDIANTES
 * ============================================================================
 *
 * Obtiene todos los usuarios con role "student"
 * y elimina sus registros.
 *
 * @returns {Promise<void>}
 *
 * ============================================================================
 */
export const deleteAllStudents = async () => {

  /**
   * Obtener todos los estudiantes.
   */
  const students = await getAllStudents()

  /**
   * Eliminar todos.
   */
  await Promise.all(
    students.map(
      (student) =>
        deleteStudent(student.uid)
    )
  )
}