import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Receipt, Search, Download, CreditCard, X, AlertCircle, Printer } from 'lucide-react'

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => { loadSales() }, [])

  const loadSales = async () => {
    try {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (paymentFilter) params.paymentMethod = paymentFilter
      const res = await api.get('/sales', { params })
      setSales(res.data)
    } catch (e) { console.error(e) }
  }


  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')
  const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }
  const formatInvoice = (id: number) => `INV-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`

  const filteredSales = sales.filter(s =>
    !search ||
    s.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.items?.some((i: any) => i.productName.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Receipt className="w-6 h-6" /> Ventas</h1>
        <a
          href={`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'}/exports/sales/csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ventas..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todos los pagos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="credit">Crédito</option>
        </select>
        <button onClick={loadSales} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Filtrar</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Factura</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Concepto</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Pago</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(s => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedSale(s)}>
                <td className="px-4 py-3 font-mono text-sm text-gray-500">#{s.id}</td>
                <td className="px-4 py-3 font-mono text-sm text-blue-600">{s.invoiceNumber || formatInvoice(s.id)}</td>
                <td className="px-4 py-3 font-medium">{s.client?.name || 'Consumidor Final'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                  {s.items?.map((i: any) => i.productName).join(', ')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">{methodLabel[s.paymentMethod] || s.paymentMethod}</span>
                    {s.paymentMethod === 'credit' && <CreditCard className="w-3.5 h-3.5 text-orange-500" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No hay ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Venta #{selectedSale.id}</h2>
            <p className="text-xl text-blue-600 font-mono font-bold mb-4">{selectedSale.invoiceNumber || formatInvoice(selectedSale.id)}</p>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">Cliente: <span className="font-medium text-gray-800">{selectedSale.client?.name || 'Consumidor Final'}</span></p>
              <p className="text-sm text-gray-500">Fecha: <span className="font-medium text-gray-800">{formatDate(selectedSale.createdAt)}</span></p>
              <p className="text-sm text-gray-500">Pago: <span className="font-medium text-gray-800 capitalize">{methodLabel[selectedSale.paymentMethod]}</span></p>
              {selectedSale.taxTotal > 0 && (
                <p className="text-sm text-gray-500">TVA Total: <span className="font-medium text-gray-800">{formatCurrency(selectedSale.taxTotal)}</span></p>
              )}
              {selectedSale.paymentMethod === 'credit' && selectedSale.creditPayment && (
                <p className="text-sm text-orange-600">Crédito: {formatCurrency(selectedSale.creditPayment.amount)}</p>
              )}
            </div>
            <div className="border-t pt-3 space-y-2">
              {selectedSale.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.productName} x{item.quantity}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSale.subtotal || selectedSale.total)}</span>
              </div>
              {(selectedSale.taxTotal > 0) && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA</span>
                  <span>{formatCurrency(selectedSale.taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { window.print() }}
                className="flex items-center justify-center gap-2 flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              {selectedSale.status === 'completed' && can(user?.role, 'sales', 'edit') && (
                <button
                  onClick={() => { setCancelReason(''); setShowCancelModal(true) }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Cancelar Venta #{selectedSale?.id}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cancelación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Ingrese el motivo..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Volver</button>
              <button
                onClick={async () => {
                  if (!cancelReason.trim()) return
                  try {
                    await api.patch(`/sales/${selectedSale.id}/cancel`, { cancelReason })
                    setShowCancelModal(false)
                    setSelectedSale(null)
                    loadSales()
                  } catch (e: any) {
                    alert(e.response?.data?.error || 'Error al cancelar venta')
                  }
                }}
                disabled={!cancelReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
