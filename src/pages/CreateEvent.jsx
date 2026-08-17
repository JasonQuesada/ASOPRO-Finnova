/**
 * @fileoverview Formulario de creación de eventos financieros para el profesor.
 *
 * Permite al profesor configurar y publicar un nuevo evento financiero
 * (compra, emergencia, ahorro o préstamo) que los estudiantes verán en
 * su dashboard. Incluye validación de campos, vista previa en tiempo real
 * y retroalimentación visual mediante toasts de Sonner.
 *
 * @module CreateEvent
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "@/services/events";
import { auth } from "@/services/firebase";
import {
  ArrowLeft,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
  TrendingUp,
  Calendar,
  DollarSign,
  Type,
  FileEdit,
  Percent,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "sonner";

/**
 * Formulario de creación de un evento financiero.
 *
 * Responsabilidades:
 * - Gestionar el estado local de todos los campos del formulario.
 * - Validar los campos antes de enviar y mostrar mensajes de error por campo.
 * - Llamar al servicio `createEvent` con los datos normalizados.
 * - Mostrar toasts de éxito o error según el resultado de la operación.
 * - Renderizar una vista previa en tiempo real del evento mientras se llena el formulario.
 *
 * @component
 * @returns {JSX.Element} El formulario completo de creación de evento.
 *
 * @example
 * // Uso dentro del enrutador protegido del profesor
 * <Route path="/teacher/create-event" element={<ProtectedRoute allowedRole="teacher"><CreateEvent /></ProtectedRoute>} />
 */
export default function CreateEvent() {
  const navigate = useNavigate();

  /**
   * Nombre o título del evento financiero.
   * @type {[string, Function]}
   */
  const [eventName, setEventName] = useState("");

  /**
   * Tipo de evento seleccionado. Determina el ícono, colores y texto de ayuda del monto.
   * Valores posibles: `"purchase"` | `"emergency"` | `"saving"` | `"investment"`.
   * @type {[string, Function]}
   */
  const [eventType, setEventType] = useState("purchase");

  /**
   * Descripción del escenario financiero que enfrentarán los estudiantes.
   * @type {[string, Function]}
   */
  const [description, setDescription] = useState("");

  /**
   * Monto monetario del evento en colones (₡), almacenado como string
   * para compatibilidad con el input de tipo number.
   * @type {[string, Function]}
   */
  const [amount, setAmount] = useState("");

  /**
   * Duración del evento en días. Se inicializa en 7 como valor sugerido.
   * Almacenado como string para compatibilidad con el input de tipo number.
   * @type {[string, Function]}
   */
  const [duration, setDuration] = useState("7");

  /**
   * Indica si el formulario está siendo enviado al servidor.
   * Deshabilita el botón de envío y muestra el estado "Publicando..." mientras es `true`.
   * @type {[boolean, Function]}
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Controla la visibilidad del modal de confirmación de publicación.
   * Se activa cuando el formulario es válido y el profesor hace click en "Publicar Evento".
   * El evento no se publica hasta que el profesor confirma en el modal.
   * @type {[boolean, Function]}
   */
  const [showConfirm, setShowConfirm] = useState(false);

  /**
   * Tasa de interés anual para eventos de tipo `investment`.
   * Solo se valida y se guarda cuando `eventType === 'investment'`.
   * Representa el porcentaje de ganancia sobre el monto invertido al vencer.
   * @type {[string, Function]}
   */
  const [interestRate, setInterestRate] = useState("");

  /**
   * Mensajes de error de validación por campo.
   * Un string vacío indica que el campo es válido.
   * @type {[{eventName: string, description: string, amount: string, duration: string}, Function]}
   */
  const [errors, setErrors] = useState({
    eventName: "",
    description: "",
    amount: "",
    duration: "",
    interestRate: "",
  });

  /**
   * Definición de los tipos de evento disponibles para el selector visual.
   * Cada entrada incluye el valor interno, la etiqueta legible, el ícono de Lucide
   * y las clases de color de Tailwind para su representación gráfica.
   *
   * TIPOS DISPONIBLES:
   * - purchase:   oferta de compra, el estudiante gasta de su balance.
   * - emergency:  gasto imprevisto, mismo flujo que purchase.
   * - saving:     el estudiante aparta dinero en una cuenta de ahorro existente.
   * - investment: el estudiante invierte y recibe el monto más intereses al vencer.
   *
   * @type {Array<{value: string, label: string, icon: React.ComponentType, color: string, bgColor: string}>}
   */
  const eventTypes = [
    {
      value: "purchase",
      label: "Oferta de Compra",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      value: "emergency",
      label: "Emergencia",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      value: "saving",
      label: "Ahorro",
      icon: PiggyBank,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      value: "investment",
      label: "Inversión",
      icon: TrendingUp,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  /**
   * Valida todos los campos del formulario antes del envío.
   *
   * Reglas de validación:
   * - `eventName`: no puede estar vacío ni contener solo espacios.
   * - `description`: no puede estar vacía ni contener solo espacios.
   * - `amount`: obligatorio y debe ser un número mayor a cero.
   * - `duration`: obligatorio, debe ser un entero positivo.
   *
   * Actualiza el estado `errors` con los mensajes correspondientes y
   * retorna `false` si algún campo es inválido.
   *
   * @function
   * @returns {boolean} `true` si todos los campos son válidos, `false` en caso contrario.
   */
  const validateForm = () => {
    const newErrors = {
      eventName: "",
      description: "",
      amount: "",
      duration: "",
      interestRate: "",
    };
    let isValid = true;

    if (!eventName.trim()) {
      newErrors.eventName = "El nombre del evento es obligatorio";
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = "La descripción del escenario es obligatoria";
      isValid = false;
    }

    if (!amount) {
      newErrors.amount = "El monto es obligatorio";
      isValid = false;
    } else if (parseFloat(amount) <= 0) {
      newErrors.amount = "El monto debe ser mayor a cero";
      isValid = false;
    }

    if (!duration) {
      newErrors.duration = "La duración es obligatoria";
      isValid = false;
    } else if (!Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      newErrors.duration = "La duración debe ser un número entero mayor a cero";
      isValid = false;
    }

    /**
     * La tasa de interés solo se valida para eventos de tipo `investment`.
     * Para los demás tipos se ignora aunque tenga valor.
     */
    if (eventType === "investment") {
      if (!interestRate) {
        newErrors.interestRate =
          "La tasa de interés es obligatoria para inversiones";
        isValid = false;
      } else if (
        parseFloat(interestRate) <= 0 ||
        parseFloat(interestRate) > 100
      ) {
        newErrors.interestRate = "La tasa debe estar entre 1% y 100%";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Limpia el mensaje de error de un campo específico al comenzar a editarlo.
   *
   * Se llama en el `onChange` de cada input para dar retroalimentación
   * inmediata al usuario mientras corrige un campo inválido.
   *
   * @function
   * @param {keyof typeof errors} field - Nombre del campo cuyo error se debe limpiar.
   */
  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /**
   * Maneja el click en "Publicar Evento".
   *
   * Flujo:
   * 1. Previene el comportamiento por defecto del formulario.
   * 2. Ejecuta la validación; si falla, muestra un toast de error y detiene el flujo.
   * 3. Si todo es válido, abre el modal de confirmación.
   *    El evento NO se publica todavía — el profesor debe confirmar.
   *
   * @function
   * @param {React.FormEvent<HTMLFormElement>} e - Evento de envío del formulario.
   */
  const handleRequestPublish = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor corrige los errores antes de continuar");
      return;
    }

    // Formulario válido: mostrar modal de confirmación antes de publicar
    setShowConfirm(true);
  };

  /**
   * Ejecuta la publicación del evento tras la confirmación en el modal.
   *
   * Flujo:
   * 1. Cierra el modal de confirmación.
   * 2. Activa `isSubmitting` para bloquear reenvíos.
   * 3. Llama a `createEvent` con los datos normalizados.
   *    Para eventos de tipo `investment` incluye `interestRate`.
   * 4. En caso de éxito: muestra un toast y redirige al dashboard tras 1 segundo.
   * 5. En caso de error: muestra un toast y desactiva `isSubmitting` para reintentar.
   *
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const handleConfirmPublish = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);

    try {
      /**
       * Calcular fecha de inicio (ahora) y fecha de cierre
       * (ahora + duración en días), para que Reportes pueda
       * mostrar el rango de vigencia del evento.
       */
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(duration));

      await createEvent({
        title: eventName.trim(),
        type: eventType,
        description: description.trim(),
        amount: parseFloat(amount),
        duration: parseInt(duration),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: "active",
        teacherId: auth.currentUser.uid,
        participants: [],
        /**
         * Solo se guarda la tasa de interés en eventos de tipo `investment`.
         * Para los demás tipos se omite el campo para no generar confusión.
         */
        ...(eventType === "investment" && {
          interestRate: parseFloat(interestRate),
        }),
      });

      toast.success("Evento publicado exitosamente");

      // Esperar 1 segundo antes de navegar para que el profesor vea el toast
      setTimeout(() => navigate("/teacher"), 1000);
    } catch (error) {
      console.error("Error al crear evento:", error);
      toast.error("No se pudo publicar el evento. Intenta de nuevo.");
      // Reactivar el botón para que el profesor pueda reintentar
      setIsSubmitting(false);
    }
  };

  /**
   * Objeto de configuración del tipo de evento actualmente seleccionado.
   * Se usa para renderizar la vista previa con el ícono y colores correctos.
   * @type {{value: string, label: string, icon: React.ComponentType, color: string, bgColor: string} | undefined}
   */
  const selectedType = eventTypes.find((t) => t.value === eventType);

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Proveedor de toasts de Sonner; debe estar dentro del árbol del componente */}
      <Toaster />

      {/* ── Cabecera ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          {/* Botón para volver al dashboard del profesor */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl">Crear Evento</h1>
            <p className="text-purple-100 text-sm">
              Nuevo escenario financiero
            </p>
          </div>
        </div>
      </div>

      {/* ── Formulario ─────────────────────────────────────────────────────── */}
      <div className="px-4 mt-4">
        <Card className="p-5 rounded-2xl bg-white shadow-lg border-0">
          <form onSubmit={handleRequestPublish} className="space-y-5">
            {/* ── Campo: Nombre del evento ──────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="eventName" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Nombre del Evento
              </Label>

              <Input
                id="eventName"
                placeholder="Ej: Oferta especial de laptop"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  clearError("eventName"); // Limpiar error al comenzar a corregir
                }}
                className={
                  errors.eventName
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />

              {/* Mensaje de error inline para el campo nombre */}
              {errors.eventName && (
                <p className="text-xs text-red-500">{errors.eventName}</p>
              )}
            </div>

            {/* ── Campo: Tipo de evento (selector visual con grid) ──────────── */}
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>

              <div className="grid grid-cols-2 gap-2">
                {eventTypes.map((type) => {
                  /** Componente de ícono del tipo de evento actual en la iteración. */
                  const Icon = type.icon;

                  /** Indica si este tipo es el seleccionado actualmente. */
                  const isSelected = eventType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button" // Evita que el click dispare el submit del formulario
                      onClick={() => setEventType(type.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-purple-600 bg-purple-50" // Estilo activo
                          : "border-border hover:border-purple-300" // Estilo inactivo
                      }`}
                    >
                      <div
                        className={`${type.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2`}
                      >
                        <Icon className={`w-5 h-5 ${type.color}`} />
                      </div>
                      <div className="text-xs font-medium text-center">
                        {type.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Campo: Descripción del escenario ─────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileEdit className="w-4 h-4" />
                Descripción del Escenario
              </Label>

              <Textarea
                id="description"
                placeholder="Describe la situación financiera que enfrentarán los estudiantes..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearError("description");
                }}
                rows={4}
                className={
                  errors.description
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />

              {/* Mensaje de error inline para el campo descripción */}
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Explica el contexto y las opciones disponibles
              </p>
            </div>

            {/* ── Campo: Monto del evento ───────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Monto del Evento
              </Label>

              {/* Contenedor relativo para posicionar el símbolo ₡ dentro del input */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₡
                </span>

                <Input
                  id="amount"
                  type="number"
                  placeholder="50000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearError("amount");
                  }}
                  className={`pl-7 ${errors.amount ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  min="1"
                />
              </div>

              {/* Mensaje de error inline para el campo monto */}
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}

              {/*
                Texto de ayuda contextual: cambia según el tipo de evento seleccionado
                para orientar al profesor sobre el significado del monto.
                - purchase / emergency: costo que paga el estudiante.
                - saving: monto que el estudiante aparta en su ahorro.
                - investment: monto que invierte; recibirá ese monto más intereses al vencer.
              */}
              <p className="text-xs text-muted-foreground">
                {eventType === "saving"
                  ? "Monto que el estudiante apartará en su ahorro"
                  : eventType === "investment"
                    ? "Monto a invertir (el estudiante recibirá monto + intereses al vencer)"
                    : "Costo o impacto financiero del evento"}
              </p>
            </div>

            {/* ── Campo: Duración del evento ────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Duración del Evento
              </Label>

              <div className="flex gap-2">
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value);
                    clearError("duration");
                  }}
                  min="1"
                  className={`w-20 ${errors.duration ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <span className="flex items-center text-muted-foreground text-sm">
                  días
                </span>
              </div>

              {/* Mensaje de error inline para el campo duración */}
              {errors.duration && (
                <p className="text-xs text-red-500">{errors.duration}</p>
              )}
            </div>

            {/* ── Campo: Tasa de interés (solo para inversiones) ────────────── */}
            {/*
              Solo se muestra cuando el tipo de evento es `investment`.
              El valor se guarda en Firestore como `interestRate` y es usado
              por TeacherEventDetail al finalizar el evento para calcular
              la ganancia de cada estudiante: monto + (monto * interestRate / 100).
            */}
            {eventType === "investment" && (
              <div className="space-y-2">
                <Label
                  htmlFor="interestRate"
                  className="flex items-center gap-2"
                >
                  <Percent className="w-4 h-4" />
                  Tasa de Interés
                </Label>

                <div className="relative">
                  <Input
                    id="interestRate"
                    type="number"
                    placeholder="15"
                    value={interestRate}
                    onChange={(e) => {
                      setInterestRate(e.target.value);
                      clearError("interestRate");
                    }}
                    min="1"
                    max="100"
                    className={`pr-8 ${errors.interestRate ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {/* Símbolo % posicionado dentro del input */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>

                {/* Mensaje de error inline para el campo tasa de interés */}
                {errors.interestRate && (
                  <p className="text-xs text-red-500">{errors.interestRate}</p>
                )}

                {/* Texto de ayuda: muestra el cálculo de ganancia en tiempo real */}
                {interestRate &&
                  amount &&
                  parseFloat(interestRate) > 0 &&
                  parseFloat(amount) > 0 && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      El estudiante recibirá ₡
                      {Math.round(
                        parseFloat(amount) *
                          (1 + parseFloat(interestRate) / 100),
                      ).toLocaleString()}{" "}
                      al vencer ( ₡{parseFloat(amount).toLocaleString()} +{" "}
                      {parseFloat(interestRate)}% de interés )
                    </p>
                  )}
              </div>
            )}

            {/* ── Vista previa del evento ───────────────────────────────────── */}
            {/*
              Se renderiza solo cuando hay un tipo seleccionado válido.
              Muestra cómo verán los estudiantes el evento en su dashboard,
              actualizándose en tiempo real mientras el profesor llena el formulario.
            */}
            {selectedType && (
              <Card className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border-2 border-dashed">
                <div className="text-xs text-muted-foreground mb-2">
                  Vista previa
                </div>

                <div className="flex items-start gap-3">
                  <div className={`${selectedType.bgColor} p-2 rounded-lg`}>
                    <selectedType.icon
                      className={`w-5 h-5 ${selectedType.color}`}
                    />
                  </div>

                  <div className="flex-1">
                    {/* Muestra el nombre ingresado o un placeholder si aún está vacío */}
                    <div className="font-medium text-sm mb-1">
                      {eventName || "Nombre del evento"}
                    </div>

                    {/* Muestra la descripción ingresada o un placeholder si aún está vacía */}
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {description || "Descripción del escenario financiero..."}
                    </div>

                    {/* El monto solo se muestra en la vista previa cuando el campo tiene valor */}
                    {amount && (
                      <div className="mt-2 font-semibold text-sm">
                        ₡{parseInt(amount).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ── Advertencia de publicación definitiva ─────────────────────── */}
            {/*
              Se muestra siempre antes del botón de envío para que el profesor
              la lea en cada creación de evento, sin excepción.

              MOTIVO:
              Los eventos publicados no pueden editarse ni eliminarse,
              ya que los estudiantes pueden haberlos visto o respondido,
              lo que generaría inconsistencias en sus historiales financieros.

              Por eso es responsabilidad del profesor verificar los datos
              antes de publicar.
            */}
            {/* ── Modal de confirmación de publicación ──────────────────────── */}
            {/*
              Se muestra cuando el formulario es válido y el profesor hace click
              en "Publicar Evento". Presenta un resumen del evento para revisión
              final antes de confirmar.

              CANCELAR: cierra el modal y regresa al formulario con todos los
              datos intactos para que el profesor pueda revisar o corregir.

              CONFIRMAR: ejecuta handleConfirmPublish y publica en Firestore.
            */}
            {showConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">
                  {/* Ícono y título del modal */}
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">
                        ¿Publicar este evento?
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Revisá que todos los datos sean correctos antes de
                        continuar.
                      </p>
                    </div>
                  </div>

                  {/* Resumen del evento para revisión rápida */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre</span>
                      <span className="font-medium">{eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-medium">{selectedType?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto</span>
                      <span className="font-medium">
                        ₡{parseInt(amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duración</span>
                      <span className="font-medium">{duration} días</span>
                    </div>
                    {/* La tasa de interés solo aparece en el resumen si el tipo es investment */}
                    {eventType === "investment" && interestRate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tasa de interés
                        </span>
                        <span className="font-medium text-yellow-700">
                          {interestRate}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    {/*
                      Revisar: cierra el modal sin publicar ni borrar nada.
                      El formulario conserva todos los datos para seguir corrigiendo.
                    */}
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowConfirm(false)}
                    >
                      Revisar
                    </Button>

                    {/* Confirmar: ejecuta la publicación del evento */}
                    <Button
                      type="button"
                      onClick={handleConfirmPublish}
                      className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                    >
                      Sí, publicar
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ── Botón de envío ────────────────────────────────────────────── */}
            {/* Se deshabilita durante el envío para evitar duplicados */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium disabled:opacity-60 transition-colors"
            >
              {/* Texto dinámico según el estado de envío */}
              {isSubmitting ? "Publicando..." : "Publicar Evento"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
