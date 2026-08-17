/**
 * ============================================================================
 * PÁGINA DE ESTADO FINANCIERO
 * ============================================================================
 * Pantalla dedicada a mostrar la situación financiera completa del estudiante.
 *
 * Muestra:
 * - Balance actual disponible.
 * - Deuda total acumulada.
 * - Patrimonio neto.
 * - Préstamos activos.
 * - Últimos 10 movimientos financieros.
 * - Alerta si la deuda supera ₡150,000.
 *
 * Todos los datos se sincronizan en tiempo real mediante Firestore.
 *
 * SUSCRIPCIONES ACTIVAS:
 * - students/{uid}  → balance y totalDebt
 * - loans           → préstamos activos
 * - transactions    → historial de movimientos
 * ============================================================================
 */

/**
 * Hooks principales de React.
 *
 * useState:
 * Manejo de estado local.
 *
 * useEffect:
 * Ejecución de efectos secundarios y suscripciones.
 */
import { useState, useEffect } from 'react'

/**
 * Hook de React Router para navegación programática.
 */
import { useNavigate } from 'react-router-dom'

/**
 * Iconos para representar estados y acciones financieras.
 */
import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  PiggyBank,
} from 'lucide-react'

/**
 * Componentes de interfaz reutilizables.
 *
 * Card:
 * Contenedor visual para agrupar contenido.
 *
 * Button:
 * Botón con variantes visuales consistentes.
 */
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Instancias de Firebase.
 *
 * auth:
 * Permite obtener el usuario autenticado actual.
 *
 * db:
 * Instancia principal de Firestore.
 */
import { auth, db } from '@/services/firebase'

/**
 * Funciones de Firestore.
 *
 * doc:
 * Construye referencias a documentos.
 *
 * onSnapshot:
 * Escucha cambios en tiempo real.
 */
import { doc, onSnapshot } from 'firebase/firestore'

/**
 * Servicio de préstamos.
 *
 * subscribeToLoans:
 * Suscripción en tiempo real a los préstamos activos del estudiante.
 */
import { subscribeToLoans } from '@/services/loans'

/**
 * Servicio de transacciones.
 *
 * subscribeToTransactions:
 * Suscripción en tiempo real al historial de movimientos.
 */
import { subscribeToTransactions } from '@/services/transactions'

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL
 * ============================================================================
 *
 * @returns {JSX.Element}
 * ============================================================================
 */
export default function FinancialStatus() {

  /**
   * Hook de navegación programática.
   */
  const navigate = useNavigate()

  /**
   * Usuario autenticado actualmente desde Firebase Auth.
   */
  const user = auth.currentUser

  /**
   * ==========================================================================
   * ESTADOS LOCALES
   * ==========================================================================
   */

  /**
   * Datos del documento del estudiante en Firestore.
   * Contiene balance y totalDebt.
   */
  const [studentData, setStudentData] = useState(null)

  /**
   * Lista de préstamos activos del estudiante.
   */
  const [loans, setLoans] = useState([])

  /**
   * Historial completo de movimientos financieros.
   */
  const [transactions, setTransactions] = useState([])

  /**
   * ==========================================================================
   * ESTADOS DE CARGA
   * ==========================================================================
   */
  
  /**
   * Indica si el documento principal del estudiante
   * ya fue recibido desde Firestore.
   */
  const [loadingStudent, setLoadingStudent] = useState(true)

  /**
   * Indica si la lista de préstamos activos
   * ya fue recibida desde Firestore.
   */
  const [loadingLoans, setLoadingLoans] = useState(true)

  /**
   * Indica si el historial de movimientos
   * ya fue recibido desde Firestore.
   */
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  /**
   * ==========================================================================
   * SUSCRIPCIÓN AL DOCUMENTO DEL ESTUDIANTE
   * ==========================================================================
   *
   * Escucha cambios en:
   * students/{uid}
   *
   * Se actualiza automáticamente cuando cambia
   * el balance o la deuda total.
   * ==========================================================================
   */
  useEffect(() => {

    if (!user) return

    const ref = doc(db, 'students', user.uid)

    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setStudentData(snap.data())
      }

    /**
     * Marca la carga del documento del estudiante
     * como completada después de la primera respuesta.
     */
      setLoadingStudent(false)
    })

    return () => unsub()

  }, [user])

  /**
   * ==========================================================================
   * SUSCRIPCIÓN A PRÉSTAMOS ACTIVOS
   * ==========================================================================
   *
   * Solo retorna préstamos con status === 'active'.
   * Se actualiza automáticamente cuando se crea o paga un préstamo.
   * ==========================================================================
   */
  useEffect(() => {

    if (!user) return

    const unsub = subscribeToLoans(user.uid, data => {
    /**
     * Actualiza la lista de préstamos activos.
     */
      setLoans(data)

      /**
       * Marca la carga de préstamos
       * como completada.
       */
      setLoadingLoans(false)
    })

    return () => unsub()

  }, [user])

  /**
   * ==========================================================================
   * SUSCRIPCIÓN A TRANSACCIONES
   * ==========================================================================
   *
   * Ordenadas por fecha descendente (más reciente primero).
   * ==========================================================================
   */
  useEffect(() => {

    if (!user) return

    const unsub = subscribeToTransactions(user.uid, data => {
      /**
       * Actualiza el historial de movimientos.
       */
      setTransactions(data)

      /**
       * Marca la carga de transacciones
       * como completada.
       */
      setLoadingTransactions(false)
    })

    return () => unsub()

  }, [user])

  /**
   * ==========================================================================
   * VALORES DERIVADOS
   * ==========================================================================
   *
   * Calculados a partir de los datos obtenidos desde Firestore.
   * ==========================================================================
   */

  /**
   * Balance disponible actual.
   */
  const balance = studentData?.balance ?? 0

  /**
   * Deuda total acumulada en todos los préstamos.
   */
  const totalDebt = studentData?.totalDebt ?? 0

  /**
   * Patrimonio neto = balance - deuda total.
   * Puede ser negativo si la deuda supera el balance.
   */
  const netWorth = balance - totalDebt

  /**
   * Determina si alguna de las suscripciones
   * aún se encuentra cargando información.
   */
  const loading =
  loadingStudent ||
  loadingLoans ||
  loadingTransactions

  /**
   * ==========================================================================
   * PANTALLA DE CARGA
   * ==========================================================================
   *
   * Se muestra mientras las suscripciones iniciales
   * recuperan la información desde Firestore.
   *
   * Evita mostrar balances, préstamos y movimientos
   * incompletos durante la carga inicial.
   * ==========================================================================
   */
  /**
   * Skeleton de carga del estado financiero.
   *
   * Se muestra mientras las suscripciones de Firestore (estudiante, préstamos
   * y transacciones) no han respondido aún. Replica la estructura visual de
   * las tres secciones principales: resumen, deuda y últimos movimientos.
   */
  if (loading) {
  return (
    <div className="min-h-screen bg-white pb-6">
      {/* HEADER — estructura idéntica al header real para evitar descuadre */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-12">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Estado Financiero</h1>
            <p className="text-blue-100 text-sm">Resumen de tu situación actual</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">

        {/* SKELETON: tarjeta de resumen de balance */}
        <Card className="p-5 rounded-2xl shadow-lg border-0 animate-pulse">
          <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
          <div className="h-10 w-40 bg-gray-200 rounded-full mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-100 rounded-xl p-3 space-y-1">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
            <div className="bg-gray-100 rounded-xl p-3 space-y-1">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        </Card>

        {/* SKELETON: tarjeta de deuda */}
        <Card className="p-5 rounded-2xl shadow-sm animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-36 bg-gray-200 rounded-full mb-3" />
          <div className="h-2 bg-gray-200 rounded-full mb-2" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </Card>

        {/* SKELETON: últimos movimientos */}
        <Card className="p-5 rounded-2xl shadow-sm animate-pulse">
          <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </Card>

      </div>
    </div>
  )
}

  return (
    <div className="min-h-screen bg-white pb-6">

      {/* =====================================================================
          HEADER PRINCIPAL
          ===================================================================== */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-">
        <div className="flex items-center gap-3">

          {/* Botón de regreso */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl">Estado Financiero</h1>
            <p className="text-blue-100 text-sm">
              Resumen de tu situación actual
            </p>
          </div>

        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ===================================================================
            TARJETA DE RESUMEN GENERAL
            =================================================================== */}
        <Card className="p-5 rounded-2xl bg-white shadow-lg border-0">

          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Resumen General
          </h2>

          <div className="space-y-3">

            {/* Fila de balance disponible */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Balance disponible</span>
              </div>
              <span className="font-bold text-blue-600">
                ₡{balance.toLocaleString()}
              </span>
            </div>

            {/* Fila de deuda total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm">Deuda total</span>
              </div>
              <span className="font-bold text-red-600">
                ₡{totalDebt.toLocaleString()}
              </span>
            </div>

            {/* Fila de patrimonio neto */}
            <div className="border-t pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Patrimonio neto</span>
              </div>
              <span className={`font-bold text-lg ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₡{netWorth.toLocaleString()}
              </span>
            </div>

          </div>
        </Card>

        {/* ===================================================================
            TARJETA DE PRÉSTAMOS ACTIVOS
            =================================================================== */}
        <Card className="p-5 rounded-2xl bg-white shadow-lg border-0">

          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Préstamos Activos
          </h2>

          {/* Estado vacío */}
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tienes préstamos activos
            </p>
          ) : (
            <div className="space-y-3">
              {loans.map(loan => (
                <div
                  key={loan.id}
                  className="bg-red-50 border border-red-100 rounded-xl p-3"
                >

                  {/* Título del préstamo y badge de estado */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{loan.eventTitle}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Activo
                    </span>
                  </div>

                  {/* Desglose del préstamo */}
                  <div className="text-xs text-muted-foreground space-y-1">

                    <div className="flex justify-between">
                      <span>Monto original</span>
                      <span>₡{loan.amount?.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Interés ({loan.interest}%)</span>
                      <span>₡{(loan.totalOwed - loan.amount)?.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between font-semibold text-red-600">
                      <span>Total pendiente</span>
                      <span>₡{loan.remainingBalance?.toLocaleString()}</span>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ===================================================================
            TARJETA DE HISTORIAL DE MOVIMIENTOS
            =================================================================== */}
        <Card className="p-5 rounded-2xl bg-white shadow-lg border-0">

          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Últimos Movimientos
          </h2>

          {/* Estado vacío */}
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay movimientos registrados
            </p>
          ) : (
            <div className="space-y-2">

              {/* Mostrar únicamente los últimos 10 movimientos */}
              {transactions.slice(0, 10).map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >

                  {/* Descripción y fecha */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    {/*
                      min-h reservada para la fecha: evita el layout shift que ocurría
                      cuando createdAt llegaba de Firestore después del primer render
                      y la fila cambiaba de altura al aparecer la fecha.
                    */}
                    <p className="text-xs text-muted-foreground min-h-[1rem]">
                      {tx.createdAt?.toDate
                        ? tx.createdAt.toDate().toLocaleDateString('es-CR')
                        : ''}
                    </p>
                  </div>

                  {/* Monto y balance resultante */}
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      tx.balanceAfter > tx.balanceBefore
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {tx.balanceAfter > tx.balanceBefore ? '+' : '-'}₡{tx.amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₡{tx.balanceAfter?.toLocaleString()}
                    </p>
                  </div>

                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ===================================================================
            ALERTA DE ALTO ENDEUDAMIENTO
            -------------------------------------------------------------------
            Solo visible cuando la deuda total supera ₡150,000.
            =================================================================== */}
        {totalDebt > 150000 && (
          <Card className="p-4 rounded-xl bg-red-50 border-red-200">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Advertencia: nivel de endeudamiento alto
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Tu deuda supera los ₡150,000. Revisa tu situación financiera.
                </p>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}