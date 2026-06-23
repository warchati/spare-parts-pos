import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, CreditCard, DollarSign, Users, X, History } from 'lucide-react'

export default function CreditPayments() {
  const { user } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [clientDetail, setClientDetail] = useState<any>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'cash', notes: '' })

  useEffect(() => { loadClients() }, [search])

  const loadClients = async () => {
    try {
      const res = await api.get('/credit', { params: { q: search || undefined } })
      setClients(res.data)
    } catch (e) { console.error(e) }
  }

  const loadClientDetail = async (client: any) => {
    try {
      const res = await api.get(`/credit/clients`, { params: { clientId: client.id } })
      setClientDetail(res.data)
      setSelectedClient(client)
    } catch (e: any) { alert(e.response?.data?.error || 'Error al cargar detalle') }
  }

  const registerPayment = async () => {
    if (!paymentForm.amount) return
    try {
      await api.post('/credit', {
        clientId: selectedClient.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes,
      })
      setShowPaymentForm(false)
      setPaymentForm({ amount: 0, method: 'cash', notes: '' })
      loadClients()
      if (selectedClient) loadClientDetail(selectedClient)
    } catch (e: any) { alert(e.response?.data?.error || 'Error al registrar pago') }
  }


  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  const filtered = clients.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6" /> Créditos
        </h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-right px-4 py-3">Límite</th>
              <th className="text-right px-4 py-3">Saldo</th>
              <th className="text-right px-4 py-3">Disponible</th>
              <th className="text-center px-4 py-3">Ventas</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => {
              const available = (c.creditLimit || 0) - (c.currentBalance || 0)
              return (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => loadClientDetail(c)}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.currentBalance)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(available)}</td>
                  <td className="px-4 py-3 text-center">{c.creditSalesCount || 0}</td>
                  <td className="px-4 py-3 text-right">
                    {can(user?.role, 'credit', 'pay') && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setShowPaymentForm(true) }} className="text-sm text-blue-600 hover:underline">
                        Registrar Pago
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay datos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClient && clientDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedClient(null); setClientDetail(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedClient.name} - Detalle de Deuda</h2>
              <button onClick={() => { setSelectedClient(null); setClientDetail(null) }}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">Límite</p>
                <p className="text-lg font-bold">{formatCurrency(selectedClient.creditLimit)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">Saldo Actual</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(selectedClient.currentBalance)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">Disponible</p>
                <p className={`text-lg font-bold ${(selectedClient.creditLimit - selectedClient.currentBalance) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(selectedClient.creditLimit - selectedClient.currentBalance)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <History className="w-4 h-4" /> Historial de Pagos
              </h3>
              {can(user?.role, 'credit', 'pay') && (
                <button onClick={() => setShowPaymentForm(true)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  Registrar Pago
                </button>
              )}
            </div>

            {clientDetail.payments?.length > 0 ? (
              <div className="space-y-2">
                {clientDetail.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.notes || 'Pago'}</p>
                      <p className="text-xs text-gray-500">{formatDate(p.createdAt)}</p>
                    </div>
                    <span className="font-bold text-green-600">-{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin pagos registrados</p>
            )}

            {clientDetail.sales?.length > 0 && (
              <>
                <h3 className="font-bold text-gray-700 mt-6 mb-3">Ventas a Crédito</h3>
                <div className="space-y-2">
                  {clientDetail.sales.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Venta #{s.id}</p>
                        <p className="text-xs text-gray-500">{formatDate(s.createdAt)}</p>
                      </div>
                      <span className="font-bold">{formatCurrency(s.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Registrar Pago</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedClient?.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input type="text" value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPaymentForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={registerPayment} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
