/**
 * @fileoverview Página de gestión de usuarios y eventos para el docente.
 * Muestra dos listas desplegables independientes (acordeón: solo una
 * abierta a la vez) con todos los estudiantes y todos los eventos
 * registrados en la base de datos, permitiendo eliminarlos de forma
 * individual o masiva.
 *
 * @module ManageUsersEvents
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAllStudents, deleteStudent, deleteAllStudents } from "@/services/users";
import { getEvents, deleteEvent, deleteAllEvents } from "@/services/events";

export default function ManageUsersEvents() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  /** Controla cuál de las dos listas está desplegada: 'students' | 'events' | null */
  const [openSection, setOpenSection] = useState(null);

  /**
   * Controla qué confirmación de "borrar todo" se está mostrando: 'students' | 'events' | null.
   * Al activarse muestra el modal de confirmación de borrado masivo.
   */
  const [confirmTarget, setConfirmTarget] = useState(null);

  /**
   * Ítem individual pendiente de eliminar.
   * Almacena { type: 'student' | 'event', id, name } hasta que el profesor confirme.
   * Al activarse muestra el modal de confirmación individual.
   */
  const [confirmItem, setConfirmItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [studentsData, eventsData] = await Promise.all([
      getAllStudents(),
      getEvents(),
    ]);
    setStudents(studentsData);
    setEvents(eventsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Acordeón: al abrir una sección, se cierra la otra automáticamente
  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const handleDeleteStudent = async (uid) => {
    await deleteStudent(uid);
    setStudents((prev) => prev.filter((s) => s.uid !== uid));
  };

  const handleDeleteEvent = async (eventId) => {
    await deleteEvent(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  /**
   * Ejecuta la eliminación del ítem individual confirmado en el modal.
   * Llama al servicio correspondiente según el tipo y actualiza el estado local.
   */
  const handleConfirmDeleteItem = async () => {
    if (!confirmItem) return;
    if (confirmItem.type === 'student') {
      await handleDeleteStudent(confirmItem.id);
    } else {
      await handleDeleteEvent(confirmItem.id);
    }
    setConfirmItem(null);
  };

  const handleConfirmDeleteAll = async () => {
    if (confirmTarget === "students") {
      await deleteAllStudents();
      setStudents([]);
    } else if (confirmTarget === "events") {
      await deleteAllEvents();
      setEvents([]);
    }
    setConfirmTarget(null);
  };

  /**
   * Skeleton de carga de gestión de usuarios y eventos.
   *
   * Se muestra mientras la consulta inicial a Firestore no ha respondido aún.
   * Reemplaza la pantalla completa para evitar que los acordeones aparezcan
   * vacíos o con contadores en 0 durante la carga.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 pb-6">

        {/* HEADER — misma estructura que el real */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl mt-2">Gestionar Usuarios y Eventos</h1>
        </div>

        <div className="px-4 mt-4 space-y-4">

          {/* SKELETON: acordeón de usuarios */}
          <Card className="overflow-hidden animate-pulse">
            <div className="w-full flex items-center justify-between p-4">
              <div className="h-5 w-36 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-200 rounded" />
            </div>
          </Card>

          {/* SKELETON: acordeón de eventos */}
          <Card className="overflow-hidden animate-pulse">
            <div className="w-full flex items-center justify-between p-4">
              <div className="h-5 w-36 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-200 rounded" />
            </div>
          </Card>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 pb-6">
      {/* ── Cabecera ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/teacher")}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl mt-2">Gestionar Usuarios y Eventos</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">        
        {/* ── Sección Usuarios ─────────────────────────────── */}
        <Card className="overflow-hidden">
          <button
            onClick={() => toggleSection("students")}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="flex items-center gap-2 font-medium">
              <Users className="w-5 h-5" />
              Usuarios ({students.length})
            </span>
            {openSection === "students" ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {openSection === "students" && (
            <div className="px-4 pb-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full mb-3 gap-2"
                disabled={students.length === 0}
                onClick={() => setConfirmTarget("students")}
              >
                <Trash2 className="w-4 h-4" />
                Borrar todos los usuarios
              </Button>

              {!loading && students.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  No hay usuarios registrados.
                </p>
              )}

              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.uid}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">{student.name}</span>
                    <button
                      onClick={() => setConfirmItem({ type: 'student', id: student.uid, name: student.name })}
                      className="text-red-600 text-sm font-medium hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Sección Eventos ──────────────────────────────── */}
        <Card className="overflow-hidden">
          <button
            onClick={() => toggleSection("events")}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="w-5 h-5" />
              Eventos ({events.length})
            </span>
            {openSection === "events" ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {openSection === "events" && (
            <div className="px-4 pb-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full mb-3 gap-2"
                disabled={events.length === 0}
                onClick={() => setConfirmTarget("events")}
              >
                <Trash2 className="w-4 h-4" />
                Borrar todos los eventos
              </Button>

              {!loading && events.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">
                  No hay eventos registrados.
                </p>
              )}

              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">{event.title}</span>
                    <button
                      onClick={() => setConfirmItem({ type: 'event', id: event.id, name: event.title })}
                      className="text-red-600 text-sm font-medium hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Modal de confirmación para eliminar ítem individual ────────────── */}
      {/*
        Se muestra al hacer click en "Eliminar" sobre un usuario o evento específico.
        El profesor debe confirmar antes de que se ejecute la eliminación.

        CANCELAR: cierra el modal sin borrar nada.
        CONFIRMAR: llama a handleConfirmDeleteItem y elimina el ítem.
      */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

            {/* Ícono y título */}
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">¿Eliminar este {confirmItem.type === 'student' ? 'usuario' : 'evento'}?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              </div>
            </div>

            {/* Resumen del ítem a eliminar */}
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{confirmItem.type === 'student' ? 'Usuario' : 'Evento'}</span>
                <span className="font-medium">{confirmItem.name}</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmItem(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDeleteItem}
              >
                Sí, eliminar
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* ── Modal de confirmación para "borrar todo" ────────────────────────── */}
      {/*
        Se muestra al hacer click en "Borrar todos los usuarios/eventos".
        El profesor debe confirmar antes de ejecutar la eliminación masiva.

        CANCELAR: cierra el modal sin borrar nada.
        CONFIRMAR: llama a handleConfirmDeleteAll y elimina todos los registros.
      */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

            {/* Ícono y título */}
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">¿Borrar todo?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Esta acción eliminará permanentemente{" "}
                  {confirmTarget === "students" ? "todos los usuarios" : "todos los eventos"}{" "}
                  de la base de datos. No se puede deshacer.
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDeleteAll}
              >
                Sí, borrar todo
              </Button>
            </div>

          </Card>
        </div>
      )}
    </div>
  );
}
