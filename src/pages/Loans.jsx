import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster, toast } from 'sonner'
import { auth, db } from '@/services/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { subscribeToLoans, payLoan } from '@/services/loans'
import { createTransaction, TRANSACTION_TYPES } from '@/services/transactions'

/**
 * Formatea un Timestamp de Firestore a fecha legible en español.
 *
 * @param {Object} timestamp - Timestamp de Firestore con método toDate()
 * @returns {string} Fecha formateada
 */
const formatDate = (timestamp) => {
  if (!timestamp) return '—'
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('es-CR', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })
}

/**
 * Calcula los días restantes hasta la fecha límite de pago.
 * Retorna un número negativo si ya venció.
 *
 * @param {Object} timestamp - Timestamp de Firestore de la fecha límite
 * @returns {number} Días restantes (negativo si vencido)
 */
const getDaysRemaining = (timestamp) => {
  if (!timestamp) return 0
  const due  = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  const now  = new Date()
  const diff = due - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Tarjeta individual de un préstamo activo.
 * Muestra detalles del préstamo, progreso de pago y formulario de abono.
 *
 * @param {Object}   loan           - Documento del préstamo desde Firestore
 * @param {number}   studentBalance - Balance actual del estudiante
 * @param {Function} onPay          - Callback al confirmar abono
 * @returns {JSX.Element}
 */
function LoanCard({ loan, studentBalance, onPay }) {
  // Controla si el formulario de abono está visible
  const [expanded,        setExpanded]        = useState(false)
  const [payAmount,       setPayAmount]       = useState('')
  const [paying,          setPaying]          = useState(false)

  /**
   * Controla la visibilidad del modal de confirmación del abono.
   * Se activa cuando el estudiante hace click en "Confirmar abono" y el
   * monto es válido. El abono no se procesa hasta que se confirma en el modal.
   */
  const [showPayConfirm,  setShowPayConfirm]  = useState(false)

  const daysRemaining = getDaysRemaining(loan.dueDate)
  const isOverdue     = daysRemaining < 0
  const isUrgent      = daysRemaining >= 0 && daysRemaining <= 5

  // Porcentaje de la deuda ya pagada — para la barra de progreso
  const paidPercent = loan.totalOwed > 0
    ? Math.round((loan.amountPaid / loan.totalOwed) * 100)
    : 0

  /**
   * Valida el monto del abono y abre el modal de confirmación.
   * El abono no se ejecuta hasta que el estudiante confirma en el modal.
   */
  const handleRequestPay = () => {
    const parsed = parseFloat(payAmount)

    if (!parsed || parsed <= 0) {
      toast.error('Ingresa un monto válido mayor a cero')
      return
    }
    if (parsed > studentBalance) {
      toast.error('Saldo insuficiente en tu balance principal')
      return
    }
    if (parsed > loan.remainingBalance) {
      toast.error(`El monto máximo a abonar es ₡${loan.remainingBalance.toLocaleString()}`)
      return
    }

    // Monto válido: mostrar modal de confirmación antes de procesar
    setShowPayConfirm(true)
  }

  /**
   * Ejecuta el abono después de que el estudiante confirmó en el modal.
   */
  const handleConfirmPay = async () => {
    setShowPayConfirm(false)
    setPaying(true)
    await onPay(loan, parseFloat(payAmount))
    setPayAmount('')
    setExpanded(false)
    setPaying(false)
  }

  return (
    <Card className={`p-4 rounded-2xl border-2 transition-all ${
      isOverdue  ? 'border-red-200 bg-red-50/30'    :
      isUrgent   ? 'border-amber-200 bg-amber-50/30' :
                   'border-purple-200'
    }`}>

      {/* CABECERA — evento + badge de estado */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            isOverdue ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-purple-100'
          }`}>
            <CreditCard className={`w-4 h-4 ${
              isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-purple-600'
            }`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{loan.eventTitle}</h3>
            <p className="text-xs text-muted-foreground">
              Préstamo al {loan.interest}% de interés
            </p>
          </div>
        </div>

        {/* BADGE DE DÍAS RESTANTES */}
        {isOverdue ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            Vencido
          </span>
        ) : (
          <span className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
            isUrgent
              ? 'text-amber-600 bg-amber-100 border border-amber-200'
              : 'text-purple-600 bg-purple-100 border border-purple-200'
          }`}>
            <Clock className="w-3 h-3" />
            {daysRemaining}d
          </span>
        )}
      </div>

      {/* MONTOS */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-xl p-2 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Total</div>
          <div className="text-sm font-bold">₡{loan.totalOwed.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Pagado</div>
          <div className="text-sm font-bold text-green-600">₡{loan.amountPaid.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Pendiente</div>
          <div className="text-sm font-bold text-red-600">₡{loan.remainingBalance.toLocaleString()}</div>
        </div>
      </div>

      {/* BARRA DE PROGRESO */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progreso de pago</span>
          <span>{paidPercent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-700"
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </div>

      {/* FECHA LÍMITE */}
      <p className="text-xs text-muted-foreground mb-3">
        Vence: {formatDate(loan.dueDate)}
      </p>

      {/* BOTÓN EXPANDIR / CONTRAER FORMULARIO DE ABONO */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Cancelar abono' : 'Realizar abono'}
      </Button>

      {/* FORMULARIO DE ABONO — visible solo cuando expanded */}
      {expanded && (
        <div className="mt-3 space-y-3 pt-3 border-t">
          <div className="space-y-1.5">
            <Label>Monto del abono</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₡</span>
              <Input
                type="number"
                placeholder="0"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="pl-7"
                min="1"
                max={Math.min(studentBalance, loan.remainingBalance)}
                autoFocus
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Balance: ₡{studentBalance.toLocaleString()}
              </span>
              <span>
                Máx. abono: ₡{Math.min(studentBalance, loan.remainingBalance).toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleRequestPay}
            disabled={paying}
          >
            {paying ? 'Procesando...' : 'Confirmar abono'}
          </Button>

          {/* ── Modal de confirmación del abono ──────────────────────────── */}
          {/*
            Se muestra cuando el monto es válido y el estudiante hace click
            en "Confirmar abono". Permite revisar el impacto antes de procesar.

            CANCELAR: cierra el modal sin procesar el abono.
            CONFIRMAR: ejecuta handleConfirmPay y descuenta del balance.
          */}
          {showPayConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
              <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

                {/* Ícono y título */}
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">¿Confirmar abono?</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Este monto se descontará de tu balance principal. No se puede deshacer.
                    </p>
                  </div>
                </div>

                {/* Resumen del abono */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Préstamo</span>
                    <span className="font-medium">{loan.eventTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto del abono</span>
                    <span className="font-medium text-red-600">₡{parseFloat(payAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deuda restante</span>
                    <span className="font-medium">₡{(loan.remainingBalance - parseFloat(payAmount)).toLocaleString()}</span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPayConfirm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                    onClick={handleConfirmPay}
                  >
                    Sí, abonar
                  </Button>
                </div>

              </Card>
            </div>
          )}
        </div>
      )}

    </Card>
  )
}

/**
 * Pantalla de préstamos activos del estudiante.
 * Muestra todos los préstamos pendientes de pago con su progreso
 * y permite realizar abonos directamente desde aquí.
 *
 * COLECCIONES INVOLUCRADAS:
 * - students/{uid} → balance principal (lectura y escritura)
 * - loans/         → préstamos activos del estudiante
 * - transactions/  → registro de cada abono
 *
 * @returns {JSX.Element}
 */
export default function Loans() {
  const navigate = useNavigate()
  const user     = auth.currentUser

  const [balance,        setBalance]        = useState(0)
  // loadingBalance: true hasta que onSnapshot del balance responde al menos una vez
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loans,          setLoans]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [processing, setProcessing] = useState(false)

  // Suscripción en tiempo real al balance del estudiante
  useEffect(() => {
    if (!user) return
    const ref         = doc(db, 'students', user.uid)
    const unsubscribe = onSnapshot(ref, snap => {
      if (snap.exists()) setBalance(snap.data().balance ?? 0)
      // Primera respuesta del balance recibida: ocultar skeleton del resumen
      setLoadingBalance(false)
    })
    return () => unsubscribe()
  }, [user])

  // Suscripción en tiempo real a préstamos activos del estudiante
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToLoans(user.uid, data => {
      // Ordenar: vencidos primero, luego por días restantes ascendente
      const sorted = [...data].sort((a, b) => {
        const daysA = getDaysRemaining(a.dueDate)
        const daysB = getDaysRemaining(b.dueDate)
        return daysA - daysB
      })
      setLoans(sorted)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  /**
   * Procesa un abono a un préstamo.
   * Descuenta del balance del estudiante, actualiza el préstamo
   * y registra la transacción.
   *
   * @param {Object} loan      - Documento del préstamo
   * @param {number} payAmount - Monto del abono
   */
  const handlePay = async (loan, payAmount) => {
    if (processing) return
    setProcessing(true)

    const newBalance = balance - payAmount

    try {
      // 1. Registrar abono en el préstamo — actualiza remainingBalance y status
      await payLoan(loan.id, payAmount)

      // 2. Descontar del balance del estudiante
      const { updateBalance } = await import('@/services/balance')
      await updateBalance(user.uid, newBalance)

      // 3. Registrar transacción
      await createTransaction(
        user.uid,
        TRANSACTION_TYPES.LOAN_PAYMENT,
        payAmount,
        balance,
        newBalance,
        `Abono a préstamo: ${loan.eventTitle}`,
        { loanId: loan.id }
      )

      toast.success(`Abono de ₡${payAmount.toLocaleString()} registrado`)

      // Si el préstamo quedó saldado, notificar
      if (payAmount >= loan.remainingBalance) {
        toast.success('¡Préstamo saldado completamente! 🎉', {
          description: 'Este préstamo ha sido marcado como pagado',
        })
      }

    } catch (err) {
      console.error(err)
      toast.error('No se pudo procesar el abono')
    } finally {
      setProcessing(false)
    }
  }

  // Deuda total pendiente entre todos los préstamos activos
  const totalDebt = loans.reduce((acc, l) => acc + l.remainingBalance, 0)

  return (
    <div className="min-h-screen bg-white pb-6">
      <Toaster />

      {/* HEADER */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-24">
        <div className="flex items-center gap-3 -mb-29">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Mis Préstamos</h1>
            <p className="text-purple-100 text-sm">Gestiona tus deudas activas</p>
          </div>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="px-4 mt-6 mb-6">
        <div className="grid grid-cols-2 gap-3">

          {/*
           * Skeleton de las tarjetas de resumen.
           *
           * Se muestra mientras onSnapshot del balance no ha respondido aún
           * (loadingBalance === true), evitando que el usuario vea ₡0
           * en balance y deuda total durante el primer render.
           */}
          {loadingBalance ? (
            <>
              <Card className="p-4 rounded-2xl shadow-lg border-0 bg-white animate-pulse">
                <div className="h-3 w-14 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-28 bg-gray-200 rounded-full" />
              </Card>
              <Card className="p-4 rounded-2xl shadow-lg border-0 bg-white animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-28 bg-gray-200 rounded-full" />
              </Card>
            </>
          ) : (
            <>
              {/* BALANCE PRINCIPAL */}
              <Card className="p-4 rounded-2xl shadow-lg border-0 bg-white">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="text-xs">Balance</span>
                </div>
                <div className="text-xl font-bold">₡{balance.toLocaleString()}</div>
              </Card>

              {/* DEUDA TOTAL */}
              <Card className="p-4 rounded-2xl shadow-lg border-0 bg-white">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="text-xs">Deuda total</span>
                </div>
                <div className="text-xl font-bold text-red-600">
                  ₡{totalDebt.toLocaleString()}
                </div>
              </Card>
            </>
          )}

        </div>
      </div>

      {/* LISTA DE PRÉSTAMOS */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Préstamos activos ({loans.length})
          </h2>
        </div>

        {/*
         * Skeleton de carga de préstamos.
         *
         * Se muestra mientras la suscripción a Firestore (subscribeToLoans)
         * no ha respondido aún (loading === true). Evita que el usuario vea
         * la lista vacía prematuramente antes de que lleguen los datos.
         */}
        {loading && [0, 1, 2].map((i) => (
          <Card key={i} className={`p-4 rounded-2xl border-2 border-purple-200 animate-pulse`}>
            {/* SKELETON: cabecera — ícono + nombre + badge */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              {/* SKELETON: badge de días */}
              <div className="h-5 w-12 bg-purple-100 rounded-full flex-shrink-0" />
            </div>
            {/* SKELETON: tres columnas de montos */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="bg-white rounded-xl p-2 space-y-1">
                  <div className="h-3 w-10 bg-gray-200 rounded mx-auto" />
                  <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
                </div>
              ))}
            </div>
            {/* SKELETON: barra de progreso */}
            <div className="h-2 bg-gray-200 rounded-full mb-3" />
            {/* SKELETON: fecha y botón */}
            <div className="h-3 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-full bg-gray-200 rounded-lg" />
          </Card>
        ))}

        {!loading && loans.length === 0 && (
          <Card className="p-8 rounded-2xl text-center border-dashed">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">¡Sin deudas activas!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No tienes préstamos pendientes de pago
            </p>
          </Card>
        )}

        {loans.map(loan => (
          <LoanCard
            key={loan.id}
            loan={loan}
            studentBalance={balance}
            onPay={handlePay}
          />
        ))}

      </div>
    </div>
  )
}