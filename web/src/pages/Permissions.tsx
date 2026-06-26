import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Shield, Save, Check } from 'lucide-react'

const ROLES = ['admin', 'supervisor', 'cashier', 'seller']
const MODULES = ['pos', 'products', 'clients', 'suppliers', 'sales', 'purchases', 'dashboard', 'cashRegister', 'users', 'vehicles', 'credit', 'exports', 'taxes', 'currencies', 'returns']
const ACTIONS = ['view', 'create', 'edit', 'delete', 'sell', 'receive', 'open', 'close', 'movements', 'pay', 'redeem']

const MODULE_LABELS: Record<string, string> = {
  pos: 'POS', products: 'Productos', clients: 'Clientes', suppliers: 'Proveedores',
  sales: 'Ventas', purchases: 'Compras', dashboard: 'Dashboard',
  cashRegister: 'Caja', users: 'Usuarios', vehicles: 'Vehículos',
  credit: 'Crédito', exports: 'Exportaciones', taxes: 'Impuestos', currencies: 'Monedas', returns: 'Devoluciones',
}
const ACTION_LABELS: Record<string, string> = {
  view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
  sell: 'Vender', receive: 'Recibir', open: 'Abrir', close: 'Cerrar',
  movements: 'Movimientos', pay: 'Pagar', redeem: 'Canjear',
}

const MODULE_ACTIONS: Record<string, string[]> = {
  pos: ['sell'],
  products: ['view', 'create', 'edit'],
  clients: ['view', 'create', 'edit'],
  suppliers: ['view', 'create', 'edit'],
  sales: ['view', 'edit'],
  purchases: ['view', 'create', 'receive'],
  dashboard: ['view'],
  cashRegister: ['open', 'close', 'movements'],
  users: ['view', 'create', 'edit', 'delete'],
  vehicles: ['view', 'create', 'edit', 'delete'],
  credit: ['view', 'pay'],
  exports: ['view'],
  taxes: ['view', 'create', 'edit'],
  currencies: ['view', 'create', 'edit'],
  permissions: ['edit'],
  loyalty: ['view', 'edit', 'redeem'],
  returns: ['view', 'edit'],
}

export default function Permissions() {
  const [data, setData] = useState<Record<string, Record<string, string[]>>>({})
  const [selectedRole, setSelectedRole] = useState('cashier')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadPermissions() }, [])

  const loadPermissions = async () => {
    try {
      const res = await api.get('/permissions/roles')
      setData(res.data)
    } catch { alert('Error al cargar permisos') }
    finally { setLoading(false) }
  }

  const toggle = (module: string, action: string) => {
    const current = data[selectedRole]?.[module] || []
    const exists = current.includes(action)
    setData(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: exists ? current.filter((a: string) => a !== action) : [...current, action],
      },
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/permissions/roles/${selectedRole}`, { permissions: data[selectedRole] || {} })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { alert('Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Shield className="w-6 h-6" /> Gestión de Permisos</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Guardado</span>}
          <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {ROLES.map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              selectedRole === role ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3 w-40">Módulo</th>
              {ACTIONS.map(action => (
                <th key={action} className="text-center px-2 py-3 text-xs">{ACTION_LABELS[action]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(module => {
              const moduleActions = MODULE_ACTIONS[module] || []
              return (
                <tr key={module} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-sm">{MODULE_LABELS[module] || module}</td>
                  {ACTIONS.map(action => {
                    const enabled = data[selectedRole]?.[module]?.includes(action)
                    const isTypical = moduleActions.includes(action)
                    return (
                      <td
                        key={action}
                        className={`text-center px-2 py-3 ${isTypical ? 'bg-blue-50/40' : 'opacity-40'}`}
                      >
                        <button
                          onClick={() => toggle(module, action)}
                          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                            enabled ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent hover:border-gray-400'
                          } ${!isTypical && !enabled ? 'cursor-not-allowed' : ''}`}
                          title={isTypical ? `Acción recomendada para ${MODULE_LABELS[module] || module}` : `Acción no aplica a ${MODULE_LABELS[module] || module}`}
                        >
                          {enabled && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-gray-300 inline-block" />
          No aplica
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-50/60 border border-blue-200 inline-block" />
          Acción recomendada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-600 border border-blue-600 inline-block" />
          Permiso activo
        </span>
      </div>
    </div>
  )
}
