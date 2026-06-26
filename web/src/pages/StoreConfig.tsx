import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { Save, Upload, Building2 } from 'lucide-react'

export default function StoreConfig() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/store-config').then(res => setConfig(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/store-config', config)
      setConfig(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      try {
        const res = await api.post('/store-config/logo', { dataUrl })
        setConfig(res.data)
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al subir logo')
      }
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = async () => {
    try {
      const res = await api.post('/store-config/logo', { dataUrl: '' })
      setConfig(res.data)
    } catch {}
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>
  if (!config) return <div className="p-6 text-red-500">Error al cargar configuración</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Configuración de Factura</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            {config.logoUrl ? (
              <div className="relative">
                <img src={config.logoUrl} alt="Logo" className="w-24 h-24 object-contain border border-gray-200 rounded-lg" />
                <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs leading-none">x</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <p className="text-xs text-gray-400 mt-1 text-center">Logo</p>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
              <input type="text" value={config.companyName} onChange={(e) => setConfig({ ...config, companyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RNC</label>
                <input type="text" value={config.rnc} onChange={(e) => setConfig({ ...config, rnc: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={config.phone} onChange={(e) => setConfig({ ...config, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" value={config.address} onChange={(e) => setConfig({ ...config, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={config.email} onChange={(e) => setConfig({ ...config, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NCF (Comprobante Fiscal)</label>
                <input type="text" value={config.ncf} onChange={(e) => setConfig({ ...config, ncf: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="B01-00000001" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
