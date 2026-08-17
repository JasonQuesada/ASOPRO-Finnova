/**
 * @fileoverview
 * Demo interactiva de Finnova ASOPRO para portafolio.
 *
 * IMPORTANTE:
 * - Esta demo es completamente independiente de Firebase.
 * - Todos los datos son ficticios.
 * - Todos los cambios existen únicamente en memoria.
 * - Al recargar la página, la demo vuelve a su estado inicial.
 * - Estudiante y profesor son simulaciones independientes.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
  Eye,
  Edit3,
  UserCheck,
  UserX,
  Target,
  Sparkles,
  Activity,
  CreditCard,
  FileText,
  ShieldCheck
} from 'lucide-react'

import logoFinnova from '@/assets/logo-finnova.png'

/* ============================================================================
 * DATOS INICIALES
 * ========================================================================== */

const INITIAL_STUDENT = {
  name: 'María González',
  email: 'maria.gonzalez@demo.com',
  balance: 125000,
  savings: 45000,
  debt: 18500,
  monthlyIncome: 180000,
  monthlyExpenses: 125000,
  financialScore: 82,
  participation: 87
}

const INITIAL_EVENTS = [
  {
    id: 1,
    title: '¿Comprar o ahorrar?',
    description:
      'Has recibido un ingreso extraordinario y debes decidir cómo utilizarlo para mejorar tu situación financiera.',
    category: 'Ahorro',
    difficulty: 'Fácil',
    reward: 5000,
    date: '12 Ago 2026',
    status: 'Disponible',
    options: [
      {
        id: 'a',
        title: 'Ahorrar la mayor parte',
        description: 'Destinar ₡25,000 a tu fondo de emergencia.',
        balanceImpact: -25000,
        savingsImpact: 25000,
        debtImpact: 0,
        result: 'Tu fondo de emergencia crece y mejoras tu capacidad de afrontar imprevistos.'
      },
      {
        id: 'b',
        title: 'Comprar algo que necesitas',
        description: 'Utilizar ₡15,000 para una compra personal necesaria.',
        balanceImpact: -15000,
        savingsImpact: 0,
        debtImpact: 0,
        result: 'Realizas una compra necesaria manteniendo una parte del dinero disponible.'
      },
      {
        id: 'c',
        title: 'Mantener el dinero disponible',
        description: 'No realizar movimientos y conservar el ingreso.',
        balanceImpact: 0,
        savingsImpact: 0,
        debtImpact: 0,
        result: 'Mantienes tu liquidez, aunque no aumentas directamente tus ahorros.'
      }
    ]
  },
  {
    id: 2,
    title: 'Emergencia médica familiar',
    description:
      'Un familiar necesita atención médica inesperada. Debes decidir cómo cubrir el gasto sin comprometer demasiado tus finanzas.',
    category: 'Emergencia',
    difficulty: 'Difícil',
    reward: 8000,
    date: '10 Ago 2026',
    status: 'Disponible',
    options: [
      {
        id: 'a',
        title: 'Utilizar tus ahorros',
        description: 'Retirar ₡20,000 del fondo de emergencia.',
        balanceImpact: 0,
        savingsImpact: -20000,
        debtImpact: 0,
        result: 'Utilizas tu fondo de emergencia para cubrir una situación importante.'
      },
      {
        id: 'b',
        title: 'Solicitar un préstamo',
        description: 'Cubrir el gasto mediante un nuevo préstamo de ₡20,000.',
        balanceImpact: 0,
        savingsImpact: 0,
        debtImpact: 20000,
        result: 'Conservas tus ahorros, pero aumentas tu nivel de endeudamiento.'
      }
    ]
  },
  {
    id: 3,
    title: 'Oferta de trabajo',
    description:
      'Recibes una oportunidad laboral con mejores ingresos, pero requiere algunos gastos iniciales de transporte y capacitación.',
    category: 'Ingresos',
    difficulty: 'Media',
    reward: 7000,
    date: '08 Ago 2026',
    status: 'Disponible',
    options: [
      {
        id: 'a',
        title: 'Aceptar la oportunidad',
        description: 'Invertir ₡10,000 inicialmente para comenzar.',
        balanceImpact: -10000,
        savingsImpact: 0,
        debtImpact: 0,
        result: 'Realizas una inversión inicial que podría aumentar tus ingresos futuros.'
      },
      {
        id: 'b',
        title: 'Mantener tu situación actual',
        description: 'No asumir gastos adicionales por ahora.',
        balanceImpact: 0,
        savingsImpact: 0,
        debtImpact: 0,
        result: 'Mantienes estabilidad financiera y evitas un gasto inmediato.'
      }
    ]
  },
  {
    id: 4,
    title: 'Compra de computadora',
    description:
      'Necesitas una computadora para tus estudios. Tienes varias alternativas para financiar la compra.',
    category: 'Educación',
    difficulty: 'Media',
    reward: 6000,
    date: '05 Ago 2026',
    status: 'Disponible',
    options: [
      {
        id: 'a',
        title: 'Comprar de contado',
        description: 'Pagar ₡80,000 inmediatamente.',
        balanceImpact: -80000,
        savingsImpact: 0,
        debtImpact: 0,
        result: 'Obtienes la computadora sin adquirir deuda, pero reduces considerablemente tu liquidez.'
      },
      {
        id: 'b',
        title: 'Comprar a cuotas',
        description: 'Pagar ₡20,000 inicialmente y financiar el resto.',
        balanceImpact: -20000,
        savingsImpact: 0,
        debtImpact: 60000,
        result: 'Conservas más liquidez, pero aumentas tu deuda mensual.'
      },
      {
        id: 'c',
        title: 'Esperar',
        description: 'No comprar todavía y continuar ahorrando.',
        balanceImpact: 0,
        savingsImpact: 10000,
        debtImpact: 0,
        result: 'Proteges tu liquidez y fortaleces tu capacidad de ahorro.'
      }
    ]
  },
  {
    id: 5,
    title: 'Préstamo para emprendimiento',
    description:
      'Tienes una idea de negocio y puedes solicitar financiamiento para iniciar operaciones.',
    category: 'Emprendimiento',
    difficulty: 'Difícil',
    reward: 10000,
    date: '01 Ago 2026',
    status: 'Disponible',
    options: [
      {
        id: 'a',
        title: 'Solicitar financiamiento',
        description: 'Adquirir ₡75,000 de deuda para comenzar.',
        balanceImpact: 75000,
        savingsImpact: 0,
        debtImpact: 75000,
        result: 'Obtienes capital para emprender, pero debes administrar cuidadosamente la nueva deuda.'
      },
      {
        id: 'b',
        title: 'Utilizar tus ahorros',
        description: 'Invertir ₡35,000 de tus ahorros.',
        balanceImpact: 0,
        savingsImpact: -35000,
        debtImpact: 0,
        result: 'Evitas adquirir deuda, aunque reduces tu fondo de emergencia.'
      },
      {
        id: 'c',
        title: 'Esperar y ahorrar',
        description: 'No iniciar todavía y continuar fortaleciendo tus finanzas.',
        balanceImpact: 0,
        savingsImpact: 15000,
        debtImpact: 0,
        result: 'Aumentas tu capital antes de asumir riesgos empresariales.'
      }
    ]
  }
]

const INITIAL_HISTORY = [
  {
    id: 1,
    event: 'Presupuesto mensual',
    decision: 'Reducir gastos innecesarios',
    date: '02 Ago 2026',
    impact: 12000,
    result: 'Positivo'
  },
  {
    id: 2,
    event: 'Meta de ahorro',
    decision: 'Aumentar aporte mensual',
    date: '28 Jul 2026',
    impact: 10000,
    result: 'Positivo'
  },
  {
    id: 3,
    event: 'Compra educativa',
    decision: 'Comparar alternativas',
    date: '20 Jul 2026',
    impact: -5000,
    result: 'Controlado'
  }
]

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: '¡Bienvenido a Finnova!',
    message: 'Explora los eventos financieros disponibles.',
    date: 'Hoy',
    read: false,
    type: 'success'
  },
  {
    id: 2,
    title: 'Nuevo evento financiero disponible',
    message: 'Ya puedes participar en "Compra de computadora".',
    date: 'Hace 2 horas',
    read: false,
    type: 'info'
  },
  {
    id: 3,
    title: 'Meta de ahorro',
    message: 'Has alcanzado el 22% de tu objetivo de emergencia.',
    date: 'Ayer',
    read: true,
    type: 'success'
  },
  {
    id: 4,
    title: 'Consejo financiero',
    message: 'Tu nivel de endeudamiento se mantiene moderado.',
    date: 'Hace 2 días',
    read: true,
    type: 'warning'
  }
]

const INITIAL_STUDENTS = [
  {
    id: 1,
    name: 'María González',
    initials: 'MG',
    progress: 88,
    score: 82,
    savings: 45000,
    debt: 18500,
    participation: 94,
    status: 'Activo'
  },
  {
    id: 2,
    name: 'Daniel Vargas',
    initials: 'DV',
    progress: 76,
    score: 75,
    savings: 32000,
    debt: 25000,
    participation: 81,
    status: 'Activo'
  },
  {
    id: 3,
    name: 'Sofía Ramírez',
    initials: 'SR',
    progress: 93,
    score: 91,
    savings: 68000,
    debt: 12000,
    participation: 97,
    status: 'Activo'
  },
  {
    id: 4,
    name: 'Andrés Castillo',
    initials: 'AC',
    progress: 64,
    score: 68,
    savings: 19000,
    debt: 42000,
    participation: 70,
    status: 'En riesgo'
  },
  {
    id: 5,
    name: 'Valentina Mora',
    initials: 'VM',
    progress: 84,
    score: 86,
    savings: 51000,
    debt: 15000,
    participation: 89,
    status: 'Activo'
  },
  {
    id: 6,
    name: 'Sebastián Solano',
    initials: 'SS',
    progress: 71,
    score: 73,
    savings: 28000,
    debt: 31000,
    participation: 78,
    status: 'Activo'
  }
]

const INITIAL_TEACHER_EVENTS = [
  {
    id: 101,
    title: 'Presupuesto familiar',
    category: 'Planificación',
    participants: 24,
    responses: 22,
    status: 'Activo',
    date: '12 Ago 2026'
  },
  {
    id: 102,
    title: 'Decisión de ahorro',
    category: 'Ahorro',
    participants: 24,
    responses: 20,
    status: 'Activo',
    date: '10 Ago 2026'
  },
  {
    id: 103,
    title: 'Préstamo responsable',
    category: 'Crédito',
    participants: 24,
    responses: 24,
    status: 'Finalizado',
    date: '05 Ago 2026'
  },
  {
    id: 104,
    title: 'Inversión y riesgo',
    category: 'Inversión',
    participants: 24,
    responses: 19,
    status: 'Activo',
    date: '01 Ago 2026'
  }
]

/* ============================================================================
 * UTILIDADES
 * ========================================================================== */

const formatMoney = (value) => {
  const sign = value < 0 ? '-' : ''

  return `${sign}₡${Math.abs(Math.round(value)).toLocaleString('es-CR')}`
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}

/* ============================================================================
 * COMPONENTES INTERNOS
 * ========================================================================== */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  type = 'blue',
  trend
}) {
  const styles = {
    blue: 'from-blue-700 to-cyan-600 text-white',
    green: 'from-emerald-500 to-teal-500 text-white',
    amber: 'from-amber-400 to-orange-500 text-white',
    purple: 'from-indigo-600 to-violet-600 text-white',
    slate: 'from-slate-700 to-slate-800 text-white'
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles[type]}
        p-5 shadow-lg transition duration-300
        hover:-translate-y-1 hover:shadow-xl
      `}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">
            {title}
          </span>

          <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
            <Icon size={20} />
          </div>
        </div>

        <div className="text-2xl font-bold tracking-tight">
          {value}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-white/75">
          {trend && <TrendingUp size={14} />}
          <span>{subtitle}</span>
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value, label, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-400 to-orange-500',
    purple: 'from-indigo-600 to-violet-500'
  }

  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-slate-600">{label}</span>
          <span className="font-bold text-slate-800">{value}%</span>
        </div>
      )}

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colors[color]} transition-all duration-700`}
          style={{ width: `${clamp(value, 0, 100)}%` }}
        />
      </div>
    </div>
  )
}

function Badge({ children, type = 'blue' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-violet-50 text-violet-700 border-violet-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200'
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full border px-2.5 py-1
        text-xs font-semibold ${styles[type]}
      `}
    >
      {children}
    </span>
  )
}

function SectionTitle({ title, subtitle, icon: Icon }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {Icon && (
        <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
          <Icon size={21} />
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={26} />
      </div>

      <h3 className="font-semibold text-slate-800">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">
        {message}
      </p>
    </div>
  )
}

/* ============================================================================
 * COMPONENTE PRINCIPAL
 * ========================================================================== */

export default function Demo() {
  const navigate = useNavigate()

  const [role, setRole] = useState('student')
  const [student, setStudent] = useState(INITIAL_STUDENT)
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [students, setStudents] = useState(INITIAL_STUDENTS)
  const [teacherEvents, setTeacherEvents] = useState(INITIAL_TEACHER_EVENTS)

  const [studentView, setStudentView] = useState('dashboard')
  const [teacherView, setTeacherView] = useState('dashboard')

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    category: 'Ahorro',
    difficulty: 'Media',
    date: ''
  })

  const currentView = role === 'student' ? studentView : teacherView

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  const financialHealth = useMemo(() => {
    const savingsRatio =
      student.monthlyIncome > 0
        ? (student.savings / student.monthlyIncome) * 100
        : 0

    const debtRatio =
      student.monthlyIncome > 0
        ? (student.debt / student.monthlyIncome) * 100
        : 0

    return {
      savingsRatio,
      debtRatio,
      netWorth: student.balance + student.savings - student.debt
    }
  }, [student])

  /* --------------------------------------------------------------------------
   * Feedback
   * ------------------------------------------------------------------------ */

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type })

    window.setTimeout(() => {
      setFeedback(null)
    }, 3000)
  }

  /* --------------------------------------------------------------------------
   * Decisión de estudiante
   * ------------------------------------------------------------------------ */

  const handleDecision = (event, option) => {
    setStudent((previous) => ({
      ...previous,
      balance: Math.max(
        0,
        previous.balance + option.balanceImpact
      ),
      savings: Math.max(
        0,
        previous.savings + option.savingsImpact
      ),
      debt: Math.max(
        0,
        previous.debt + option.debtImpact
      ),
      financialScore: clamp(
        previous.financialScore +
          (option.debtImpact > 0
            ? -3
            : option.savingsImpact > 0
              ? 2
              : 0),
        0,
        100
      )
    }))

    setEvents((previous) =>
      previous.map((item) =>
        item.id === event.id
          ? { ...item, status: 'Completado' }
          : item
      )
    )

    setHistory((previous) => [
      {
        id: Date.now(),
        event: event.title,
        decision: option.title,
        date: 'Ahora',
        impact: option.balanceImpact,
        result: option.balanceImpact >= 0 ? 'Positivo' : 'Registrado'
      },
      ...previous
    ])

    setNotifications((previous) => [
      {
        id: Date.now(),
        title: 'Decisión registrada',
        message: `${option.title} en "${event.title}".`,
        date: 'Ahora',
        read: false,
        type: 'success'
      },
      ...previous
    ])

    setSelectedEvent(null)

    showFeedback(
      `Decisión registrada: ${option.title}`,
      'success'
    )
  }

  /* --------------------------------------------------------------------------
   * Ahorros
   * ------------------------------------------------------------------------ */

  const modifySavings = (amount) => {
    if (amount < 0 && student.savings < Math.abs(amount)) {
      showFeedback(
        'No tienes suficientes ahorros para realizar este retiro.',
        'error'
      )
      return
    }

    if (amount < 0 && student.balance < Math.abs(amount)) {
      showFeedback(
        'No tienes suficiente dinero disponible.',
        'error'
      )
      return
    }

    setStudent((previous) => ({
      ...previous,
      savings: Math.max(0, previous.savings + amount),
      balance:
        amount > 0
          ? Math.max(0, previous.balance - amount)
          : previous.balance + Math.abs(amount),
      financialScore: clamp(
        previous.financialScore + (amount > 0 ? 1 : -1),
        0,
        100
      )
    }))

    showFeedback(
      amount > 0
        ? `Has agregado ${formatMoney(amount)} a tus ahorros.`
        : `Has retirado ${formatMoney(Math.abs(amount))}.`,
      amount > 0 ? 'success' : 'warning'
    )
  }

  /* --------------------------------------------------------------------------
   * Pago de préstamo
   * ------------------------------------------------------------------------ */

  const payLoan = () => {
    const payment = 7500

    if (student.balance < payment) {
      showFeedback(
        'No tienes suficiente saldo disponible.',
        'error'
      )
      return
    }

    const actualPayment = Math.min(student.debt, payment)

    setStudent((previous) => ({
      ...previous,
      balance: previous.balance - actualPayment,
      debt: Math.max(0, previous.debt - actualPayment),
      financialScore: clamp(
        previous.financialScore + 3,
        0,
        100
      )
    }))

    setNotifications((previous) => [
      {
        id: Date.now(),
        title: 'Pago realizado',
        message: `Realizaste un pago de ${formatMoney(actualPayment)}.`,
        date: 'Ahora',
        read: false,
        type: 'success'
      },
      ...previous
    ])

    showFeedback(
      `Pago de ${formatMoney(actualPayment)} realizado correctamente.`,
      'success'
    )
  }

  /* --------------------------------------------------------------------------
   * Notificaciones
   * ------------------------------------------------------------------------ */

  const markNotificationRead = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true
      }))
    )

    showFeedback(
      'Todas las notificaciones fueron marcadas como leídas.',
      'success'
    )
  }

  /* --------------------------------------------------------------------------
   * Crear evento profesor
   * ------------------------------------------------------------------------ */

  const handleCreateEvent = (event) => {
    event.preventDefault()

    if (!newEvent.title.trim()) {
      showFeedback(
        'Ingresa un título para el evento.',
        'error'
      )
      return
    }

    const created = {
      id: Date.now(),
      title: newEvent.title,
      category: newEvent.category,
      participants: 24,
      responses: 0,
      status: 'Activo',
      date: newEvent.date || 'Sin fecha'
    }

    setTeacherEvents((previous) => [
      created,
      ...previous
    ])

    setNewEvent({
      title: '',
      description: '',
      category: 'Ahorro',
      difficulty: 'Media',
      date: ''
    })

    setShowCreateEvent(false)

    showFeedback(
      'Evento simulado creado correctamente.',
      'success'
    )
  }

  /* --------------------------------------------------------------------------
   * Navegación interna
   * ------------------------------------------------------------------------ */

  const navigateStudent = (view) => {
    setStudentView(view)
    setShowMenu(false)
  }

  const navigateTeacher = (view) => {
    setTeacherView(view)
    setShowMenu(false)
  }

  /* ==========================================================================
   * SIDEBAR
   * ======================================================================== */

  const studentNavigation = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: LayoutDashboard
    },
    {
      id: 'events',
      label: 'Eventos',
      icon: BookOpen
    },
    {
      id: 'history',
      label: 'Historial',
      icon: Activity
    },
    {
      id: 'savings',
      label: 'Ahorros',
      icon: PiggyBank
    },
    {
      id: 'loans',
      label: 'Préstamos',
      icon: Landmark
    },
    {
      id: 'financial',
      label: 'Estado financiero',
      icon: BarChart3
    },
    {
      id: 'notifications',
      label: 'Notificaciones',
      icon: Bell,
      badge: unreadNotifications
    }
  ]

  const teacherNavigation = [
    {
      id: 'dashboard',
      label: 'Resumen',
      icon: LayoutDashboard
    },
    {
      id: 'students',
      label: 'Estudiantes',
      icon: Users
    },
    {
      id: 'events',
      label: 'Eventos',
      icon: BookOpen
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: BarChart3
    },
    {
      id: 'manage',
      label: 'Administración',
      icon: Settings
    }
  ]

  const navigation =
    role === 'student'
      ? studentNavigation
      : teacherNavigation

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">

      {/* ======================================================================
       * FEEDBACK
       * ==================================================================== */}

      {feedback && (
        <div
          className={`
            fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3
            rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur
            animate-[fadeIn_.25s_ease-out]
            ${
              feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : feedback.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }
          `}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle size={20} />
          ) : (
            <Check size={20} />
          )}

          <span className="text-sm font-semibold">
            {feedback.message}
          </span>

          <button
            onClick={() => setFeedback(null)}
            className="ml-2 rounded-lg p-1 hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================================
       * SIDEBAR DESKTOP
       * ==================================================================== */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200
          bg-white lg:flex lg:flex-col
        `}
      >
        <div className="border-b border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <img
              src={logoFinnova}
              alt="Finnova ASOPRO"
              className="h-11 w-11 object-contain"
            />

            <div>
              <div className="font-bold text-slate-900">
                Finnova
              </div>

              <div className="text-xs font-medium text-slate-500">
                ASOPRO
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-5">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
            {role === 'student'
              ? 'Espacio estudiante'
              : 'Espacio profesor'}
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    role === 'student'
                      ? navigateStudent(item.id)
                      : navigateTeacher(item.id)
                  }
                  className={`
                    group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-sm font-medium transition
                    ${
                      active
                        ? 'bg-blue-900 text-white shadow-md shadow-blue-900/10'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon size={18} />

                  <span className="flex-1 text-left">
                    {item.label}
                  </span>

                  {item.badge > 0 && (
                    <span
                      className={`
                        rounded-full px-2 py-0.5 text-[10px] font-bold
                        ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 text-blue-700'
                        }
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-4">
            <div className="mb-2 flex items-center gap-2 text-blue-800">
              <Sparkles size={17} />
              <span className="text-xs font-bold">
                MODO DEMO
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Todos los datos son simulados y desaparecen al recargar la página.
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Salir de demo
          </button>
        </div>
      </aside>

      {/* ======================================================================
       * CONTENIDO PRINCIPAL
       * ==================================================================== */}

      <div className="lg:pl-64">

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

            <div className="flex items-center gap-3">

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div className="lg:hidden">
                <img
                  src={logoFinnova}
                  alt="Finnova"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-400">
                  Simulación financiera educativa
                </p>

                <p className="font-semibold text-slate-800">
                  {role === 'student'
                    ? `Hola, ${student.name.split(' ')[0]}`
                    : 'Panel del profesor'}
                </p>
              </div>
            </div>

            {/* Selector de rol */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setRole('student')
                  setStudentView('dashboard')
                }}
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-xs
                  font-semibold transition sm:text-sm
                  ${
                    role === 'student'
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }
                `}
              >
                <GraduationCap size={17} />
                <span className="hidden sm:inline">
                  Estudiante
                </span>
              </button>

              <button
                onClick={() => {
                  setRole('teacher')
                  setTeacherView('dashboard')
                }}
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-xs
                  font-semibold transition sm:text-sm
                  ${
                    role === 'teacher'
                      ? 'bg-white text-blue-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }
                `}
              >
                <Users size={17} />
                <span className="hidden sm:inline">
                  Profesor
                </span>
              </button>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5">
                <Sparkles size={14} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-700">
                  MODO DEMO
                </span>
              </div>

              {role === 'student' && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-cyan-500 text-xs font-bold text-white">
                  MG
                </div>
              )}

              {role === 'teacher' && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-xs font-bold text-white">
                  CR
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu */}
        {showMenu && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden">
            <div className="h-full w-72 bg-white p-5 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={logoFinnova}
                    alt="Finnova"
                    className="h-10 w-10 object-contain"
                  />

                  <span className="font-bold">
                    Finnova ASOPRO
                  </span>
                </div>

                <button
                  onClick={() => setShowMenu(false)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Navegación
              </div>

              <nav className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        role === 'student'
                          ? navigateStudent(item.id)
                          : navigateTeacher(item.id)
                      }
                      className={`
                        flex w-full items-center gap-3 rounded-xl px-3 py-3
                        text-sm font-medium
                        ${
                          currentView === item.id
                            ? 'bg-blue-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }
                      `}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>

              <button
                onClick={() => navigate('/login')}
                className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                Salir de demo
              </button>
            </div>
          </div>
        )}

        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">

          {/* ==================================================================
           * VISTA ESTUDIANTE
           * ================================================================ */}

          {role === 'student' && (
            <>
              {/* --------------------------------------------------------------
               * DASHBOARD
               * ------------------------------------------------------------ */}

              {studentView === 'dashboard' && (
                <div className="mx-auto max-w-7xl space-y-7">

                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-700 p-6 text-white shadow-xl sm:p-8">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-2xl" />
                    <div className="absolute -bottom-24 right-32 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

                    <div className="relative max-w-2xl">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                        <Sparkles size={14} />
                        Experiencia Finnova
                      </div>

                      <h1 className="text-2xl font-bold sm:text-3xl">
                        Tu futuro financiero empieza con buenas decisiones.
                      </h1>

                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
                        Explora escenarios financieros, toma decisiones y observa
                        cómo cambian tus finanzas en tiempo real.
                      </p>

                      <button
                        onClick={() => navigateStudent('events')}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                      >
                        Explorar eventos
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      title="Dinero disponible"
                      value={formatMoney(student.balance)}
                      subtitle="Liquidez actual"
                      icon={Wallet}
                      type="blue"
                    />

                    <StatCard
                      title="Ahorros"
                      value={formatMoney(student.savings)}
                      subtitle="Fondo acumulado"
                      icon={PiggyBank}
                      type="green"
                    />

                    <StatCard
                      title="Deuda"
                      value={formatMoney(student.debt)}
                      subtitle="Pendiente por pagar"
                      icon={CreditCard}
                      type="amber"
                    />

                    <StatCard
                      title="Score financiero"
                      value={`${student.financialScore}/100`}
                      subtitle="Excelente progreso"
                      icon={ShieldCheck}
                      type="purple"
                      trend
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-3">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                      <SectionTitle
                        title="Resumen financiero"
                        subtitle="Una vista rápida de tu situación actual"
                        icon={BarChart3}
                      />

                      <div className="grid gap-6 sm:grid-cols-2">

                        <div className="rounded-2xl bg-slate-50 p-5">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">
                                Capacidad de ahorro
                              </p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">
                                {formatMoney(
                                  student.monthlyIncome -
                                  student.monthlyExpenses
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                              <TrendingUp size={20} />
                            </div>
                          </div>

                          <ProgressBar
                            value={Math.round(
                              ((student.monthlyIncome -
                                student.monthlyExpenses) /
                                student.monthlyIncome) *
                                100
                            )}
                            label="Ingresos disponibles"
                            color="green"
                          />
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-5">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-slate-500">
                                Nivel de deuda
                              </p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">
                                {Math.round(financialHealth.debtRatio)}%
                              </p>
                            </div>

                            <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                              <Landmark size={20} />
                            </div>
                          </div>

                          <ProgressBar
                            value={Math.round(
                              financialHealth.debtRatio
                            )}
                            label="Sobre ingresos mensuales"
                            color="amber"
                          />
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
                        <div className="flex items-start gap-4">
                          <div className="rounded-xl bg-blue-700 p-3 text-white">
                            <Target size={21} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-slate-800">
                                Fondo de emergencia
                              </h3>

                              <span className="text-sm font-bold text-blue-700">
                                {Math.round(
                                  (student.savings / 200000) * 100
                                )}%
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              Objetivo: ₡200,000
                            </p>

                            <div className="mt-4">
                              <ProgressBar
                                value={Math.round(
                                  (student.savings / 200000) * 100
                                )}
                                color="blue"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Actividad reciente"
                        subtitle="Tus últimas decisiones"
                        icon={Activity}
                      />

                      <div className="space-y-4">
                        {history.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3"
                          >
                            <div
                              className={`
                                mt-0.5 rounded-xl p-2
                                ${
                                  item.impact >= 0
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-amber-50 text-amber-600'
                                }
                              `}
                            >
                              {item.impact >= 0 ? (
                                <ArrowUp size={16} />
                              ) : (
                                <ArrowDown size={16} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {item.event}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {item.decision}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                {item.date}
                              </p>
                            </div>

                            <span
                              className={`
                                text-xs font-bold
                                ${
                                  item.impact >= 0
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                }
                              `}
                            >
                              {item.impact >= 0 ? '+' : ''}
                              {formatMoney(item.impact)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => navigateStudent('history')}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                      >
                        Ver historial
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <SectionTitle
                      title="Eventos recomendados"
                      subtitle="Pon a prueba tus habilidades financieras"
                      icon={BookOpen}
                    />

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {events.slice(0, 3).map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * EVENTOS
               * ------------------------------------------------------------ */}

              {studentView === 'events' && (
                <div className="mx-auto max-w-7xl">
                  <SectionTitle
                    title="Eventos financieros"
                    subtitle="Toma decisiones y observa sus consecuencias"
                    icon={BookOpen}
                  />

                  <div className="mb-6 flex flex-wrap gap-2">
                    <Badge type="blue">
                      {events.filter((event) => event.status === 'Disponible').length} disponibles
                    </Badge>

                    <Badge type="green">
                      {events.filter((event) => event.status === 'Completado').length} completados
                    </Badge>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={() => {
                          if (event.status === 'Disponible') {
                            setSelectedEvent(event)
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * HISTORIAL
               * ------------------------------------------------------------ */}

              {studentView === 'history' && (
                <div className="mx-auto max-w-6xl">
                  <SectionTitle
                    title="Historial de decisiones"
                    subtitle="Revisa cómo tus decisiones han afectado tus finanzas"
                    icon={Activity}
                  />

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">Evento</th>
                            <th className="px-6 py-4">Decisión</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Impacto</th>
                            <th className="px-6 py-4">Resultado</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {history.map((item) => (
                            <tr
                              key={item.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {item.event}
                              </td>

                              <td className="px-6 py-4 text-sm text-slate-600">
                                {item.decision}
                              </td>

                              <td className="px-6 py-4 text-sm text-slate-500">
                                {item.date}
                              </td>

                              <td
                                className={`
                                  px-6 py-4 text-sm font-bold
                                  ${
                                    item.impact >= 0
                                      ? 'text-emerald-600'
                                      : 'text-amber-600'
                                  }
                                `}
                              >
                                {item.impact >= 0 ? '+' : ''}
                                {formatMoney(item.impact)}
                              </td>

                              <td className="px-6 py-4">
                                <Badge
                                  type={
                                    item.result === 'Positivo'
                                      ? 'green'
                                      : 'amber'
                                  }
                                >
                                  {item.result}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 p-4 md:hidden">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {item.event}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.decision}
                              </p>
                            </div>

                            <Badge type="green">
                              {item.result}
                            </Badge>
                          </div>

                          <div className="mt-4 flex justify-between text-xs text-slate-400">
                            <span>{item.date}</span>
                            <span className="font-bold text-slate-700">
                              {formatMoney(item.impact)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * AHORROS
               * ------------------------------------------------------------ */}

              {studentView === 'savings' && (
                <div className="mx-auto max-w-6xl space-y-6">
                  <SectionTitle
                    title="Mis ahorros"
                    subtitle="Construye una reserva para tus objetivos"
                    icon={PiggyBank}
                  />

                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 p-7 text-white shadow-xl lg:col-span-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/75">
                            Fondo de emergencia
                          </p>

                          <p className="mt-2 text-4xl font-bold">
                            {formatMoney(student.savings)}
                          </p>

                          <p className="mt-2 text-sm text-white/70">
                            de {formatMoney(200000)} objetivo
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/15 p-4">
                          <PiggyBank size={28} />
                        </div>
                      </div>

                      <div className="mt-8">
                        <div className="mb-2 flex justify-between text-sm text-white/80">
                          <span>Progreso</span>
                          <span className="font-bold">
                            {Math.round(
                              (student.savings / 200000) * 100
                            )}%
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-white transition-all duration-700"
                            style={{
                              width: `${clamp(
                                (student.savings / 200000) * 100,
                                0,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">
                        Disponible
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatMoney(student.balance)}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Puedes mover dinero entre tu saldo y tus ahorros.
                      </p>

                      <div className="mt-6 space-y-2">
                        <button
                          onClick={() => modifySavings(5000)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          <Plus size={17} />
                          Agregar ₡5,000
                        </button>

                        <button
                          onClick={() => modifySavings(10000)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Plus size={17} />
                          Agregar ₡10,000
                        </button>

                        <button
                          onClick={() => modifySavings(-5000)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                        >
                          <ArrowDown size={17} />
                          Retirar ₡5,000
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Meta mensual
                      </p>
                      <p className="mt-2 text-xl font-bold">
                        ₡20,000
                      </p>
                      <ProgressBar
                        value={65}
                        color="green"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Ahorro / ingreso
                      </p>
                      <p className="mt-2 text-xl font-bold">
                        {Math.round(
                          (student.savings /
                            student.monthlyIncome) *
                            100
                        )}%
                      </p>
                      <ProgressBar
                        value={Math.min(
                          100,
                          (student.savings /
                            student.monthlyIncome) *
                            100
                        )}
                        color="blue"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Próximo objetivo
                      </p>
                      <p className="mt-2 text-xl font-bold">
                        ₡75,000
                      </p>
                      <ProgressBar
                        value={60}
                        color="purple"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * PRÉSTAMOS
               * ------------------------------------------------------------ */}

              {studentView === 'loans' && (
                <div className="mx-auto max-w-6xl space-y-6">
                  <SectionTitle
                    title="Mis préstamos"
                    subtitle="Controla tus obligaciones y pagos"
                    icon={Landmark}
                  />

                  <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 p-7 text-white shadow-xl">
                    <div className="grid gap-7 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-slate-400">
                          Deuda pendiente
                        </p>
                        <p className="mt-2 text-3xl font-bold">
                          {formatMoney(student.debt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Cuota estimada
                        </p>
                        <p className="mt-2 text-3xl font-bold">
                          ₡7,500
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">
                          Estado
                        </p>
                        <div className="mt-3">
                          <Badge type="green">
                            Al día
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-amber-50 p-4 text-amber-600">
                          <Landmark size={24} />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            Préstamo educativo
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Monto inicial: ₡50,000
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Cuota mensual: ₡7,500
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={payLoan}
                        disabled={student.debt <= 0}
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {student.debt <= 0
                          ? 'Préstamo pagado'
                          : 'Realizar pago'}
                      </button>
                    </div>

                    <div className="mt-6">
                      <ProgressBar
                        value={
                          ((50000 - student.debt) / 50000) *
                          100
                        }
                        label="Progreso del préstamo"
                        color="green"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-emerald-50 p-5">
                      <p className="text-sm text-emerald-700">
                        Capital pagado
                      </p>
                      <p className="mt-2 text-xl font-bold text-emerald-900">
                        {formatMoney(50000 - student.debt)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-5">
                      <p className="text-sm text-amber-700">
                        Capital pendiente
                      </p>
                      <p className="mt-2 text-xl font-bold text-amber-900">
                        {formatMoney(student.debt)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-5">
                      <p className="text-sm text-blue-700">
                        Próximo pago
                      </p>
                      <p className="mt-2 text-xl font-bold text-blue-900">
                        30 Ago 2026
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * ESTADO FINANCIERO
               * ------------------------------------------------------------ */}

              {studentView === 'financial' && (
                <div className="mx-auto max-w-6xl space-y-6">
                  <SectionTitle
                    title="Estado financiero"
                    subtitle="Analiza la salud de tus finanzas"
                    icon={BarChart3}
                  />

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Ingresos mensuales"
                      value={formatMoney(student.monthlyIncome)}
                      subtitle="Ingreso estimado"
                      icon={ArrowUp}
                      type="green"
                    />

                    <StatCard
                      title="Gastos mensuales"
                      value={formatMoney(student.monthlyExpenses)}
                      subtitle="Gastos estimados"
                      icon={ArrowDown}
                      type="amber"
                    />

                    <StatCard
                      title="Patrimonio neto"
                      value={formatMoney(financialHealth.netWorth)}
                      subtitle="Balance + ahorros - deuda"
                      icon={CircleDollarSign}
                      type="blue"
                    />

                    <StatCard
                      title="Score"
                      value={`${student.financialScore}/100`}
                      subtitle="Salud financiera"
                      icon={ShieldCheck}
                      type="purple"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Distribución mensual"
                        subtitle="Ingresos frente a gastos"
                        icon={BarChart3}
                      />

                      <div className="space-y-6">
                        <ProgressBar
                          value={100}
                          label={`Ingresos · ${formatMoney(student.monthlyIncome)}`}
                          color="blue"
                        />

                        <ProgressBar
                          value={
                            (student.monthlyExpenses /
                              student.monthlyIncome) *
                            100
                          }
                          label={`Gastos · ${formatMoney(student.monthlyExpenses)}`}
                          color="amber"
                        />

                        <ProgressBar
                          value={
                            ((student.monthlyIncome -
                              student.monthlyExpenses) /
                              student.monthlyIncome) *
                            100
                          }
                          label={`Capacidad de ahorro · ${formatMoney(
                            student.monthlyIncome -
                            student.monthlyExpenses
                          )}`}
                          color="green"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Salud financiera"
                        subtitle="Indicadores principales"
                        icon={ShieldCheck}
                      />

                      <div className="flex items-center gap-7">
                        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-lg">
                          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-3xl font-bold text-slate-900">
                              {student.financialScore}
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              / 100
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <HealthIndicator
                            color="green"
                            text="Buen nivel de ahorro"
                          />

                          <HealthIndicator
                            color="blue"
                            text="Capacidad de ahorro positiva"
                          />

                          <HealthIndicator
                            color="amber"
                            text="Endeudamiento moderado"
                          />

                          <HealthIndicator
                            color="purple"
                            text="Participación constante"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * NOTIFICACIONES
               * ------------------------------------------------------------ */}

              {studentView === 'notifications' && (
                <div className="mx-auto max-w-4xl">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <SectionTitle
                      title="Notificaciones"
                      subtitle="Mantente al día con tu actividad"
                      icon={Bell}
                    />

                    {unreadNotifications > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="mb-6 text-sm font-semibold text-blue-700 hover:text-blue-900"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() =>
                          markNotificationRead(notification.id)
                        }
                        className={`
                          flex w-full items-start gap-4 rounded-2xl border p-5
                          text-left transition hover:-translate-y-0.5 hover:shadow-md
                          ${
                            notification.read
                              ? 'border-slate-200 bg-white'
                              : 'border-blue-100 bg-blue-50/60'
                          }
                        `}
                      >
                        <div
                          className={`
                            rounded-xl p-3
                            ${
                              notification.type === 'success'
                                ? 'bg-emerald-100 text-emerald-600'
                                : notification.type === 'warning'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-blue-100 text-blue-600'
                            }
                          `}
                        >
                          {notification.type === 'warning' ? (
                            <AlertTriangle size={20} />
                          ) : (
                            <Bell size={20} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {notification.title}
                            </h3>

                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-blue-600" />
                            )}
                          </div>

                          <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {notification.date}
                          </p>
                        </div>

                        {!notification.read && (
                          <div className="hidden text-xs font-semibold text-blue-600 sm:block">
                            Marcar leída
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================================================================
           * VISTA PROFESOR
           * ================================================================ */}

          {role === 'teacher' && (
            <>
              {/* --------------------------------------------------------------
               * DASHBOARD PROFESOR
               * ------------------------------------------------------------ */}

              {teacherView === 'dashboard' && (
                <div className="mx-auto max-w-7xl space-y-7">

                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-violet-700 p-7 text-white shadow-xl sm:p-8">
                    <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
                    <div className="absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                          <ShieldCheck size={14} />
                          Panel educativo
                        </div>

                        <h1 className="text-2xl font-bold sm:text-3xl">
                          Hola, Carlos Rodríguez
                        </h1>

                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">
                          Supervisa el progreso de tus estudiantes y analiza
                          sus decisiones financieras.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowCreateEvent(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                      >
                        <Plus size={18} />
                        Crear evento
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      title="Estudiantes activos"
                      value="24"
                      subtitle="+3 este mes"
                      icon={Users}
                      type="blue"
                      trend
                    />

                    <StatCard
                      title="Eventos activos"
                      value="6"
                      subtitle="2 requieren atención"
                      icon={BookOpen}
                      type="purple"
                    />

                    <StatCard
                      title="Decisiones"
                      value="137"
                      subtitle="+18 esta semana"
                      icon={Activity}
                      type="green"
                      trend
                    />

                    <StatCard
                      title="Participación"
                      value="87%"
                      subtitle="Promedio del grupo"
                      icon={TrendingUp}
                      type="amber"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                      <SectionTitle
                        title="Participación del grupo"
                        subtitle="Actividad de los últimos 7 días"
                        icon={BarChart3}
                      />

                      <div className="flex h-56 items-end gap-3 sm:gap-5">
                        {[62, 78, 55, 84, 72, 91, 87].map(
                          (value, index) => (
                            <div
                              key={index}
                              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                            >
                              <span className="text-xs font-bold text-slate-500">
                                {value}%
                              </span>

                              <div className="flex h-full w-full items-end rounded-t-xl bg-slate-50">
                                <div
                                  className="w-full rounded-t-xl bg-gradient-to-t from-blue-700 to-cyan-400 transition-all duration-700 hover:from-blue-600 hover:to-cyan-300"
                                  style={{
                                    height: `${value}%`
                                  }}
                                />
                              </div>

                              <span className="text-[10px] font-medium text-slate-400">
                                {
                                  [
                                    'Lun',
                                    'Mar',
                                    'Mié',
                                    'Jue',
                                    'Vie',
                                    'Sáb',
                                    'Dom'
                                  ][index]
                                }
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Rendimiento"
                        subtitle="Promedios actuales"
                        icon={Target}
                      />

                      <div className="space-y-6">
                        <ProgressBar
                          value={87}
                          label="Participación"
                          color="blue"
                        />

                        <ProgressBar
                          value={82}
                          label="Score financiero"
                          color="green"
                        />

                        <ProgressBar
                          value={76}
                          label="Finalización"
                          color="purple"
                        />

                        <ProgressBar
                          value={69}
                          label="Ahorro"
                          color="amber"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Estudiantes destacados"
                        subtitle="Mayor progreso financiero"
                        icon={Users}
                      />

                      <div className="space-y-4">
                        {students
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 4)
                          .map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3"
                            >
                              <div className="w-5 text-center text-xs font-bold text-slate-400">
                                #{index + 1}
                              </div>

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                                {item.initials}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                  {item.name}
                                </p>

                                <ProgressBar
                                  value={item.progress}
                                  color="blue"
                                />
                              </div>

                              <span className="text-sm font-bold text-blue-700">
                                {item.score}
                              </span>
                            </div>
                          ))}
                      </div>

                      <button
                        onClick={() => navigateTeacher('students')}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Ver estudiantes
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Eventos recientes"
                        subtitle="Actividad de tu clase"
                        icon={BookOpen}
                      />

                      <div className="space-y-3">
                        {teacherEvents.slice(0, 4).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                          >
                            <div className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm">
                              <BookOpen size={18} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {event.title}
                              </p>

                              <p className="text-xs text-slate-500">
                                {event.responses}/{event.participants} respuestas
                              </p>
                            </div>

                            <Badge
                              type={
                                event.status === 'Activo'
                                  ? 'green'
                                  : 'slate'
                              }
                            >
                              {event.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * ESTUDIANTES
               * ------------------------------------------------------------ */}

              {teacherView === 'students' && (
                <div className="mx-auto max-w-7xl">
                  <SectionTitle
                    title="Estudiantes"
                    subtitle="Seguimiento del progreso financiero"
                    icon={Users}
                  />

                  <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <MiniMetric
                      label="Total"
                      value="24"
                      icon={Users}
                    />

                    <MiniMetric
                      label="Activos"
                      value="22"
                      icon={UserCheck}
                    />

                    <MiniMetric
                      label="En riesgo"
                      value="2"
                      icon={AlertTriangle}
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-5 py-4">Estudiante</th>
                            <th className="px-5 py-4">Progreso</th>
                            <th className="px-5 py-4">Score</th>
                            <th className="px-5 py-4">Ahorro</th>
                            <th className="px-5 py-4">Deuda</th>
                            <th className="px-5 py-4">Participación</th>
                            <th className="px-5 py-4">Estado</th>
                            <th className="px-5 py-4" />
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {students.map((item) => (
                            <tr
                              key={item.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-[10px] font-bold text-white">
                                    {item.initials}
                                  </div>

                                  <span className="text-sm font-semibold">
                                    {item.name}
                                  </span>
                                </div>
                              </td>

                              <td className="w-32 px-5 py-4">
                                <ProgressBar
                                  value={item.progress}
                                  color="blue"
                                />
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-bold text-blue-700">
                                  {item.score}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-sm font-medium text-emerald-600">
                                {formatMoney(item.savings)}
                              </td>

                              <td className="px-5 py-4 text-sm font-medium text-amber-600">
                                {formatMoney(item.debt)}
                              </td>

                              <td className="px-5 py-4 text-sm">
                                {item.participation}%
                              </td>

                              <td className="px-5 py-4">
                                <Badge
                                  type={
                                    item.status === 'Activo'
                                      ? 'green'
                                      : 'amber'
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </td>

                              <td className="px-5 py-4">
                                <button
                                  onClick={() =>
                                    setSelectedStudent(item)
                                  }
                                  className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Eye size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 p-4 lg:hidden">
                      {students.map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setSelectedStudent(item)
                          }
                          className="rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-100 hover:bg-blue-50/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                              {item.initials}
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Score {item.score} · {item.participation}% participación
                              </p>
                            </div>

                            <ChevronRight size={18} className="text-slate-400" />
                          </div>

                          <div className="mt-4">
                            <ProgressBar
                              value={item.progress}
                              label="Progreso"
                              color="blue"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * EVENTOS PROFESOR
               * ------------------------------------------------------------ */}

              {teacherView === 'events' && (
                <div className="mx-auto max-w-7xl">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <SectionTitle
                      title="Eventos financieros"
                      subtitle="Administra las experiencias de aprendizaje"
                      icon={BookOpen}
                    />

                    <button
                      onClick={() => setShowCreateEvent(true)}
                      className="mb-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/10 hover:bg-blue-800"
                    >
                      <Plus size={17} />
                      Crear evento
                    </button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {teacherEvents.map((event) => (
                      <div
                        key={event.id}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="mb-5 flex items-start justify-between">
                          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                            <BookOpen size={21} />
                          </div>

                          <Badge
                            type={
                              event.status === 'Activo'
                                ? 'green'
                                : 'slate'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <h3 className="font-bold text-slate-900">
                          {event.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {event.category}
                        </p>

                        <div className="mt-5 space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">
                              Participación
                            </span>
                            <span className="font-bold text-slate-700">
                              {event.responses}/{event.participants}
                            </span>
                          </div>

                          <ProgressBar
                            value={
                              (event.responses /
                                event.participants) *
                              100
                            }
                            color="blue"
                          />

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar size={14} />
                            {event.date}
                          </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                          <button
                            onClick={() =>
                              showFeedback(
                                `Visualizando ${event.title}`,
                                'success'
                              )
                            }
                            className="flex-1 rounded-xl bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Ver detalles
                          </button>

                          <button
                            onClick={() =>
                              showFeedback(
                                'Modo edición simulado.',
                                'success'
                              )
                            }
                            className="rounded-xl bg-slate-50 px-3 text-slate-500 hover:bg-slate-100"
                          >
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * REPORTES
               * ------------------------------------------------------------ */}

              {teacherView === 'reports' && (
                <div className="mx-auto max-w-7xl space-y-6">
                  <SectionTitle
                    title="Reportes"
                    subtitle="Analiza el comportamiento financiero del grupo"
                    icon={BarChart3}
                  />

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Participación"
                      value="87%"
                      subtitle="+4% vs. periodo anterior"
                      icon={Users}
                      type="blue"
                      trend
                    />

                    <StatCard
                      title="Score promedio"
                      value="81"
                      subtitle="+6 puntos"
                      icon={TrendingUp}
                      type="green"
                      trend
                    />

                    <StatCard
                      title="Ahorro promedio"
                      value="₡41,500"
                      subtitle="+8.2%"
                      icon={PiggyBank}
                      type="purple"
                      trend
                    />

                    <StatCard
                      title="Decisiones"
                      value="137"
                      subtitle="92% completadas"
                      icon={Activity}
                      type="amber"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Participación por evento"
                        subtitle="Respuestas registradas"
                        icon={BarChart3}
                      />

                      <div className="space-y-5">
                        {[
                          ['Presupuesto familiar', 92],
                          ['Decisión de ahorro', 83],
                          ['Préstamo responsable', 100],
                          ['Inversión y riesgo', 79],
                          ['Meta financiera', 88]
                        ].map(([label, value]) => (
                          <ProgressBar
                            key={label}
                            value={value}
                            label={label}
                            color="blue"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <SectionTitle
                        title="Evolución financiera"
                        subtitle="Score promedio durante el periodo"
                        icon={TrendingUp}
                      />

                      <div className="flex h-56 items-end gap-3">
                        {[62, 65, 69, 71, 75, 78, 81, 82].map(
                          (value, index) => (
                            <div
                              key={index}
                              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                            >
                              <div className="flex h-full w-full items-end rounded-t-lg bg-slate-50">
                                <div
                                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400"
                                  style={{
                                    height: `${value}%`
                                  }}
                                />
                              </div>

                              <span className="text-[10px] text-slate-400">
                                S{index + 1}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                          <TrendingUp size={17} />
                          Tendencia positiva
                        </div>

                        <span className="text-sm font-bold text-emerald-800">
                          +20 pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle
                      title="Distribución del grupo"
                      subtitle="Clasificación según score financiero"
                      icon={Users}
                    />

                    <div className="grid gap-4 md:grid-cols-4">
                      <ReportDistribution
                        label="Excelente"
                        value="29%"
                        count="7 estudiantes"
                        color="green"
                      />

                      <ReportDistribution
                        label="Bueno"
                        value="42%"
                        count="10 estudiantes"
                        color="blue"
                      />

                      <ReportDistribution
                        label="En progreso"
                        value="21%"
                        count="5 estudiantes"
                        color="amber"
                      />

                      <ReportDistribution
                        label="Requiere apoyo"
                        value="8%"
                        count="2 estudiantes"
                        color="red"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------
               * ADMINISTRACIÓN
               * ------------------------------------------------------------ */}

              {teacherView === 'manage' && (
                <div className="mx-auto max-w-7xl space-y-6">
                  <SectionTitle
                    title="Administración"
                    subtitle="Gestión simulada de la plataforma"
                    icon={Settings}
                  />

                  <div className="grid gap-5 md:grid-cols-3">
                    <AdminCard
                      icon={Users}
                      title="Usuarios"
                      description="Gestiona estudiantes y profesores."
                      count="26"
                      onClick={() =>
                        showFeedback(
                          'Panel de usuarios simulado.',
                          'success'
                        )
                      }
                    />

                    <AdminCard
                      icon={BookOpen}
                      title="Eventos"
                      description="Administra experiencias financieras."
                      count={teacherEvents.length}
                      onClick={() =>
                        navigateTeacher('events')
                      }
                    />

                    <AdminCard
                      icon={FileText}
                      title="Reportes"
                      description="Consulta métricas y resultados."
                      count="12"
                      onClick={() =>
                        navigateTeacher('reports')
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Usuarios recientes
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Datos completamente simulados.
                        </p>
                      </div>

                      <Badge type="purple">
                        Demo
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {students.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {item.initials}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-semibold">
                              {item.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              Estudiante · Finnova Demo
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setSelectedStudent(item)
                              }
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              Ver
                            </button>

                            <button
                              onClick={() =>
                                showFeedback(
                                  'Edición simulada.',
                                  'success'
                                )
                              }
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() =>
                                showFeedback(
                                  'Cambio de estado simulado.',
                                  'warning'
                                )
                              }
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                            >
                              Desactivar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ======================================================================
       * MODAL EVENTO ESTUDIANTE
       * ==================================================================== */}

      {selectedEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 to-cyan-700 p-6 text-white sm:p-7">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />

              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 hover:bg-white/20"
              >
                <X size={20} />
              </button>

              <div className="relative">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    {selectedEvent.category}
                  </span>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    Dificultad: {selectedEvent.difficulty}
                  </span>
                </div>

                <h2 className="text-2xl font-bold">
                  {selectedEvent.title}
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-blue-100">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                    <CircleDollarSign size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Toma una decisión
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Analiza cada alternativa y observa su posible impacto
                      sobre tus finanzas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedEvent.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      handleDecision(selectedEvent, option)
                    }
                    className="group w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                        {option.id.toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="font-bold text-slate-800">
                            {option.title}
                          </h3>

                          <span
                            className={`
                              text-sm font-bold
                              ${
                                option.balanceImpact > 0
                                  ? 'text-emerald-600'
                                  : option.balanceImpact < 0
                                    ? 'text-red-500'
                                    : 'text-slate-500'
                              }
                            `}
                          >
                            {option.balanceImpact > 0 ? '+' : ''}
                            {formatMoney(option.balanceImpact)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                          {option.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {option.savingsImpact !== 0 && (
                            <Badge
                              type={
                                option.savingsImpact > 0
                                  ? 'green'
                                  : 'amber'
                              }
                            >
                              Ahorros:{' '}
                              {option.savingsImpact > 0
                                ? '+'
                                : ''}
                              {formatMoney(
                                option.savingsImpact
                              )}
                            </Badge>
                          )}

                          {option.debtImpact !== 0 && (
                            <Badge type="red">
                              Deuda: +
                              {formatMoney(
                                option.debtImpact
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={19}
                        className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"
                      />
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="mt-5 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
       * MODAL ESTUDIANTE PROFESOR
       * ==================================================================== */}

      {selectedStudent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="relative bg-gradient-to-br from-indigo-950 to-violet-700 p-6 text-white">
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 hover:bg-white/20"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-bold backdrop-blur">
                  {selectedStudent.initials}
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    {selectedStudent.name}
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    Estudiante · Perfil simulado
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <DetailMetric
                label="Score financiero"
                value={`${selectedStudent.score}/100`}
                icon={ShieldCheck}
                color="blue"
              />

              <DetailMetric
                label="Progreso"
                value={`${selectedStudent.progress}%`}
                icon={TrendingUp}
                color="green"
              />

              <DetailMetric
                label="Ahorros"
                value={formatMoney(selectedStudent.savings)}
                icon={PiggyBank}
                color="green"
              />

              <DetailMetric
                label="Deuda"
                value={formatMoney(selectedStudent.debt)}
                icon={Landmark}
                color="amber"
              />

              <div className="sm:col-span-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-slate-700">
                      Participación
                    </span>

                    <span className="font-bold text-blue-700">
                      {selectedStudent.participation}%
                    </span>
                  </div>

                  <ProgressBar
                    value={selectedStudent.participation}
                    color="blue"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-6">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
       * MODAL CREAR EVENTO
       * ==================================================================== */}

      {showCreateEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Crear evento
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Este evento solo existirá durante esta demo.
                </p>
              </div>

              <button
                onClick={() => setShowCreateEvent(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateEvent}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Título
                </label>

                <input
                  value={newEvent.title}
                  onChange={(event) =>
                    setNewEvent((previous) => ({
                      ...previous,
                      title: event.target.value
                    }))
                  }
                  placeholder="Ej. Planificación de vacaciones"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Descripción
                </label>

                <textarea
                  rows={4}
                  value={newEvent.description}
                  onChange={(event) =>
                    setNewEvent((previous) => ({
                      ...previous,
                      description: event.target.value
                    }))
                  }
                  placeholder="Describe la situación financiera..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Categoría
                  </label>

                  <select
                    value={newEvent.category}
                    onChange={(event) =>
                      setNewEvent((previous) => ({
                        ...previous,
                        category: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option>Ahorro</option>
                    <option>Educación</option>
                    <option>Crédito</option>
                    <option>Ingresos</option>
                    <option>Emprendimiento</option>
                    <option>Inversión</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Dificultad
                  </label>

                  <select
                    value={newEvent.difficulty}
                    onChange={(event) =>
                      setNewEvent((previous) => ({
                        ...previous,
                        difficulty: event.target.value
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option>Fácil</option>
                    <option>Media</option>
                    <option>Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Fecha
                </label>

                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(event) =>
                    setNewEvent((previous) => ({
                      ...previous,
                      date: event.target.value
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <div className="flex gap-3">
                  <Sparkles
                    size={18}
                    className="mt-0.5 shrink-0 text-violet-600"
                  />

                  <p className="text-xs leading-relaxed text-violet-800">
                    Este formulario demuestra la creación de eventos.
                    El evento se agrega únicamente al estado local de
                    Demo.jsx y desaparecerá al recargar.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 hover:bg-blue-800"
                >
                  Crear evento simulado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
 * COMPONENTES AUXILIARES INTERNOS
 * ========================================================================== */

function EventCard({ event, onClick }) {
  const categoryStyles = {
    Ahorro: 'bg-emerald-50 text-emerald-700',
    Emergencia: 'bg-red-50 text-red-700',
    Ingresos: 'bg-blue-50 text-blue-700',
    Educación: 'bg-violet-50 text-violet-700',
    Emprendimiento: 'bg-amber-50 text-amber-700'
  }

  return (
    <div
      onClick={onClick}
      className={`
        group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm
        transition duration-300
        ${
          event.status === 'Disponible'
            ? 'cursor-pointer hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl'
            : 'opacity-80'
        }
      `}
    >
      <div className="mb-5 flex items-start justify-between">
        <span
          className={`
            rounded-full px-3 py-1.5 text-xs font-bold
            ${categoryStyles[event.category] || 'bg-blue-50 text-blue-700'}
          `}
        >
          {event.category}
        </span>

        <Badge
          type={
            event.status === 'Disponible'
              ? 'green'
              : 'slate'
          }
        >
          {event.status}
        </Badge>
      </div>

      <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-blue-800">
        {event.title}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">
        {event.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge type="slate">
          {event.difficulty}
        </Badge>

        <Badge type="purple">
          +{formatMoney(event.reward)} recompensa
        </Badge>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">
          {event.date}
        </span>

        {event.status === 'Disponible' && (
          <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
            Resolver
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  )
}

function HealthIndicator({ color, text }) {
  const styles = {
    green: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-violet-100 text-violet-600'
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
      <span
        className={`h-2.5 w-2.5 rounded-full ${styles[color]}`}
      />
      {text}
    </div>
  )
}

function MiniMetric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function DetailMetric({ label, value, icon: Icon, color }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-violet-50 text-violet-700'
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${styles[color]}`}>
          <Icon size={18} />
        </div>

        <div>
          <p className="text-xs text-slate-400">
            {label}
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function ReportDistribution({
  label,
  value,
  count,
  color
}) {
  const styles = {
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700'
  }

  return (
    <div
      className={`rounded-2xl border p-5 ${styles[color]}`}
    >
      <p className="text-sm font-semibold">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs opacity-70">
        {count}
      </p>
    </div>
  )
}

function AdminCard({
  icon: Icon,
  title,
  description,
  count,
  onClick
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
          <Icon size={22} />
        </div>

        <ChevronRight
          size={19}
          className="text-slate-300 transition group-hover:text-blue-600"
        />
      </div>

      <h3 className="mt-5 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      <p className="mt-5 text-2xl font-bold text-blue-800">
        {count}
      </p>
    </button>
  )
}