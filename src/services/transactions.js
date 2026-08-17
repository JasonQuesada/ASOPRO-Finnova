/**
 * ============================================================================
 * TRANSACTIONS SERVICE
 * ============================================================================
 * Servicio encargado de registrar y consultar
 * el historial de movimientos financieros realizados
 * por los estudiantes dentro de la simulación.
 *
 * Este módulo funciona como una bitácora financiera,
 * permitiendo auditar todos los cambios que afectan
 * el balance de un estudiante.
 *
 * COLECCIÓN PRINCIPAL:
 *
 * transactions/{transactionId}
 *
 * OBJETIVOS:
 *
 * ✓ Mantener historial financiero completo.
 * ✓ Permitir auditoría de movimientos.
 * ✓ Mostrar estados de cuenta.
 * ✓ Facilitar reportes futuros.
 * ✓ Rastrear origen de cada cambio de balance.
 *
 * EJEMPLOS DE TRANSACCIONES:
 *
 * - Compra en evento.
 * - Pago de préstamo.
 * - Depósito en ahorro.
 * - Retiro de ahorro.
 * - Cobro automático.
 * - Bonificación.
 * - Intereses generados.
 *
 * ESTRUCTURA GENERAL:
 *
 * {
 *   uid,
 *   type,
 *   amount,
 *   balanceBefore,
 *   balanceAfter,
 *   description,
 *   createdAt
 * }
 *
 * FLUJO:
 *
 * Acción financiera
 *        ↓
 * createTransaction()
 *        ↓
 * transactions/{id}
 *        ↓
 * subscribeToTransactions()
 *        ↓
 * Historial actualizado en tiempo real
 *
 * ============================================================================
 */

/**
 * Instancia global de Firestore.
 *
 * Utilizada para interactuar con la base
 * de datos central del sistema.
 */
import { db } from './firebase'

/**
 * Funciones de Firestore utilizadas
 * dentro de este servicio.
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
  serverTimestamp,
} from 'firebase/firestore'

/**
 * ============================================================================
 * TIPOS DE TRANSACCIÓN
 * ============================================================================
 *
 * Enumeración centralizada de todos los tipos
 * válidos de movimientos financieros.
 *
 * IMPORTANTE:
 *
 * Siempre utilizar estas constantes
 * en lugar de strings escritos manualmente.
 *
 * BENEFICIOS:
 *
 * ✓ Evita errores tipográficos.
 * ✓ Facilita mantenimiento.
 * ✓ Mejora autocompletado.
 * ✓ Centraliza lógica financiera.
 *
 * EJEMPLO:
 *
 * createTransaction(
 *   uid,
 *   TRANSACTION_TYPES.EVENT_BUY,
 *   ...
 * )
 *
 * en lugar de:
 *
 * createTransaction(
 *   uid,
 *   'event_buy',
 *   ...
 * )
 * ============================================================================
 */
export const TRANSACTION_TYPES = {

  /**
   * Depósito desde el balance principal
   * hacia una cuenta de ahorro.
   *
   * Resultado:
   *
   * Balance principal ↓
   * Ahorro ↑
   */
  DEPOSIT_SAVING: 'deposit_saving',

  /**
   * Retiro desde un ahorro
   * hacia el balance principal.
   *
   * Resultado:
   *
   * Ahorro ↓
   * Balance principal ↑
   */
  WITHDRAW_SAVING: 'withdraw_saving',

  /**
   * Cobro aplicado automáticamente
   * por el sistema.
   *
   * Ejemplos:
   *
   * - Multas.
   * - Gastos inesperados.
   * - Penalizaciones.
   */
  SYSTEM_CHARGE: 'system_charge',

  /**
   * Depósito realizado automáticamente
   * por el sistema.
   *
   * Ejemplos:
   *
   * - Bonificaciones.
   * - Premios.
   * - Ingresos extraordinarios.
   */
  SYSTEM_DEPOSIT: 'system_deposit',

  /**
   * Compra realizada dentro
   * de un evento financiero.
   *
   * Generalmente reduce el balance.
   */
  EVENT_BUY: 'event_buy',

  /**
   * Pago o abono realizado
   * sobre un préstamo activo.
   */
  LOAN_PAYMENT: 'loan_payment',

  /**
   * Interés generado por una cuenta
   * de ahorro o inversión.
   */
  SAVING_INTEREST: 'saving_interest',
}

/**
 * ============================================================================
 * CREAR TRANSACCIÓN
 * ============================================================================
 *
 * Registra un nuevo movimiento financiero
 * dentro del historial del estudiante.
 *
 * IMPORTANTE:
 *
 * Esta función debería ejecutarse cada vez
 * que el balance de un estudiante cambie.
 *
 * De esta forma se mantiene una trazabilidad
 * completa de todas las operaciones.
 *
 * INFORMACIÓN REGISTRADA:
 *
 * ✓ Tipo de movimiento.
 * ✓ Monto involucrado.
 * ✓ Balance antes.
 * ✓ Balance después.
 * ✓ Descripción legible.
 * ✓ Fecha.
 * ✓ Relación con eventos, préstamos o ahorros.
 *
 * EJEMPLO:
 *
 * Antes:
 * ₡50,000
 *
 * Compra:
 * ₡10,000
 *
 * Después:
 * ₡40,000
 *
 * Se almacena:
 *
 * {
 *   balanceBefore: 50000,
 *   balanceAfter: 40000
 * }
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {string} type
 * Tipo de movimiento.
 *
 * @param {number} amount
 * Monto involucrado.
 *
 * IMPORTANTE:
 * Siempre debe enviarse positivo.
 *
 * @param {number} balanceBefore
 * Balance previo.
 *
 * @param {number} balanceAfter
 * Balance resultante.
 *
 * @param {string} description
 * Descripción visible para el usuario.
 *
 * @param {Object} [extra]
 * Datos opcionales.
 *
 * Ejemplos:
 *
 * - eventId
 * - loanId
 * - savingId
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const createTransaction = async (
  uid,
  type,
  amount,
  balanceBefore,
  balanceAfter,
  description,
  extra = {}
) => {

  /**
   * Crear documento dentro de:
   *
   * transactions/{transactionId}
   */
  await addDoc(
    collection(db, 'transactions'),
    {

      /**
       * Propietario de la transacción.
       */
      uid,

      /**
       * Tipo de movimiento financiero.
       */
      type,

      /**
       * Monto involucrado.
       *
       * Siempre positivo.
       */
      amount,

      /**
       * Balance antes de aplicar
       * el movimiento.
       */
      balanceBefore,

      /**
       * Balance después de aplicar
       * el movimiento.
       */
      balanceAfter,

      /**
       * Descripción legible
       * para mostrar en interfaz.
       */
      description,

      /**
       * Fecha de creación.
       *
       * Generada por Firebase.
       */
      createdAt: serverTimestamp(),

      /**
       * Campos opcionales.
       *
       * Permiten relacionar la transacción
       * con otras entidades.
       */
      ...extra,
    }
  )
}

/**
 * ============================================================================
 * SUSCRIPCIÓN A TRANSACCIONES
 * ============================================================================
 *
 * Escucha en tiempo real el historial financiero
 * completo de un estudiante.
 *
 * CONSULTA:
 *
 * transactions
 * WHERE uid == estudiante
 * ORDER BY createdAt DESC
 *
 * RESULTADO:
 *
 * Las transacciones más recientes
 * aparecen primero.
 *
 * BENEFICIOS:
 *
 * ✓ Actualización automática.
 * ✓ No requiere recargas.
 * ✓ Compatible con dashboards.
 * ✓ Ideal para estados de cuenta.
 *
 * EVENTOS QUE ACTUALIZAN LA SUSCRIPCIÓN:
 *
 * - Nueva transacción.
 * - Modificación de una transacción.
 * - Eliminación de una transacción.
 *
 * @param {string} uid
 * UID del estudiante.
 *
 * @param {Function} callback
 * Función que recibe el historial actualizado.
 *
 * @returns {Function}
 * Función unsubscribe para detener
 * la escucha en tiempo real.
 * ============================================================================
 */
export const subscribeToTransactions = (uid, callback) => {

  /**
   * Consulta filtrada por estudiante.
   *
   * Además ordena por fecha descendente.
   */
  const q = query(

    collection(db, 'transactions'),

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
   * Suscripción en tiempo real.
   *
   * Se ejecuta:
   *
   * ✓ Al iniciar la escucha.
   * ✓ Cuando se crea una transacción.
   * ✓ Cuando cambia una transacción.
   * ✓ Cuando se elimina una transacción.
   */
  return onSnapshot(q, (snapshot) => {

    /**
     * Convertir documentos Firestore
     * en objetos JavaScript normales.
     */
    const data =
      snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))

    /**
     * Entregar resultados actualizados
     * al componente que realizó
     * la suscripción.
     */
    callback(data)
  })
}