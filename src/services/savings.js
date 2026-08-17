/**
 * ============================================================================
 * SAVINGS SERVICE
 * ============================================================================
 * Servicio encargado de gestionar las cuentas de ahorro
 * dentro de la simulación financiera.
 *
 * Este módulo centraliza todas las operaciones relacionadas con:
 *
 * - Creación de objetivos de ahorro.
 * - Depósitos desde el balance principal.
 * - Retiros hacia el balance principal.
 * - Consulta de ahorros.
 * - Actualización en tiempo real.
 *
 * COLECCIÓN PRINCIPAL:
 *
 * savings/{savingId}
 *
 * ESTRUCTURA DE UN AHORRO:
 *
 * {
 *   uid,
 *   name,
 *   balance,
 *   createdAt
 * }
 *
 * EJEMPLOS DE OBJETIVOS:
 *
 * - Vacaciones
 * - Laptop nueva
 * - Fondo de emergencia
 * - Universidad
 * - Vehículo
 *
 * FLUJO GENERAL:
 *
 * Estudiante
 *      ↓
 * createSaving()
 *      ↓
 * savings/{savingId}
 *      ↓
 * depositToSaving()
 *      ↓
 * Aumenta ahorro
 * Disminuye balance principal
 *      ↓
 * withdrawFromSaving()
 *      ↓
 * Disminuye ahorro
 * Aumenta balance principal
 *
 * ============================================================================
 */

/**
 * Instancia global de Firestore.
 *
 * Permite acceder a la base de datos
 * configurada para toda la aplicación.
 */
import { db } from './firebase'

/**
 * Funciones del SDK de Firestore utilizadas
 * por este servicio.
 *
 * collection()
 * → Referencia a colecciones.
 *
 * addDoc()
 * → Crear documentos.
 *
 * doc()
 * → Referencia a documentos específicos.
 *
 * getDoc()
 * → Obtener documento.
 *
 * updateDoc()
 * → Actualizar campos.
 *
 * query()
 * → Construir consultas.
 *
 * where()
 * → Aplicar filtros.
 *
 * onSnapshot()
 * → Escuchar cambios en tiempo real.
 *
 * serverTimestamp()
 * → Fecha generada por Firebase.
 *
 * NOTA:
 * Aunque getDoc está importado, actualmente
 * no es utilizado dentro de este archivo.
 * Puede estar reservado para futuras funcionalidades.
 */
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

/**
 * ============================================================================
 * CREAR OBJETIVO DE AHORRO
 * ============================================================================
 *
 * Genera una nueva cuenta de ahorro dentro de:
 *
 * savings/{savingId}
 *
 * IMPORTANTE:
 *
 * El ahorro NO recibe dinero automáticamente.
 *
 * Todos los ahorros inician con:
 *
 * balance = 0
 *
 * El estudiante deberá transferir dinero
 * manualmente desde su balance principal.
 *
 * EJEMPLO:
 *
 * createSaving(
 *   uid,
 *   'Vacaciones'
 * )
 *
 * Resultado:
 *
 * {
 *   uid: 'abc123',
 *   name: 'Vacaciones',
 *   balance: 0
 * }
 *
 * @param {string} uid
 * UID del estudiante propietario.
 *
 * @param {string} name
 * Nombre del objetivo de ahorro.
 *
 * @returns {Promise<string>}
 * ID generado para el ahorro.
 * ============================================================================
 */
export const createSaving = async (uid, name, type = 'saving') => {

  /**
   * Crear documento en Firestore.
   */
  const ref = await addDoc(
    collection(db, 'savings'),
    {

      /**
       * Propietario del ahorro.
       */
      uid,

      /**
       * Nombre visible del objetivo.
       *
       * Ejemplos:
       * - Vacaciones
       * - Casa
       * - Laptop
       */
      name,

      /**
       * Tipo de cuenta de ahorro.
       *
       * Valores posibles:
       * - 'saving':     cuenta de ahorro normal, visible y editable por el estudiante.
       * - 'investment': cuenta de inversión bloqueada, no editable hasta que vence.
       *
       * Se usa en Savings.jsx para filtrar y ocultar las cuentas de inversión
       * de la lista principal, evitando que el estudiante pueda depositar o retirar
       * mientras la inversión está activa.
       */
      type,

      /**
       * Balance inicial.
       *
       * Todos los ahorros comienzan en cero.
       */
      balance: 0,

      /**
       * Fecha de creación.
       *
       * Generada por Firebase para garantizar
       * consistencia entre dispositivos.
       */
      createdAt: serverTimestamp(),
    }
  )

  /**
   * Retornar ID generado por Firestore.
   */
  return ref.id
}

/**
 * ============================================================================
 * DEPOSITAR EN AHORRO
 * ============================================================================
 *
 * Transfiere dinero desde el balance principal
 * del estudiante hacia una cuenta de ahorro.
 *
 * AFECTA DOS DOCUMENTOS:
 *
 * students/{uid}
 * savings/{savingId}
 *
 * RESULTADO:
 *
 * Balance principal ↓
 * Balance ahorro ↑
 *
 * EJEMPLO:
 *
 * Balance estudiante:
 * ₡50,000
 *
 * Balance ahorro:
 * ₡10,000
 *
 * Depósito:
 * ₡5,000
 *
 * Resultado:
 *
 * Estudiante:
 * ₡45,000
 *
 * Ahorro:
 * ₡15,000
 *
 * IMPORTANTE:
 *
 * Esta función NO valida que exista saldo suficiente.
 *
 * Esa validación debe realizarse previamente
 * desde la interfaz o componente que invoque
 * esta función.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {string} savingId
 * ID del ahorro destino.
 *
 * @param {number} amount
 * Monto a transferir.
 *
 * @param {number} currentStudentBalance
 * Balance actual del estudiante.
 *
 * @param {number} currentSavingBalance
 * Balance actual del ahorro.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const depositToSaving = async (
  uid,
  savingId,
  amount,
  currentStudentBalance,
  currentSavingBalance
) => {

  /**
   * Referencia al documento del estudiante.
   */
  const studentRef =
    doc(db, 'students', uid)

  /**
   * Referencia al documento del ahorro.
   */
  const savingRef =
    doc(db, 'savings', savingId)

  /**
   * --------------------------------------------------------------------------
   * ACTUALIZAR BALANCE DEL ESTUDIANTE
   * --------------------------------------------------------------------------
   *
   * Se descuenta el monto transferido.
   */
  await updateDoc(
    studentRef,
    {
      balance: currentStudentBalance - amount
    }
  )

  /**
   * --------------------------------------------------------------------------
   * ACTUALIZAR BALANCE DEL AHORRO
   * --------------------------------------------------------------------------
   *
   * Se suma el monto transferido.
   */
  await updateDoc(
    savingRef,
    {
      balance: currentSavingBalance + amount
    }
  )

  /**
   * IMPORTANTE:
   *
   * Actualmente ambas operaciones se ejecutan
   * por separado.
   *
   * Riesgo:
   *
   * Si la primera actualización funciona
   * pero la segunda falla, los datos
   * quedan inconsistentes.
   *
   * Ejemplo:
   *
   * ✓ Se descuenta dinero al estudiante
   * ✗ No se acredita al ahorro
   *
   * Por eso existe el TODO:
   *
   * Migrar a Batch Write o Transaction
   * para lograr atomicidad.
   */
}

/**
 * ============================================================================
 * RETIRAR DINERO DE UN AHORRO
 * ============================================================================
 *
 * Realiza el proceso inverso al depósito.
 *
 * Transfiere dinero desde una cuenta
 * de ahorro hacia el balance principal.
 *
 * RESULTADO:
 *
 * Balance principal ↑
 * Balance ahorro ↓
 *
 * EJEMPLO:
 *
 * Ahorro:
 * ₡20,000
 *
 * Balance:
 * ₡30,000
 *
 * Retiro:
 * ₡5,000
 *
 * Resultado:
 *
 * Ahorro:
 * ₡15,000
 *
 * Balance:
 * ₡35,000
 *
 * PRECONDICIÓN:
 *
 * El ahorro debe contener al menos
 * el monto solicitado.
 *
 * Esta validación debe realizarse
 * antes de invocar esta función.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {string} savingId
 * ID del ahorro origen.
 *
 * @param {number} amount
 * Monto a retirar.
 *
 * @param {number} currentStudentBalance
 * Balance actual del estudiante.
 *
 * @param {number} currentSavingBalance
 * Balance actual del ahorro.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const withdrawFromSaving = async (
  uid,
  savingId,
  amount,
  currentStudentBalance,
  currentSavingBalance
) => {

  /**
   * Referencia al documento del estudiante.
   */
  const studentRef =
    doc(db, 'students', uid)

  /**
   * Referencia al documento del ahorro.
   */
  const savingRef =
    doc(db, 'savings', savingId)

  /**
   * Aumentar balance principal.
   */
  await updateDoc(
    studentRef,
    {
      balance: currentStudentBalance + amount
    }
  )

  /**
   * Disminuir balance del ahorro.
   */
  await updateDoc(
    savingRef,
    {
      balance: currentSavingBalance - amount
    }
  )
}

/**
 * ============================================================================
 * SUSCRIPCIÓN A AHORROS
 * ============================================================================
 *
 * Escucha en tiempo real todos los objetivos
 * de ahorro pertenecientes a un estudiante.
 *
 * UTILIZA:
 *
 * onSnapshot()
 *
 * para mantener la interfaz sincronizada
 * automáticamente con Firestore.
 *
 * EVENTOS QUE DISPARAN ACTUALIZACIONES:
 *
 * ✓ Creación de ahorro.
 * ✓ Depósitos.
 * ✓ Retiros.
 * ✓ Modificaciones futuras.
 *
 * CONSULTA:
 *
 * savings
 * WHERE uid == estudiante
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {Function} callback
 * Función que recibe el arreglo actualizado.
 *
 * @returns {Function}
 * Función unsubscribe.
 * ============================================================================
 */
export const subscribeToSavings = (uid, callback) => {

  /**
   * Consulta filtrada por propietario.
   *
   * Solo retorna ahorros pertenecientes
   * al estudiante actual.
   */
  const q = query(
    collection(db, 'savings'),

    where(
      'uid',
      '==',
      uid
    )
  )

  /**
   * Escucha en tiempo real.
   *
   * Se ejecuta:
   *
   * - Al iniciar la suscripción.
   * - Cuando se crea un ahorro.
   * - Cuando cambia un balance.
   * - Cuando se modifica un documento.
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
     * Enviar resultados actualizados
     * al componente que está escuchando.
     */
    callback(data)
  })
}
/**
 * ============================================================================
 * LIQUIDAR INVERSIÓN
 * ============================================================================
 *
 * Cierra una cuenta de ahorro de inversión al vencimiento,
 * acreditando al balance principal del estudiante el monto
 * total con intereses y dejando el ahorro en cero.
 *
 * CUÁNDO SE USA:
 *
 * Cuando el profesor finaliza un evento de tipo `investment`.
 * El sistema busca la cuenta de ahorro correspondiente a cada
 * estudiante que invirtió y ejecuta esta función por cada uno.
 *
 * AFECTA DOS DOCUMENTOS:
 *
 * students/{uid}    → balance ↑ (capital + intereses)
 * savings/{savingId} → balance = 0 (inversión cerrada)
 *
 * EJEMPLO:
 *
 * Inversión inicial: ₡10,000
 * Tasa: 15%
 * Ganancia: ₡1,500
 * Total acreditado: ₡11,500
 *
 * Resultado:
 *
 * Balance estudiante: currentBalance + 11,500
 * Balance ahorro: 0
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {string} savingId
 * ID de la cuenta de ahorro de la inversión.
 *
 * @param {number} totalPayout
 * Monto total a acreditar (capital + intereses).
 *
 * @param {number} currentStudentBalance
 * Balance actual del estudiante antes de liquidar.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const liquidateSaving = async (
  uid,
  savingId,
  totalPayout,
  currentStudentBalance
) => {

  /**
   * Referencia al documento del estudiante.
   */
  const studentRef = doc(db, 'students', uid)

  /**
   * Referencia al documento del ahorro de inversión.
   */
  const savingRef = doc(db, 'savings', savingId)

  /**
   * Acreditar capital + intereses al balance principal.
   *
   * El estudiante recupera su inversión con ganancia.
   */
  await updateDoc(studentRef, {
    balance: currentStudentBalance + totalPayout
  })

  /**
   * Cerrar la cuenta de inversión dejándola en cero.
   *
   * El dinero ya fue transferido al balance principal,
   * así que el ahorro queda saldado.
   */
  await updateDoc(savingRef, {
    balance: 0
  })
}

/**
 * ============================================================================
 * ELIMINAR OBJETIVO DE AHORRO
 * ============================================================================
 *
 * Elimina un documento de la colección savings/{savingId}.
 *
 * CONDICIÓN DE SEGURIDAD:
 *
 * Solo permite eliminar si el balance del ahorro es cero.
 * Si el ahorro tiene saldo, lanza un error para que el
 * componente lo informe al usuario antes de continuar.
 *
 * FLUJO:
 *
 * 1. Leer el documento para verificar el balance actual.
 * 2. Si balance > 0 → lanzar error (el usuario debe retirar primero).
 * 3. Si balance === 0 → eliminar el documento.
 *
 * @param {string} savingId
 * ID del documento de ahorro a eliminar.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const deleteSaving = async (savingId) => {

  /**
   * Referencia al documento del ahorro.
   */
  const savingRef = doc(db, 'savings', savingId)

  /**
   * Leer el documento para validar
   * que el balance esté en cero.
   */
  const snap = await getDoc(savingRef)

  if (!snap.exists()) {
    throw new Error('El ahorro no existe')
  }

  /**
   * Bloquear la eliminación si el ahorro
   * tiene saldo pendiente de retirar.
   */
  if (snap.data().balance > 0) {
    throw new Error('Debes retirar todo el saldo antes de eliminar este ahorro')
  }

  /**
   * Eliminar el documento del ahorro.
   */
  await deleteDoc(savingRef)
}
