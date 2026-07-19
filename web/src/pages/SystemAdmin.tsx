import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Server, Database, Activity, Settings, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink, Shield, Globe, HardDrive, Users, Package, FileText, ChevronDown, ChevronRight, Save, AlertTriangle, Image, LayoutDashboard, Receipt, FileCog, HelpCircle } from 'lucide-react'

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
    metadata: any
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
  { id: 'cloudinary', label: 'Cloudinary', description: 'Panel de imágenes y assets', icon: Image, editable: true, configKey: 'link_cloudinary' },
]

const LINK_DEFAULTS: Record<string, string> = {
  link_github: 'https://github.com/warchati/spare-parts-pos',
  link_vercel: 'https://vercel.com/nyumoviescom-gmailcoms-projects',
  link_database: 'https://console.neon.tech',
  link_cloudinary: 'https://console.cloudinary.com',
}

export default function SystemAdmin() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [links, setLinks] = useState<SystemLink[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    links: true,
    version: true,
    shortcuts: true,
    logs: false,
    help: false,
    config: false,
  })
  const [editingLink, setEditingLink] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [backendChanged, setBackendChanged] = useState(false)
  const [helpOpen, setHelpOpen] = useState<Record<string, boolean>>({
    server: false,
    database: false,
    config: false,
    users: false,
    daily: false,
  })

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const res = await api.get('/system/status')
        const statusData = res.data as SystemStatus
        setStatus(statusData)
        setError('')

        const configRes = await api.get('/system/config')
        const saved = configRes.data as Record<string, string>
        const merged = DEFAULT_LINKS.map(link => {
          let url = link.id === 'frontend'
            ? window.location.origin
            : saved[link.configKey || ''] || ''
          if (!url && link.configKey) {
            if (link.id === 'backend' && statusData.server?.apiBaseUrl) {
              url = statusData.server.apiBaseUrl
            } else if (LINK_DEFAULTS[link.configKey]) {
              url = LINK_DEFAULTS[link.configKey]
            }
            if (url) api.put('/system/config', { key: link.configKey, value: url }).catch(() => {})
          }
          return { ...link, url }
        })
        setLinks(merged)
      } catch (e: any) {
        setError(e.response?.data?.error || 'Error al cargar estado del sistema')
      } finally {
        setLoading(false)
      }
    }
    init()
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
          : saved[link.configKey || ''] || (link.id === 'backend' && status?.server?.apiBaseUrl ? status.server.apiBaseUrl : LINK_DEFAULTS[link.configKey || ''] || ''),
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
      if (id === 'backend') {
        localStorage.setItem('api_base_url', editValue)
        setBackendChanged(true)
        setSaveMsg('Servidor actualizado. Haz clic en "Recargar" para aplicar cambios.')
      } else {
        setSaveMsg('Guardado correctamente en la base de datos')
      }
      setEditingLink(null)
      setTimeout(() => setSaveMsg(''), 5000)
    } catch {
      if (id === 'backend') {
        localStorage.setItem('api_base_url', editValue)
        setBackendChanged(true)
        setSaveMsg('URL guardada localmente. Haz clic en "Recargar" para aplicar.')
        setEditingLink(null)
      } else {
        setSaveMsg('Error al guardar')
      }
      setTimeout(() => setSaveMsg(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (link: SystemLink) => {
    setEditingLink(link.id)
    setEditValue(link.url)
  }

  const resetBackendUrl = () => {
    localStorage.removeItem('api_base_url')
    setBackendChanged(true)
    setSaveMsg('URL restaurada al valor original. Recarga para aplicar.')
    setTimeout(() => setSaveMsg(''), 5000)
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
        <button onClick={async () => { await loadStatus(); await loadLinks() }} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {saveMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {saveMsg}
        </div>
      )}

      {backendChanged && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Cambiaste el servidor backend. Recarga la página para aplicar los cambios.</span>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors">
            <RefreshCw className="w-3 h-3" /> Recargar página
          </button>
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
                {link.id === 'backend' && localStorage.getItem('api_base_url') && editingLink !== link.id && (
                  <button onClick={resetBackendUrl} title="Restablecer URL original" className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Versión del Sistema" icon={<FileCog className="w-5 h-5" />} expanded={expandedSections.version} onToggle={() => toggleSection('version')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Versión</p>
            <p className="text-sm font-bold text-gray-800">Spare Parts POS v1.0</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Última actualización</p>
            <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString('es-VE')}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Stack</p>
            <p className="text-sm font-bold text-gray-800">React + Express + Prisma + Neon</p>
          </div>
        </div>
      </Section>

      <Section title="Accesos Rápidos" icon={<LayoutDashboard className="w-5 h-5" />} expanded={expandedSections.shortcuts} onToggle={() => toggleSection('shortcuts')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => navigate('/site-config')} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors text-left">
            <Settings className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">Config. Sitio</p>
              <p className="text-xs text-gray-500">Nombre, moneda, datos del negocio</p>
            </div>
          </button>
          <button onClick={() => navigate('/invoice-config')} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors text-left">
            <Receipt className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">Config. Factura</p>
              <p className="text-xs text-gray-500">RIF, dirección, mensajes</p>
            </div>
          </button>
          <button onClick={() => navigate('/users')} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors text-left">
            <Users className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800">Usuarios</p>
              <p className="text-xs text-gray-500">Gestionar cuentas y permisos</p>
            </div>
          </button>
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
                    <td className="py-2 px-3 text-gray-500 text-xs max-w-xs truncate">{log.metadata ? JSON.stringify(log.metadata) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">Sin registros de auditoría</p>
        )}
      </Section>

      <Section title="Ayuda / Tutorial" icon={<HelpCircle className="w-5 h-5" />} expanded={expandedSections.help} onToggle={() => toggleSection('help')}>
        <div className="space-y-3">

          {/* TEMA 1: Cambiar Servidor */}
          <HelpTopic title="Cambiar Servidor Backend" color="blue" isOpen={helpOpen.server} onToggle={() => setHelpOpen(p => ({ ...p, server: !p.server }))}>
            <p className="text-xs text-blue-700 mb-2">Si tu servidor actual se cae o vence (ej: free tier de Vercel), puedes cambiarlo desde aquí sin tocar código.</p>
            <p className="text-xs font-semibold text-blue-800 mb-1">Antes de empezar necesitas:</p>
            <ul className="text-xs text-blue-700 space-y-0.5 mb-3">
              <li>• Un servidor nuevo ya desplegado ( Railway, Render, etc.)</li>
              <li>• Las mismas variables de entorno: DATABASE_URL, JWT_SECRET, CLOUDINARY_*</li>
            </ul>
            <p className="text-xs font-semibold text-blue-800 mb-1">Pasos:</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Ve a <strong>Enlaces del Sistema</strong> (arriba en esta página)</li>
              <li>Haz clic en el ícono de engranaje junto a "Backend API"</li>
              <li>Escribe la nueva URL (ej: https://mi-nuevo-backend.vercel.app)</li>
              <li>Haz clic en <strong>Guardar</strong></li>
              <li>Haz clic en <strong>Recargar</strong> cuando aparezca el botón</li>
              <li>Listo, el sistema ahora apunta al nuevo servidor</li>
            </ol>
            <WarnBox text="El nuevo servidor debe tener el mismo JWT_SECRET para que las sesiones sigan funcionando. Si no lo tiene, los usuarios deberán iniciar sesión de nuevo." />
          </HelpTopic>

          {/* TEMA 2: Cambiar Base de Datos */}
          <HelpTopic title="Cambiar Base de Datos" color="green" isOpen={helpOpen.database} onToggle={() => setHelpOpen(p => ({ ...p, database: !p.database }))}>
            <p className="text-xs text-green-700 mb-2">Si tu base de datos actual se cae o cambias de proveedor (ej: Neon → Supabase), sigue estos pasos.</p>
            <p className="text-xs font-semibold text-green-800 mb-1">Antes de empezar necesitas:</p>
            <ul className="text-xs text-green-700 space-y-0.5 mb-3">
              <li>• Una cuenta en el nuevo proveedor (Supabase, Neon, etc.)</li>
              <li>• Un proyecto creado con base de datos PostgreSQL</li>
            </ul>
            <p className="text-xs font-semibold text-green-800 mb-1">Pasos:</p>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
              <li>Crea el proyecto en el nuevo proveedor</li>
              <li>Copia el <strong>DATABASE_URL</strong> (PostgreSQL connection string)</li>
              <li>Ve a <strong>Vercel → tu proyecto Backend → Settings → Environment Variables</strong></li>
              <li>Busca <strong>DATABASE_URL</strong>, haz clic en ⋯ → Edit</li>
              <li>Pega el nuevo URL → Save</li>
              <li>El backend se reinicia automáticamente (~30 segundos)</li>
              <li>En tu PC, abre PowerShell y ve a la carpeta del backend:</li>
            </ol>
            <div className="bg-green-100 rounded p-2 mt-2 mb-2">
              <code className="text-xs text-green-800">cd C:\Users\admin\spare-parts-pos\backend</code>
            </div>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside" start={8}>
              <li>Corre este comando para crear las tablas en la nueva BD:</li>
            </ol>
            <div className="bg-green-100 rounded p-2 mt-2 mb-2">
              <code className="text-xs text-green-800">npx prisma db push</code>
            </div>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside" start={9}>
              <li>Listo, la nueva BD tiene todas las tablas</li>
            </ol>
            <WarnBox text="Los datos NO se migran automáticamente. Si necesitas los datos viejos, exporta de Neon e importa en el nuevo proveedor antes de cambiar el URL." />
          </HelpTopic>

          {/* TEMA 3: Configurar el Sistema */}
          <HelpTopic title="Configurar el Sistema" color="purple" isOpen={helpOpen.config} onToggle={() => setHelpOpen(p => ({ ...p, config: !p.config }))}>
            <p className="text-xs text-purple-700 mb-2">Para cambiar los datos de tu negocio, moneda, logo y datos de factura.</p>
            <p className="text-xs font-semibold text-purple-800 mb-1">Configuración del Sitio:</p>
            <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Menú lateral → Config. Sitio</strong> (o haz clic en "Accesos Rápidos" arriba)</li>
              <li>Cambia el <strong>nombre del negocio</strong></li>
              <li>Cambia la <strong>moneda</strong> (ej: USD, EUR, Bs)</li>
              <li>Sube el <strong>logo</strong> (aparecerá en facturas y tickets)</li>
              <li>Haz clic en <strong>Guardar</strong></li>
            </ol>
            <p className="text-xs font-semibold text-purple-800 mb-1">Configuración de Factura:</p>
            <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
              <li>Ve a <strong>Menú lateral → Config. Factura</strong></li>
              <li>Cambia el <strong>RIF</strong> (identificación fiscal)</li>
              <li>Cambia la <strong>dirección</strong> del negocio</li>
              <li>Cambia el <strong>mensaje del pie</strong> (aparece al final de la factura)</li>
              <li>Haz clic en <strong>Guardar</strong></li>
            </ol>
          </HelpTopic>

          {/* TEMA 4: Gestionar Usuarios */}
          <HelpTopic title="Gestionar Usuarios" color="orange" isOpen={helpOpen.users} onToggle={() => setHelpOpen(p => ({ ...p, users: !p.users }))}>
            <p className="text-xs text-orange-700 mb-2">Para crear cuentas nuevas, cambiar roles o desactivar usuarios.</p>
            <p className="text-xs font-semibold text-orange-800 mb-1">Crear usuario nuevo:</p>
            <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Menú lateral → Usuarios</strong></li>
              <li>Haz clic en <strong>"Nuevo Usuario"</strong></li>
              <li>Escribe el <strong>nombre</strong>, <strong>usuario</strong> y <strong>contraseña</strong></li>
              <li>Selecciona el <strong>rol</strong> (ver abajo)</li>
              <li>Haz clic en <strong>Guardar</strong></li>
            </ol>
            <p className="text-xs font-semibold text-orange-800 mb-1">Roles disponibles:</p>
            <div className="bg-orange-50 rounded-lg p-3 mb-3">
              <div className="space-y-1.5">
                <div className="flex items-start gap-2"><span className="text-xs font-bold text-orange-600 w-20">admin</span><span className="text-xs text-orange-700">Control total. Puede cambiar configuración, usuarios, todo.</span></div>
                <div className="flex items-start gap-2"><span className="text-xs font-bold text-orange-600 w-20">supervisor</span><span className="text-xs text-orange-700">Puede vender, ver reportes, gestionar productos y clientes. No puede cambiar usuarios.</span></div>
                <div className="flex items-start gap-2"><span className="text-xs font-bold text-orange-600 w-20">cashier</span><span className="text-xs text-orange-700">Solo puede vender y abrir/cerrar caja. No ve reportes ni configura nada.</span></div>
                <div className="flex items-start gap-2"><span className="text-xs font-bold text-orange-600 w-20">seller</span><span className="text-xs text-orange-700">Puede vender y ver clientes. No puede cerrar caja ni ver reportes.</span></div>
              </div>
            </div>
            <p className="text-xs font-semibold text-orange-800 mb-1">Desactivar usuario:</p>
            <ol className="text-xs text-orange-700 space-y-1 list-decimal list-inside">
              <li>Ve a <strong>Usuarios</strong></li>
              <li>Haz clic en el ícono de <strong>editar</strong> (lápiz) junto al usuario</li>
              <li>Desmarca <strong>"Activo"</strong></li>
              <li>Haz clic en <strong>Guardar</strong></li>
              <li>El usuario ya no puede iniciar sesión</li>
            </ol>
          </HelpTopic>

          {/* TEMA 5: Uso Diario */}
          <HelpTopic title="Uso Diario del Sistema" color="cyan" isOpen={helpOpen.daily} onToggle={() => setHelpOpen(p => ({ ...p, daily: !p.daily }))}>
            <p className="text-xs text-cyan-700 mb-2">Cómo usar el sistema día a día: vender, caja, reportes y más.</p>
            <p className="text-xs font-semibold text-cyan-800 mb-1">Abrir Caja:</p>
            <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Menú lateral → Caja</strong></li>
              <li>Haz clic en <strong>"Abrir Caja"</strong></li>
              <li>Escribe el <strong>monto inicial</strong> (efectivo con el que abres)</li>
              <li>Haz clic en <strong>Confirmar</strong></li>
            </ol>
            <p className="text-xs font-semibold text-cyan-800 mb-1">Hacer una Venta:</p>
            <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Menú lateral → POS</strong></li>
              <li>Busca el producto por <strong>nombre o código</strong></li>
              <li>Haz clic en el producto o presiona <strong>Enter</strong> para agregarlo</li>
              <li>Cambia la <strong>cantidad</strong> si es necesario</li>
              <li>Selecciona el <strong>método de pago</strong> (efectivo, tarjeta, transferencia)</li>
              <li>Haz clic en <strong>"Cobrar"</strong></li>
              <li>Confirma la venta</li>
              <li>Se genera la factura automáticamente</li>
            </ol>
            <p className="text-xs font-semibold text-cyan-800 mb-1">Cerrar Caja:</p>
            <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Caja</strong></li>
              <li>Haz clic en <strong>"Cerrar Caja"</strong></li>
              <li>Cuenta el <strong>efectivo real</strong> y escríbelo</li>
              <li>El sistema muestra las <strong>diferencias</strong> (si las hay)</li>
              <li>Haz clic en <strong>Confirmar</strong></li>
            </ol>
            <p className="text-xs font-semibold text-cyan-800 mb-1">Ver Reportes:</p>
            <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside mb-3">
              <li>Ve a <strong>Menú lateral → Reportes</strong></li>
              <li>Selecciona el <strong>tipo de reporte</strong> (ventas, productos, etc.)</li>
              <li>Selecciona el <strong>período</strong></li>
              <li>Puedes <strong>exportar a Excel</strong> haciendo clic en el ícono</li>
            </ol>
            <p className="text-xs font-semibold text-cyan-800 mb-1">Agregar Producto:</p>
            <ol className="text-xs text-cyan-700 space-y-1 list-decimal list-inside">
              <li>Ve a <strong>Menú lateral → Productos</strong></li>
              <li>Haz clic en <strong>"Nuevo Producto"</strong></li>
              <li>Escribe el <strong>nombre</strong>, <strong>código</strong>, <strong>precio</strong> y <strong>stock</strong></li>
              <li>Selecciona la <strong>categoría</strong></li>
              <li>Haz clic en <strong>Guardar</strong></li>
            </ol>
          </HelpTopic>

        </div>
      </Section>

      <Section title="Configuración Avanzada" icon={<Settings className="w-5 h-5" />} expanded={expandedSections.config} onToggle={() => toggleSection('config')}>
        <div className="space-y-4">
          <ConfigRow label="CORS Origins" value="spare-parts-pos.vercel.app, pos-spare-parts.vercel.app, localhost:5173" />
          <ConfigRow label="Rate Limiting" value="200 peticiones / 15 minutos por IP" />
          <ConfigRow label="Account Lockout" value="5 intentos fallidos → 15 minutos de bloqueo" />
          <ConfigRow label="JWT Expiración" value="24 horas" />
          <ConfigRow label="Límite Upload" value="2MB (JSON), 5MB (imágenes Cloudinary)" />
          <ConfigRow label="Permisos" value="4 roles: admin, supervisor, cashier, seller" />
          <ConfigRow label="Base de Datos" value="Vercel → Variables de Entorno → Backend → DATABASE_URL" />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Database className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Cambiar de proveedor de BD (ej: Neon → Supabase):</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Crea el proyecto en el nuevo proveedor</li>
                <li>Copia el DATABASE_URL (PostgreSQL connection string)</li>
                <li>Actualízalo en Vercel → Variables de Entorno → Backend</li>
                <li>El backend se reiniciará automáticamente</li>
              </ol>
            </div>
          </div>
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

function HelpTopic({ title, color, isOpen, onToggle, children }: { title: string; color: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  const colors: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-500' },
    green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-800', icon: 'text-green-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-800', icon: 'text-purple-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-800', icon: 'text-orange-500' },
    cyan: { border: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-800', icon: 'text-cyan-500' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`rounded-lg border ${c.border} overflow-hidden`}>
      <button onClick={onToggle} className={`w-full flex items-center justify-between p-3 ${c.bg} hover:opacity-90 transition-opacity`}>
        <span className={`text-sm font-semibold ${c.text}`}>{title}</span>
        {isOpen ? <ChevronDown className={`w-4 h-4 ${c.icon}`} /> : <ChevronRight className={`w-4 h-4 ${c.icon}`} />}
      </button>
      {isOpen && <div className="p-3 bg-white border-t border-gray-100">{children}</div>}
    </div>
  )
}

function WarnBox({ text }: { text: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 mt-3">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700">{text}</p>
    </div>
  )
}
