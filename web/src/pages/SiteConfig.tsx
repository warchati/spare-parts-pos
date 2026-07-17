import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Save, Upload, Store, X, AlertTriangle, Database, Package } from 'lucide-react'

const CLOUDINARY_CLOUD = 'vidcanal'
const CLOUDINARY_PRESET = 'm5vtjzdl'

type ResetMode = 'transactional' | 'master' | null

export default function SiteConfig() {
  const { user } = useAuth()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resetMode, setResetMode] = useState<ResetMode>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    api.get('/store-config').then(res => setConfig(res.data)).catch((e) => console.error('Failed to load store config:', e)).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/store-config', {
        companyName: config.companyName,
        description: config.description,
        logoUrl: config.logoUrl,
      })
      setConfig(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      window.dispatchEvent(new Event('store-changed'))
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', CLOUDINARY_PRESET)
      fd.append('folder', 'logos')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('Error al subir logo')
      const data = await res.json()
      setConfig({ ...config, logoUrl: data.secure_url })
    } catch (e) {
      console.error('Failed to upload logo:', e); alert('Error al subir el logo')
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    setConfig({ ...config, logoUrl: '' })
  }

  const handleReset = async () => {
    if (!resetPassword || !resetMode) return
    setResetting(true)
    setResetError('')
    try {
      await api.post(`/store-config/reset-${resetMode}`, { password: resetPassword })
      setResetMode(null)
      setResetPassword('')
      alert('Datos eliminados correctamente')
      window.location.reload()
    } catch (e: any) {
      setResetError(e.response?.data?.error || 'Error al resetear datos')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>
  if (!config) return <div className="p-6 text-red-500">Error al cargar configuración</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Store className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Configuración del Sitio</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Información</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Mi Tienda"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Lema</label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                rows={3}
                placeholder="Sistema de Postventa"
              />
              <p className="text-xs text-gray-400 mt-1">Se muestra debajo del nombre en el menú lateral</p>
            </div>

            <div className="border-t pt-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Logo</h2>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {config.logoUrl ? (
                    <div className="relative">
                      <img
                        src={config.logoUrl}
                        alt="Logo"
                        className="w-20 h-20 object-contain border border-gray-200 rounded-lg"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs leading-none hover:bg-red-600"
                      >
                        <X className="w-3 h-3 m-auto" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400">
                      {uploading ? (
                        <span className="text-xs text-gray-400">Subiendo...</span>
                      ) : (
                        <Upload className="w-6 h-6 text-gray-400" />
                      )}
                      <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Formatos: PNG, JPG, WEBP</p>
                  <p>Tamaño recomendado: 400x400px</p>
                  <p>Se sube directamente a Cloudinary</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
              </button>
            </div>

            {user?.role === 'admin' && (
              <div className="border-t border-red-200 pt-5">
                <div className="bg-red-50 rounded-lg border border-red-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h3 className="text-sm font-semibold text-red-700">Zona de Peligro</h3>
                  </div>
                  <p className="text-xs text-red-600">Estas acciones no se pueden deshacer. Requieren tu contraseña de administrador.</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setResetMode('transactional')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Database className="w-4 h-4" />
                      Resetear Datos Transaccionales
                    </button>
                    <button
                      onClick={() => setResetMode('master')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      Resetear Datos Maestros
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-red-700">
                    <div className="bg-red-100 rounded p-2">
                      <strong className="block mb-1">📊 Transaccionales</strong>
                      Ventas, compras, gastos, caja, movimientos de stock, ajustes de inventario, devoluciones, crédito, loyalty, auditoría
                    </div>
                    <div className="bg-red-100 rounded p-2">
                      <strong className="block mb-1">📦 Maestros</strong>
                      Productos, clientes, proveedores, vehículos, almacenes y ubicaciones
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Vista previa</h2>
            <p className="text-xs text-gray-400 mb-4">Así se verá en el menú lateral</p>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <Store className="w-5 h-5 text-blue-600" />
                )}
                <span className="text-sm font-bold text-gray-800 truncate">
                  {config.companyName || 'Mi Tienda'}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate pl-7">
                {config.description || 'Sistema de Postventa'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {resetMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-gray-800">
                {resetMode === 'transactional' ? 'Resetear Datos Transaccionales' : 'Resetear Datos Maestros'}
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {resetMode === 'transactional'
                ? 'Esta acción eliminará permanentemente ventas, compras, gastos, movimientos de caja, ajustes de inventario, devoluciones, crédito, transacciones de loyalty y registros de auditoría. Se mantendrán productos, clientes, proveedores, vehículos, almacenes y ubicaciones.'
                : 'Esta acción eliminará permanentemente productos, clientes, proveedores, vehículos, almacenes y ubicaciones. Se mantendrán las ventas, compras, gastos y demás datos transaccionales.'}
              Para confirmar, ingresa tu contraseña de administrador.
            </p>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => { setResetPassword(e.target.value); setResetError('') }}
              placeholder="Tu contraseña de administrador"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            />
            {resetError && (
              <p className="text-sm text-red-600 mb-3">{resetError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setResetMode(null); setResetPassword(''); setResetError('') }}
                disabled={resetting}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || !resetPassword}
                className={`flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${
                  resetMode === 'transactional' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {resetting ? 'Eliminando...' : `Sí, resetear ${resetMode === 'transactional' ? 'transaccionales' : 'maestros'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
