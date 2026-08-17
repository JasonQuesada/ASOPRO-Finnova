/**
 * @fileoverview Componente raíz de enrutamiento de la aplicación.
 *
 * Define todas las rutas de la aplicación organizadas por rol, aplica los
 * guardias `ProtectedRoute` y `PublicRoute` según corresponda, y establece
 * la redirección por defecto desde `/` hacia `/login`.
 *
 * Mapa de rutas:
 * - **Pública**       `/login`                       → `Login`
 * - **Demo**          `/demo`                        → `Demo`
 *
 * - **Estudiante**    `/student`                     → `StudentDashboard`
 * - **Estudiante**    `/student/event/:id`           → `EventDetail`
 * - **Estudiante**    `/student/historial`           → `DecisionHistory`
 * - **Estudiante**    `/student/notifications`      → `Notifications`
 * - **Estudiante**    `/student/savings`             → `Savings`
 * - **Estudiante**    `/student/loans`               → `Loans`
 * - **Estudiante**    `/student/financial-status`    → `FinancialStatus`
 *
 * - **Profesor**      `/teacher`                     → `TeacherDashboard`
 * - **Profesor**      `/teacher/create-event`        → `CreateEvent`
 * - **Profesor**      `/teacher/event/:id`            → `TeacherEventDetail`
 * - **Profesor**      `/teacher/reports`              → `TeacherReports`
 * - **Profesor**      `/teacher/manage`               → `ManageUsersEvents`
 *
 * - **Autenticado**   `/profile`                     → `Profile`
 *   (cualquier rol)
 *
 * @module App
 */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

/**
 * ============================================================================
 * PÁGINAS PÚBLICAS
 * ============================================================================
 */

import Login from './pages/Login'
import Demo from './pages/Demo'

/**
 * ============================================================================
 * PÁGINAS DE ESTUDIANTE
 * ============================================================================
 */

import StudentDashboard from './pages/StudentDashboard'
import EventDetail from './pages/EventDetail'
import DecisionHistory from './pages/DecisionHistory'
import Notifications from './pages/Notifications'
import Savings from './pages/Savings'
import Loans from './pages/Loans'
import FinancialStatus from './pages/FinancialStatus'

/**
 * ============================================================================
 * PÁGINAS DE PROFESOR
 * ============================================================================
 */

import TeacherDashboard from './pages/TeacherDashboard'
import TeacherEventDetail from './pages/TeacherEventDetail'
import CreateEvent from './pages/CreateEvent'
import TeacherReports from './pages/TeacherReports'
import ManageUsersEvents from './pages/ManageUsersEvents'

/**
 * ============================================================================
 * PÁGINAS COMPARTIDAS
 * ============================================================================
 */

import Profile from './pages/Profile'

/**
 * ============================================================================
 * GUARDIAS DE RUTAS
 * ============================================================================
 */

import ProtectedRoute from './routes/ProtectedRoute'
import PublicRoute from './routes/PublicRoute'

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL
 * ============================================================================
 */

/**
 * Componente raíz que configura el enrutador y declara todas las rutas
 * de la aplicación con sus respectivos guardias de acceso.
 *
 * Convenciones de protección aplicadas:
 *
 * - `PublicRoute`
 *   → permite acceder únicamente cuando no existe una sesión activa.
 *
 * - `ProtectedRoute allowedRole="student"`
 *   → requiere autenticación y rol de estudiante.
 *
 * - `ProtectedRoute allowedRole="teacher"`
 *   → requiere autenticación y rol de profesor.
 *
 * - `ProtectedRoute` sin `allowedRole`
 *   → requiere autenticación, independientemente del rol.
 *
 * - `/demo`
 *   → ruta completamente pública.
 *   → no requiere autenticación.
 *   → no utiliza Firebase.
 *   → utiliza datos simulados.
 *
 * @component
 * @returns {JSX.Element} Árbol completo de enrutamiento de la aplicación.
 */
export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ================================================================== */}
        {/* REDIRECCIÓN PRINCIPAL                                             */}
        {/* ================================================================== */}

        {/* La raíz de la aplicación lleva al Login */}
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* ================================================================== */}
        {/* RUTAS PÚBLICAS                                                     */}
        {/* ================================================================== */}

        {/* ------------------------------------------------------------------ */}
        {/* LOGIN                                                              */}
        {/* ------------------------------------------------------------------ */}

        {/*
         * Pantalla de inicio de sesión.
         *
         * PublicRoute evita que un usuario que ya tiene una sesión activa
         * vuelva innecesariamente al Login.
         */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* MODO DEMO                                                          */}
        {/* ------------------------------------------------------------------ */}

        {/*
         * Modo demostración para visitantes.
         *
         * Esta ruta NO utiliza ProtectedRoute.
         *
         * El usuario puede acceder sin iniciar sesión y explorar la aplicación
         * utilizando datos simulados.
         */}
        <Route
          path="/demo"
          element={<Demo />}
        />

        {/* ================================================================== */}
        {/* RUTAS DE ESTUDIANTE                                                */}
        {/* ================================================================== */}

        {/* ------------------------------------------------------------------ */}
        {/* DASHBOARD                                                           */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* DETALLE DE EVENTO                                                   */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/event/:id"
          element={
            <ProtectedRoute allowedRole="student">
              <EventDetail />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* HISTORIAL                                                           */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/historial"
          element={
            <ProtectedRoute allowedRole="student">
              <DecisionHistory />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* NOTIFICACIONES                                                      */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute allowedRole="student">
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* AHORROS                                                             */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/savings"
          element={
            <ProtectedRoute allowedRole="student">
              <Savings />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* PRÉSTAMOS                                                           */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/loans"
          element={
            <ProtectedRoute allowedRole="student">
              <Loans />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* ESTADO FINANCIERO                                                  */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/student/financial-status"
          element={
            <ProtectedRoute allowedRole="student">
              <FinancialStatus />
            </ProtectedRoute>
          }
        />

        {/* ================================================================== */}
        {/* RUTAS DE PROFESOR                                                  */}
        {/* ================================================================== */}

        {/* ------------------------------------------------------------------ */}
        {/* DASHBOARD                                                           */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* CREAR EVENTO                                                        */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/teacher/create-event"
          element={
            <ProtectedRoute allowedRole="teacher">
              <CreateEvent />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* DETALLE DE EVENTO                                                   */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/teacher/event/:id"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherEventDetail />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* REPORTES                                                            */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherReports />
            </ProtectedRoute>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* GESTIÓN                                                             */}
        {/* ------------------------------------------------------------------ */}

        <Route
          path="/teacher/manage"
          element={
            <ProtectedRoute allowedRole="teacher">
              <ManageUsersEvents />
            </ProtectedRoute>
          }
        />

        {/* ================================================================== */}
        {/* RUTAS COMPARTIDAS                                                  */}
        {/* ================================================================== */}

        {/*
         * Perfil del usuario.
         *
         * Puede ser utilizado tanto por estudiantes como por profesores,
         * pero requiere una sesión autenticada.
         */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>
  )
}