import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Search, ArrowUpDown, Package } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  PURCHASE_RECEIVE: 'Recepción Compra',
  SALE_CANCEL: 'Cancelación Venta',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  MANUAL: 'Manual',
  TRANSFER: 'Transferencia',
}
const TYPE_COLORS: Record<string, string> = {
  SALE: 'text-red-600',
  PURCHASE_RECEIVE: 'text-green-600',
  SALE_CANCEL: 'text-orange-600',
  RETURN: 'text-blue-600',
  ADJUSTMENT: 'text-purple-600',
  MANUAL: 'text-gray-600',
  TRANSFER: 'text-cyan-600',
}

const MOVEMENT_TYPES = Object.keys(TYPE_LABELS)

export default function StockMovements() {
  const [data, setData] = useState<any>({ movements: [], total: 0 })
  const [products, setProducts] = useState<any[]>([])
  const [productId, setProductId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch((e) => console.error('Failed to load products:', e))
  }, [])

  useEffect(() => { loadMovements() }, [productId, typeFilter, startDate, endDate, page])

  const loadMovements = async () => {
    try {
      const params: any = { limit: 30, offset: page * 30 }
      if (productId) params.productId = productId
      if (typeFilter) params.type = typeFilter
      if (startDate) params.start = startDate
      if (endDate) params.end = endDate
      const res = await api.get('/stock-movements', { params })
      setData(res.data)
    } catch (e) { console.error('Failed to load stock movements:', e) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <ArrowUpDown className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Movimientos de Stock</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar por producto..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={productId} onChange={(e) => { setProductId(e.target.value); setPage(0) }} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos los productos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos los tipos</option>
          {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>

      <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
        <span>Total: <strong>{data.total}</strong> movimientos</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Producto</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-center px-4 py-3">Cantidad</th>
              <th className="text-right px-4 py-3">Stock Total</th>
              <th className="text-left px-4 py-3">Ubicación</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Razón</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.map((m: any) => (
              <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{m.product?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${TYPE_COLORS[m.type] || 'text-gray-600'}`}>
                    {TYPE_LABELS[m.type] || m.type}
                  </span>
                </td>
                <td className={`px-4 py-3 text-center font-mono font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.quantity > 0 ? '+' : ''}{m.quantity}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">{m.afterStock}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.location?.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.user?.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-400 max-w-[200px] truncate">{m.reason || '-'}</td>
              </tr>
            ))}
            {data.movements.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No hay movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.total > 30 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">Anterior</button>
          <span className="text-sm text-gray-500">Página {page + 1} de {Math.ceil(data.total / 30)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 30 >= data.total} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  )
}
