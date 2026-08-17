import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster, toast } from 'sonner'

import {
  loginWithGoogle,
  logout
} from '@/services/authentication'

import {
  createBaseUser,
  createStudentProfile,
  createTeacherProfile
} from '@/services/users'

import {
  createNotification,
  NOTIFICATION_TYPES
} from '@/services/notifications'

import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'

import { db } from '@/services/firebase'
import logoFinnova from '@/assets/logo-finnova.png'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  /**
   * ============================================================================
   * VERIFICAR WHITELIST DE DOCENTES
   * ============================================================================
   *
   * Consulta la colección `whitelistTeachers` utilizando el correo
   * del usuario autenticado.
   *
   * @param {string} email - Correo electrónico del usuario.
   * @returns {Promise<boolean>} true si el correo está autorizado.
   */
  const checkIfTeacher = async (email) => {
    const q = query(
      collection(db, 'whitelistTeachers'),
      where('email', '==', email)
    )

    const snapshot = await getDocs(q)

    return !snapshot.empty
  }

  /**
   * ============================================================================
   * VERIFICAR WHITELIST DE ESTUDIANTES
   * ============================================================================
   *
   * Consulta la colección `whitelistStudents` utilizando el correo
   * del usuario autenticado.
   *
   * @param {string} email - Correo electrónico del usuario.
   * @returns {Promise<boolean>} true si el correo está autorizado.
   */
  const checkIfStudent = async (email) => {
    const q = query(
      collection(db, 'whitelistStudents'),
      where('email', '==', email)
    )

    const snapshot = await getDocs(q)

    return !snapshot.empty
  }

  /**
   * ============================================================================
   * FLUJO PRINCIPAL DE AUTENTICACIÓN
   * ============================================================================
   *
   * Flujo:
   *
   * 1. Autenticar mediante Google.
   * 2. Verificar whitelist de docentes.
   * 3. Si no es docente, verificar whitelist de estudiantes.
   * 4. Si no pertenece a ninguna whitelist, cerrar sesión.
   * 5. Asignar el rol correspondiente.
   * 6. Crear el documento base del usuario.
   * 7. Crear el perfil específico según el rol.
   * 8. Crear notificación de bienvenida para estudiantes nuevos.
   *
   * La redirección posterior queda a cargo de AuthContext / PublicRoute.
   */
  const handleLogin = async () => {
    setLoading(true)

    try {
      /**
       * PASO 1 — AUTENTICAR USUARIO
       */
      const firebaseUser = await loginWithGoogle()

      console.log(
        'Usuario autenticado:',
        firebaseUser.email
      )

      /**
       * PASO 2 — VERIFICAR WHITELIST DE DOCENTES
       */
      const isTeacher = await checkIfTeacher(
        firebaseUser.email
      )

      console.log(
        '¿Es teacher?:',
        isTeacher
      )

      let role

      /**
       * PASO 3 — DETERMINAR ROL
       *
       * Si pertenece a whitelistTeachers,
       * recibe el rol `teacher`.
       */
      if (isTeacher) {
        role = 'teacher'
      } else {
        /**
         * PASO 4 — VERIFICAR WHITELIST DE ESTUDIANTES
         *
         * Solo se consulta si el usuario no es docente.
         */
        const isStudent = await checkIfStudent(
          firebaseUser.email
        )

        console.log(
          '¿Es student?:',
          isStudent
        )

        /**
         * Si tampoco pertenece a whitelistStudents,
         * no tiene autorización para utilizar la plataforma.
         */
        if (!isStudent) {
          await logout()

          setLoading(false)

          setTimeout(() => {
            toast.error(
              'No tienes acceso a la plataforma. Comunícate con tu profesor asignado para crear tu usuario personal.',
              {
                duration: 6000
              }
            )
          }, 500)

          return
        }

        /**
         * El usuario está autorizado como estudiante.
         */
        role = 'student'
      }

      console.log(
        'Rol asignado:',
        role
      )

      /**
       * PASO 5 — CREAR DOCUMENTO BASE
       *
       * Crea el documento `users/{uid}` si no existe.
       *
       * Retorna:
       * true  → usuario nuevo.
       * false → usuario existente.
       */
      const isNewUser = await createBaseUser(
        firebaseUser,
        role
      )

      /**
       * PASO 6 — CREAR PERFIL SEGÚN EL ROL
       */
      if (role === 'student') {
        /**
         * Crear perfil específico del estudiante.
         */
        await createStudentProfile(
          firebaseUser.uid
        )

        /**
         * PASO 7 — NOTIFICACIÓN DE BIENVENIDA
         *
         * Solo se crea cuando el estudiante
         * está entrando por primera vez.
         */
        if (isNewUser) {
          await createNotification(
            firebaseUser.uid,
            NOTIFICATION_TYPES.WELCOME,
            '¡Bienvenido a Finnova!',
            'Tu cuenta fue creada exitosamente. Tienes ₡100,000 disponibles para comenzar tu simulación financiera.'
          )
        }
      } else {
        /**
         * Crear perfil específico del docente.
         */
        await createTeacherProfile(
          firebaseUser.uid
        )
      }

      /**
       * PASO 8 — FINALIZAR AUTENTICACIÓN
       *
       * No realizamos navegación manual.
       *
       * AuthContext detecta el usuario autenticado
       * y PublicRoute se encarga de la redirección
       * correspondiente según el rol.
       */

    } catch (error) {
      console.error(
        'Error en login:',
        error
      )

      toast.error(
        'No se pudo iniciar sesión. Intenta de nuevo.'
      )

      setLoading(false)
    }
  }

  /**
   * ============================================================================
   * INTERFAZ
   * ============================================================================
   */
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 flex items-center justify-center p-4">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-200/40 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-indigo-100/30 blur-3xl" />

      </div>

      {/* Contenedor global de notificaciones */}
      <Toaster />

      <div className="relative z-10 w-full max-w-md">

        {/* ================================================================
            IDENTIDAD DE LA PLATAFORMA
            ================================================================ */}
        <div className="text-center mb-7">

          {/* Logo principal */}
          <div className="flex items-center justify-center mb-5">

            <div className="relative">

              <div className="absolute inset-0 rounded-3xl bg-blue-200/50 blur-xl scale-110" />

              <div className="relative w-24 h-24 rounded-3xl bg-white shadow-lg border border-slate-200/80 flex items-center justify-center">

                <img
                  src={logoFinnova}
                  alt="Finnova ASOPRO"
                  className="w-20 h-20 object-contain"
                />

              </div>

            </div>

          </div>

          {/* Nombre de la plataforma */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-950">
            Finnova <span className="text-blue-700">ASOPRO</span>
          </h1>

          {/* Descripción */}
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Simulación Financiera Educativa
          </p>

          {/* Indicadores */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Plataforma segura
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              Educación financiera
            </div>

          </div>

        </div>

        {/* ================================================================
            TARJETA PRINCIPAL
            ================================================================ */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl shadow-slate-300/40 border border-slate-200/80 overflow-hidden">

          {/* Franja superior */}
          <div className="h-1.5 bg-gradient-to-r from-blue-950 via-blue-700 to-sky-400" />

          <div className="p-6 sm:p-7">

            {/* Encabezado */}
            <div className="text-center mb-6">

              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 mb-3">
                <LogIn className="w-5 h-5" />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Iniciar sesión
              </h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Acceso exclusivo para usuarios registrados y autorizados.
              </p>

            </div>

            {/* ============================================================
                LOGIN REAL
                ============================================================ */}
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="group relative w-full h-12 rounded-xl overflow-hidden bg-blue-950 hover:bg-blue-900 text-white shadow-lg shadow-blue-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-950/25 disabled:opacity-60 disabled:hover:translate-y-0"
            >

              <span className="flex items-center justify-center gap-2.5">

                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.22a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.39Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.5A9.75 9.75 0 0 0 12 21.75Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M6.54 13.85A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.27.31-1.85v-2.5H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.35l3.24-2.5Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 6.12c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.18 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.4l3.24 2.5c.77-2.31 2.92-4.03 5.46-4.03Z"
                      />
                    </svg>

                    Continuar con Google

                    <ArrowRight className="w-4 h-4 opacity-60 transition-transform group-hover:translate-x-1" />
                  </>
                )}

              </span>

            </Button>

            {/* Texto explicativo del login */}
            <div className="flex items-start gap-2 mt-3 px-1">

              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />

              <p className="text-xs text-slate-500 leading-relaxed">
                Utiliza una cuenta previamente registrada y autorizada
                por Finnova ASOPRO.
              </p>

            </div>

            {/* ============================================================
                SEPARADOR
                ============================================================ */}
            <div className="flex items-center gap-3 my-6">

              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                o
              </span>

              <div className="h-px flex-1 bg-slate-200" />

            </div>

            {/* ============================================================
                DEMO
                ============================================================ */}
            <div className="relative rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4">

              {/* Decoración */}
              <div className="absolute top-3 right-3">

                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-sky-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  <Sparkles className="w-3 h-3" />
                  Demo
                </span>

              </div>

              <div className="pr-14">

                <h3 className="font-semibold text-slate-900 text-sm">
                  ¿Quieres explorar Finnova?
                </h3>

                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Explora las vistas de estudiante y profesor con datos
                  completamente simulados.
                </p>

              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/demo')}
                className="group w-full h-11 mt-4 rounded-xl border-blue-300 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-800 font-semibold transition-all duration-200 shadow-sm"
              >

                <span className="flex items-center justify-center gap-2">

                  <GraduationCap className="w-4 h-4" />

                  Explorar como invitado

                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />

                </span>

              </Button>

              <p className="text-[11px] text-center text-slate-500 mt-2.5">
                No necesitas una cuenta · Los cambios no se guardarán
              </p>

            </div>

          </div>

          {/* Pie de tarjeta */}
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">

            <p className="text-[11px] text-center text-slate-400">
              Finnova ASOPRO · Plataforma de simulación financiera educativa
            </p>

          </div>

        </div>

        {/* ================================================================
            NOTA INFERIOR
            ================================================================ */}
        <p className="text-center text-[11px] text-slate-400 mt-5 px-4">
          Acceso controlado mediante cuentas autorizadas.
        </p>

      </div>

    </div>
  )
}