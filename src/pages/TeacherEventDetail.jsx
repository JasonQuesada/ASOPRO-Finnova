/**
 * @fileoverview Página de detalle de un evento financiero para el profesor.
 *
 * Muestra la información completa de un evento (tipo, monto, duración, estado),
 * las estadísticas agregadas de decisiones de los estudiantes mediante barras
 * de progreso, y el listado individual de decisiones cuando el evento ha finalizado.
 * También permite al profesor finalizar un evento activo.
 *
 * Para eventos de tipo `investment`, al finalizar se liquidan automáticamente
 * las inversiones de todos los estudiantes que invirtieron: se acredita el
 * capital más los intereses a su balance principal y se cierra la cuenta de ahorro.
 *
 * @module TeacherEventDetail
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from 'sonner'
import { db } from '@/services/firebase'
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { liquidateSaving } from '@/services/savings'
import { createTransaction, TRANSACTION_TYPES } from '@/services/transactions'

/**
 * Configuración visual y de metadatos para cada tipo de evento financiero.
 *
 * Define la etiqueta legible, el ícono de Lucide y las clases de color de Tailwind
 * utilizadas para identificar visualmente el tipo de evento en la vista de detalle.
 *
 * @constant {Object.<string, {label: string, icon: React.ComponentType, color: string, bgColor: string}>}
 */
const EVENT_TYPE_CONFIG = {
  /** Evento de oferta de compra. */
  purchase:  { label: 'Oferta de Compra', icon: ShoppingCart,  color: 'text-blue-600',   bgColor: 'bg-blue-100'   },
  /** Evento de emergencia financiera. */
  emergency: { label: 'Emergencia',        icon: AlertTriangle, color: 'text-red-600',    bgColor: 'bg-red-100'    },
  /** Evento de ahorro: el estudiante aparta dinero en una cuenta de ahorro. */
  saving:    { label: 'Ahorro',            icon: PiggyBank,     color: 'text-green-600',  bgColor: 'bg-green-100'  },
  /** Evento de inversión: el estudiante invierte y recibe el monto más intereses al vencer. */
  investment:{ label: 'Inversión',         icon: TrendingUp,    color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  /** Evento de préstamo. */
  loan:      { label: 'Préstamo',          icon: FileText,      color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

/**
 * Configuración visual para cada tipo de decisión que puede tomar un estudiante.
 *
 * Se usa tanto en las barras de progreso agregadas como en el listado
 * individual de decisiones por estudiante.
 *
 * @constant {Object.<string, {label: string, color: string, bg: string, icon: React.ComponentType}>}
 */
const DECISION_CONFIG = {
  /** El estudiante decidió comprar o aceptar el evento. */
  buy:    { label: 'Compraron',   color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle },
  /** El estudiante solicitó un préstamo para afrontar el evento. */
  loan:   { label: 'Préstamo',    color: 'text-purple-600', bg: 'bg-purple-100', icon: TrendingUp  },
  /** El estudiante decidió ahorrar en el evento. */
  save:   { label: 'Ahorraron',   color: 'text-green-600',  bg: 'bg-green-100',  icon: PiggyBank   },
  /** El estudiante decidió invertir en el evento. */
  invest: { label: 'Invirtieron', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: TrendingUp  },
  /** El estudiante rechazó o ignoró el evento. */
  reject: { label: 'Rechazaron',  color: 'text-gray-600',   bg: 'bg-gray-100',   icon: XCircle     },
}

/**
 * Página de detalle de un evento financiero para el profesor.
 *
 * Responsabilidades:
 * - Leer el documento del evento desde Firestore usando el `id` de la URL.
 * - Recorrer la colección `students` para extraer y agregar todas las decisiones
 *   asociadas al evento actual.
 * - Calcular los conteos por tipo de decisión (buy, loan, save, invest, reject).
 * - Permitir al profesor finalizar el evento si está activo.
 * - Para eventos de tipo `investment`: liquidar automáticamente las inversiones
 *   al finalizar, acreditando capital + intereses a cada estudiante que invirtió.
 * - Mostrar el listado individual de decisiones cuando el evento ha finalizado.
 *
 * @component
 * @returns {JSX.Element} La vista completa de detalle del evento, un spinner de carga
 *                        o `null` si el evento no existe.
 */
export default function TeacherEventDetail() {
  const navigate = useNavigate()

  /**
   * ID del evento leído desde los parámetros de la URL (`/teacher/event/:id`).
   * @type {string}
   */
  const { id } = useParams()

  /**
   * Datos completos del evento cargado desde Firestore.
   * Es `null` mientras se carga o si el documento no existe.
   * @type {[Object|null, Function]}
   */
  const [event, setEvent] = useState(null)

  /**
   * Lista de decisiones tomadas por los estudiantes en este evento.
   * Cada entrada incluye los datos de la decisión más `studentId` y `studentName`.
   * @type {[Array<{studentId: string, studentName: string, decision: string, balanceAfter?: number, eventId: string}>, Function]}
   */
  const [decisions, setDecisions] = useState([])

  /**
   * Indica si la carga inicial de datos desde Firestore está en progreso.
   * @type {[boolean, Function]}
   */
  const [loading, setLoading] = useState(true)

  /**
   * Indica si el proceso de finalización del evento está en curso.
   * Deshabilita el botón "Finalizar Evento" mientras es `true`.
   * @type {[boolean, Function]}
   */
  const [finishing, setFinishing] = useState(false)

  /**
   * Controla la visibilidad del modal de confirmación de finalización.
   * Se activa cuando el profesor hace click en "Finalizar Evento".
   * @type {[boolean, Function]}
   */
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  /**
   * Efecto: carga el evento y las decisiones de los estudiantes al montar el componente.
   *
   * Flujo de ejecución:
   * 1. Lee el documento del evento desde `events/{id}`.
   *    Si no existe, muestra un toast de error y redirige al dashboard del profesor.
   * 2. Lee todos los documentos de la colección `students`.
   * 3. Por cada estudiante, filtra las decisiones cuyo `eventId` coincide con el
   *    evento actual y las agrega a la lista, enriqueciendo cada entrada con
   *    `studentId` y `studentName`.
   * 4. En caso de error, muestra un toast y registra el error en consola.
   * 5. En cualquier caso (éxito o error), desactiva el estado de carga.
   *
   * Se vuelve a ejecutar si cambia el `id` del evento o la función `navigate`.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Paso 1: leer el documento del evento
        const eventSnap = await getDoc(doc(db, 'events', id))

        if (!eventSnap.exists()) {
          toast.error('Evento no encontrado')
          navigate('/teacher')
          return
        }

        setEvent({ id: eventSnap.id, ...eventSnap.data() })

        // Paso 2: leer todos los estudiantes para extraer sus decisiones
        const studentsSnap = await getDocs(collection(db, 'students'))
        const allDecisions = []

        studentsSnap.forEach(studentDoc => {
          const data = studentDoc.data()

          // Paso 3: filtrar solo las decisiones que corresponden a este evento
          const matched = (data.decisions || []).filter(d => d.eventId === id)

          matched.forEach(d => allDecisions.push({
            ...d,
            studentId:   studentDoc.id,
            // Usar el ID como fallback si el estudiante no tiene nombre registrado
            studentName: data.name || studentDoc.id,
          }))
        })

        setDecisions(allDecisions)

      } catch (err) {
        console.error(err)
        toast.error('Error al cargar el evento')
      } finally {
        // Paso 5: desactivar carga independientemente del resultado
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate])

  /**
   * ==========================================================================
   * LIQUIDAR INVERSIONES
   * ==========================================================================
   * Se ejecuta únicamente al finalizar un evento de tipo `investment`.
   *
   * Flujo por cada estudiante que tomó la decisión `invest`:
   * 1. Obtener el balance actual del estudiante desde Firestore.
   * 2. Buscar en la colección `savings` la cuenta cuyo nombre coincide con
   *    `Inversión: ${event.title}` y pertenece al estudiante (uid).
   * 3. Calcular el pago total: monto + (monto * interestRate / 100).
   * 4. Llamar a `liquidateSaving` para acreditar el total al balance del
   *    estudiante y dejar la cuenta de ahorro en cero.
   * 5. Registrar la transacción con tipo `SAVING_INTEREST` para el historial.
   *
   * Si algún estudiante no tiene la cuenta de ahorro (por ejemplo, por un error
   * anterior), se registra el error en consola y se continúa con los demás
   * para no bloquear la liquidación completa.
   *
   * @async
   * @function
   * @param {Object} eventData - Datos completos del evento.
   * @returns {Promise<void>}
   * ==========================================================================
   */
  const liquidateInvestments = async (eventData) => {

    /**
     * Filtrar solo las decisiones de tipo `invest` para este evento.
     */
    const investors = decisions.filter(d => d.decision === 'invest')

    /**
     * Tasa de interés configurada en el evento.
     * Fallback a 0 si no se definió (no debería pasar con la validación nueva).
     */
    const interestRate = eventData.interestRate ?? 0

    /**
     * Nombre exacto de la cuenta de ahorro creada al invertir.
     * Debe coincidir con el patrón usado en EventDetail.jsx al crear la inversión.
     */
    const savingName = `Inversión: ${eventData.title}`

    for (const investor of investors) {

      try {
        // Paso 1: obtener el balance actual del estudiante
        const studentSnap = await getDoc(doc(db, 'students', investor.studentId))
        if (!studentSnap.exists()) continue

        const currentBalance = studentSnap.data().balance ?? 0

        // Paso 2: buscar la cuenta de ahorro de la inversión por nombre y uid
        const savingsQuery = query(
          collection(db, 'savings'),
          where('uid',  '==',  investor.studentId),
          where('name', '==',  savingName),
        )

        const savingsSnap = await getDocs(savingsQuery)

        if (savingsSnap.empty) {
          console.error(`No se encontró la cuenta de inversión "${savingName}" para el estudiante ${investor.studentId}`)
          continue
        }

        /**
         * Tomar la primera cuenta que coincida con el nombre del evento.
         * En condiciones normales solo debe existir una por evento.
         */
        const savingDoc  = savingsSnap.docs[0]
        const savingId   = savingDoc.id
        const savingData = savingDoc.data()

        /**
         * Paso 3: calcular el pago total con intereses.
         * Se redondea al entero más cercano para evitar decimales en colones.
         */
        const principal  = savingData.balance ?? eventData.amount
        const totalPayout = Math.round(principal * (1 + interestRate / 100))
        const interest    = totalPayout - principal

        // Paso 4: acreditar al balance del estudiante y cerrar el ahorro
        await liquidateSaving(
          investor.studentId,
          savingId,
          totalPayout,
          currentBalance,
        )

        /**
         * Paso 5: registrar DOS transacciones para que el estado financiero
         * muestre claramente qué fue devolución del capital y qué fue ganancia.
         *
         * Sin esto, el estudiante solo ve el interés pero no la devolución
         * del monto original, lo que hace que el estado financiero se vea incompleto.
         */

        // Transacción 1: devolución del capital invertido
        await createTransaction(
          investor.studentId,
          TRANSACTION_TYPES.SYSTEM_DEPOSIT,
          principal,
          currentBalance,
          currentBalance + principal,
          `Devolución de capital: ${eventData.title}`,
          { eventId: id, savingId },
        )

        // Transacción 2: intereses generados por la inversión
        await createTransaction(
          investor.studentId,
          TRANSACTION_TYPES.SAVING_INTEREST,
          interest,
          currentBalance + principal,
          currentBalance + totalPayout,
          `Intereses ganados: ${eventData.title} (+${interestRate}%)`,
          { eventId: id, savingId },
        )

      } catch (err) {
        console.error(`Error al liquidar inversión del estudiante ${investor.studentId}:`, err)
        // Continuar con los demás estudiantes aunque uno falle
      }
    }
  }

  /**
   * Finaliza el evento activo y, si es de tipo `investment`, liquida las inversiones.
   *
   * Flujo:
   * 1. Activa `finishing` para deshabilitar el botón.
   * 2. Si el evento es de tipo `investment`, llama a `liquidateInvestments` primero.
   * 3. Actualiza únicamente el campo `status` a `"finished"` en Firestore.
   * 4. Actualiza el estado local para reflejar el cambio sin recargar.
   * 5. Si algo falla, desactiva `finishing` para permitir reintentar.
   *
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const handleFinishEvent = async () => {
    setFinishing(true)

    try {
      /**
       * Para eventos de inversión: liquidar primero, luego marcar como finalizado.
       * El orden importa: si la liquidación falla, el evento no se cierra.
       */
      if (event.type === 'investment') {
        await liquidateInvestments(event)
      }

      await updateDoc(doc(db, 'events', id), { status: 'finished' })

      // Actualizar el estado local sin recargar el documento completo
      setEvent(prev => ({ ...prev, status: 'finished' }))

      /**
       * Mensaje diferenciado según si hubo inversiones que liquidar o no.
       */
      const investors = decisions.filter(d => d.decision === 'invest')
      if (event.type === 'investment' && investors.length > 0) {
        toast.success(`Evento finalizado — ${investors.length} inversión(es) liquidada(s)`)
      } else {
        toast.success('Evento finalizado correctamente')
      }

    } catch (err) {
      console.error(err)
      toast.error('No se pudo finalizar el evento')
      // Reactivar el botón para que el profesor pueda reintentar
      setFinishing(false)
    }
  }

  /**
   * Skeleton de carga del detalle del evento (vista profesor).
   *
   * Se muestra mientras Firestore resuelve el evento y las decisiones.
   * Mantiene la estructura visual del header y las tarjetas reales.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-6">
        {/* HEADER */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Detalle del Evento</h1>
              <p className="text-purple-100 text-sm">Cargando...</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {/* SKELETON: tarjeta de información del evento */}
          <Card className="p-5 rounded-2xl shadow-lg border-0 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-6 w-28 bg-gray-200 rounded-full" />
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-full bg-gray-200 rounded mb-1" />
            <div className="h-4 w-2/3 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`bg-gray-100 rounded-xl p-3 ${i === 2 ? 'col-span-2' : ''}`}>
                  <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
                  <div className="h-5 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </Card>

          {/* SKELETON: tarjeta de finalización */}
          <Card className="p-4 rounded-2xl border-2 border-gray-200 animate-pulse">
            <div className="h-4 w-full bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded-xl" />
          </Card>
        </div>
      </div>
    )
  }

  // Guardia: si el evento no existe tras la carga, no renderizar nada
  if (!event) return null

  /**
   * Configuración visual del tipo del evento actual.
   * Usa "purchase" como fallback si el tipo no está registrado en EVENT_TYPE_CONFIG.
   */
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.purchase

  /** Componente de ícono correspondiente al tipo del evento. */
  const Icon = config.icon

  /** Indica si el evento está actualmente activo y recibiendo decisiones. */
  const isActive = event.status === 'active'

  /**
   * Total de decisiones registradas en el evento.
   * @type {number}
   */
  const totalDecisions = decisions.length

  return (
    <div className="min-h-screen bg-white pb-6">

      {/* Proveedor de toasts de Sonner */}
      <Toaster />

      {/* ── Cabecera ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
        <div className="flex items-center gap-3 mb-4">

          {/* Botón para volver al dashboard del profesor */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/teacher')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl">Detalle del Evento</h1>
            {/* Subtítulo dinámico según el estado del evento */}
            <p className="text-purple-100 text-sm">
              {isActive ? 'Evento en curso' : 'Evento finalizado'}
            </p>
          </div>

        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── Tarjeta de información del evento ──────────────────────────── */}
        <Card className="p-5 rounded-2xl shadow-lg border-0">

          {/* Fila superior: chip de tipo de evento y badge de estado */}
          <div className="flex items-center justify-between mb-3">

            {/* Chip del tipo de evento con ícono y color correspondiente */}
            <div className={`flex items-center gap-2 ${config.bgColor} px-3 py-1.5 rounded-full`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-xs font-semibold ${config.color}`}>
                {config.label}
              </span>
            </div>

            {/* Badge de estado: verde si activo, gris si finalizado */}
            {isActive ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                <Clock className="w-3 h-3" />
                Activo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Finalizado
              </span>
            )}
          </div>

          {/* Título y descripción del evento */}
          <h2 className="text-xl font-bold mb-2">{event.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {event.description}
          </p>

          {/* Grid de métricas: monto, duración, participantes y tasa si aplica */}
          <div className="grid grid-cols-2 gap-3">

            {/* Monto del evento */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs">Monto</span>
              </div>
              <div className="font-bold">
                ₡{event.amount?.toLocaleString() ?? '—'}
              </div>
            </div>

            {/* Duración en días */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Duración</span>
              </div>
              <div className="font-bold">
                {event.duration ?? '—'} días
              </div>
            </div>

            {/*
              Tasa de interés — solo visible para eventos de tipo `investment`.
              Muestra el porcentaje de ganancia que recibirán los estudiantes al vencer.
            */}
            {event.type === 'investment' && event.interestRate != null && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-yellow-700 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs">Tasa de interés</span>
                </div>
                <div className="font-bold text-yellow-700">
                  {event.interestRate}%
                </div>
              </div>
            )}

            {/* Total de estudiantes que tomaron una decisión; ocupa columnas restantes */}
            <div className={`bg-gray-50 rounded-xl p-3 ${event.type === 'investment' && event.interestRate != null ? '' : 'col-span-2'}`}>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Participantes</span>
              </div>
              <div className="font-bold">
                {totalDecisions} estudiante{totalDecisions !== 1 ? 's' : ''}
              </div>
            </div>

          </div>
        </Card>

        {/* ── Tarjeta de finalización (solo visible si el evento está activo) ── */}
        {isActive && (
          <Card className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800 mb-3">
              <span className="font-semibold">El evento está activo.</span>
              {' '}
              {event.type === 'investment'
                ? 'Al finalizar, se liquidarán automáticamente las inversiones de todos los estudiantes que invirtieron.'
                : 'Los estudiantes pueden tomar decisiones hasta que lo finalices.'
              }
            </p>

            {/* Botón que abre el modal de confirmación antes de finalizar */}
            <Button
              onClick={() => setShowFinishConfirm(true)}
              disabled={finishing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
            >
              {finishing ? 'Finalizando...' : 'Finalizar Evento'}
            </Button>
          </Card>
        )}

        {/* ── Modal de confirmación para finalizar evento ────────────────────── */}
        {/*
          Se muestra al hacer click en "Finalizar Evento".
          Para inversiones, advierte que se liquidarán automáticamente.

          CANCELAR: cierra el modal sin finalizar el evento.
          CONFIRMAR: ejecuta handleFinishEvent.
        */}
        {showFinishConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

              {/* Ícono y título */}
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">¿Finalizar este evento?</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {event.type === 'investment'
                      ? 'Se liquidarán automáticamente las inversiones de los estudiantes que participaron.'
                      : 'Los estudiantes ya no podrán tomar decisiones sobre este evento.'
                    }
                  </p>
                </div>
              </div>

              {/* Resumen del evento */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evento</span>
                  <span className="font-medium">{event.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participantes</span>
                  <span className="font-medium">{totalDecisions} estudiante{totalDecisions !== 1 ? 's' : ''}</span>
                </div>
                {event.type === 'investment' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inversiones a liquidar</span>
                    <span className="font-medium text-yellow-700">
                      {decisions.filter(d => d.decision === 'invest').length}
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowFinishConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                  onClick={() => {
                    setShowFinishConfirm(false)
                    handleFinishEvent()
                  }}
                >
                  Sí, finalizar
                </Button>
              </div>

            </Card>
          </div>
        )}

        {/* ── Listado individual de decisiones (solo en eventos finalizados) ── */}
        {/*
          Se muestra únicamente cuando el evento ha finalizado y existe al menos
          una decisión registrada, para dar al profesor un desglose por estudiante.
        */}
        {!isActive && decisions.length > 0 && (
          <Card className="p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-3">Decisiones individuales</h3>

            <div className="space-y-2">
              {decisions.map((d, i) => {
                /**
                 * Configuración visual de la decisión del estudiante actual.
                 * Si el valor no está mapeado en DECISION_CONFIG, usa "reject" como respaldo.
                 */
                const dc = DECISION_CONFIG[d.decision] || DECISION_CONFIG.reject

                /** Componente de ícono correspondiente al tipo de decisión. */
                const DIcon = dc.icon

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    {/* Lado izquierdo: ícono de decisión y nombre del estudiante */}
                    <div className="flex items-center gap-2">
                      <span className={`${dc.bg} ${dc.color} p-1.5 rounded-lg`}>
                        <DIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-medium">{d.studentName}</span>
                    </div>

                    {/* Lado derecho: etiqueta de la decisión y balance resultante */}
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${dc.color}`}>
                        {dc.label}
                      </div>
                      {/* El balance post-decisión solo se muestra si está registrado */}
                      {d.balanceAfter != null && (
                        <div className="text-xs text-muted-foreground">
                          ₡{d.balanceAfter?.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
