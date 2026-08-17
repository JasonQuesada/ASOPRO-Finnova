/**
 * ============================================================================
 * LOANS SERVICE
 * ============================================================================
 * Servicio encargado de gestionar todo el ciclo de vida
 * de los préstamos dentro de la simulación financiera.
 *
 * Este módulo centraliza las operaciones relacionadas con:
 *
 * - Creación de préstamos.
 * - Cálculo de intereses.
 * - Registro de pagos.
 * - Actualización de deuda pendiente.
 * - Consulta de préstamos activos.
 * - Suscripciones en tiempo real.
 *
 * COLECCIÓN PRINCIPAL:
 *
 * loans/{loanId}
 *
 * ESTRUCTURA GENERAL DE UN PRÉSTAMO:
 *
 * {
 *   uid,
 *   eventId,
 *   eventTitle,
 *   amount,
 *   interest,
 *   totalOwed,
 *   amountPaid,
 *   remainingBalance,
 *   status,
 *   dueDate,
 *   createdAt
 * }
 *
 * FLUJO GENERAL:
 *
 * Evento
 *    ↓
 * Estudiante solicita préstamo
 *    ↓
 * createLoan()
 *    ↓
 * loans/{loanId}
 *    ↓
 * Pagos parciales
 *    ↓
 * payLoan()
 *    ↓
 * Estado actualizado
 *
 * BENEFICIOS:
 *
 * - Centraliza la lógica financiera.
 * - Evita duplicación de código.
 * - Facilita mantenimiento.
 * - Permite futuras ampliaciones.
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
 * Referencia a colecciones.
 *
 * addDoc():
 * Crea nuevos documentos.
 *
 * doc():
 * Referencia a documentos específicos.
 *
 * getDoc():
 * Obtiene un documento.
 *
 * updateDoc():
 * Actualiza campos específicos.
 *
 * query():
 * Construye consultas avanzadas.
 *
 * where():
 * Agrega filtros a consultas.
 *
 * onSnapshot():
 * Escucha cambios en tiempo real.
 *
 * serverTimestamp():
 * Marca de tiempo generada por Firebase.
 *
 * Timestamp:
 * Tipo de fecha compatible con Firestore.
 */
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

/**
 * ============================================================================
 * TASA DE INTERÉS POR DEFECTO
 * ============================================================================
 *
 * Porcentaje utilizado cuando un evento
 * no especifica una tasa personalizada.
 *
 * Fórmula:
 *
 * totalOwed =
 * amount + (amount * interest / 100)
 *
 * Ejemplo:
 *
 * amount = 10000
 * interest = 8
 *
 * totalOwed = 10800
 *
 * Puede ser reemplazada durante la creación
 * del préstamo enviando otro valor.
 * ============================================================================
 */
export const DEFAULT_LOAN_INTEREST = 8 // 8%

/**
 * ============================================================================
 * CREAR PRÉSTAMO
 * ============================================================================
 *
 * Genera un nuevo documento dentro de:
 *
 * loans/{loanId}
 *
 * cuando un estudiante selecciona la opción
 * "loan" dentro de un evento financiero.
 *
 * RESPONSABILIDADES:
 *
 * ✓ Calcular interés.
 * ✓ Calcular deuda total.
 * ✓ Calcular fecha límite.
 * ✓ Registrar préstamo en Firestore.
 * ✓ Inicializar estado financiero.
 *
 * FÓRMULA:
 *
 * totalOwed =
 * amount * (1 + interest / 100)
 *
 * EJEMPLO:
 *
 * amount = 50000
 * interest = 8
 *
 * totalOwed = 54000
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {string} eventId
 * Evento que originó el préstamo.
 *
 * @param {string} eventTitle
 * Título descriptivo del evento.
 *
 * @param {number} amount
 * Monto original solicitado.
 *
 * @param {number} [interest]
 * Porcentaje de interés.
 *
 * @param {number} [daysToPay]
 * Días permitidos para cancelar el préstamo.
 *
 * @returns {Promise<string>}
 * ID del préstamo creado.
 * ============================================================================
 */
export const createLoan = async (
  uid,
  eventId,
  eventTitle,
  amount,
  interest = DEFAULT_LOAN_INTEREST,
  daysToPlay = 30
) => {

  /**
   * Calcular monto total adeudado.
   *
   * Fórmula:
   *
   * monto + interés
   *
   * Math.round():
   * Evita decimales innecesarios.
   */
  const totalOwed =
    Math.round(
      amount * (1 + interest / 100)
    )

  /**
   * --------------------------------------------------------------------------
   * CALCULAR FECHA LÍMITE
   * --------------------------------------------------------------------------
   *
   * Se toma la fecha actual
   * y se agregan los días permitidos.
   *
   * Ejemplo:
   *
   * Hoy:
   * 01/01/2025
   *
   * daysToPlay:
   * 30
   *
   * Resultado:
   * 31/01/2025
   */
  const dueDate = new Date()

  dueDate.setDate(
    dueDate.getDate() + daysToPlay
  )

  /**
   * --------------------------------------------------------------------------
   * CREAR DOCUMENTO DEL PRÉSTAMO
   * --------------------------------------------------------------------------
   *
   * Firestore genera automáticamente
   * el ID del documento.
   */
  const loanRef =
    await addDoc(
      collection(db, 'loans'),
      {

        /**
         * UID del estudiante deudor.
         */
        uid,

        /**
         * Evento que originó el préstamo.
         */
        eventId,

        /**
         * Título utilizado para mostrar
         * información amigable en interfaz.
         */
        eventTitle,

        /**
         * Monto original solicitado.
         */
        amount,

        /**
         * Porcentaje de interés aplicado.
         */
        interest,

        /**
         * Total que deberá pagar el estudiante.
         */
        totalOwed,

        /**
         * Dinero abonado hasta el momento.
         *
         * Inicia en cero.
         */
        amountPaid: 0,

        /**
         * Deuda restante.
         *
         * Inicialmente es igual
         * al monto total adeudado.
         */
        remainingBalance: totalOwed,

        /**
         * Estado del préstamo.
         *
         * Valores posibles:
         *
         * active
         * paid
         */
        status: 'active',

        /**
         * Fecha límite de pago.
         *
         * Se convierte al tipo Timestamp
         * compatible con Firestore.
         */
        dueDate: Timestamp.fromDate(dueDate),

        /**
         * Fecha de creación.
         *
         * Generada por el servidor.
         */
        createdAt: serverTimestamp(),
      }
    )

  /**
   * Retornar ID generado.
   */
  return loanRef.id
}

/**
 * ============================================================================
 * REGISTRAR PAGO DE PRÉSTAMO
 * ============================================================================
 *
 * Permite registrar un abono parcial
 * o total sobre un préstamo existente.
 *
 * ACTUALIZA:
 *
 * - amountPaid
 * - remainingBalance
 * - status
 *
 * COMPORTAMIENTO:
 *
 * Si la deuda llega a cero:
 *
 * status = paid
 *
 * De lo contrario:
 *
 * status = active
 *
 * @param {string} loanId
 * ID del préstamo.
 *
 * @param {number} payAmount
 * Monto abonado.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const payLoan = async (loanId, payAmount) => {

  /**
   * Referencia al documento.
   */
  const ref =
    doc(
      db,
      'loans',
      loanId
    )

  /**
   * Obtener información actual.
   */
  const snap =
    await getDoc(ref)

  /**
   * Validación de existencia.
   *
   * Evita intentar modificar
   * un documento inexistente.
   */
  if (!snap.exists()) {
    throw new Error('Préstamo no encontrado')
  }

  /**
   * Datos actuales del préstamo.
   */
  const loan = snap.data()

  /**
   * --------------------------------------------------------------------------
   * CALCULAR NUEVO TOTAL PAGADO
   * --------------------------------------------------------------------------
   *
   * Suma el nuevo abono
   * al historial acumulado.
   */
  const newAmountPaid =
    loan.amountPaid + payAmount

  /**
   * --------------------------------------------------------------------------
   * CALCULAR DEUDA RESTANTE
   * --------------------------------------------------------------------------
   *
   * Math.max evita que la deuda
   * se vuelva negativa.
   *
   * Ejemplo:
   *
   * deuda = 1000
   * pago = 1200
   *
   * resultado = 0
   */
  const newRemainingBalance =
    Math.max(
      0,
      loan.remainingBalance - payAmount
    )

  /**
   * --------------------------------------------------------------------------
   * DETERMINAR ESTADO DEL PRÉSTAMO
   * --------------------------------------------------------------------------
   *
   * Si no queda deuda:
   *
   * paid
   *
   * Si aún existe saldo pendiente:
   *
   * active
   */
  const newStatus =
    newRemainingBalance === 0
      ? 'paid'
      : 'active'

  /**
   * --------------------------------------------------------------------------
   * ACTUALIZAR FIRESTORE — PRÉSTAMO
   * --------------------------------------------------------------------------
   */
  await updateDoc(
    ref,
    {
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance,
      status: newStatus,
    }
  )

  /**
   * --------------------------------------------------------------------------
   * ACTUALIZAR FIRESTORE — DEUDA TOTAL DEL ESTUDIANTE
   * --------------------------------------------------------------------------
   *
   * Lee el totalDebt actual del documento del estudiante
   * y le resta el monto abonado, sin bajar de cero.
   *
   * Esto mantiene el campo totalDebt sincronizado
   * con los abonos reales, evitando que FinancialStatus
   * muestre una deuda acumulada incorrecta.
   */
  const studentRef = doc(db, 'students', loan.uid)
  const studentSnap = await getDoc(studentRef)

  if (studentSnap.exists()) {
    const currentDebt = studentSnap.data().totalDebt ?? 0

    await updateDoc(studentRef, {
      totalDebt: Math.max(0, currentDebt - payAmount),
    })
  }
}

/**
 * ============================================================================
 * SUSCRIPCIÓN A PRÉSTAMOS ACTIVOS
 * ============================================================================
 *
 * Crea una escucha en tiempo real
 * de todos los préstamos activos
 * pertenecientes a un estudiante.
 *
 * SOLO RETORNA:
 *
 * status === 'active'
 *
 * Esto permite:
 *
 * - Mostrar deudas pendientes.
 * - Actualizar la interfaz automáticamente.
 * - Reflejar pagos en tiempo real.
 *
 * UTILIZA:
 *
 * onSnapshot()
 *
 * por lo que los cambios llegan
 * inmediatamente sin recargar.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {Function} callback
 * Función ejecutada cuando hay cambios.
 *
 * @returns {Function}
 * Función unsubscribe para cancelar
 * la suscripción.
 * ============================================================================
 */
export const subscribeToLoans = (uid, callback) => {

  /**
   * Consulta:
   *
   * loans
   * donde:
   *
   * uid == estudiante
   * status == active
   */
  const q = query(
    collection(db, 'loans'),
    where('uid', '==', uid),
    where('status', '==', 'active')
  )

  /**
   * Escucha en tiempo real.
   *
   * Se ejecuta:
   *
   * - Al suscribirse.
   * - Cuando se crea un préstamo.
   * - Cuando cambia un préstamo.
   * - Cuando se paga completamente.
   */
  return onSnapshot(q, (snapshot) => {

    /**
     * Transformar documentos Firestore
     * en objetos JavaScript normales.
     */
    const data =
      snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))

    /**
     * Entregar resultados al componente
     * que realizó la suscripción.
     */
    callback(data)
  })
}