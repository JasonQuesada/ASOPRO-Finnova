/**
 * ============================================================================
 * DECISION HISTORY PAGE
 * ============================================================================
 * Pantalla encargada de mostrar el historial de decisiones financieras
 * realizadas por el estudiante dentro de la simulación.
 *
 * Responsabilidades principales:
 * - Escuchar cambios en tiempo real del perfil del estudiante.
 * - Obtener el historial de decisiones almacenado en Firestore.
 * - Ordenar las decisiones cronológicamente.
 * - Mostrar información resumida de cada decisión tomada.
 * - Mostrar el saldo antes y después de cada evento.
 *
 * Flujo general:
 * 1. Se obtiene el usuario autenticado.
 * 2. Se crea una suscripción en tiempo real al documento del estudiante.
 * 3. Se recupera el arreglo de decisiones.
 * 4. Se ordenan por fecha descendente.
 * 5. Se renderizan en una lista cronológica.
 * ============================================================================
 */

/**
 * Hooks de React utilizados dentro del componente.
 *
 * useState:
 * Permite almacenar estados locales.
 *
 * useEffect:
 * Permite ejecutar efectos secundarios como suscripciones
 * y listeners en tiempo real.
 */
import { useState, useEffect } from 'react'

/**
 * Hook de React Router para navegación programática.
 *
 * Se utiliza para regresar al dashboard del estudiante.
 */
import { useNavigate } from 'react-router-dom'

/**
 * Iconos utilizados para representar visualmente
 * los distintos tipos de decisiones financieras.
 *
 * ArrowLeft:
 * Navegación hacia atrás.
 *
 * TrendingDown:
 * Compra realizada con saldo disponible.
 *
 * TrendingUp:
 * Solicitud de préstamo.
 *
 * XCircle:
 * Rechazo de evento o estados vacíos.
 */
import { ArrowLeft, TrendingDown, TrendingUp, XCircle } from 'lucide-react'

/**
 * Componente visual reutilizable utilizado para mostrar
 * información agrupada dentro de tarjetas.
 */
import { Card } from '@/components/ui/card'

/**
 * Componente reutilizable de botón.
 *
 * Mantiene consistencia visual con el resto de la aplicación.
 */
import { Button } from '@/components/ui/button'

/**
 * Instancias configuradas de Firebase.
 *
 * db:
 * Base de datos Firestore.
 *
 * auth:
 * Servicio de autenticación.
 */
import { db, auth } from '@/services/firebase'

/**
 * Funciones de Firestore.
 *
 * doc:
 * Construye una referencia a un documento.
 *
 * onSnapshot:
 * Permite escuchar cambios en tiempo real
 * sobre un documento específico.
 */
import { doc, onSnapshot } from 'firebase/firestore'

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL
 * ============================================================================
 *
 * Muestra el historial financiero del estudiante.
 *
 * Cada registro representa una decisión tomada
 * ante un evento financiero publicado por un docente.
 *
 * @returns {JSX.Element}
 * ============================================================================
 */
export default function DecisionHistory() {

  /**
   * Función utilizada para realizar redirecciones.
   */
  const navigate = useNavigate()

  /**
   * Usuario actualmente autenticado.
   *
   * Se utiliza para localizar el documento
   * correspondiente dentro de Firestore.
   */
  const user = auth.currentUser

  /**
   * Lista de decisiones registradas por el estudiante.
   *
   * Cada elemento contiene información como:
   * - Evento asociado.
   * - Decisión tomada.
   * - Fecha.
   * - Saldo antes y después.
   */
  const [decisions, setDecisions] = useState([])

  /**
   * Estado utilizado para controlar la carga inicial.
   *
   * Mientras sea true se mostrará un mensaje
   * indicando que el historial está cargando.
   */
  const [loading, setLoading] = useState(true)

  /**
   * ==========================================================================
   * SUSCRIPCIÓN EN TIEMPO REAL AL PERFIL DEL ESTUDIANTE
   * ==========================================================================
   *
   * Este efecto crea un listener sobre el documento:
   *
   * students/{uid}
   *
   * Objetivos:
   * - Obtener el historial actualizado automáticamente.
   * - Reflejar cambios sin recargar la página.
   * - Mantener sincronización en tiempo real con Firestore.
   *
   * El listener se elimina automáticamente al desmontar
   * el componente para evitar memory leaks.
   * ==========================================================================
   */
  useEffect(() => {

    /**
     * Si no existe usuario autenticado,
     * no se crea la suscripción.
     */
    if (!user) return

    /**
     * Referencia al documento del estudiante.
     */
    const studentRef = doc(db, 'students', user.uid)

    /**
     * Listener en tiempo real.
     */
    const unsubscribe = onSnapshot(studentRef, (snap) => {

      if (snap.exists()) {

        /**
         * Datos completos del estudiante.
         */
        const data = snap.data()

        /**
         * Ordenar decisiones por fecha descendente.
         *
         * Resultado:
         * La decisión más reciente aparecerá primero.
         */
        const sorted = [...(data.decisions ?? [])].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )

        /**
         * Actualiza el estado con las decisiones ordenadas.
         */
        setDecisions(sorted)
      }

      /**
       * Finaliza el estado de carga inicial.
       */
      setLoading(false)
    })

    /**
     * Cleanup del efecto.
     *
     * Elimina la suscripción cuando el componente
     * se desmonta.
     */
    return () => unsubscribe()

  }, [user])

  /**
   * ==========================================================================
   * OBTENER ICONO SEGÚN LA DECISIÓN
   * ==========================================================================
   *
   * Determina qué icono debe mostrarse para cada tipo
   * de decisión financiera.
   *
   * buy:
   * Compra realizada.
   *
   * loan:
   * Préstamo solicitado.
   *
   * default:
   * Evento rechazado.
   *
   * @param {string} decision
   * @returns {JSX.Element}
   * ==========================================================================
   */
  const getDecisionIcon = (decision) => {
    if (decision === 'buy') {
      return <TrendingDown className="w-5 h-5 text-red-500" />
    }

    if (decision === 'loan') {
      return <TrendingUp className="w-5 h-5 text-purple-500" />
    }

    /**
     * Ahorro: el estudiante apartó dinero en una cuenta de ahorro.
     * Se muestra con ícono verde para distinguirlo de un rechazo.
     */
    if (decision === 'save') {
      return <TrendingDown className="w-5 h-5 text-green-500" />
    }

    /**
     * Inversión: el estudiante invirtió el monto del evento.
     * Se muestra con ícono amarillo para identificar la categoría.
     */
    if (decision === 'invest') {
      return <TrendingUp className="w-5 h-5 text-yellow-500" />
    }

    return <XCircle className="w-5 h-5 text-gray-500" />
  }

  /**
   * ==========================================================================
   * OBTENER ETIQUETA DESCRIPTIVA
   * ==========================================================================
   *
   * Convierte el valor interno almacenado
   * en una descripción legible para el usuario.
   *
   * @param {string} decision
   * @returns {string}
   * ==========================================================================
   */
  const getDecisionLabel = (decision) => {
    if (decision === 'buy')    return 'Compró con saldo'
    if (decision === 'loan')   return 'Solicitó préstamo'
    /**
     * Etiquetas para los tipos de decisión agregados en la fase de inversiones.
     * Si no se mapean aquí, aparecen como "Rechazó evento" aunque no lo sean.
     */
    if (decision === 'save')   return 'Apartó en ahorro'
    if (decision === 'invest') return 'Realizó inversión'
    return 'Rechazó evento'
  }

  /**
   * ==========================================================================
   * FORMATEAR FECHAS
   * ==========================================================================
   *
   * Convierte una fecha ISO almacenada en Firestore
   * a un formato legible para usuarios costarricenses.
   *
   * Ejemplo:
   * 2025-08-01
   * →
   * 1 ago. 2025
   *
   * @param {string} isoString
   * @returns {string}
   * ==========================================================================
   */
  const formatDate = (isoString) => {

    if (!isoString) return ''

    return new Date(isoString).toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (

    /**
     * ========================================================================
     * CONTENEDOR PRINCIPAL
     * ========================================================================
     *
     * Estructura general:
     *
     * 1. Encabezado superior.
     * 2. Indicador de carga.
     * 3. Estado vacío.
     * 4. Historial de decisiones.
     *
     * Se utiliza un gradiente para mantener consistencia
     * visual con el módulo del estudiante.
     * ========================================================================
     */
    <div className="min-h-screen bg-white pb-6">

      {/* =====================================================================
          HEADER DE LA PANTALLA
          ---------------------------------------------------------------------
          Contiene:
          - Botón de regreso.
          - Título principal.
          - Descripción contextual.
         ===================================================================== */}
      <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-3">

        <div className="flex items-center gap-3">

          {/* Botón para regresar al dashboard del estudiante */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/student')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-xl">Historial</h1>

            <p className="text-blue-100 text-sm">
              Tus decisiones financieras
            </p>
          </div>

        </div>

      </div>

      {/* =====================================================================
          CONTENEDOR DEL HISTORIAL
          ---------------------------------------------------------------------
          Renderiza:
          - Estado de carga.
          - Estado vacío.
          - Lista de decisiones.
         ===================================================================== */}
      <div className="px-4 mt-4 space-y-3">

        {/* ================================================================
            ESTADO DE CARGA
            ---------------------------------------------------------------
            Se muestra mientras Firestore obtiene los datos
            iniciales del estudiante.
           ================================================================ */}
        {/*
          SKELETON DE CARGA DEL HISTORIAL
          Se muestra mientras Firestore obtiene los datos iniciales del estudiante.
          Replica la estructura de una fila de decisión para que la transición
          sea suave al terminar la carga.
        */}
        {loading && [0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-4 rounded-2xl border animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
              <div className="text-right space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          </Card>
        ))}

        {/* ================================================================
            ESTADO VACÍO
            ---------------------------------------------------------------
            Se muestra cuando el estudiante aún no ha tomado
            ninguna decisión dentro de la simulación.
           ================================================================ */}
        {!loading && decisions.length === 0 && (

          <Card className="p-8 rounded-2xl text-center border-dashed">

            <XCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />

            <p className="text-sm text-muted-foreground">
              Aún no has tomado ninguna decisión
            </p>

          </Card>
        )}

        {/* ================================================================
            LISTADO DE DECISIONES
            ---------------------------------------------------------------
            Se genera dinámicamente a partir del arreglo
            almacenado en Firestore.
           ================================================================ */}
        {decisions.map((d, index) => (

          <Card key={index} className="p-4 rounded-xl">

            <div className="flex items-center gap-3">

              {/* Icono correspondiente a la decisión tomada */}
              {getDecisionIcon(d.decision)}

              {/* ==========================================================
                  INFORMACIÓN PRINCIPAL DEL EVENTO
                  ----------------------------------------------------------
                  Muestra:
                  - Nombre del evento.
                  - Tipo de decisión tomada.
                  - Fecha de realización.
                 ========================================================== */}
              <div className="flex-1 min-w-0">

                <p className="font-medium text-sm truncate">
                  {d.eventTitle}
                </p>

                <p className="text-xs text-muted-foreground">
                  {getDecisionLabel(d.decision)}
                </p>

                {d.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(d.date)}
                  </p>
                )}

              </div>

              {/* ==========================================================
                  RESUMEN FINANCIERO
                  ----------------------------------------------------------
                  Permite visualizar rápidamente:
                  - Saldo resultante.
                  - Saldo previo a la decisión.
                 ========================================================== */}
              <div className="text-right flex-shrink-0">

                <p className="text-sm font-bold">
                  ₡{d.balanceAfter?.toLocaleString()}
                </p>

                <p className="text-xs text-muted-foreground">
                  antes: ₡{d.balanceBefore?.toLocaleString()}
                </p>

              </div>

            </div>

          </Card>
        ))}

      </div>

    </div>
  )
}