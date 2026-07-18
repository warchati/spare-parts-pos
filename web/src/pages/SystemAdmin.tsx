import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Server, Database, Activity, Settings, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink, Shield, Globe, HardDrive, BarChart3, Users, Package, ShoppingCart, FileText, ChevronDown, ChevronRight, Save, AlertTriangle } from 'lucide-react'

interface SystemStatus {
  status: string
  timestamp: string
  server: {
    nodeEnv: string
    vercel: boolean
    region: string
    apiBaseUrl: string
    frontendUrl: string
  }
  database: {
    status: string
    latencyMs: number
  }
  stats: {
    users: number
    products: number
    sales: number
    auditLogs: number
  }
  recentAudit: {
    id: number
    entity: string
    action: string
    createdAt: string
    details: string | null
  }[]
}

interface SystemLink {
  id: string
  label: string
  url: string
  description: string
  icon: any
  editable: boolean
  configKey?: string
}

const DEFAULT_LINKS: Omit<SystemLink, 'url'>[] = [
  { id: 'backend', label: 'Backend API', description: 'URL del servidor backend', icon: Server, editable: true, configKey: 'link_backend' },
  { id: 'frontend', label: 'Frontend', description: 'URL del frontend actual', icon: Globe, editable: false },
  { id: 'github', label: 'Repositorio GitHub', description: 'Código fuente del proyecto', icon: FileText, editable: true, configKey: 'link_github' },
  { id: 'vercel', label: 'Panel Vercel', description: 'Dashboard de despliegues', icon: HardDrive, editable: true, configKey: 'link_vercel' },
  { id: 'database', label: 'Base de Datos', description: 'Panel de la base de datos (Neon)', icon: Database, editable: true, configKey: 'link_database' },
]

export default function SystemAdmin() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [links, setLinks] = useState<SystemLink[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    links: true,
    logs: false,
    config: false,
  })
  const [editingLink, setEditingLink] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    loadStatus()
    loadLinks()
  }, [])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const res = await api.get('/system/status')
      setStatus(res.data)
      setError('')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al cargar estado del sistema')
    } finally {
      setLoading(false)
    }
  }

  const loadLinks = async () => {
    try {
      const res = await api.get('/system/config')
      const saved = res.data as Record<string, string>
      const merged = DEFAULT_LINKS.map(link => ({
        ...link,
        url: link.id === 'frontend'
          ? window.location.origin
          : saved[link.configKey || ''] || '',
      }))
      setLinks(merged)
    } catch {
      const fallback = DEFAULT_LINKS.map(link => ({
        ...link,
        url: link.id === 'frontend' ? window.location.origin : '',
      }))
      setLinks(fallback)
    }
  }

  const saveLink = async (id: string) => {
    const link = links.find(l => l.id === id)
    if (!link?.configKey) return
    setSaving(true)
    try {
      await api.put('/system/config', { key: link.configKey, value: editValue })
      setLinks(prev => prev.map(l => l.id === id ? { ...l, url: editValue } : l))
      setEditingLink(null)
      setSaveMsg('Guardado correctamente en la base de datos')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('Error al guardar')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (link: SystemLink) => {
    setEditingLink(link.id)
    setEditValue(link.url)
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Estado, configuración y enlaces del sistema</p>
        </div>
        <button onClick={loadStatus} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {saveMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {saveMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Section title="Estado del Sistema" icon={<Activity className="w-5 h-5" />} expanded={expandedSections.status} onToggle={() => toggleSection('status')}>
        {loading && !status ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : status ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard
                icon={<Server className="w-5 h-5" />}
                label="Backend"
                value={status.status === 'ok' ? 'Activo' : 'Error'}
                color={status.status === 'ok' ? 'green' : 'red'}
              />
              <StatusCard
                icon={<Database className="w-5 h-5" />}
                label="Base de Datos"
                value={status.database.status === 'connected' ? `Conectada (${status.database.latencyMs}ms)` : 'Desconectada'}
                color={status.database.status === 'connected' ? 'green' : 'red'}
              />
              <StatusCard
                icon={<Shield className="w-5 h-5" />}
                label="Entorno"
                value={status.server.nodeEnv === 'production' ? 'Producción' : 'Desarrollo'}
                color={status.server.nodeEnv === 'production' ? 'blue' : 'yellow'}
              />
              <StatusCard
                icon={<Globe className="w-5 h-5" />}
                label="Región"
                value={status.server.vercel ? status.server.region : 'Local'}
                color="purple"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard icon={<Users className="w-4 h-4" />} label="Usuarios" value={status.stats.users} />
              <StatCard icon={<Package className="w-4 h-4" />} label="Productos" value={status.stats.products} />
              <StatCard icon={<ShoppingCart className="w-4 h-4" />} label="Ventas" value={status.stats.sales} />
              <StatCard icon={<FileText className="w-4 h-4" />} label="Auditoría" value={status.stats.auditLogs} />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Última verificación: {formatDate(status.timestamp)}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Enlaces del Sistema" icon={<ExternalLink className="w-5 h-5" />} expanded={expandedSections.links} onToggle={() => toggleSection('links')}>
        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <link.icon className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{link.label}</p>
                  {editingLink === link.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 text-xs px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                        autoFocus
                      />
                      <button onClick={() => saveLink(link.id)} disabled={saving} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingLink(null)} className="p-1 bg-gray-300 text-gray-600 rounded hover:bg-gray-400">
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 truncate">{link.url || 'No configurado'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {link.url && editingLink !== link.id && (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {link.editable && editingLink !== link.id && (
                  <button onClick={() => startEdit(link)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Logs de Auditoría" icon={<FileText className="w-5 h-5" />} expanded={expandedSections.logs} onToggle={() => toggleSection('logs')}>
        {status?.recentAudit && status.recentAudit.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Fecha</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Entidad</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Acción</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {status.recentAudit.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{log.entity}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{log.action}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs max-w-xs truncate">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">Sin registros de auditoría</p>
        )}
      </Section>

      <Section title="Configuración Avanzada" icon={<Settings className="w-5 h-5" />} expanded={expandedSections.config} onToggle={() => toggleSection('config')}>
        <div className="space-y-4">
          <ConfigRow label="CORS Origins" value="spare-parts-pos.vercel.app, pos-spare-parts.vercel.app, localhost:5173" />
          <ConfigRow label="Rate Limiting" value="200 peticiones / 15 minutos por IP" />
          <ConfigRow label="Account Lockout" value="5 intentos fallidos → 15 minutos de bloqueo" />
          <ConfigRow label="JWT Expiración" value="24 horas" />
          <ConfigRow label="Límite Upload" value="2MB (JSON), 5MB (imágenes Cloudinary)" />
          <ConfigRow label="Permisos" value="4 roles: admin, supervisor, cashier, seller" />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Los cambios en CORS, Rate Limiting y permisos requieren modificar el código del backend y redesplegar.</p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, expanded, onToggle, children }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            {icon}
          </div>
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  )
}

function StatusCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-75">{label}</span>
      </div>
      <p className="text-sm font-bold">{value}</p>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-2 mb-1 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-800">{value.toLocaleString()}</p>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-500 text-right ml-4">{value}</span>
    </div>
  )
}
