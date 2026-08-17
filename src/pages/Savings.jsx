import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  PiggyBank,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster, toast } from 'sonner'
import { auth, db } from '@/services/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import {
  createSaving,
  depositToSaving,
  withdrawFromSaving,
  subscribeToSavings,
  deleteSaving,
} from '@/services/savings'
import { createTransaction, TRANSACTION_TYPES } from '@/services/transactions'

/**
 * Tarjeta individual de un ahorro.
 * Muestra nombre, balance y paneles expandibles para depositar y retirar.
 * El diseño es consistente con LoanCard en Loans.jsx.
 *
 * @param {Object}   saving           - Documento del ahorro desde Firestore
 * @param {number}   studentBalance  - Balance actual del estudiante
 * @param {Function} onDeposit       - Callback al confirmar depósito
 * @param {Function} onWithdraw      - Callback al confirmar retiro
 * @returns {JSX.Element}
 */
function SavingCard({ saving, studentBalance, onDeposit, onWithdraw, onDelete }) {
  // Controla qué panel está expandido: null | 'deposit' | 'withdraw'
  const [expanded,      setExpanded]      = useState(null)
  const [amount,        setAmount]        = useState('')
  const [processing,    setProcessing]    = useState(false)
  // Controla si el modal de confirmación de eliminación está visible
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  /**
   * Alterna el panel activo.
   * Si se toca el mismo que está abierto, lo cierra.
   *
   * @param {string} panel - 'deposit' | 'withdraw'
   */
  const togglePanel = (panel) => {
    setAmount('')
    setExpanded(prev => prev === panel ? null : panel)
  }

  /**
   * Valida y ejecuta la acción según el panel activo.
   */
  const handleConfirm = async () => {
    const parsed = parseFloat(amount)

    if (!parsed || parsed <= 0) {
      toast.error('Ingresa un monto válido mayor a cero')
      return
    }

    const max = expanded === 'deposit' ? studentBalance : saving.balance

    if (parsed > max) {
      toast.error(`El monto máximo disponible es ₡${max.toLocaleString()}`)
      return
    }

    setProcessing(true)
    if (expanded === 'deposit') {
      await onDeposit(saving, parsed)
    } else {
      await onWithdraw(saving, parsed)
    }
    setAmount('')
    setExpanded(null)
    setProcessing(false)
  }

  const isDeposit  = expanded === 'deposit'
  const isWithdraw = expanded === 'withdraw'
  const maxAmount  = isDeposit ? studentBalance : saving.balance

  return (
    <Card className="p-4 rounded-2xl border-2 border-green-200">
      <div className="flex items-start gap-3">

        {/* ÍCONO */}
        <div className="bg-green-100 p-2.5 rounded-xl flex-shrink-0">
          <PiggyBank className="w-5 h-5 text-green-600" />
        </div>

        <div className="flex-1 min-w-0">

          {/* NOMBRE */}
          <h3 className="font-semibold text-sm truncate mb-1">{saving.name}</h3>

          {/* BALANCE */}
          <div className="text-2xl font-bold text-green-600 mb-3">
            ₡{saving.balance.toLocaleString()}
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex gap-2 mb-0">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 gap-1 transition-colors ${
                isDeposit
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
              onClick={() => togglePanel('deposit')}
              disabled={studentBalance <= 0}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Depositar
              {isDeposit
                ? <ChevronUp className="w-3 h-3 ml-auto" />
                : <ChevronDown className="w-3 h-3 ml-auto" />
              }
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 gap-1 transition-colors ${
                isWithdraw
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
              onClick={() => togglePanel('withdraw')}
              disabled={saving.balance <= 0}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Retirar
              {isWithdraw
                ? <ChevronUp className="w-3 h-3 ml-auto" />
                : <ChevronDown className="w-3 h-3 ml-auto" />
              }
            </Button>
          </div>

          {/*
            BOTÓN DE ELIMINAR — visible solo cuando no hay panel expandido.
            Abre un modal de confirmación antes de ejecutar la eliminación.
            Si el ahorro tiene saldo, el servicio lo bloqueará con un error.
          */}
          {!expanded && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-1 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar ahorro
              </Button>

              {/* ── Modal de confirmación de eliminación ─────────────────── */}
              {/*
                Se muestra al hacer click en "Eliminar ahorro".
                El estudiante debe confirmar antes de que se ejecute la eliminación.

                CANCELAR: cierra el modal sin eliminar nada.
                CONFIRMAR: llama a onDelete con el ahorro actual.
              */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                  <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

                    {/* Ícono y título */}
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">¿Eliminar este ahorro?</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          Esta acción es permanente y no se puede deshacer.
                        </p>
                      </div>
                    </div>

                    {/* Resumen del ahorro a eliminar */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ahorro</span>
                        <span className="font-medium">{saving.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium">₡{saving.balance?.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          onDelete(saving)
                        }}
                      >
                        Sí, eliminar
                      </Button>
                    </div>

                  </Card>
                </div>
              )}
            </div>
          )}
          {expanded && (
            <div className="mt-3 pt-3 border-t space-y-3">
              <div className="space-y-1.5">
                <Label>
                  {isDeposit ? 'Monto a depositar' : 'Monto a retirar'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₡</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="pl-7"
                    min="1"
                    max={maxAmount}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleConfirm()
                      if (e.key === 'Escape') { setExpanded(null); setAmount('') }
                    }}
                  />
                </div>
                {/* DISPONIBLE SEGÚN EL TIPO DE OPERACIÓN */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  {isDeposit
                    ? `Balance disponible: ₡${studentBalance.toLocaleString()}`
                    : `Ahorro disponible: ₡${saving.balance.toLocaleString()}`
                  }
                </div>
              </div>

              {/* BOTONES CONFIRMAR / CANCELAR */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setExpanded(null); setAmount('') }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className={`flex-1 text-white ${
                    isDeposit
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  onClick={handleConfirm}
                  disabled={processing}
                >
                  {processing
                    ? 'Procesando...'
                    : isDeposit ? 'Confirmar depósito' : 'Confirmar retiro'
                  }
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Card>
  )
}

/**
 * Pantalla de ahorros del estudiante.
 * Permite crear objetivos de ahorro, depositar y retirar fondos.
 *
 * COLECCIONES INVOLUCRADAS:
 * - students/{uid}     → balance principal (lectura y escritura)
 * - savings/{savingId} → ahorros del estudiante (lectura y escritura)
 * - transactions/      → registro de cada movimiento
 *
 * @returns {JSX.Element}
 */
export default function Savings() {
  const navigate = useNavigate()
  const user     = auth.currentUser

  const [balance,        setBalance]        = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [savings,          setSavings]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)
  const [processing, setProcessing] = useState(false)

  // Suscripción en tiempo real al balance del estudiante
  useEffect(() => {
    if (!user) return
    const ref         = doc(db, 'students', user.uid)
    const unsubscribe = onSnapshot(ref, snap => {
      if (snap.exists()) setBalance(snap.data().balance ?? 0)
      setLoadingBalance(false)
    })
    return () => unsubscribe()
  }, [user])

  // Suscripción en tiempo real a los ahorros del estudiante
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToSavings(user.uid, data => {
      /**
       * Filtrar cuentas de tipo `investment` para que no aparezcan en esta pantalla.
       *
       * Las cuentas de inversión se crean desde EventDetail cuando el estudiante
       * acepta un evento de tipo `investment`. No deben ser editables aquí porque
       * están bloqueadas hasta que el profesor finaliza el evento y el sistema
       * liquida automáticamente el capital + intereses.
       *
       * Si el campo `type` no existe (cuentas creadas antes de este cambio),
       * se tratan como ahorros normales para no romper datos existentes.
       */
      setSavings(data.filter(s => s.type !== 'investment'))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  /**
   * Crea un nuevo objetivo de ahorro con balance inicial de 0.
   */
  const handleCreateSaving = async () => {
    if (!newName.trim()) {
      toast.error('El nombre del ahorro es obligatorio')
      return
    }

    setCreating(true)
    try {
      await createSaving(user.uid, newName.trim())
      toast.success(`Ahorro "${newName.trim()}" creado`)
      setNewName('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo crear el ahorro')
    } finally {
      setCreating(false)
    }
  }

  /**
   * Transfiere dinero del balance principal al ahorro seleccionado.
   * Registra la transacción en transactions/.
   */
  const handleDeposit = async (saving, amount) => {
    if (processing) return
    if (amount > balance) {
      toast.error('Saldo insuficiente en tu balance principal')
      return
    }

    setProcessing(true)
    try {
      await depositToSaving(user.uid, saving.id, amount, balance, saving.balance)

      await createTransaction(
        user.uid,
        TRANSACTION_TYPES.DEPOSIT_SAVING,
        amount,
        balance,
        balance - amount,
        `Depósito a ahorro: ${saving.name}`,
        { savingId: saving.id }
      )

      toast.success(`₡${amount.toLocaleString()} depositados en "${saving.name}"`)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo realizar el depósito')
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Retira dinero de un ahorro hacia el balance principal.
   * Registra la transacción en transactions/.
   */
  const handleWithdraw = async (saving, amount) => {
    if (processing) return
    if (amount > saving.balance) {
      toast.error('Saldo insuficiente en el ahorro')
      return
    }

    setProcessing(true)
    try {
      await withdrawFromSaving(user.uid, saving.id, amount, balance, saving.balance)

      await createTransaction(
        user.uid,
        TRANSACTION_TYPES.WITHDRAW_SAVING,
        amount,
        balance,
        balance + amount,
        `Retiro de ahorro: ${saving.name}`,
        { savingId: saving.id }
      )

      toast.success(`₡${amount.toLocaleString()} retirados de "${saving.name}"`)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo realizar el retiro')
    } finally {
      setProcessing(false)
    }
  }

  /**
   * Elimina un objetivo de ahorro si su balance es cero.
   * El servicio lanza un error si el ahorro aún tiene saldo,
   * mostrando un mensaje claro para que el usuario retire primero.
   *
   * @param {Object} saving - Documento del ahorro a eliminar
   */
  const handleDelete = async (saving) => {
    try {
      await deleteSaving(saving.id)
      toast.success(`Ahorro "${saving.name}" eliminado`)
    } catch (err) {
      console.error(err)
      // El mensaje del error viene directamente del servicio
      toast.error(err.message ?? 'No se pudo eliminar el ahorro')
    }
  }

  // Suma total de todos los ahorros del estudiante
  const totalSavings = savings.reduce((acc, s) => acc + s.balance, 0)

  return (
    <div className="min-h-screen bg-white pb-6">
      <Toaster />

      {/* HEADER */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Mis Ahorros</h1>
            <p className="text-green-100 text-sm">Administra tus objetivos financieros</p>
          </div>
        </div>
      </div>

      {/* RESUMEN DE BALANCES */}
      <div className="px-4 mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {loadingBalance ? (
            <>
              <Card className="p-4 rounded-2xl shadow-sm border animate-pulse">
                <div className="h-3 w-14 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-28 bg-gray-200 rounded-full" />
              </Card>
              <Card className="p-4 rounded-2xl shadow-sm border animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-28 bg-gray-200 rounded-full" />
              </Card>
            </>
          ) : (
            <>
              <Card className="p-4 rounded-2xl shadow-sm border">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="text-xs">Balance</span>
                </div>
                <div className="text-xl font-bold">₡{balance.toLocaleString()}</div>
              </Card>

              <Card className="p-4 rounded-2xl shadow-sm border">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span className="text-xs">Total ahorros</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  ₡{totalSavings.toLocaleString()}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* CAMBIO: Botón modificado a color azul institucional estable y texto blanco */}
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium rounded-xl h-11 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo objetivo de ahorro
          </Button>
        ) : (
          <Card className="p-4 rounded-2xl border-2 border-green-200">
            <h3 className="font-semibold text-sm mb-3">Nuevo ahorro</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="savingName">Nombre del objetivo</Label>
                <Input
                  id="savingName"
                  placeholder="Ej: Vacaciones, Laptop, Emergencia..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateSaving()
                    if (e.key === 'Escape') { setShowForm(false); setNewName('') }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowForm(false); setNewName('') }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCreateSaving}
                  disabled={creating}
                >
                  {creating ? 'Creando...' : 'Crear'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* LISTA DE AHORROS */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Mis objetivos ({savings.length})
          </h2>

          {loading && [0, 1, 2].map((i) => (
            <Card key={i} className="p-4 rounded-2xl border-2 border-green-200 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-8 w-40 bg-gray-200 rounded-full" />
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 bg-gray-200 rounded-lg" />
                    <div className="h-8 flex-1 bg-gray-200 rounded-lg" />
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {!loading && savings.length === 0 && (
            <Card className="p-8 rounded-2xl text-center border-dashed">
              <PiggyBank className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tienes ahorros aún</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crea tu primer objetivo de ahorro
              </p>
            </Card>
          )}

          {savings.map(saving => (
            <SavingCard
              key={saving.id}
              saving={saving}
              studentBalance={balance}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onDelete={handleDelete}
            />
          ))}
        </div>

      </div>
    </div>
  )
}