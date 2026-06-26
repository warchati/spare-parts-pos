import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Save, Upload, Store, X } from 'lucide-react'

const CLOUDINARY_CLOUD = 'vidcanal'
const CLOUDINARY_PRESET = 'm5vtjzdl'

export default function SiteConfig() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/store-config').then(res => setConfig(res.data)).catch(() => {}).finally(() => setLoading(false))
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
    } catch {
      alert('Error al subir el logo')
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    setConfig({ ...config, logoUrl: '' })
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
    </div>
  )
}
