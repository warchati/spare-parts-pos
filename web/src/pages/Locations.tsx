import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, Layers, X, ChevronRight, ChevronDown, Maximize2, Minimize2, Package, Hash, Building2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  ZONE: 'Zona', AISLE: 'Pasillo', RACK: 'Estante', SHELF: 'Anaquel', BIN: 'Ubicación',
}

const TYPE_COLORS: Record<string, string> = {
  ZONE: 'bg-violet-100 text-violet-700 border-violet-200',
  AISLE: 'bg-blue-100 text-blue-700 border-blue-200',
  RACK: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  SHELF: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BIN: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PROD_BADGE = (count: number) => {
  if (count === 0) return 'bg-red-100 text-red-600'
  if (count < 10) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
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
  const [allLocations, setAllLocations] = useState<any[] | null>(null)

  useEffect(() => {
    api.get('/warehouses').then(res => setWarehouses(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedWarehouse) { loadLocations(); setChildrenMap({}); setAllLocations(null) }
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

  const expandAll = async () => {
    try {
      const res = await api.get('/locations', { params: { warehouseId: selectedWarehouse } })
      const all: any[] = res.data
      setAllLocations(all)
      const map: Record<number, any[]> = {}
      for (const loc of all) {
        if (loc.parentId) {
          if (!map[loc.parentId]) map[loc.parentId] = []
          map[loc.parentId].push(loc)
        }
      }
      setChildrenMap(map)
      const ids = new Set<number>()
      for (const loc of all) {
        if (loc._count?.children > 0) ids.add(loc.id)
      }
      setExpanded(ids)
    } catch {}
  }

  const collapseAll = () => {
    setExpanded(new Set())
    setChildrenMap({})
    setAllLocations(null)
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

  const stats = useMemo(() => {
    let count = locations.length
    let maxDepth = 1
    let products = 0
    const walk = (items: any[], depth: number) => {
      maxDepth = Math.max(maxDepth, depth)
      for (const item of items) {
        products += item._count?.productLocations || 0
        if (childrenMap[item.id]) {
          count += childrenMap[item.id].length
          walk(childrenMap[item.id], depth + 1)
        }
      }
    }
    walk(locations, 1)
    return { count, maxDepth, products }
  }, [locations, childrenMap])

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
        setAllLocations(null)
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
      setAllLocations(null)
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

  const renderSiblingRows = (siblings: any[], depth: number, ancestorHasNext: boolean[]): JSX.Element[] => {
    const rows: JSX.Element[] = []
    siblings.forEach((loc, i) => {
      const hasNextSibling = i < siblings.length - 1
      rows.push(...renderLocationRows(loc, depth, ancestorHasNext, hasNextSibling))
    })
    return rows
  }

  const renderLocationRows = (loc: any, depth: number, ancestorHasNext: boolean[], hasNextSibling: boolean): JSX.Element[] => {
    const hasChildren = loc._count?.children > 0 || (childrenMap[loc.id]?.length > 0)
    const isExpanded = expanded.has(loc.id)
    const tc = TYPE_COLORS[loc.type] || TYPE_COLORS.BIN
    const pc = PROD_BADGE(loc._count?.productLocations || 0)

    const rows: JSX.Element[] = [
      <tr key={loc.id} className="group border-t border-gray-100 hover:bg-blue-50/40 transition-colors">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-0.5 font-mono text-sm text-gray-400 select-none">
            {ancestorHasNext.map((hasNext, i) => (
              <span key={i} className="w-5 shrink-0 flex justify-center text-gray-300">
                {hasNext ? '│' : ' '}
              </span>
            ))}
            <span className="w-5 shrink-0 flex justify-center text-gray-300">
              {hasNextSibling ? '├' : '└'}
            </span>
            <span className="w-3 shrink-0 text-gray-300">─</span>
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(loc.id) }}
                className="w-4 h-4 shrink-0 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                }
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <Layers className={`w-4 h-4 shrink-0 ml-1 ${isExpanded ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className={`font-medium text-sm ml-2 ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>
              {loc.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
            {loc.code}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${tc}`}>
            {TYPE_LABELS[loc.type] || loc.type}
          </span>
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 text-xs font-bold rounded-full ${pc}`}>
            {loc._count?.productLocations || 0}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {can(user?.role, 'warehouses', 'create') && (
              <button
                onClick={() => openForm({ warehouseId: Number(selectedWarehouse), parentId: String(loc.id) })}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                title="Añadir sub-ubicación"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {can(user?.role, 'warehouses', 'edit') && (
              <button
                onClick={() => openForm(loc)}
                className="p-1.5 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {can(user?.role, 'warehouses', 'delete') && loc._count?.children === 0 && (
              <button
                onClick={() => handleDelete(loc.id)}
                className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>,
    ]

    if (isExpanded && childrenMap[loc.id]) {
      rows.push(...renderSiblingRows(childrenMap[loc.id], depth + 1, [...ancestorHasNext, hasNextSibling]))
    }

    return rows
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" /> Ubicaciones
          </h1>
          {selectedWarehouse && (
            <p className="text-sm text-gray-400 mt-0.5 ml-8">
              {stats.count} ubicación{stats.count !== 1 ? 'es' : ''} · {stats.maxDepth} nivel{stats.maxDepth !== 1 ? 'es' : ''} · {stats.products} producto{stats.products !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedWarehouse && (
            <>
              <button
                onClick={expandAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Expandir todo"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Expandir
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Colapsar todo"
              >
                <Minimize2 className="w-3.5 h-3.5" /> Colapsar
              </button>
            </>
          )}
          {selectedWarehouse && can(user?.role, 'warehouses', 'create') && (
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <Plus className="w-4 h-4" /> Nueva Ubicación
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer"
          >
            <option value="">Seleccionar almacén</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {stats.count > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-400 bg-white px-4 py-2 rounded-lg border border-gray-200">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> {stats.count}
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> {stats.maxDepth} niv.
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> {stats.products} prod.
            </span>
          </div>
        )}
      </div>

      {selectedWarehouse ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-[40%]">Nombre</th>
                  <th className="text-left px-4 py-3 w-[20%]">Código</th>
                  <th className="text-left px-4 py-3 w-[15%]">Tipo</th>
                  <th className="text-center px-4 py-3 w-[10%]">Prod.</th>
                  <th className="text-right px-4 py-3 w-[15%]"></th>
                </tr>
              </thead>
              <tbody>
                {locations.length > 0 ? (
                  renderSiblingRows(locations, 0, [])
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                        <MapPin className="w-12 h-12 mb-3" />
                        <p className="text-gray-400 text-sm">No hay ubicaciones en este almacén</p>
                        {can(user?.role, 'warehouses', 'create') && (
                          <button
                            onClick={() => openForm()}
                            className="mt-3 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                          >
                            <Plus className="w-4 h-4" /> Crear primera ubicación
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-16 h-16 mb-4" />
          <p className="text-gray-400 text-sm">Selecciona un almacén para ver sus ubicaciones</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {editing ? <Pencil className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                {editing ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Almacén</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.warehouseId}
                    onChange={(e) => setForm({...form, warehouseId: Number(e.target.value)})}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
                  >
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Código *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({...form, code: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ej: BIN-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ej: Estante Principal"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => {
                    const selected = form.type === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setForm({...form, type: k})}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                          selected
                            ? `${TYPE_COLORS[k]} ring-2 ring-offset-1 ring-blue-400`
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Ubicación padre</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({...form, parentId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="">Ninguna (raíz)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={String(loc.id)}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Orden</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({...form, sortOrder: Number(e.target.value)})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm shadow-blue-200"
              >
                {editing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
