/**
 * @fileoverview Dashboard principal del profesor.
 *
 * Permite al profesor visualizar un resumen estadístico de sus eventos financieros,
 * crear nuevos eventos y navegar al detalle de cada uno.
 * Se suscribe en tiempo real a la colección `events` de Firestore para mantener
 * los datos siempre actualizados.
 *
 * @module TeacherDashboard
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Plus,
  ArrowLeft,
  LogOut,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  FileText,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Clock,
  User,
  BarChart2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/services/firebase";
import { logout } from "@/services/authentication";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot } from "firebase/firestore";

/**
 * Configuración visual y de metadatos para cada tipo de evento financiero.
 *
 * Cada clave corresponde a un tipo de evento que el profesor puede crear.
 * Define la etiqueta legible, el ícono de Lucide y las clases de color de Tailwind
 * utilizadas para renderizar la tarjeta del evento en el dashboard.
 *
 * @constant {Object.<string, {label: string, icon: React.ComponentType, color: string, bgColor: string, borderColor: string}>}
 *
 * @example
 * const config = EVENT_TYPE_CONFIG["loan"];
 * // config.label => "Préstamo"
 */
const EVENT_TYPE_CONFIG = {
  /** Evento de oferta de compra: decisión de gasto para el estudiante. */
  purchase: {
    label: "Oferta de Compra",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  /** Evento de emergencia: situación imprevista que requiere una decisión financiera urgente. */
  emergency: {
    label: "Emergencia",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
  },
  /** Evento de ahorro: oportunidad para apartar dinero del estudiante. */
  saving: {
    label: "Ahorro",
    icon: PiggyBank,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
  },
  /** Evento de inversión: el estudiante invierte y recibe el monto más intereses al vencer. */
  investment: {
    label: "Inversión",
    icon: TrendingUp,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
  },
  /** Evento de préstamo: solicitud o gestión de crédito dentro de la simulación. */
  loan: {
    label: "Préstamo",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
  },
};

/**
 * Tarjeta de resumen de un evento financiero para la vista del profesor.
 *
 * Muestra el tipo, estado (activo/finalizado), título, descripción, monto
 * y cantidad de estudiantes que han participado en el evento.
 * Es completamente controlada por el padre: no gestiona estado propio.
 *
 * @component
 * @param {Object}   props          - Props del componente.
 * @param {Object}   props.event    - Datos del evento a renderizar.
 * @param {string}   props.event.id          - Identificador único del evento.
 * @param {string}   props.event.type        - Tipo de evento (purchase | emergency | saving | loan).
 * @param {string}   props.event.status      - Estado del evento ("active" | "finished").
 * @param {string}   props.event.title       - Título descriptivo del evento.
 * @param {string}   props.event.description - Descripción detallada del evento.
 * @param {number}   [props.event.amount]    - Monto monetario asociado al evento en colones (₡).
 * @param {Array}    [props.event.participants] - Lista de estudiantes que respondieron el evento.
 * @param {Function} props.onClick  - Callback ejecutado al hacer clic sobre la tarjeta.
 * @returns {JSX.Element} Tarjeta interactiva con el resumen del evento.
 *
 * @example
 * <EventCard
 *   event={eventData}
 *   onClick={() => navigate(`/teacher/event/${eventData.id}`)}
 * />
 */
function EventCard({ event, onClick }) {
  /**
   * Configuración visual del evento según su tipo.
   * Si el tipo no está definido en EVENT_TYPE_CONFIG, usa "purchase" como fallback.
   */
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.purchase;

  /** Componente de ícono correspondiente al tipo de evento. */
  const Icon = config.icon;

  /** Indica si el evento está actualmente activo. */
  const isActive = event.status === "active";

  /**
   * Cantidad de estudiantes que han participado en el evento.
   * Retorna 0 si `participants` no es un array válido.
   */
  const participantCount = Array.isArray(event.participants)
    ? event.participants.length
    : 0;

  return (
    <Card
      onClick={onClick}
      className={`p-4 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all border ${config.borderColor}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>

          <div>
            <p className="font-semibold">{event.title}</p>
            <p className="text-sm text-muted-foreground">{config.label}</p>
          </div>
        </div>

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {isActive ? "Activo" : "Finalizado"}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mt-3">{event.description}</p>

      <div className="flex justify-between items-center mt-4">
        <span className="font-semibold">
          ₡{event.amount?.toLocaleString() || 0}
        </span>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {participantCount}
        </div>
      </div>
    </Card>
  );
}

/**
 * Componente principal del dashboard del profesor.
 *
 * Responsabilidades:
 * - Suscribirse en tiempo real a la colección `events` de Firestore para obtener
 *   todos los eventos creados por el profesor.
 * - Calcular estadísticas agregadas: total de participaciones, eventos activos
 *   y eventos finalizados.
 * - Renderizar la cabecera de bienvenida, las tarjetas de estadísticas, el botón
 *   de creación de eventos y la lista completa de eventos.
 *
 * @component
 * @returns {JSX.Element} La interfaz completa del dashboard del profesor.
 *
 * @example
 * // Uso dentro del enrutador de la aplicación
 * <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
 */
export default function TeacherDashboard() {
  const navigate = useNavigate();

  /** Nombre del profesor autenticado, obtenido desde el contexto de autenticación. */
  const { name, loading } = useAuth();

  /**
   * Lista de todos los eventos financieros creados, sin filtrar por estado.
   * Se actualiza en tiempo real desde Firestore.
   * @type {[Array<{id: string, type: string, status: string, title: string, description: string, amount: number, participants: Array}>, Function]}
   */
  const [events, setEvents] = useState([]);

  /**
   * Indica si la suscripción a eventos aún no ha respondido por primera vez.
   * Mientras sea true se muestra el skeleton para evitar parpadeos.
   * @type {[boolean, Function]}
   */
  const [loadingEvents, setLoadingEvents] = useState(true);

  /**
   * Efecto: suscripción en tiempo real a la colección `events` de Firestore.
   *
   * Obtiene todos los documentos de la colección y los almacena en el estado,
   * incluyendo tanto los eventos activos como los finalizados. Los eventos se
   * ordenan por `createdAt` de forma descendente, mostrando primero el más reciente.
   * La suscripción se cancela automáticamente al desmontar el componente.
   *
   * @listens {onSnapshot} events
   */
  useEffect(() => {
    const ref = collection(db, "events");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Ordenar por fecha de creación descendente: el evento más reciente primero
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setEvents(sorted);
      // Primera respuesta recibida: ocultar skeleton de la lista de eventos
      setLoadingEvents(false);
    });

    // Cancelar suscripción al desmontar para evitar memory leaks
    return () => unsubscribe();
  }, []);

  /**
   * Total acumulado de participaciones de estudiantes en todos los eventos.
   * Suma la longitud del array `participants` de cada evento.
   * @type {number}
   */
  const totalParticipants = events.reduce((acc, e) => {
    return acc + (Array.isArray(e.participants) ? e.participants.length : 0);
  }, 0);

  /**
   * Cantidad de eventos con estado `"active"`.
   * @type {number}
   */
  const activeEvents = events.filter((e) => e.status === "active").length;

  /**
   * Cantidad de eventos con estado `"finished"`.
   * @type {number}
   */
  const finishedEvents = events.filter((e) => e.status === "finished").length;

  /**
   * Maneja el cierre de sesión del profesor.
   *
   * Llama al servicio de autenticación para cerrar la sesión activa y redirige
   * al usuario a la pantalla de login, reemplazando la entrada en el historial
   * de navegación para impedir volver atrás con el botón del navegador.
   *
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  /**
   * Skeleton de carga del dashboard del profesor.
   *
   * Se muestra mientras AuthContext resuelve el perfil (loading)
   * o mientras onSnapshot de eventos no ha respondido aún (loadingEvents).
   * Reemplaza la pantalla completa para evitar parpadeos o valores vacíos.
   */
  if (loading || loadingEvents) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 pb-6">

        {/* HEADER — misma altura que el header real */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-20">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-8 w-16 bg-white/20 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Skeleton del título y bienvenida */}
          <div className="h-7 w-48 bg-white/30 rounded-full mb-2 animate-pulse" />
          <div className="h-4 w-36 bg-white/20 rounded-full animate-pulse" />
        </div>

        {/* SKELETON: botones de reportes y gestión */}
        <div className="px-4 mb-3 mt-4 flex gap-3">
          <div className="flex-1 h-11 bg-gray-200 rounded-xl animate-pulse" />
          <div className="flex-1 h-11 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* SKELETON: tarjetas de estadísticas */}
        <div className="px-4 mt-6 mb-6">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-3 rounded-2xl shadow-sm animate-pulse">
                <div className="w-4 h-4 bg-gray-200 rounded mb-2" />
                <div className="h-6 w-8 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </Card>
            ))}
          </div>
        </div>

        {/* SKELETON: botón crear evento */}
        <div className="px-4 mb-6">
          <div className="h-11 w-full bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* SKELETON: lista de eventos */}
        <div className="px-4 space-y-3">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 rounded-2xl shadow-sm animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-5 w-24 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-200 rounded mb-1" />
              <div className="h-3 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            </Card>
          ))}
        </div>

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 pb-6">
      {/* ── Cabecera del dashboard ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900  text-white p-4 pb-20">
        {/* Barra de navegación superior: botón atrás + acciones del usuario */}
        <div className="flex justify-between items-center mb-4">
          {/* Botón para regresar a la pantalla de inicio */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Grupo de acciones del usuario: perfil y cerrar sesión */}
          <div className="flex items-center gap-2">
            {/* Botón de acceso al perfil del profesor */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="text-white hover:bg-white/20 gap-1.5"
            >
              <User className="w-4 h-4" />
              Mi Perfil
            </Button>

            {/* Botón de cierre de sesión */}
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>
        </div>

        {/* Título del panel y mensaje de bienvenida personalizado */}
        <h1 className="text-2xl mb-1">Panel del Profesor</h1>
        {/* Muestra el nombre del profesor o "..." mientras se carga */}
        <p className="text-indigo-100 font-medium">
          Bienvenido, {name ?? "..."}
        </p>
      </div>
      {/* ── Botón de reportes ───────────────────────────────────────── */}

      <div className="px-4 mb-3 mt-4 flex gap-3">
        <Button
          onClick={() => navigate("/teacher/reports")}
          className="flex-1 gap-2 bg-gradient-to-r  bg-blue-900 text-white rounded-xl h-11"
        >
          <BarChart2 className="w-4 h-4" />
          Visualizar Reportes
        </Button>

      {/* ── Botón de gestión usuarios y eventos ───────────────────────────────────────── */}

        <Button
          onClick={() => navigate("/teacher/manage")}
          className="flex-1 gap-2 bg-gradient-to-r  bg-blue-900 text-white rounded-xl h-11"
        >
          <Users className="w-4 h-4" />
          Gestionar Usuarios y Eventos
        </Button>
      </div>


      {/* ── Tarjetas de estadísticas ───────────────────────────────────────── */}

      <div className="px-4 mt-6 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {/* Estadística: total de participaciones acumuladas en todos los eventos */}
          <Card className="p-3 rounded-2xl shadow-sm">
            <Users className="w-4 h-4 text-blue-600 mb-1" />
            <div className="text-xl font-bold">{totalParticipants}</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Participaciones
            </div>
          </Card>

          {/* Estadística: cantidad de eventos actualmente activos */}
          <Card className="p-3 rounded-2xl shadow-sm">
            <Clock className="w-4 h-4 text-emerald-600 mb-1" />
            <div className="text-xl font-bold">{activeEvents}</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Activos
            </div>
          </Card>

          {/* Estadística: cantidad de eventos que ya han finalizado */}
          <Card className="p-3 rounded-2xl shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-gray-500 mb-1" />
            <div className="text-xl font-bold">{finishedEvents}</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Finalizados
            </div>
          </Card>
        </div>
      </div>

      {/* ── Botón de creación de evento ────────────────────────────────────── */}
      <div className="px-4 mb-6">
        <Button
          onClick={() => navigate("/teacher/create-event")}
          className="w-full gap-2 bg-gradient-to-r bg-blue-900 text-white rounded-xl h-11"
        >
          <Plus className="w-5 h-5" />
          Crear Evento
        </Button>
      </div>

      {/* ── Lista de eventos ───────────────────────────────────────────────── */}
      <div className="px-4 space-y-3">
        {/* Encabezado de sección con contador total de eventos */}
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Eventos ({events.length})
        </h2>

        {/* Estado vacío: se muestra cuando el profesor aún no ha creado ningún evento */}
        {events.length === 0 && (
          <Card className="p-8 rounded-2xl text-center border-dashed">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay eventos aún</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea tu primer evento financiero
            </p>
          </Card>
        )}

        {/*
          Renderizado de la lista completa de eventos (activos y finalizados).
          Cada evento se delega al componente EventCard, que maneja
          su propia presentación visual según tipo y estado.
        */}
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => navigate(`/teacher/event/${event.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
