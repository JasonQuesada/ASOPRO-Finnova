import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BellOff,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  FileText,
  Gift,
  Zap,
  CreditCard,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from 'sonner'
import { auth } from '@/services/firebase'
import {
  subscribeToNotifications,
  markAsRead,
  NOTIFICATION_TYPES,
} from '@/services/notifications'

/**
 * Configuración visual por tipo de notificación.
 * Define ícono, colores y etiqueta para cada tipo del sistema.
 */
const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.NEW_EVENT]: {
    icon:     ShoppingCart,
    color:    'text-blue-600',
    bgColor:  'bg-blue-100',
    label:    'Nuevo Evento',
  },
  [NOTIFICATION_TYPES.EVENT_FINISHED]: {
    icon:     CheckCircle2,
    color:    'text-green-600',
    bgColor:  'bg-green-100',
    label:    'Evento Finalizado',
  },
  [NOTIFICATION_TYPES.DEPOSIT]: {
    icon:     Gift,
    color:    'text-emerald-600',
    bgColor:  'bg-emerald-100',
    label:    'Depósito',
  },
  [NOTIFICATION_TYPES.CHARGE]: {
    icon:     Zap,
    color:    'text-red-600',
    bgColor:  'bg-red-100',
    label:    'Cobro',
  },
  [NOTIFICATION_TYPES.LOAN_REMINDER]: {
    icon:     CreditCard,
    color:    'text-amber-600',
    bgColor:  'bg-amber-100',
    label:    'Recordatorio de Préstamo',
  },
  [NOTIFICATION_TYPES.LOAN_DUE]: {
    icon:     AlertTriangle,
    color:    'text-red-600',
    bgColor:  'bg-red-100',
    label:    'Préstamo Vencido',
  },
  [NOTIFICATION_TYPES.SAVING_INTEREST]: {
    icon:     PiggyBank,
    color:    'text-purple-600',
    bgColor:  'bg-purple-100',
    label:    'Interés de Ahorro',
  },
  [NOTIFICATION_TYPES.WELCOME]: {
    icon:     Bell,
    color:    'text-blue-600',
    bgColor:  'bg-blue-100',
    label:    'Bienvenida',
  },
}

/**
 * Formatea un timestamp de Firestore o string ISO a fecha legible.
 *
 * @param {Object|string} timestamp - Timestamp de Firestore o string ISO
 * @returns {string} Fecha formateada en español
 */
const formatDate = (timestamp) => {
  if (!timestamp) return ''

  // Firestore devuelve un objeto con método toDate()
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)

  return date.toLocaleDateString('es-CR', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/**
 * Tarjeta individual de notificación.
 * Las no leídas tienen fondo destacado y punto indicador.
 * Al tocar se marca como leída automáticamente.
 *
 * @param {Object}   notification - Documento de notificación desde Firestore
 * @param {Function} onRead       - Callback al marcar como leída
 * @returns {JSX.Element}
 */
function NotificationCard({ notification, onRead }) {
  const config = NOTIFICATION_CONFIG[notification.type] ?? {
    icon:    Bell,
    color:   'text-gray-600',
    bgColor: 'bg-gray-100',
    label:   'Notificación',
  }
  const Icon    = config.icon
  const isUnread = !notification.read

  const handleTap = async () => {
    // Solo marcar como leída si aún no lo está — evitar escrituras innecesarias
    if (isUnread) {
      await onRead(notification.id)
    }

    // Si la notificación tiene un evento asociado, navegar a él
    // (implementable en fases futuras)
  }

  return (
    <Card
      onClick={handleTap}
      className={`p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md active:scale-[0.99] ${
        isUnread
          ? 'border-2 border-blue-200 bg-blue-50/50'
          : 'border border-border'
      }`}
    >
      <div className="flex items-start gap-3">

        {/* ÍCONO DEL TIPO */}
        <div className={`${config.bgColor} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">

          {/* TIPO + PUNTO DE NO LEÍDA */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>

          {/* TÍTULO */}
          <h3 className="font-semibold text-sm leading-tight mb-1">
            {notification.title}
          </h3>

          {/* MENSAJE */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {notification.message}
          </p>

          {/* FECHA */}
          <p className="text-xs text-muted-foreground">
            {formatDate(notification.createdAt)}
          </p>

        </div>
      </div>
    </Card>
  )
}

/**
 * Centro de notificaciones del estudiante.
 * Muestra todas las notificaciones ordenadas por fecha descendente.
 * Permite marcar notificaciones individuales como leídas al tocarlas,
 * o marcar todas como leídas con el botón superior.
 *
 * Los datos se actualizan en tiempo real via onSnapshot.
 *
 * @returns {JSX.Element}
 */
export default function Notifications() {
  const navigate = useNavigate()
  const user     = auth.currentUser

  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [markingAll,    setMarkingAll]    = useState(false)

  // Suscripción en tiempo real a las notificaciones del estudiante
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  /**
   * Marca una notificación individual como leída.
   *
   * @param {string} notificationId - ID del documento en notifications/
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId)
    } catch (err) {
      console.error('Error marcando notificación:', err)
      toast.error('No se pudo marcar como leída')
    }
  }

  /**
   * Marca TODAS las notificaciones no leídas como leídas.
   * Las procesa en paralelo para mayor velocidad.
   */
  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read)
    if (unread.length === 0) return

    setMarkingAll(true)
    try {
      await Promise.all(unread.map(n => markAsRead(n.id)))
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch (err) {
      console.error('Error marcando todas:', err)
      toast.error('No se pudieron marcar todas las notificaciones')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-white pb-6">
      <Toaster />

      {/* HEADER */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
        <div className="flex items-center justify-between">
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
              <h1 className="text-xl">Notificaciones</h1>
              <p className="text-blue-100 text-sm">
                {unreadCount > 0
                  ? `${unreadCount} sin leer`
                  : 'Todo al día'}
              </p>
            </div>
          </div>

          {/* BOTÓN MARCAR TODAS COMO LEÍDAS */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="text-white hover:bg-white/20 text-xs"
            >
              {markingAll ? 'Marcando...' : 'Leer todas'}
            </Button>
          )}
        </div>
      </div>

      {/* LISTA DE NOTIFICACIONES */}
      <div className="px-4 mt-4 space-y-3">

        {/*
          SKELETON DE CARGA DE NOTIFICACIONES
          Se muestra mientras Firestore obtiene las notificaciones del estudiante.
          Replica la estructura de una tarjeta de notificación real.
        */}
        {loading && [0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-4 rounded-2xl border animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          </Card>
        ))}

        {/* ESTADO VACÍO */}
        {!loading && notifications.length === 0 && (
          <Card className="p-8 rounded-2xl text-center border-dashed">
            <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tienes notificaciones aún</p>
            <p className="text-xs text-muted-foreground mt-1">
              Te avisaremos cuando haya eventos o movimientos en tu cuenta
            </p>
          </Card>
        )}

        {/* NOTIFICACIONES */}
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRead={handleMarkAsRead}
          />
        ))}

      </div>
    </div>
  )
}