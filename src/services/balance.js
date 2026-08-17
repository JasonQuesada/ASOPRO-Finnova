/**
 * ============================================================================
 * BALANCE SERVICE
 * ============================================================================
 * Servicio encargado de gestionar las operaciones
 * relacionadas con el balance financiero de los estudiantes.
 *
 * Este archivo centraliza el acceso al campo:
 *
 * students/{uid}.balance
 *
 * BENEFICIOS:
 * - Evita duplicar lógica de Firestore.
 * - Centraliza la gestión del balance.
 * - Facilita mantenimiento futuro.
 * - Reduce errores al manipular saldos.
 *
 * FUNCIONALIDADES DISPONIBLES:
 *
 * 1. getBalance()
 *    → Obtiene el saldo actual del estudiante.
 *
 * 2. updateBalance()
 *    → Actualiza el saldo del estudiante.
 *
 * IMPORTANTE:
 * Este servicio únicamente administra el valor
 * almacenado en Firestore.
 *
 * La lógica financiera (compras, préstamos,
 * inversiones, etc.) debe implementarse en los
 * módulos que consumen este servicio.
 * ============================================================================
 */

/**
 * Instancia configurada de Firestore.
 *
 * Se utiliza para acceder a la base de datos
 * principal de la aplicación.
 */
import { db } from './firebase'

/**
 * Funciones utilizadas para interactuar
 * con documentos de Firestore.
 *
 * doc():
 * Genera una referencia a un documento.
 *
 * getDoc():
 * Obtiene información de un documento.
 *
 * updateDoc():
 * Actualiza campos específicos de un documento.
 */
import {
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore'

/**
 * ============================================================================
 * OBTENER BALANCE DEL ESTUDIANTE
 * ============================================================================
 *
 * Recupera el saldo actual almacenado
 * dentro del documento:
 *
 * students/{uid}
 *
 * Flujo:
 *
 * 1. Crear referencia al estudiante.
 * 2. Obtener documento desde Firestore.
 * 3. Leer campo balance.
 * 4. Retornar el valor encontrado.
 *
 * Si por alguna razón:
 *
 * - El documento no existe.
 * - El campo balance no existe.
 * - El valor es undefined.
 *
 * Se retorna 0 como valor por defecto.
 *
 * Esto evita errores en operaciones matemáticas
 * posteriores dentro de la aplicación.
 *
 * @param {string} uid
 * UID único del estudiante.
 *
 * @returns {Promise<number>}
 * Balance actual del estudiante.
 * ============================================================================
 */
export const getBalance = async (uid) => {

  /**
   * Referencia al documento:
   *
   * students/{uid}
   */
  const ref =
    doc(
      db,
      'students',
      uid
    )

  /**
   * Obtener documento desde Firestore.
   */
  const snap =
    await getDoc(ref)

  /**
   * Retornar balance.
   *
   * Optional Chaining:
   * Evita errores si el documento no existe.
   *
   * Nullish Coalescing:
   * Si balance es null o undefined,
   * retorna 0.
   */
  return snap.data()?.balance ?? 0
}

/**
 * ============================================================================
 * ACTUALIZAR BALANCE DEL ESTUDIANTE
 * ============================================================================
 *
 * Modifica el campo:
 *
 * students/{uid}.balance
 *
 * Flujo:
 *
 * 1. Crear referencia al estudiante.
 * 2. Ejecutar actualización en Firestore.
 * 3. Guardar el nuevo saldo.
 *
 * IMPORTANTE:
 *
 * Esta función NO calcula diferencias.
 *
 * Ejemplo:
 *
 * balance actual = 50000
 *
 * updateBalance(uid, 30000)
 *
 * Resultado:
 * balance = 30000
 *
 * Es responsabilidad del componente o servicio
 * que invoque esta función calcular previamente
 * el nuevo valor.
 *
 * Ejemplo:
 *
 * const currentBalance = await getBalance(uid)
 *
 * const newBalance =
 *   currentBalance - amount
 *
 * await updateBalance(uid, newBalance)
 *
 * @param {string} uid
 * UID único del estudiante.
 *
 * @param {number} newBalance
 * Nuevo saldo que será almacenado.
 *
 * @returns {Promise<void>}
 * ============================================================================
 */
export const updateBalance = async (uid, newBalance) => {

  /**
   * Referencia al documento:
   *
   * students/{uid}
   */
  const ref =
    doc(
      db,
      'students',
      uid
    )

  /**
   * Actualización parcial del documento.
   *
   * updateDoc solamente modifica
   * el campo indicado.
   *
   * No reemplaza el documento completo.
   */
  await updateDoc(
    ref,
    {
      balance: newBalance
    }
  )
}