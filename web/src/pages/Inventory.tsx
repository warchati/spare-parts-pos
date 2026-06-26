import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { ClipboardList, Plus, CheckCircle, XCircle, Clock, Eye, Search, Loader2, X, Package } from 'lucide-react'
import { formatCurrency } from '../lib/currency'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
}
const TYPE_LABELS: Record<string, string> = {
  COUNT: 'Conteo', ADJUSTMENT: 'Ajuste',
}

export default function Inventory() {
  const { user } = useAuth()
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'COUNT', warehouseId: 0, notes: '', items: [{ productId: 0, locationId: 0, expectedQty: 0, actualQty: 0 }] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/warehouses').then(res => setWarehouses(res.data)).catch(() => {})
    api.get('/products').then(res => setProducts(res.data)).catch(() => {})
    loadAdjustments()
  }, [filterWarehouse, filterStatus])

  const loadAdjustments = async () => {
    try {
      const params: any = {}
      if (filterWarehouse) params.warehouseId = filterWarehouse
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/inventory/adjustments', { params })
      setAdjustments(res.data)
    } catch {}
  }

  const viewDetail = async (id: number) => {
    try {
      const res = await api.get(`/inventory/adjustments/${id}`)
      setSelected(res.data)
    } catch {}
  }

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { productId: 0, locationId: 0, expectedQty: 0, actualQty: 0 }] }))
  }

  const removeItem = (idx: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_: any, i: number) => i !== idx) }))
  }

  const updateItem = (idx: number, field: string, value: any) => {
    setForm(prev => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, items }
    })
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      await api.post('/inventory/adjustments', {
        type: form.type,
        warehouseId: form.warehouseId,
        notes: form.notes,
        items: form.items.map(i => ({
          productId: i.productId,
          locationId: i.locationId,
          expectedQty: Number(i.expectedQty),
          actualQty: Number(i.actualQty),
        })),
      })
      setShowForm(false)
      setForm({ type: 'COUNT', warehouseId: 0, notes: '', items: [{ productId: 0, locationId: 0, expectedQty: 0, actualQty: 0 }] })
      loadAdjustments()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const handleSubmit = async (id: number) => {
    if (!confirm('Enviar este ajuste para aprobación?')) return
    try {
      await api.post(`/inventory/adjustments/${id}/submit`)
      loadAdjustments()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const handleApprove = async (id: number) => {
    if (!confirm('Aprobar este ajuste? Esto modificará el stock real.')) return
    try {
      await api.post(`/inventory/adjustments/${id}/approve`)
      loadAdjustments()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const handleReject = async (id: number) => {
    if (!confirm('Rechazar este ajuste?')) return
    try {
      await api.post(`/inventory/adjustments/${id}/reject`)
      loadAdjustments()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Inventario</h1>
        {can(user?.role, 'inventory', 'create') && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Ajuste</button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos los almacenes</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Almacén</th>
              <th className="text-center px-4 py-3">Items</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Creado por</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map(a => (
              <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{TYPE_LABELS[a.type] || a.type}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.warehouse?.name}</td>
                <td className="px-4 py-3 text-center text-sm">{a._count?.items || 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.createdBy?.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => viewDetail(a.id)} className="p-1.5 hover:bg-gray-100 rounded" title="Ver detalle"><Eye className="w-4 h-4 text-gray-400" /></button>
                    {a.status === 'draft' && (
                      <button onClick={() => handleSubmit(a.id)} className="p-1.5 hover:bg-blue-50 rounded" title="Enviar a aprobación"><Clock className="w-4 h-4 text-blue-500" /></button>
                    )}
                    {a.status === 'pending' && user?.id !== a.createdById && (
                      <>
                        <button onClick={() => handleApprove(a.id)} className="p-1.5 hover:bg-green-50 rounded" title="Aprobar"><CheckCircle className="w-4 h-4 text-green-500" /></button>
                        <button onClick={() => handleReject(a.id)} className="p-1.5 hover:bg-red-50 rounded" title="Rechazar"><XCircle className="w-4 h-4 text-red-500" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {adjustments.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay ajustes de inventario</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajuste #{selected.id}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">{TYPE_LABELS[selected.type]}</span></div>
              <div><span className="text-gray-500">Estado:</span> <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span></div>
              <div><span className="text-gray-500">Almacén:</span> <span className="font-medium">{selected.warehouse?.name}</span></div>
              <div><span className="text-gray-500">Notas:</span> <span>{selected.notes || '-'}</span></div>
              <div><span className="text-gray-500">Creado por:</span> <span>{selected.createdBy?.name}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span>{formatDate(selected.createdAt)}</span></div>
              {selected.approvedBy && (
                <>
                  <div><span className="text-gray-500">Aprobado por:</span> <span>{selected.approvedBy?.name}</span></div>
                  <div><span className="text-gray-500">Aprobado el:</span> <span>{selected.approvedAt ? formatDate(selected.approvedAt) : '-'}</span></div>
                </>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-left px-3 py-2">Ubicación</th>
                  <th className="text-right px-3 py-2">Esperado</th>
                  <th className="text-right px-3 py-2">Real</th>
                  <th className="text-right px-3 py-2">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map((item: any) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{item.product?.name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.location?.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.expectedQty}</td>
                    <td className="px-3 py-2 text-right font-mono">{item.actualQty}</td>
                    <td className={`px-3 py-2 text-right font-mono ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : ''}`}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button onClick={() => setSelected(null)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nuevo Ajuste de Inventario</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="COUNT">Conteo</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Almacén</label>
                  <select value={form.warehouseId} onChange={(e) => setForm({...form, warehouseId: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Productos</h3>
              <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><Package className="w-4 h-4" /> Agregar</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-auto">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-xs text-gray-500 mb-1">Producto</label>
                    <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                      <option value={0}>Seleccionar</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Ubicación ID</label>
                    <input type="number" value={item.locationId} onChange={(e) => updateItem(idx, 'locationId', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Esperado</label>
                    <input type="number" value={item.expectedQty} onChange={(e) => updateItem(idx, 'expectedQty', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Real</label>
                    <input type="number" value={item.actualQty} onChange={(e) => updateItem(idx, 'actualQty', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Creando...' : 'Crear Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
