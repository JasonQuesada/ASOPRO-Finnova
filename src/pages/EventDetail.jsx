/**
 * ============================================================================
 * EVENT DETAIL PAGE
 * ============================================================================
 * Screen that shows the full detail of a financial event and allows
 * the student to make a decision about it.
 *
 * Main responsibilities:
 * - Load the selected event information.
 * - Get the student's financial data.
 * - Verify if the student already participated.
 * - Show decision options.
 * - Register the decision in Firestore.
 * - Update balances, loans and transactions.
 * ============================================================================
 */

/**
 * React hooks.
 *
 * useState: local state management.
 * useEffect: side effects and data fetching.
 */
import { useState, useEffect } from "react";

/**
 * React Router hooks.
 *
 * useNavigate: programmatic navigation.
 * useParams: access dynamic URL parameters.
 */
import { useNavigate, useParams } from "react-router-dom";

/**
 * Icons for representing financial states and actions.
 */
import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShoppingCart,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";

/**
 * Reusable UI components.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Toast notification system.
 *
 * Toaster: global container that renders toasts.
 * toast: API to trigger toast messages.
 */
import { Toaster, toast } from "sonner";

/**
 * Firebase instances.
 *
 * db: main Firestore instance.
 * auth: Firebase Authentication instance.
 */
import { db, auth } from "@/services/firebase";

/**
 * Firestore functions.
 *
 * doc: builds document references.
 * getDoc: fetches a document once.
 * updateDoc: updates specific fields in a document.
 * arrayUnion: adds items to an array without overwriting existing ones.
 */
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

/**
 * Loan service.
 *
 * createLoan: creates a loan linked to the student.
 * DEFAULT_LOAN_INTEREST: fallback interest rate percentage.
 */
import { createLoan, DEFAULT_LOAN_INTEREST } from "@/services/loans";

/**
 * Savings service.
 *
 * createSaving: creates a new saving account linked to the student.
 * depositToSaving: transfers money from main balance to a saving account.
 */
import { createSaving, depositToSaving } from "@/services/savings";

/**
 * Transaction service.
 *
 * createTransaction: registers financial movements.
 * TRANSACTION_TYPES: centralized enum of transaction types.
 */
import { createTransaction, TRANSACTION_TYPES } from "@/services/transactions";

/**
 * ============================================================================
 * EVENT TYPE VISUAL CONFIG
 * ============================================================================
 * Centralizes the visual appearance of each financial event type.
 *
 * Each config defines:
 * - label: visible text for the user.
 * - icon: representative icon component.
 * - color: Tailwind class for text and icons.
 * - bgColor: Tailwind class for decorative backgrounds.
 *
 * TYPES:
 * - purchase:   standard purchase offer, student pays from balance.
 * - emergency:  unexpected expense, same flow as purchase.
 * - saving:     student sets aside money into a savings account.
 * - investment: student invests and receives principal + interest on maturity.
 * ============================================================================
 */
const EVENT_TYPE_CONFIG = {
  purchase: {
    label: "Oferta de Compra",
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },

  emergency: {
    label: "Emergencia",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },

  saving: {
    label: "Ahorro",
    icon: PiggyBank,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },

  investment: {
    label: "Inversión",
    icon: TrendingUp,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
};

/**
 * ============================================================================
 * MAIN COMPONENT
 * ============================================================================
 *
 * @returns {JSX.Element}
 * ============================================================================
 */
export default function EventDetail() {
  /**
   * Programmatic navigation hook.
   */
  const navigate = useNavigate();

  /**
   * Event ID from the URL.
   * Example: /student/event/abc123 → id = "abc123"
   */
  const { id } = useParams();

  /**
   * Currently authenticated user from Firebase Auth.
   */
  const user = auth.currentUser;

  /**
   * ==========================================================================
   * LOCAL STATE
   * ==========================================================================
   */

  /**
   * Full event data loaded from Firestore.
   */
  const [event, setEvent] = useState(null);

  /**
   * Student's financial and academic data.
   */
  const [studentData, setStudentData] = useState(null);

  /**
   * Controls the initial loading screen.
   */
  const [loading, setLoading] = useState(true);

  /**
   * Currently selected decision option.
   * Possible values: 'buy' | 'loan' | 'save' | 'invest' | 'reject'
   */
  const [selectedOption, setSelectedOption] = useState(null);

  /**
   * Decisión pendiente de confirmar en el modal.
   * Se establece cuando el estudiante toca una opción y se limpia
   * al cancelar o confirmar.
   * @type {[string|null, Function]}
   */
  const [pendingDecision, setPendingDecision] = useState(null);

  /**
   * Prevents multiple simultaneous submissions.
   */
  const [submitting, setSubmitting] = useState(false);

  /**
   * ==========================================================================
   * INITIAL DATA FETCH
   * ==========================================================================
   * Fetches simultaneously:
   * 1. The requested event.
   * 2. The student's data.
   *
   * Also validates:
   * - That the event exists.
   * - That the student hasn't already answered.
   * ==========================================================================
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        /**
         * Run both queries in parallel for better performance.
         */
        const [eventSnap, studentSnap] = await Promise.all([
          getDoc(doc(db, "events", id)),
          getDoc(doc(db, "students", user.uid)),
        ]);

        /**
         * Redirect if the event doesn't exist.
         */
        if (!eventSnap.exists()) {
          toast.error("Evento no encontrado");
          navigate("/student");
          return;
        }

        const studentInfo = studentSnap.data();

        /**
         * Check if the student already answered this event.
         */
        const alreadyAnswered = (studentInfo?.decisions ?? []).some(
          (d) => d.eventId === id,
        );

        if (alreadyAnswered) {
          toast.info("Ya tomaste una decisión en este evento");
          navigate("/student");
          return;
        }

        /**
         * Save fetched data to local state.
         */
        setEvent({ id: eventSnap.id, ...eventSnap.data() });
        setStudentData(studentInfo);
      } catch (err) {
        console.error(err);
        toast.error("Error al cargar el evento");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  /**
   * ==========================================================================
   * HANDLE DECISION
   * ==========================================================================
   * Centralizes all logic associated with the student's decision.
   *
   * The flow branches by event type:
   *
   * purchase / emergency:
   *   buy    → balance decreases, transaction registered.
   *   loan   → the bank covers the purchase: balance stays the same
   *            (bank credits the amount and the event is paid immediately),
   *            loan document created, debt updated.
   *   reject → no changes.
   *
   * saving:
   *   save   → balance decreases, money deposited into a new savings account
   *            named after the event title.
   *   reject → no changes.
   *   (no loan option — borrowing to save makes no sense)
   *
   * investment:
   *   invest → balance decreases, savings account created to hold the
   *            investment until maturity. Interests are credited separately
   *            by the system on maturity (TODO fase 3).
   *   reject → no changes.
   *   (no loan option)
   *
   * @param {'buy'|'loan'|'save'|'invest'|'reject'} decision
   * ==========================================================================
   */
  const handleDecision = async (decision) => {
    if (submitting) return;

    setSubmitting(true);
    setSelectedOption(decision);

    /**
     * Current balance with fallback value.
     */
    const currentBalance = studentData?.balance ?? 50000;

    /**
     * New balance after the operation.
     *
     * - buy / save / invest: deduct the event amount from current balance.
     * - loan: the bank credits the amount to pay the event immediately,
     *         so net effect on balance is zero — balance stays the same.
     *         The student now owes the loan total (principal + interest)
     *         which is tracked separately in the loans collection.
     * - reject: unchanged.
     */
    let newBalance = currentBalance;

    if (decision === "buy" || decision === "save" || decision === "invest") {
      newBalance = currentBalance - event.amount;
    }
    // loan and reject leave newBalance equal to currentBalance

    try {
      /**
       * Firestore document references.
       */
      const studentRef = doc(db, "students", user.uid);
      const eventRef   = doc(db, "events", id);

      /**
       * Update student document:
       * - New balance.
       * - Decision added to history.
       */
      await updateDoc(studentRef, {
        balance: newBalance,
        decisions: arrayUnion({
          eventId:       id,
          eventTitle:    event.title,
          decision,
          balanceBefore: currentBalance,
          balanceAfter:  newBalance,
          date:          new Date().toISOString(),
        }),
      });

      /**
       * Register student participation in the event.
       */
      await updateDoc(eventRef, {
        participants: arrayUnion(user.uid),
      });

      /**
       * ==================================================================
       * BUY DECISION (purchase / emergency)
       * ==================================================================
       * Standard purchase: balance decreases, transaction registered.
       */
      if (decision === "buy") {
        await createTransaction(
          user.uid,
          TRANSACTION_TYPES.EVENT_BUY,
          event.amount,
          currentBalance,
          newBalance,
          `Compra en evento: ${event.title}`,
          { eventId: id },
        );

        toast.success("¡Compra realizada!", {
          description: `Nuevo balance: ₡${newBalance.toLocaleString()}`,
        });

      /**
       * ==================================================================
       * LOAN DECISION (purchase / emergency)
       * ==================================================================
       * The bank covers the purchase cost on behalf of the student.
       * Balance stays the same because the bank credit and the event
       * payment cancel each other out.
       * A loan document is created to track what the student owes.
       */
      } else if (decision === "loan") {
        /**
         * Use event-configured interest rate or fall back to default.
         */
        const loanInterest = event.loanInterest ?? DEFAULT_LOAN_INTEREST;

        /**
         * Use event-configured loan duration or fall back to 30 days.
         */
        const loanDays = event.loanDays ?? 30;

        /**
         * Calculate total amount owed including interest.
         */
        const loanTotal = Math.round(event.amount * (1 + loanInterest / 100));

        /**
         * Create the loan document in Firestore.
         */
        await createLoan(
          user.uid,
          id,
          event.title,
          event.amount,
          loanInterest,
          loanDays,
        );

        /**
         * Register loan transaction in history.
         * Balance before and after are both currentBalance since the
         * bank credit and purchase payment cancel each other out.
         */
        await createTransaction(
          user.uid,
          TRANSACTION_TYPES.LOAN_PAYMENT,
          event.amount,
          currentBalance,
          newBalance,
          `Préstamo solicitado en evento: ${event.title}`,
          { eventId: id },
        );

        /**
         * Fetch current total debt and add the new loan total.
         */
        const freshSnap   = await getDoc(doc(db, "students", user.uid));
        const currentDebt = freshSnap.data()?.totalDebt ?? 0;

        await updateDoc(doc(db, "students", user.uid), {
          totalDebt: currentDebt + loanTotal,
        });

        toast.success("Préstamo solicitado", {
          description: `Tienes ${loanDays} días para pagar ₡${loanTotal.toLocaleString()}`,
        });

      /**
       * ==================================================================
       * SAVE DECISION (saving)
       * ==================================================================
       * Student sets aside money into a new savings account.
       * Balance decreases; a savings document is created and immediately
       * funded via depositToSaving().
       *
       * The savings account is named after the event title so the student
       * can identify where the money came from.
       */
      } else if (decision === "save") {
        /**
         * Create savings account named after the event.
         * Starts at balance 0; deposit is applied right after.
         */
        const savingId = await createSaving(user.uid, event.title);

        /**
         * Transfer the event amount from main balance to the new saving.
         * currentBalance and 0 are passed as the current balances before
         * the deposit so depositToSaving calculates correctly.
         */
        await depositToSaving(
          user.uid,
          savingId,
          event.amount,
          currentBalance,
          0,
        );

        /**
         * Register deposit transaction in history.
         */
        await createTransaction(
          user.uid,
          TRANSACTION_TYPES.DEPOSIT_SAVING,
          event.amount,
          currentBalance,
          newBalance,
          `Ahorro creado desde evento: ${event.title}`,
          { eventId: id, savingId },
        );

        toast.success("¡Ahorro creado!", {
          description: `₡${event.amount.toLocaleString()} apartados en "${event.title}"`,
        });

      /**
       * ==================================================================
       * INVEST DECISION (investment)
       * ==================================================================
       * Student invests the amount. Balance decreases.
       * A savings account is created to hold the investment until maturity.
       * The system will credit principal + interest when the investment
       * matures (TODO fase 3: scheduled job or teacher trigger).
       */
      } else if (decision === "invest") {
        /**
         * Create an investment account named after the event.
         * Se pasa type: 'investment' para que Savings.jsx pueda filtrarla
         * y el estudiante no pueda depositar ni retirar mientras está activa.
         */
        const investmentId = await createSaving(user.uid, `Inversión: ${event.title}`, 'investment');

        /**
         * Transfer the invested amount from main balance to the account.
         */
        await depositToSaving(
          user.uid,
          investmentId,
          event.amount,
          currentBalance,
          0,
        );

        /**
         * Register investment transaction in history.
         */
        await createTransaction(
          user.uid,
          TRANSACTION_TYPES.DEPOSIT_SAVING,
          event.amount,
          currentBalance,
          newBalance,
          `Inversión realizada en evento: ${event.title}`,
          { eventId: id, savingId: investmentId },
        );

        toast.success("¡Inversión realizada!", {
          description: `₡${event.amount.toLocaleString()} invertidos en "${event.title}"`,
        });

      /**
       * ==================================================================
       * REJECT DECISION (all types)
       * ==================================================================
       */
      } else {
        toast.info("Evento rechazado", {
          description: "Conservaste tu balance actual",
        });
      }

      /**
       * Redirect to dashboard after showing the notification.
       */
      setTimeout(() => navigate("/student"), 1500);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar tu decisión");
      setSubmitting(false);
      setSelectedOption(null);
    }
  };

  /**
   * ==========================================================================
   * LOADING STATE
   * ==========================================================================
   * Skeleton de carga del detalle del evento.
   *
   * Se muestra mientras Firestore resuelve los datos del evento y del estudiante.
   * Mantiene la misma estructura visual del header real para que la transición
   * sea suave al terminar la carga — incluyendo el botón de regreso.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-6">

        {/* HEADER — estructura idéntica al header real para evitar descuadre */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/student")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Evento Financiero</h1>
              <p className="text-blue-100 text-sm">Toma tu decisión</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">

          {/* SKELETON: tarjeta del evento */}
          <Card className="p-5 rounded-2xl shadow-lg border-0 animate-pulse">
            {/* Badge de tipo */}
            <div className="h-6 w-28 bg-gray-200 rounded-full mb-3" />
            {/* Título */}
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            {/* Descripción */}
            <div className="h-4 w-full bg-gray-200 rounded mb-1" />
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-4" />
            {/* Monto y duración */}
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <div className="h-9 w-36 bg-gray-200 rounded-full mx-auto mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded mx-auto" />
            </div>
          </Card>

          {/* SKELETON: tarjeta de balance del estudiante */}
          <Card className="p-4 rounded-xl animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-3 w-40 bg-gray-200 rounded mt-2" />
          </Card>

          {/* SKELETON: opciones de decisión */}
          <div className="space-y-3">
            <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4 rounded-xl animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded" />
                    <div className="h-3 w-full bg-gray-200 rounded" />
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>
      </div>
    );
  }

  if (!event) return null;

  /**
   * ==========================================================================
   * DERIVED VALUES
   * ==========================================================================
   */

  /**
   * Visual config for the event type.
   */
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.purchase;

  /**
   * Icon component for the event type.
   */
  const TypeIcon = config.icon;

  /**
   * Student's current balance.
   */
  const currentBalance = studentData?.balance ?? 50000;

  /**
   * Whether the student has enough balance to buy directly.
   */
  const canAfford = currentBalance >= event.amount;

  /**
   * Total loan amount including interest.
   * Uses event-specific rate or falls back to default.
   */
  const loanTotal = Math.round(
    event.amount * (1 + (event.loanInterest ?? DEFAULT_LOAN_INTEREST) / 100),
  );

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Global toast notification container */}
      <Toaster />

      {/* =====================================================================
          HEADER
          ===================================================================== */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/student")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl">Evento Financiero</h1>
            <p className="text-blue-100 text-sm">Toma tu decisión</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* ===================================================================
            EVENT CARD
            =================================================================== */}
        <Card className="p-5 rounded-2xl bg-white shadow-lg border-0">
          {/* Event type badge */}
          <div
            className={`flex items-center gap-2 ${config.bgColor} px-3 py-1.5 rounded-full w-fit mb-3`}
          >
            <TypeIcon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-xs font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>

          {/* Event title */}
          <h2 className="text-xl font-bold mb-2">{event.title}</h2>

          {/* Event description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {event.description}
          </p>

          {/* Amount and duration */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold mb-1">
              ₡{event.amount?.toLocaleString() ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {event.duration} días de duración
            </div>
          </div>
        </Card>

        {/* ===================================================================
            STUDENT BALANCE CARD
            =================================================================== */}
        <Card className="p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tu balance actual
              </span>
            </div>
            <span className="font-bold text-lg">
              ₡{currentBalance.toLocaleString()}
            </span>
          </div>

          {/* Affordability message */}
          {canAfford ? (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Tienes saldo suficiente
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
              Saldo insuficiente, considera un préstamo
            </div>
          )}
        </Card>

        {/* ===================================================================
            DECISION OPTIONS
            Opciones mostradas según el tipo de evento:
            - purchase / emergency: Comprar · Préstamo · Rechazar
            - saving:               Ahorrar · Rechazar
            - investment:           Invertir · Rechazar
            =================================================================== */}
        <div className="space-y-3">
          <h3 className="font-semibold">¿Qué deseas hacer?</h3>

          {/* ─── purchase / emergency: opción COMPRAR ─────────────────────── */}
          {(event.type === "purchase" || event.type === "emergency") && (
            <Card
              className={`p-4 rounded-xl transition-all ${
                selectedOption === "buy"
                  ? "border-2 border-green-600 bg-green-50"
                  : canAfford && !submitting
                    ? "cursor-pointer hover:shadow-md"
                    : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => canAfford && !submitting && setPendingDecision("buy")}
            >
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Comprar con mi saldo</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Usas tu balance actual para cubrir el costo del evento.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      Nuevo balance: ₡{(currentBalance - event.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── purchase / emergency: opción PRÉSTAMO ────────────────────── */}
          {(event.type === "purchase" || event.type === "emergency") && (
            <Card
              className={`p-4 rounded-xl transition-all ${
                selectedOption === "loan"
                  ? "border-2 border-purple-600 bg-purple-50"
                  : submitting
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-md"
              }`}
              onClick={() => !submitting && setPendingDecision("loan")}
            >
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Solicitar préstamo</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    El banco cubre el costo del evento; deberás pagarlo con intereses.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-600 font-medium">
                      Total a pagar: ₡{loanTotal.toLocaleString()} (
                      {event.loanInterest ?? DEFAULT_LOAN_INTEREST}% interés)
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── saving: opción AHORRAR ────────────────────────────────────── */}
          {event.type === "saving" && (
            <Card
              className={`p-4 rounded-xl transition-all ${
                selectedOption === "save"
                  ? "border-2 border-green-600 bg-green-50"
                  : canAfford && !submitting
                    ? "cursor-pointer hover:shadow-md"
                    : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => canAfford && !submitting && setPendingDecision("save")}
            >
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <PiggyBank className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Apartar en ahorro</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Se crea una cuenta de ahorro con el monto a tu nombre.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      Nuevo balance: ₡{(currentBalance - event.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── investment: opción INVERTIR ──────────────────────────────── */}
          {event.type === "investment" && (
            <Card
              className={`p-4 rounded-xl transition-all ${
                selectedOption === "invest"
                  ? "border-2 border-yellow-600 bg-yellow-50"
                  : canAfford && !submitting
                    ? "cursor-pointer hover:shadow-md"
                    : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => canAfford && !submitting && setPendingDecision("invest")}
            >
              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Invertir</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tu dinero crecerá durante el período de la inversión.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      Nuevo balance: ₡{(currentBalance - event.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ─── todas: opción RECHAZAR ────────────────────────────────────── */}
          <Card
            className={`p-4 rounded-xl transition-all ${
              selectedOption === "reject"
                ? "border-2 border-gray-600 bg-gray-50"
                : submitting
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md"
            }`}
            onClick={() => !submitting && setPendingDecision("reject")}
          >
            <div className="flex items-start gap-3">
              <div className="bg-gray-100 p-2 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">No participar</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Ignorar este evento y conservar tu balance actual.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600 font-medium">
                    Balance sin cambios: ₡{currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ===================================================================
            FINANCIAL TIP CARD
            =================================================================== */}
        <Card className="p-4 rounded-xl bg-blue-50 border-blue-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Consejo financiero</p>
              <p className="text-blue-700">
                Evalúa si realmente necesitas participar y considera el impacto
                en tu presupuesto a largo plazo.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Modal de confirmación de decisión ──────────────────────────────── */}
      {/*
        Se muestra cuando el estudiante toca una opción (comprar, préstamo,
        ahorrar, invertir o rechazar). Le permite revisar el impacto antes
        de confirmar la acción de forma irreversible.

        CANCELAR: cierra el modal sin ejecutar ninguna acción.
        CONFIRMAR: llama a handleDecision con la decisión pendiente.
      */}
      {pendingDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <Card className="p-6 rounded-2xl bg-white shadow-2xl max-w-sm w-full space-y-4">

            {/* Ícono y título */}
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">¿Confirmar decisión?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Esta acción no se puede deshacer. Revisá el impacto antes de continuar.
                </p>
              </div>
            </div>

            {/* Resumen del impacto según la decisión pendiente */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acción</span>
                <span className="font-medium">
                  {pendingDecision === "buy"    && "Comprar con saldo"}
                  {pendingDecision === "loan"   && "Solicitar préstamo"}
                  {pendingDecision === "save"   && "Apartar en ahorro"}
                  {pendingDecision === "invest" && "Invertir"}
                  {pendingDecision === "reject" && "No participar"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evento</span>
                <span className="font-medium">{event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium">₡{event.amount?.toLocaleString()}</span>
              </div>

              {/*
                Balance resultante en el modal:
                - buy / save / invest: balance baja el monto del evento.
                - loan: balance queda igual (el banco paga el evento directamente).
                - reject: no se muestra fila de balance.
              */}
              {pendingDecision !== "reject" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance resultante</span>
                  <span className={`font-medium ${
                    pendingDecision === "loan"
                      ? "text-muted-foreground"
                      : "text-red-600"
                  }`}>
                    {pendingDecision === "loan"
                      ? `₡${currentBalance.toLocaleString()} (sin cambio)`
                      : `₡${(currentBalance - event.amount).toLocaleString()}`
                    }
                  </span>
                </div>
              )}

              {/* Para préstamo: mostrar también la deuda que se genera */}
              {pendingDecision === "loan" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deuda generada</span>
                  <span className="font-medium text-red-600">
                    ₡{loanTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              {/* Cancelar: cierra el modal sin ejecutar nada */}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingDecision(null)}
              >
                Cancelar
              </Button>

              {/* Confirmar: ejecuta la decisión */}
              <Button
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                onClick={() => {
                  const decision = pendingDecision;
                  setPendingDecision(null);
                  handleDecision(decision);
                }}
              >
                Sí, confirmar
              </Button>
            </div>

          </Card>
        </div>
      )}

    </div>
  );
}
