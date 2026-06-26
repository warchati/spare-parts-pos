import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, Layers, X, ChevronRight, ChevronDown } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  ZONE: 'Zona', AISLE: 'Pasillo', RACK: 'Estante', SHELF: 'Anaquel', BIN: 'Ubicación',
}

export default function Locations() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const warehouseIdParam = searchParams.get('warehouseId')

  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseIdParam || '')
  const [locations, setLocations] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [childrenMap, setChildrenMap] = useState<Record<number, any[]>>({})
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ warehouseId: 0, parentId: '', name: '', code: '', type: 'BIN', sortOrder: 0 })

  useEffect(() => {
    api.get('/warehouses').then(res => setWarehouses(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedWarehouse) { loadLocations(); setChildrenMap({}) }
    else setLocations([])
  }, [selectedWarehouse])

  const loadLocations = async () => {
    try {
      const res = await api.get('/locations', { params: { warehouseId: selectedWarehouse, parentId: 'null' } })
      setLocations(res.data)
    } catch {}
  }

  const loadChildren = async (parentId: number): Promise<any[]> => {
    try {
      const res = await api.get('/locations', { params: { warehouseId: selectedWarehouse, parentId } })
      return res.data
    } catch { return [] }
  }

  const toggleExpand = async (id: number) => {
    const next = new Set(expanded)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      if (!childrenMap[id]) {
        const children = await loadChildren(id)
        setChildrenMap(prev => ({ ...prev, [id]: children }))
      }
    }
    setExpanded(next)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        warehouseId: Number(form.warehouseId),
        parentId: form.parentId ? Number(form.parentId) : null,
        sortOrder: Number(form.sortOrder) || 0,
      }
      if (editing?.id) {
        await api.put(`/locations/${editing.id}`, payload)
        setShowForm(false); setEditing(null)
        loadLocations()
        setChildrenMap({})
      } else {
        await api.post('/locations', payload)
        setShowForm(false); setEditing(null)
        if (payload.parentId) {
          await loadLocations()
          const children = await loadChildren(payload.parentId)
          setChildrenMap(prev => ({ ...prev, [payload.parentId!]: children }))
          setExpanded(prev => new Set(prev).add(payload.parentId!))
        } else {
          loadLocations()
        }
      }
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar esta ubicación?')) return
    try {
      await api.delete(`/locations/${id}`)
      loadLocations()
      setChildrenMap({})
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const openForm = (loc?: any) => {
    const isEdit = loc?.id != null
    setEditing(isEdit ? loc : null)
    setForm(isEdit ? {
      warehouseId: loc.warehouseId,
      parentId: loc.parentId || '',
      name: loc.name,
      code: loc.code,
      type: loc.type,
      sortOrder: loc.sortOrder,
    } : {
      warehouseId: loc?.warehouseId || Number(selectedWarehouse),
      parentId: loc?.parentId || '',
      name: '', code: '', type: 'BIN', sortOrder: 0,
    })
    setShowForm(true)
  }

  const renderLocationRows = (loc: any, depth = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [
      <tr key={loc.id} className="border-t border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-1">
            {loc._count?.children > 0 ? (
              <button onClick={() => toggleExpand(loc.id)} className="p-0.5 hover:bg-gray-100 rounded">
                {expanded.has(loc.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
            ) : <span className="w-5" />}
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{loc.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-gray-500">{loc.code}</td>
        <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">{TYPE_LABELS[loc.type] || loc.type}</span></td>
        <td className="px-4 py-3 text-sm text-gray-500">{loc._count?.productLocations || 0}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {can(user?.role, 'warehouses', 'create') && (
              <button onClick={() => openForm({ warehouseId: Number(selectedWarehouse), parentId: String(loc.id) })} className="p-1.5 hover:bg-gray-100 rounded" title="Añadir sub-ubicación"><Plus className="w-4 h-4 text-gray-400" /></button>
            )}
            {can(user?.role, 'warehouses', 'edit') && (
              <button onClick={() => openForm(loc)} className="p-1.5 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
            )}
            {can(user?.role, 'warehouses', 'delete') && loc._count?.children === 0 && (
              <button onClick={() => handleDelete(loc.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
            )}
          </div>
        </td>
      </tr>,
    ]

    if (expanded.has(loc.id) && childrenMap[loc.id]) {
      for (const child of childrenMap[loc.id]) {
        rows.push(...renderLocationRows(child, depth + 1))
      }
    }

    return rows
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><MapPin className="w-6 h-6" /> Ubicaciones</h1>
        {selectedWarehouse && can(user?.role, 'warehouses', 'create') && (
          <button onClick={() => openForm()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nueva Ubicación</button>
        )}
      </div>

      <div className="mb-4">
        <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Seleccionar almacén</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>
      </div>

      {selectedWarehouse ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 text-sm text-gray-500">
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Productos</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {locations.flatMap(loc => renderLocationRows(loc))}
              {locations.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay ubicaciones en este almacén</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">Selecciona un almacén para ver sus ubicaciones</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Ubicación' : 'Nueva Ubicación'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                <select value={form.warehouseId} onChange={(e) => setForm({...form, warehouseId: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación padre</label>
                <select value={form.parentId} onChange={(e) => setForm({...form, parentId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Ninguna (raíz)</option>
                  {locations.map(loc => <option key={loc.id} value={String(loc.id)}>{loc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({...form, sortOrder: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
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
