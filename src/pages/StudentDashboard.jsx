/**
 * @fileoverview Dashboard principal del estudiante.
 *
 * Muestra el balance actual, eventos financieros activos publicados por el profesor,
 * accesos rápidos a ahorros y préstamos, y notificaciones no leídas.
 * Se suscribe en tiempo real a Firestore para mantener los datos actualizados.
 *
 * @module StudentDashboard
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  ArrowLeft,
  LogOut,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  FileText,
  ChevronRight,
  CheckCircle2,
  History,
  Bell,
  CreditCard,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logout } from "@/services/authentication";
import { subscribeToNotifications } from "@/services/notifications";
import { db, auth } from "@/services/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

/**
 * Configuración visual y de metadatos para cada tipo de evento financiero.
 *
 * Cada clave corresponde a un tipo de evento que puede publicar el profesor.
 * Define la etiqueta legible, el ícono de Lucide, y las clases de color de Tailwind
 * utilizadas para renderizar la tarjeta del evento en el dashboard.
 *
 * @constant {Object.<string, {label: string, icon: React.ComponentType, color: string, bgColor: string, borderColor: string}>}
 *
 * @example
 * // Acceder a la configuración de un tipo de evento
 * const config = EVENT_TYPE_CONFIG["emergency"];
 * // config.label => "Emergencia"
 */
const EVENT_TYPE_CONFIG = {
  /** Evento de oferta de compra: representa una decisión de gasto del estudiante. */
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
 * Componente principal del dashboard del estudiante.
 *
 * Responsabilidades:
 * - Suscribirse en tiempo real al documento del estudiante en Firestore para obtener
 *   su balance y el historial de decisiones tomadas.
 * - Suscribirse a la colección global de eventos para mostrar los que están activos.
 * - Suscribirse al servicio de notificaciones para mostrar el contador de no leídas.
 * - Renderizar la cabecera de bienvenida, la tarjeta de balance, los accesos rápidos
 *   y la lista de eventos activos con su estado de respuesta.
 *
 * @component
 * @returns {JSX.Element} La interfaz completa del dashboard del estudiante.
 *
 * @example
 * // Uso dentro del enrutador de la aplicación
 * <Route path="/student/dashboard" element={<StudentDashboard />} />
 */
export default function StudentDashboard() {
  const navigate = useNavigate();

  /**
   * Nombre del estudiante autenticado, obtenido desde el contexto de autenticación.
   * loading: true mientras AuthContext espera la primera respuesta de Firestore.
   */
  const { name, loading } = useAuth();

  /** Usuario activo de Firebase Authentication. */
  const user = auth.currentUser;

  /**
   * Indica si las suscripciones a Firestore (balance y eventos) ya respondieron
   * al menos una vez. Mientras sea false se muestra el skeleton para evitar
   * que el usuario vea balance en 0 o la lista de eventos vacía prematuramente.
   * @type {[boolean, Function]}
   */
  const [loadingData, setLoadingData] = useState(true);

  /**
   * Balance monetario actual del estudiante en colones costarricenses (₡).
   * Se inicializa en 0 y se actualiza desde Firestore en tiempo real.
   * @type {[number, Function]}
   */
  const [balance, setBalance] = useState(0);

  /**
   * Historial de decisiones financieras que el estudiante ya ha respondido.
   * Cada elemento contiene al menos `eventId` para identificar el evento respondido.
   * @type {[Array<{eventId: string}>, Function]}
   */
  const [decisions, setDecisions] = useState([]);

  /**
   * Lista de eventos financieros activos publicados por el profesor.
   * Se filtra desde Firestore para incluir únicamente los que tienen `status === "active"`.
   * @type {[Array<{id: string, type: string, title: string, description: string, amount: number, status: string}>, Function]}
   */
  const [events, setEvents] = useState([]);

  /**
   * Cantidad de notificaciones no leídas del estudiante.
   * Se usa para mostrar el badge numérico sobre el ícono de la campana.
   * @type {[number, Function]}
   */
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Efecto: suscripción en tiempo real al documento del estudiante en Firestore.
   *
   * Lee el balance y las decisiones del estudiante desde la colección `students`.
   * Si el documento no contiene `balance`, se usa 50000 como valor por defecto.
   * La suscripción se cancela automáticamente al desmontar el componente.
   *
   * @listens {onSnapshot} students/{user.uid}
   */
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "students", user.uid);

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBalance(data.balance ?? 100000);
        setDecisions(data.decisions ?? []);
      }
      // Primera respuesta recibida: ocultar skeleton del dashboard
      setLoadingData(false);
    });

    // Cancelar suscripción al desmontar para evitar memory leaks
    return () => unsubscribe();
  }, [user]);

  /**
   * Efecto: suscripción en tiempo real a la colección global de eventos en Firestore.
   *
   * Obtiene todos los documentos de la colección `events`, los ordena por
   * `createdAt` de forma descendente (más reciente primero) y filtra únicamente
   * aquellos cuyo campo `status` sea `"active"`.
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

      setEvents(sorted.filter((e) => e.status === "active"));
    });

    // Cancelar suscripción al desmontar para evitar memory leaks
    return () => unsubscribe();
  }, []);

  /**
   * Efecto: suscripción al servicio de notificaciones del estudiante.
   *
   * Utiliza `subscribeToNotifications` para recibir actualizaciones en tiempo real
   * y calcula cuántas notificaciones no han sido leídas aún.
   * La suscripción se cancela automáticamente al desmontar el componente.
   *
   * @listens {subscribeToNotifications} notifications/{user.uid}
   */
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.uid, (notifications) => {
      setUnreadCount(notifications.filter((n) => !n.read).length);
    });

    // Cancelar suscripción al desmontar para evitar memory leaks
    return () => unsubscribe();
  }, [user]);

  /**
   * Maneja el cierre de sesión del estudiante.
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
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  /**
   * Conjunto de IDs de eventos que el estudiante ya ha respondido.
   *
   * Se deriva del estado `decisions` y se usa para marcar visualmente
   * los eventos como "Respondido" y deshabilitar su navegación.
   *
   * @type {Set<string>}
   */
  const answeredEventIds = new Set(decisions.map((d) => d.eventId));

  /**
   * Skeleton de carga del dashboard.
   *
   * Se muestra mientras AuthContext resuelve el perfil (loading)
   * o mientras las suscripciones de Firestore no han respondido aún (loadingData).
   * Evita que el usuario vea el balance en ₡0 o la lista de eventos vacía
   * durante el primer render tras recargar la página.
   */
  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-white pb-6">

        {/* HEADER — misma altura que el header real */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-15">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {/* Skeleton del saludo */}
          <div className="h-7 w-32 bg-white/30 rounded-full mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-white/20 rounded-full animate-pulse" />
        </div>

        <div className="px-4 mt-4 mb-4">
          {/* SKELETON: tarjeta de balance */}
          <Card className="bg-white shadow-xl p-6 rounded-2xl border-0 animate-pulse">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-200 rounded" />
            </div>
            {/* Barra del monto */}
            <div className="h-10 w-48 bg-gray-200 rounded-full mb-4" />
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          </Card>
        </div>

        {/* SKELETON: botones de ahorros y préstamos */}
        <div className="px-4 grid grid-cols-2 gap-3 mb-6">
          <div className="h-11 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-11 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* SKELETON: lista de eventos */}
        <div className="px-4 space-y-3">
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 rounded-2xl border-2 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-6">

      {/* ── Cabecera del dashboard ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-7 ">

        {/* Barra de navegación superior: botón atrás + acciones del usuario */}
        <div className="flex items-center justify-between mb-4">

          {/* Botón para regresar a la pantalla de inicio */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Grupo de acciones del usuario: notificaciones, perfil y cerrar sesión */}
          <div className="flex items-center gap-2">

            {/* Botón de notificaciones con badge de conteo no leídas */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/student/notifications')}
              className="text-white hover:bg-white/20 relative"
            >
              <Bell className="w-5 h-5" />
              {/* Badge visible solo cuando hay notificaciones no leídas */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {/* Muestra "9+" si el conteo supera 9 para evitar desbordamiento visual */}
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Botón de acceso al perfil del estudiante */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
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

        {/* Mensaje de bienvenida personalizado con el nombre del estudiante */}
        <h1 className="text-2xl mb-1">¡Hola! 👋</h1>
        {/* Muestra el nombre del estudiante o "..." mientras se carga */}
        <p className="text-blue-100 font-medium">{name ?? '...'}</p>
        <p className="text-blue-100 text-sm mt-1">Aprende finanzas en tiempo real</p>
      </div>

      {/* ── Tarjeta de balance ─────────────────────────────────────────────── */}
      {/*
        Se posiciona con margen negativo (-mt-16) para superponerse sobre
        la cabecera degradada y crear efecto de tarjeta flotante.
      */}
      <div className="px-4 mt-4 mb-4">
        <Card className="bg-white shadow-xl p-6 rounded-2xl border-0">

          {/* Encabezado de la tarjeta: etiqueta y ícono de billetera */}
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground text-sm">Tu Balance</span>
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>

          {/*Monto del balance formateado con separadores de miles.
            El color cambia según el porcentaje gastado del ingreso inicial:
            - Verde/negro: menos del 60% gastado (balance > ₡40,000)
            - Amarillo: entre 60% y 80% gastado (balance entre ₡20,000 y ₡40,000)
            - Rojo: más del 80% gastado (balance < ₡20,000)*/}

          <div className={`text-4xl font-bold mb-2 ${
            balance < 20000
            ? 'text-red-600'
            : balance < 40000
              ? 'text-yellow-500'
              : 'text-foreground'
          }`}>
            ₡{balance.toLocaleString()}
          </div>

          {/* Pie de tarjeta: estado del sistema y accesos rápidos de historial */}
          <div className="flex items-center justify-between">

            {/* Indicador de que el sistema de simulación está activo */}
            <div className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Sistema activo
            </div>

            <div className="flex items-center gap-3">
              {/* Acceso directo al historial de transacciones del estudiante */}
              <button
                onClick={() => navigate("/student/historial")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Ver historial
              </button>

              {/* Acceso directo al estado financiero detallado del estudiante */}
              <button
                onClick={() => navigate("/student/financial-status")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Estado financiero
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Accesos rápidos: Ahorros y Préstamos ──────────────────────────── */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">

        {/* Botón de acceso a la sección de ahorros del estudiante */}
        <Button
          variant="outline"
          className="gap-2 border-green-200 text-green-700 hover:bg-green-50 rounded-xl h-11"
          onClick={() => navigate("/student/savings")}
        >
          <PiggyBank className="w-4 h-4" />
          Mis Ahorros
        </Button>

        {/* Botón de acceso a la sección de préstamos del estudiante */}
        <Button
          variant="outline"
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl h-11"
          onClick={() => navigate("/student/loans")}
        >
          <CreditCard className="w-4 h-4" />
          Mis Préstamos
        </Button>
      </div>

      {/* ── Lista de eventos activos ───────────────────────────────────────── */}
      <div className="px-4 space-y-3">

        {/* Encabezado de sección con contador de eventos activos */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Eventos activos
          </h2>
          <span className="text-xs text-muted-foreground">{events.length}</span>
        </div>

        {/* Estado vacío: se muestra cuando no hay eventos activos publicados */}
        {events.length === 0 && (
          <Card className="p-8 rounded-2xl text-center border-dashed">
            <PiggyBank className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay eventos activos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tu profesor publicará eventos pronto
            </p>
          </Card>
        )}

        {/*
          Renderizado de la lista de eventos activos.
          Cada tarjeta muestra el tipo, título, descripción y monto del evento.
          Si el estudiante ya respondió el evento, se marca visualmente como
          "Respondido" y se deshabilita la navegación hacia él.
        */}
        {events.map((event) => {
          /**
           * Configuración visual del evento según su tipo.
           * Si el tipo no está en EVENT_TYPE_CONFIG, usa "purchase" como fallback.
           */
          const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.purchase;

          /** Componente de ícono correspondiente al tipo de evento. */
          const Icon = config.icon;

          /** Indica si el estudiante ya tomó una decisión sobre este evento. */
          const alreadyAnswered = answeredEventIds.has(event.id);

          return (
            <Card
              key={event.id}
              onClick={() =>
                // Solo navegar al detalle del evento si aún no fue respondido
                !alreadyAnswered && navigate(`/student/event/${event.id}`)
              }
              className={`p-4 rounded-2xl border-2 transition-all ${config.borderColor} ${
                alreadyAnswered
                  ? "opacity-60 cursor-default"   // Visual deshabilitado si ya fue respondido
                  : "cursor-pointer hover:shadow-md active:scale-[0.99]" // Interactivo si está pendiente
              }`}
            >
              <div className="flex items-start gap-3">

                {/* Ícono del tipo de evento con fondo de color correspondiente */}
                <div className={`${config.bgColor} p-2.5 rounded-xl flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">

                  {/* Fila superior: etiqueta del tipo de evento y badge "Respondido" */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>

                    {/* Badge "Respondido": visible solo si el estudiante ya contestó */}
                    {alreadyAnswered && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Respondido
                      </span>
                    )}
                  </div>

                  {/* Título del evento, truncado si excede el ancho disponible */}
                  <h3 className="font-semibold text-sm leading-tight truncate mb-1">
                    {event.title}
                  </h3>

                  {/* Descripción del evento, limitada a 2 líneas */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {event.description}
                  </p>

                  {/* Fila inferior: monto del evento y flecha de navegación */}
                  <div className="flex items-center justify-between">

                    {/* Monto formateado; muestra "—" si no está definido */}
                    <span className="font-bold text-sm">
                      ₡{event.amount?.toLocaleString() ?? "—"}
                    </span>

                    {/* Flecha indicadora de navegación, oculta si ya fue respondido */}
                    {!alreadyAnswered && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}