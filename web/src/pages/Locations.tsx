import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { can } from '../lib/permissions'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, Plus, Pencil, Trash2, ChevronRight, ChevronDown, Search, Upload, Download, X, Package } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = { AISLE: 'Pasillo', RACK: 'Estante', SHELF: 'Anaquel', BIN: 'Bin', FLOOR: 'Piso', ZONE: 'Zona', DOCK: 'Dock' }
const TYPE_OPTIONS = ['AISLE', 'RACK', 'SHELF', 'BIN', 'FLOOR', 'ZONE', 'DOCK']

interface LocationNode {
  id: number; name: string; code: string; type: string; barcode: string; sortOrder: number; isActive: boolean
  warehouseId: number; parentId: number | null; children?: LocationNode[]
  _count?: { children: number; productLocations: number }
}

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
  const [importMsg, setImportMsg] = useState('')
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

  const loadWarehouses = async () => {
    try {
      const res = await api.get('/warehouses')
      setWarehouses(res.data)
      if (!warehouseId && res.data.length > 0) setWarehouseId(res.data[0].id)
    } catch { setError('Error al cargar almacenes') }
    setLoading(false)
  }

  const loadTree = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/locations', { params: { warehouseId }, signal })
      const nodes = buildTree(res.data)
      setTree(nodes)
      if (search) setExpanded(getAllIds(nodes))
    } catch { if (!signal?.aborted) setError('Error al cargar ubicaciones') }
  }

  const loadAll = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/locations/all', { params: { warehouseId }, signal })
      setAllLocations(res.data)
    } catch {}
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
    } catch { setError('Error al exportar') }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const lines = text.replace(/^\uFEFF/, '').split('\n').filter((l: string) => l.trim())
        const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
        const warehouseIdx = header.findIndex((h: string) => h === 'warehouse')
        const codeIdx = header.findIndex((h: string) => h === 'code')
        const nameIdx = header.findIndex((h: string) => h === 'nombre' || h === 'name')
        const typeIdx = header.findIndex((h: string) => h === 'tipo' || h === 'type')
        const barcodeIdx = header.findIndex((h: string) => h === 'barcode')
        const parentIdx = header.findIndex((h: string) => h === 'padre' || h === 'parent')
        const orderIdx = header.findIndex((h: string) => h === 'orden' || h === 'order')

        const rows = lines.slice(1).map((line: string) => {
          const cols = line.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''))
          return {
            warehouse: cols[warehouseIdx] || '', code: cols[codeIdx] || '', name: cols[nameIdx] || '',
            type: cols[typeIdx] || 'BIN', barcode: cols[barcodeIdx] || '', parent: cols[parentIdx] || '',
            sortOrder: orderIdx >= 0 ? Number(cols[orderIdx]) || 0 : 0,
          }
        }).filter((r: any) => r.code && r.name && r.warehouse)

        if (rows.length === 0) { setImportMsg('No se encontraron filas validas en el CSV'); return }
        const res = await api.post('/locations/import', { rows })
        const errMsgs = res.data.errors.length > 0 ? '\n' + res.data.errors.join('\n') : ''
        setImportMsg(`Importados: ${res.data.created}. Errores: ${res.data.errors.length}${errMsgs}`)
        loadTree()
        loadAll()
      } catch (e: any) { setImportMsg(e.response?.data?.error || 'Error al importar') }
    }
    input.click()
  }

  const statRoots = tree.length
  const statTotal = getAllIds(tree).length

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
            <>
              <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"><Download className="w-4 h-4" /> Exportar</button>
              <button onClick={handleImport} className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm"><Upload className="w-4 h-4" /> Importar</button>
            </>
          )}
          {can(user?.role, 'warehouses', 'create') && (
            <button onClick={() => openCreate()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" /> Nueva</button>
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
              {tree.length === 0 ? 'No hay ubicaciones. Crea una o importa desde CSV.' : 'No se encontraron ubicaciones'}
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
