/**
 * @fileoverview Módulo de Reportes y Estadísticas para el profesor.
 *
 * Muestra un listado de todos los eventos del sistema organizados como
 * acordeones desplegables. Al expandir cada evento, el profesor puede ver
 * métricas de participación, gráficos de pastel y un historial de actividad.
 *
 * @module TeacherReports
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  BarChart2,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/services/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Configuración visual por tipo de evento ──────────────────────────────────
const EVENT_TYPE_CONFIG = {
  purchase: {
    label: "Oferta de Compra",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  emergency: {
    label: "Emergencia",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
  },
  saving: {
    label: "Ahorro",
    icon: PiggyBank,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
  },
  investment: {
    label: "Inversión",
    icon: TrendingUp,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
  },
  loan: {
    label: "Préstamo",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
  },
};

// ─── Colores para los gráficos de pastel ──────────────────────────────────────
const PIE_COLORS_PARTICIPATION = ["#6366f1", "#e2e8f0"];
const PIE_COLORS_DECISIONS = ["#22c55e", "#a855f7", "#94a3b8"];

// ─── Etiquetas legibles para cada tipo de decisión ────────────────────────────
const DECISION_LABELS = {
  buy: "Compraron",
  loan: "Préstamo",
  reject: "Rechazaron",
};

/**
 * Formatea un Timestamp de Firestore o un Date a string legible.
 * Retorna '—' si el valor es nulo o indefinido.
 *
 * @param {import('firebase/firestore').Timestamp|Date|null|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Badge de estado del evento.
 *
 * @param {{ status: string }} props
 */
function StatusBadge({ status }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <Clock className="w-3 h-3" /> Activo
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" /> Finalizado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
      <Calendar className="w-3 h-3" /> Próximo
    </span>
  );
}

/**
 * Tarjeta de métrica individual con ícono, valor y etiqueta.
 *
 * @param {{ icon: React.ComponentType, value: string|number, label: string, color: string }} props
 */
function MetricCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-white border rounded-xl p-3 flex flex-col items-center text-center shadow-sm">
      <Icon className={`w-5 h-5 mb-1 ${color}`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground leading-tight mt-0.5">
        {label}
      </div>
    </div>
  );
}

/**
 * Panel expandido con estadísticas completas de un evento.
 *
 * @param {{ event: Object, decisions: Array, totalStudents: number }} props
 */
function EventStats({ event, decisions, totalStudents }) {
  // ── Cálculos de participación ────────────────────────────────────────────
  const participated = decisions.length;
  const notParticipated = Math.max(totalStudents - participated, 0);
  const pctParticipated =
    totalStudents > 0 ? Math.round((participated / totalStudents) * 100) : 0;

  // ── Datos para gráfico 1: participación general ──────────────────────────
  const participationData = [
    { name: `Participaron (${pctParticipated}%)`, value: participated },
    {
      name: `No participaron (${100 - pctParticipated}%)`,
      value: notParticipated,
    },
  ];

  // ── Datos para gráfico 2: opciones seleccionadas (decisiones) ───────────
  const decisionCounts = { buy: 0, loan: 0, reject: 0 };
  decisions.forEach((d) => {
    if (decisionCounts[d.decision] !== undefined) decisionCounts[d.decision]++;
  });

  const decisionData = Object.entries(decisionCounts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: DECISION_LABELS[key] ?? key,
      value: count,
      pct: participated > 0 ? Math.round((count / participated) * 100) : 0,
    }));

  return (
    <div className="mt-4 space-y-5 border-t pt-4">
      {/* ── Tarjetas de resumen general ───────────────────────────────────── */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Resumen General
        </h4>

        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            icon={Users}
            value={participated}
            label="Participaron"
            color="text-indigo-500"
          />
          <MetricCard
            icon={Users}
            value={notParticipated}
            label="No participaron"
            color="text-slate-400"
          />
          <MetricCard
            icon={BarChart2}
            value={`${pctParticipated}%`}
            label="Participación"
            color="text-emerald-500"
          />
        </div>
      </div>

      {/* ── Gráfico 1: participación general ──────────────────────────────── */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Participación General
        </h4>
        <div className="bg-white border rounded-xl p-3 shadow-sm">
          {participated === 0 && notParticipated === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">
              Sin datos de participación aún
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={participationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ value }) => value}
                  labelLine={false}
                >
                  {participationData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS_PARTICIPATION[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Gráfico 2: opciones seleccionadas ─────────────────────────────── */}
      {decisionData.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Preferencias / Opciones Seleccionadas
          </h4>
          <div className="bg-white border rounded-xl p-3 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ value }) => value}
                  labelLine={false}
                >
                  {decisionData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        PIE_COLORS_DECISIONS[i % PIE_COLORS_DECISIONS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>

            {/* Tabla complementaria de opciones */}
            <div className="mt-3 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                      Opción
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                      Votos
                    </th>
                    <th className="text-center px-3 py-2 font-semibold text-muted-foreground">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {decisionData.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2 text-center">{row.value}</td>
                      <td className="px-3 py-2 text-center">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial de actividad del evento ─────────────────────────────── */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Historial de Actividad
        </h4>
        <div className="bg-white border rounded-xl p-3 shadow-sm space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Fecha de creación y apertura
            </span>
            <span className="font-medium">
              {formatDate(event.startDate ?? event.createdAt)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Fecha de cierre</span>
            <span className="font-medium">{formatDate(event.endDate)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Respuestas recibidas</span>
            <span className="font-medium">{participated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fila de acordeón para un evento individual.
 *
 * Muestra el resumen siempre visible y expande el panel de estadísticas
 * al hacer clic. Recibe las decisiones y el total de estudiantes ya
 * calculados por el componente padre.
 *
 * @param {{ event: Object, decisions: Array, totalStudents: number }} props
 */
function EventAccordion({ event, decisions, totalStudents }) {
  const [open, setOpen] = useState(false);

  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.purchase;
  const Icon = config.icon;
  const participantCount = Array.isArray(event.participants)
    ? event.participants.length
    : 0;

  return (
    <Card
      className={`rounded-2xl border-2 overflow-hidden bg-white ${config.borderColor}`}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full text-left p-4 flex items-start gap-3 bg-white hover:bg-indigo-50/60 transition-colors"
      >
        {/* Ícono del tipo de evento */}
        <div className={`${config.bgColor} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Nombre y badge de estado */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
            <StatusBadge status={event.status} />
          </div>

          {/* Título del evento */}
          <h3 className="font-semibold text-sm leading-tight truncate mb-1">
            {event.title}
          </h3>

          {/* Fecha de apertura y cierre del evento */}
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1 flex-wrap">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(event.startDate ?? event.createdAt)}</span>
            <span className="text-slate-300">→</span>
            <span>{formatDate(event.endDate)}</span>
          </p>

          {/* Contadores de estudiantes */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalStudents} invitados
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-indigo-500" />
              {participantCount} participaron
            </span>
          </div>
        </div>

        {/* Ícono de expansión */}
        <div className="flex-shrink-0 mt-1">
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* ── Panel expandido ─────────────────────────────────────────────────── */}
      {open && (
        <div className="px-4 pb-4">
          <EventStats
            event={event}
            decisions={decisions}
            totalStudents={totalStudents}
          />
        </div>
      )}
    </Card>
  );
}

/**
 * Página principal del módulo de reportes del profesor.
 *
 * Carga todos los eventos y las decisiones de los estudiantes desde
 * Firestore al montar el componente y los presenta como acordeones.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function TeacherReports() {
  const navigate = useNavigate();

  /** Lista de eventos cargados desde Firestore. */
  const [events, setEvents] = useState([]);

  /**
   * Mapa de decisiones agrupadas por eventId.
   * Estructura: { [eventId]: Array<decision> }
   */
  const [decisionsByEvent, setDecisionsByEvent] = useState({});

  /** Total de estudiantes registrados en el sistema. */
  const [totalStudents, setTotalStudents] = useState(0);

  /** Indica si la carga inicial está en progreso. */
  const [loading, setLoading] = useState(true);

  /**
   * Efecto: carga eventos, estudiantes y decisiones al montar el componente.
   *
   * Flujo:
   * 1. Lee todos los eventos de la colección `events` y los ordena por
   *    fecha de creación descendente (más reciente primero).
   * 2. Lee todos los estudiantes de `students` para obtener el total y sus decisiones.
   * 3. Agrupa las decisiones por eventId para pasarlas a cada acordeón.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Paso 1: cargar eventos
        const eventsSnap = await getDocs(collection(db, "events"));
        const eventsData = eventsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Ordenar por fecha de creación descendente: el evento más reciente primero
        const sortedEvents = eventsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setEvents(sortedEvents);

        // Paso 2: cargar estudiantes y agrupar decisiones
        const studentsSnap = await getDocs(collection(db, "students"));
        setTotalStudents(studentsSnap.size);

        // Agrupar decisiones por eventId recorriendo todos los estudiantes
        const grouped = {};
        studentsSnap.forEach((studentDoc) => {
          const data = studentDoc.data();
          (data.decisions || []).forEach((decision) => {
            if (!grouped[decision.eventId]) grouped[decision.eventId] = [];
            grouped[decision.eventId].push({
              ...decision,
              studentId: studentDoc.id,
              studentName: data.name || studentDoc.id,
            });
          });
        });
        setDecisionsByEvent(grouped);
      } catch (err) {
        console.error("Error al cargar reportes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* ── Cabecera ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-3 pb-3">
        {" "}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Reportes</h1>
            <p className="text-blue-200 text-sm">
              Análisis de participación estudiantil
            </p>
          </div>
        </div>
      </div>

      {/* ── Contenido principal ────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-3">
        {/*
          SKELETON DE CARGA DE REPORTES
          Se muestra mientras Firestore obtiene los eventos y decisiones.
          Replica la estructura de una tarjeta de reporte real.
        */}
        {loading &&
          [0, 1, 2].map((i) => (
            <Card key={i} className="p-5 rounded-2xl animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-6 w-28 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="bg-gray-100 rounded-xl p-3 space-y-1">
                    <div className="h-3 w-12 bg-gray-200 rounded mx-auto" />
                    <div className="h-5 w-8 bg-gray-200 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </Card>
          ))}

        {/* Estado vacío */}
        {!loading && events.length === 0 && (
          <Card className="p-8 rounded-2xl text-center border-dashed">
            <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay eventos registrados aún
            </p>
          </Card>
        )}

        {/* Contador de eventos */}
        {!loading && events.length > 0 && (
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
            Eventos ({events.length})
          </p>
        )}

        {/* Lista de acordeones por evento */}
        {!loading &&
          events.map((event) => (
            <EventAccordion
              key={event.id}
              event={event}
              decisions={decisionsByEvent[event.id] || []}
              totalStudents={totalStudents}
            />
          ))}
      </div>
    </div>
  );
}
