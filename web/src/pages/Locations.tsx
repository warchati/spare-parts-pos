import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { can } from '../lib/permissions'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Search, Download, X, Package } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = { AISLE: 'Pasillo', RACK: 'Estante', SHELF: 'Anaquel', BIN: 'Bin', FLOOR: 'Piso', ZONE: 'Zona', DOCK: 'Dock' }
const TYPE_OPTIONS = ['AISLE', 'RACK', 'SHELF', 'BIN', 'FLOOR', 'ZONE', 'DOCK']

interface LocationNode {
  id: number; name: string; code: string; type: string; barcode: string; sortOrder: number; isActive: boolean
  warehouseId: number; parentId: number | null; children?: LocationNode[]
  _count?: { children: number; productLocations: number }
}

interface ImportRow { code: string; name: string; type: string; barcode: string; parentCode: string; sortOrder: number; isActive: boolean }

const emptyRow = (): ImportRow => ({ code: '', name: '', type: 'BIN', barcode: '', parentCode: '', sortOrder: 0, isActive: true })

export default function Locations() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [warehouseId, setWarehouseId] = useState<number>(() => Number(searchParams.get('warehouseId')) || 0)
  const [tree, setTree] = useState<LocationNode[]>([])
  const [allLocations, setAllLocations] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LocationNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LocationNode | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([emptyRow()])
  const [importMsg, setImportMsg] = useState('')
  const [importSubmitting, setImportSubmitting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [form, setForm] = useState({ name: '', code: '', type: 'BIN', barcode: '', parentId: '', sortOrder: 0, isActive: true })

  useEffect(() => { loadWarehouses() }, [])
  useEffect(() => {
    if (!warehouseId) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    loadTree(ctrl.signal)
    loadAll(ctrl.signal)
    return () => ctrl.abort()
  }, [warehouseId])

  useEffect(() => {
    if (!formOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFormOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [formOpen])

  useEffect(() => {
    if (!deleteTarget) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDeleteTarget(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deleteTarget])

  useEffect(() => {
    if (!importOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setImportOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [importOpen])

  const loadWarehouses = async () => {
    try {
      const res = await api.get('/warehouses')
      setWarehouses(res.data)
      if (!warehouseId && res.data.length > 0) setWarehouseId(res.data[0].id)
    } catch (e) { console.error('Failed to load locations:', e); setError('Error al cargar almacenes') }
    setLoading(false)
  }

  const loadTree = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/locations', { params: { warehouseId }, signal })
      const nodes = buildTree(res.data)
      setTree(nodes)
      if (search) setExpanded(getAllIds(nodes))
    } catch (e) { if (!signal?.aborted) { console.error('Failed to load locations:', e); setError('Error al cargar ubicaciones') } }
  }

  const loadAll = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/locations/all', { params: { warehouseId }, signal })
      setAllLocations(res.data)
    } catch (e) { console.error('Failed to load locations:', e) }
  }

  const buildTree = (flat: any[]): LocationNode[] => {
    const map = new Map<number, LocationNode & { children: LocationNode[] }>()
    const roots: LocationNode[] = []
    for (const loc of flat) map.set(loc.id, { ...loc, children: [] })
    for (const loc of flat) {
      const node = map.get(loc.id)!
      if (loc.parentId && map.has(loc.parentId)) map.get(loc.parentId)!.children.push(node)
      else roots.push(node)
    }
    return roots
  }

  const getAllIds = (nodes: LocationNode[]): number[] => {
    const ids: number[] = []
    for (const n of nodes) { ids.push(n.id); if (n.children) ids.push(...getAllIds(n.children)) }
    return ids
  }

  const toggle = (id: number) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const expandAll = () => { if (tree.length > 0) setExpanded(new Set(getAllIds(tree))) }

  const filterTree = (nodes: LocationNode[], q: string): LocationNode[] => {
    if (!q) return nodes
    const lower = q.toLowerCase()
    return nodes.reduce<LocationNode[]>((acc, n) => {
      const filteredChildren = filterTree(n.children || [], q)
      if (n.name.toLowerCase().includes(lower) || n.code.toLowerCase().includes(lower) || filteredChildren.length > 0) {
        acc.push({ ...n, children: filteredChildren.length > 0 ? filteredChildren : n.children })
      }
      return acc
    }, [])
  }

  const openCreate = (parentId?: number) => {
    setEditing(null)
    setForm({ name: '', code: '', type: 'BIN', barcode: '', parentId: parentId ? String(parentId) : '', sortOrder: 0, isActive: true })
    setError('')
    setFormOpen(true)
  }

  const openEdit = (loc: LocationNode) => {
    setEditing(loc)
    setForm({ name: loc.name, code: loc.code, type: loc.type, barcode: loc.barcode || '', parentId: loc.parentId ? String(loc.parentId) : '', sortOrder: loc.sortOrder, isActive: loc.isActive })
    setError('')
    setFormOpen(true)
  }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form, warehouseId, parentId: form.parentId ? Number(form.parentId) : null, sortOrder: Number(form.sortOrder) }
      if (editing) await api.put(`/locations/${editing.id}`, payload)
      else await api.post('/locations', payload)
      setFormOpen(false)
      loadTree()
      loadAll()
    } catch (e: any) { setError(e.response?.data?.error || 'Error al guardar') }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await api.delete(`/locations/${deleteTarget.id}`)
      setDeleteTarget(null)
      loadTree()
      loadAll()
    } catch (e: any) { setError(e.response?.data?.error || 'Error al eliminar') }
    setSubmitting(false)
  }

  const handleExport = async () => {
    try {
      const res = await api.get('/locations/export', { params: { warehouseId }, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'ubicaciones.csv'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) { console.error('Failed to export locations:', e); setError('Error al exportar') }
  }

  const openImport = () => {
    setImportRows([emptyRow()])
    setImportMsg('')
    setError('')
    setImportOpen(true)
  }

  const updateImportRow = (idx: number, field: keyof ImportRow, value: any) => {
    setImportRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const removeImportRow = (idx: number) => {
    setImportRows(prev => prev.filter((_, i) => i !== idx))
  }

  const addImportRow = () => {
    setImportRows(prev => [...prev, emptyRow()])
  }

  const handleImportSubmit = async () => {
    const warehouse = warehouses.find((w: any) => w.id === warehouseId)
    if (!warehouse) return
    const validRows = importRows.filter(r => r.code.trim() && r.name.trim()).map(r => ({
      warehouse: warehouse.name, code: r.code.trim(), name: r.name.trim(),
      type: r.type, barcode: r.barcode, parent: r.parentCode,
      sortOrder: r.sortOrder, isActive: r.isActive,
    }))
    if (validRows.length === 0) { setImportMsg('Completa al menos una fila con codigo y nombre'); return }
    setImportSubmitting(true)
    try {
      const res = await api.post('/locations/import', { rows: validRows })
      const errMsgs = res.data.errors.length > 0 ? '\n' + res.data.errors.join('\n') : ''
      setImportMsg(`Importados: ${res.data.created}. Errores: ${res.data.errors.length}${errMsgs}`)
      if (res.data.created > 0) { loadTree(); loadAll() }
    } catch (e: any) { setImportMsg(e.response?.data?.error || 'Error al importar') }
    setImportSubmitting(false)
  }

  const statRoots = tree.length
  const statTotal = getAllIds(tree).length
  const validImportCount = importRows.filter(r => r.code.trim() && r.name.trim()).length

  const renderNode = (node: LocationNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expanded.has(node.id)
    const typeShort = node.type?.slice(0, 3) || 'BIN'

    return (
      <div key={node.id}>
        <div className="flex items-center gap-1 py-1.5 px-2 hover:bg-gray-50 rounded-lg group" style={{ paddingLeft: `${depth * 24 + 8}px` }}>
          <button onClick={() => toggle(node.id)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0">
            {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4" />}
          </button>
          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${node.type === 'AISLE' ? 'bg-blue-100 text-blue-700' : node.type === 'RACK' ? 'bg-green-100 text-green-700' : node.type === 'SHELF' ? 'bg-purple-100 text-purple-700' : node.type === 'BIN' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>{typeShort}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{node.name}</span>
          <span className="text-xs text-gray-400 font-mono">{node.code}</span>
          {!node.isActive && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactivo</span>}
          {node._count && node._count.productLocations > 0 && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Package className="w-3 h-3" />{node._count.productLocations}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {can(user?.role, 'warehouses', 'create') && (
              <button onClick={() => openCreate(node.id)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-blue-600" title="Agregar hijo">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {can(user?.role, 'warehouses', 'edit') && (
              <button onClick={() => openEdit(node)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-yellow-600" title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {can(user?.role, 'warehouses', 'delete') && (
              <button onClick={() => setDeleteTarget(node)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600" title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {isExpanded && hasChildren && node.children!.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const filtered = filterTree(tree, search)
  const currentWarehouseName = warehouses.find((w: any) => w.id === warehouseId)?.name || ''

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MapPin className="w-6 h-6" /> Ubicaciones
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={warehouseId} onChange={e => setWarehouseId(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {can(user?.role, 'warehouses', 'view') && (
            <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"><Download className="w-4 h-4" /> Exportar</button>
          )}
          {can(user?.role, 'warehouses', 'create') && (
            <>
              <button onClick={openImport} className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"><Plus className="w-4 h-4" /> Importar</button>
              <button onClick={() => openCreate()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" /> Nueva</button>
            </>
          )}
        </div>
      </div>

      {(error || importMsg) && (
        <div className={`p-3 rounded-lg mb-4 text-sm flex items-center justify-between ${error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {error || importMsg}
          <button onClick={() => { setError(''); setImportMsg('') }}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ubicaciones..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <span className="text-xs text-gray-400">{statTotal} ubicaciones</span>
          <button onClick={expandAll} className="text-xs text-blue-600 hover:underline">Expandir todo</button>
          <button onClick={() => setExpanded(new Set())} className="text-xs text-gray-500 hover:underline">Colapsar</button>
        </div>

        <div className="p-2 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {tree.length === 0 ? 'No hay ubicaciones. Crea una o importa varias a la vez.' : 'No se encontraron ubicaciones'}
            </div>
          ) : (
            filtered.map(node => renderNode(node))
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setFormOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Ubicacion' : 'Nueva Ubicacion'}</h2>
              <button onClick={() => !submitting && setFormOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="bg-red-50 text-red-700 p-2 rounded-lg text-sm mb-3">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pasillo 1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Codigo *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="P01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]} ({t})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                  <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="000001" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Padre</label>
                <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Ninguno (raiz)</option>
                  {allLocations.filter(l => l.id !== editing?.id && l.warehouseId === warehouseId).map(l => (
                    <option key={l.id} value={String(l.id)}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => !submitting && setFormOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name || !form.code || submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                {submitting ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !importSubmitting && setImportOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold">Importar Ubicaciones</h2>
                <p className="text-sm text-gray-500">Almacen: <strong>{currentWarehouseName}</strong></p>
              </div>
              <button onClick={() => !importSubmitting && setImportOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <button onClick={addImportRow} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium"><Plus className="w-3 h-3" /> Agregar fila</button>
              <button onClick={() => setImportRows([emptyRow()])} className="flex items-center gap-1 bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 text-xs">Limpiar</button>
              <span className="ml-auto text-xs text-gray-400">{validImportCount} de {importRows.length} filas validas</span>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs">
                    <th className="text-left px-3 py-2 w-8">#</th>
                    <th className="text-left px-3 py-2">Codigo *</th>
                    <th className="text-left px-3 py-2">Nombre *</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Barcode</th>
                    <th className="text-left px-3 py-2">Padre (codigo)</th>
                    <th className="text-center px-3 py-2 w-16">Orden</th>
                    <th className="text-center px-3 py-2 w-14">Act.</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-1 py-1">
                        <input type="text" value={row.code} onChange={e => updateImportRow(idx, 'code', e.target.value.toUpperCase())}
                          className={`w-full px-2 py-1.5 border rounded text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500 ${!row.code && row.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                          placeholder="P01" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" value={row.name} onChange={e => updateImportRow(idx, 'name', e.target.value)}
                          className={`w-full px-2 py-1.5 border rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 ${row.code && !row.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                          placeholder="Pasillo 1" />
                      </td>
                      <td className="px-1 py-1">
                        <select value={row.type} onChange={e => updateImportRow(idx, 'type', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500">
                          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" value={row.barcode} onChange={e => updateImportRow(idx, 'barcode', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500" placeholder="000001" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" value={row.parentCode} onChange={e => updateImportRow(idx, 'parentCode', e.target.value.toUpperCase())}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500" placeholder="P01" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" value={row.sortOrder} onChange={e => updateImportRow(idx, 'sortOrder', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-center outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <input type="checkbox" checked={row.isActive} onChange={e => updateImportRow(idx, 'isActive', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="px-1 py-1">
                        <button onClick={() => removeImportRow(idx)} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addImportRow} className="mt-3 text-blue-600 hover:underline text-sm">+ Agregar fila vacia</button>
            </div>

            {importMsg && (
              <div className={`mx-5 mb-3 p-3 rounded-lg text-sm ${importMsg.startsWith('Importados') ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {importMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
              <button onClick={() => !importSubmitting && setImportOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleImportSubmit} disabled={importSubmitting || validImportCount === 0} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50">
                {importSubmitting ? 'Importando...' : `Importar ${validImportCount} ubicacion${validImportCount !== 1 ? 'es' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-red-600 mb-2">Eliminar ubicacion</h2>
            <p className="text-sm text-gray-600 mb-1">Estas seguro de eliminar <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?</p>
            {deleteTarget._count && deleteTarget._count.productLocations > 0 && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg mt-2">Esta ubicacion tiene {deleteTarget._count.productLocations} producto(s) asignado(s). Se desasociaran.</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => !submitting && setDeleteTarget(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                {submitting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
