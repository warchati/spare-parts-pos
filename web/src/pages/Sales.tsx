import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Receipt, Search } from 'lucide-react'

export default function Sales() {
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<any>(null)

  useEffect(() => { loadSales() }, [])

  const loadSales = async () => {
    try {
      const res = await api.get('/sales')
      setSales(res.data)
    } catch {}
  }

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-AR')}`
  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')
  const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }

  const filteredSales = sales.filter(s =>
    s.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.items?.some((i: any) => i.productName.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Receipt className="w-6 h-6" /> Ventas</h1>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ventas..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Cliente</th>
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
                <td className="px-4 py-3 font-medium">{s.client?.name || 'Consumidor Final'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{methodLabel[s.paymentMethod] || s.paymentMethod}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Venta #{selectedSale.id}</h2>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">Cliente: <span className="font-medium text-gray-800">{selectedSale.client?.name || 'Consumidor Final'}</span></p>
              <p className="text-sm text-gray-500">Fecha: <span className="font-medium text-gray-800">{formatDate(selectedSale.createdAt)}</span></p>
              <p className="text-sm text-gray-500">Pago: <span className="font-medium text-gray-800 capitalize">{methodLabel[selectedSale.paymentMethod]}</span></p>
            </div>
            <div className="border-t pt-3 space-y-2">
              {selectedSale.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.productName} x{item.quantity}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(selectedSale.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
