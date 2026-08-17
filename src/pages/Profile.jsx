import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster, toast } from 'sonner'
import { auth } from '@/services/firebase'
import { updateUserName } from '@/services/users'
import { useAuth } from '@/context/AuthContext'

/**
 * Pantalla de perfil de usuario.
 * Accesible tanto para estudiantes (/profile) como para profesores (/profile).
 * Permite visualizar información básica y editar el nombre visible en la app.
 *
 * CAMPOS VISIBLES:
 * - Nombre editable  → guardado en users/{uid}.name
 * - Email            → solo lectura, viene de Google Auth
 * - Rol              → solo lectura, asignado al crear la cuenta
 *
 * IMPORTANTE:
 * Cambiar el nombre aquí NO afecta la cuenta de Google ni
 * los datos históricos (decisions, loans, etc.) que ya fueron guardados
 * con el nombre anterior — esos usan el uid como referencia, no el nombre.
 *
 * CARGA:
 * Mientras AuthContext está resolviendo los datos desde Firestore,
 * se muestra un skeleton para evitar parpadeos o valores en 0/vacíos.
 *
 * @returns {JSX.Element}
 */
export default function Profile() {
  const navigate        = useNavigate()

  /**
   * loading: true mientras AuthContext espera la primera respuesta de Firestore.
   * Se usa para mostrar el skeleton y evitar que el perfil aparezca con datos vacíos.
   */
  const { name, role, loading }  = useAuth()
  const user            = auth.currentUser

  // Controla si el campo de nombre está en modo edición
  const [editing,   setEditing]   = useState(false)
  const [newName,   setNewName]   = useState(name ?? '')
  const [saving,    setSaving]    = useState(false)

  // Ruta de regreso según el rol del usuario
  const backRoute = role === 'teacher' ? '/teacher' : '/student'

  /**
   * Activa el modo edición e inicializa el input con el nombre actual.
   */
  const handleStartEdit = () => {
    setNewName(name ?? '')
    setEditing(true)
  }

  /**
   * Cancela la edición sin guardar cambios.
   */
  const handleCancel = () => {
    setNewName(name ?? '')
    setEditing(false)
  }

  /**
   * Valida y guarda el nuevo nombre en `users/{uid}`.
   * AuthContext se actualiza automáticamente via onAuthStateChanged
   * que vuelve a leer el documento de Firestore.
   */
  const handleSave = async () => {
    if (!newName.trim()) {
      toast.error('El nombre no puede estar vacío')
      return
    }

    if (newName.trim() === name) {
      setEditing(false)
      return
    }

    if (newName.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setSaving(true)
    try {
      await updateUserName(user.uid, newName.trim())
      toast.success('Nombre actualizado correctamente')
      setEditing(false)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo actualizar el nombre')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Etiqueta legible del rol del usuario.
   */
  const roleLabel = role === 'teacher' ? 'Profesor' : 'Estudiante'

  /**
   * Colores del rol para el badge visual.
   */
  const roleStyle = role === 'teacher'
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-blue-100 text-blue-700 border-blue-200'

  // Gradiente del header — unificado para todos los roles
  const headerGradient = 'bg-gradient-to-r bg-blue-900'

  /**
   * Skeleton de carga del perfil.
   *
   * Se muestra mientras AuthContext aún está resolviendo los datos
   * desde Firestore (loading === true), evitando que el usuario vea
   * valores vacíos o en cero durante el primer render.
   *
   * Mantiene la misma estructura visual que el perfil real para
   * que la transición sea suave al terminar la carga.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-6">

        {/* HEADER — altura corregida para evitar excesos de espacio vertical */}
        <div className="bg-gradient-to-r bg-blue-900 text-white p-4 pb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Mi Perfil</h1>
              <p className="text-white/70 text-sm">Información de tu cuenta</p>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">

          {/* SKELETON: tarjeta de avatar y nombre */}
          <Card className="p-6 rounded-2xl shadow-lg border-0 text-center animate-pulse">
            {/* Círculo del avatar */}
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gray-200" />
            {/* Barra del nombre */}
            <div className="h-6 w-40 bg-gray-200 rounded-full mx-auto mb-3" />
            {/* Barra del badge de rol */}
            <div className="h-5 w-24 bg-gray-200 rounded-full mx-auto" />
          </Card>

          {/* SKELETON: tarjeta de información de cuenta */}
          <Card className="p-5 rounded-2xl shadow-sm animate-pulse">
            <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
            <div className="space-y-4">
              {/* Tres filas de campos: nombre, email, rol */}
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-6">
      <Toaster />

      {/* HEADER */}
      <div className={`${headerGradient} text-white p-4 pb-8`}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backRoute)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Mi Perfil</h1>
            <p className="text-white/70 text-sm">Información de tu cuenta</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* AVATAR Y NOMBRE */}
        <Card className="p-6 rounded-2xl shadow-lg border-0 text-center">

          {/* AVATAR CON INICIAL */}
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold bg-blue-900">
            {(name ?? '?')[0].toUpperCase()}
          </div>

          {/* NOMBRE — modo lectura o edición */}
          {!editing ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-xl font-bold">{name ?? '—'}</h2>
              <button
                onClick={handleStartEdit}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2 mb-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="text-center font-semibold"
                maxLength={40}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
              {/* BOTONES CONFIRMAR / CANCELAR */}
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}

          {/* BADGE DE ROL */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1 ${roleStyle}`}>
            <Shield className="w-3 h-3" />
            {roleLabel}
          </span>

        </Card>

        {/* INFORMACIÓN DE LA CUENTA — solo lectura */}
        <Card className="p-5 rounded-2xl shadow-sm">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
            Información de la cuenta
          </h3>

          <div className="space-y-4">

            {/* NOMBRE */}
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="text-sm font-medium truncate">{name ?? '—'}</p>
              </div>
            </div>

            {/* EMAIL */}
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">
                <Mail className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="text-sm font-medium truncate">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* ROL */}
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">
                <Shield className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Rol en el sistema</p>
                <p className="text-sm font-medium">{roleLabel}</p>
              </div>
            </div>

          </div>
        </Card>

        {/* NOTA INFORMATIVA */}
        <Card className="p-4 rounded-xl bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">Nota:</span> Solo puedes modificar tu nombre visible en la app.
            Tu correo y rol están vinculados a tu cuenta de Google y no pueden cambiarse desde aquí.
          </p>
        </Card>

      </div>
    </div>
  )
}