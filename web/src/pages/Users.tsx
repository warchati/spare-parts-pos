import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, UserCog, Shield, ToggleLeft, ToggleRight, Check, X } from 'lucide-react'

interface User {
  id: number
  username: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

const roleBadge: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  cashier: 'Cajero',
}

const MODULES = ['pos', 'products', 'clients', 'suppliers', 'sales', 'purchases', 'dashboard', 'cashRegister', 'audit', 'users', 'vehicles', 'credit', 'exports', 'taxes', 'currencies', 'expenses']
const ACTIONS = ['view', 'create', 'edit', 'delete', 'sell', 'receive', 'open', 'close', 'movements', 'pay']
const MODULE_LABELS: Record<string, string> = {
  pos: 'POS', products: 'Productos', clients: 'Clientes', suppliers: 'Proveedores',
  sales: 'Ventas', purchases: 'Compras', dashboard: 'Dashboard',
  cashRegister: 'Caja', users: 'Usuarios', vehicles: 'Vehículos',
  credit: 'Crédito', exports: 'Exportaciones', taxes: 'Impuestos', currencies: 'Monedas', expenses: 'Gastos',
}
const ACTION_LABELS: Record<string, string> = {
  view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
  sell: 'Vender', receive: 'Recibir', open: 'Abrir', close: 'Cerrar',
  movements: 'Movimientos', pay: 'Pagar',
}

export default function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', role: 'cashier' })
  const [showPermsFor, setShowPermsFor] = useState<User | null>(null)
  const [userPerms, setUserPerms] = useState<Record<string, string[]>>({})
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({})
  const [savingPerms, setSavingPerms] = useState(false)

  useEffect(() => { loadUsers() }, [search])

  const loadUsers = async () => {
    try {
      const res = await api.get('/users', { params: { q: search || undefined } })
      setUsers(res.data)
    } catch (e) { console.error(e) }
  }

  const openPermissions = async (u: User) => {
    setShowPermsFor(u)
    try {
      const res = await api.get(`/users/${u.id}/permissions`)
      setRolePerms(res.data.effective)
    } catch {
      alert('Error al cargar permisos')
    }
  }

  const toggleUserPerm = (module: string, action: string) => {
    setUserPerms(prev => {
      const current = prev[module] || []
      const exists = current.includes(action)
      return {
        ...prev,
        [module]: exists ? current.filter((a: string) => a !== action) : [...current, action],
      }
    })
  }

  // Determine if a specific toggle is checked based on role perms + user overrides
  const isPermChecked = (module: string, action: string) => {
    const hasRole = rolePerms[module]?.includes(action)
    // If the user has an override list, check it there. Otherwise fallback to role.
    if (userPerms[module] !== undefined) {
      return userPerms[module].includes(action)
    }
    return !!hasRole
  }

  const savePermissions = async () => {
    setSavingPerms(true)
    try {
      const overrides: { module: string, action: string, granted: boolean }[] = []
      for (const [module, actions] of Object.entries(userPerms)) {
        for (const action of actions) {
          const hasRole = rolePerms[module]?.includes(action)
          const hasOverride = userPerms[module]?.includes(action)
          if (hasOverride !== hasRole) {
            overrides.push({ module, action, granted: hasOverride })
          }
        }
      }
      // Also check for removals
      for (const [module, actions] of Object.entries(rolePerms)) {
        for (const action of actions) {
          if (userPerms[module] && !userPerms[module].includes(action)) {
            overrides.push({ module, action, granted: false })
          }
        }
      }
      await api.put(`/users/${showPermsFor!.id}/permissions`, { permissions: overrides })
      setShowPermsFor(null)
      setUserPerms({})
    } catch {
      alert('Error al guardar permisos')
    } finally {
      setSavingPerms(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editing) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', form)
      }
      setShowForm(false)
      setEditing(null)
      setForm({ username: '', name: '', email: '', password: '', role: 'cashier' })
      loadUsers()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar')
    }
  }

  const toggleActive = async (u: User) => {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active })
      loadUsers()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR')

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserCog className="w-6 h-6" /> Usuarios
        </h1>
        {can(user?.role, 'users', 'create') && (
          <button onClick={() => { setEditing(null); setForm({ username: '', name: '', email: '', password: '', role: 'cashier' }); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o usuario..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Creado</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-500">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge[u.role] || 'bg-gray-100 text-gray-700'}`}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'users', 'edit') && (
                      <button onClick={() => toggleActive(u)} className="p-1.5 hover:bg-gray-100 rounded" title={u.active ? 'Desactivar' : 'Activar'}>
                        {u.active ? <ToggleRight className="w-4 h-4 text-gray-400" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                      </button>
                    )}
                    {can(user?.role, 'users', 'edit') && (
                      <button onClick={() => openPermissions(u)} className="p-1.5 hover:bg-gray-100 rounded" title="Permisos">
                        <Shield className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {can(user?.role, 'users', 'edit') && (
                      <button onClick={() => { setEditing(u); setForm({ username: u.username, name: u.name, email: u.email, password: '', role: u.role }); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded">
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay usuarios</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showPermsFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Permisos: {showPermsFor.name}</h2>
              <button onClick={() => { setShowPermsFor(null); setUserPerms({}) }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Rol base: <span className="font-medium capitalize">{showPermsFor.role}</span> — los cambios crean sobre-escrituras para este usuario específico</p>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="text-left px-3 py-2 w-32">Módulo</th>
                  {ACTIONS.map(a => <th key={a} className="text-center px-1 py-2">{ACTION_LABELS[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => (
                  <tr key={module} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{MODULE_LABELS[module] || module}</td>
                    {ACTIONS.map(action => {
                      const checked = isPermChecked(module, action)
                      return (
                        <td key={action} className="text-center px-1 py-2">
                          <button
                            onClick={() => toggleUserPerm(module, action)}
                            className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition-colors ${
                              checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowPermsFor(null); setUserPerms({}) }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={savePermissions} disabled={savingPerms} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingPerms ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cashier">Cajero</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
