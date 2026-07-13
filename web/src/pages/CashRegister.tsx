import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { formatCurrency } from '../lib/currency'
import { DollarSign, Plus, X, History, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function CashRegister() {
  const { user } = useAuth()
  const [current, setCurrent] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpenForm, setShowOpenForm] = useState(false)
  const [openForm, setOpenForm] = useState({ openingBalance: 0, notes: '' })
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [movementForm, setMovementForm] = useState({ type: 'income', amount: 0, description: '' })
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [closeForm, setCloseForm] = useState({ closingBalance: 0, notes: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [curRes, histRes] = await Promise.all([
        api.get('/cash-register/current').catch(() => null),
        api.get('/cash-register'),
      ])
      setCurrent(curRes?.data || null)
      setHistory(histRes.data.filter((r: any) => r.status === 'closed'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openRegister = async () => {
    try {
      await api.post('/cash-register', openForm)
      setShowOpenForm(false)
      setOpenForm({ openingBalance: 0, notes: '' })
      loadData()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al abrir caja') }
  }

  const addMovement = async () => {
    if (!movementForm.amount || !movementForm.description) return
    try {
      await api.post(`/cash-register/${current.id}/movements`, movementForm)
      setShowMovementForm(false)
      setMovementForm({ type: 'income', amount: 0, description: '' })
      loadData()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al agregar movimiento') }
  }

  const closeRegister = async () => {
    try {
      await api.patch(`/cash-register/${current.id}/close`, closeForm)
      setShowCloseForm(false)
      setCloseForm({ closingBalance: 0, notes: '' })
      loadData()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al cerrar caja') }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6" /> Caja
        </h1>
      </div>

      {!current ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No hay caja abierta</h2>
          <p className="text-gray-500 mb-6">Abre una caja para comenzar a registrar movimientos</p>
          {can(user?.role, 'cashRegister', 'open') && (
            <button onClick={() => setShowOpenForm(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700">
              <Plus className="w-5 h-5" /> Abrir Caja
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Caja Abierta</h2>
              {can(user?.role, 'cashRegister', 'close') && (
                <button onClick={() => setShowCloseForm(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                  Cerrar Caja
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Apertura</p>
                <p className="font-bold">{formatCurrency(current.openingBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="font-bold text-green-600">{formatCurrency(current.movements?.filter((m: any) => m.type === 'income').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Egresos</p>
                <p className="font-bold text-red-600">{formatCurrency(current.movements?.filter((m: any) => m.type === 'expense').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo Esperado</p>
                <p className="font-bold">{formatCurrency(
                  (current.openingBalance || 0)
                  + (current.movements?.filter((m: any) => m.type === 'income').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)
                  - (current.movements?.filter((m: any) => m.type === 'expense').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)
                )}</p>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Abierto por: {current.user?.name} | {formatDate(current.openingDate)}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Movimientos</h2>
              <button onClick={() => setShowMovementForm(true)} className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Agregar Movimiento
              </button>
            </div>
            {current.movements?.length > 0 ? (
              <div className="space-y-2">
                {current.movements.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {m.type === 'income'
                        ? <ArrowUpRight className="w-5 h-5 text-green-500" />
                        : <ArrowDownRight className="w-5 h-5 text-red-500" />
                      }
                      <div>
                        <p className="font-medium text-sm">{m.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin movimientos</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-800">Ventas en esta sesión</h2>
            </div>
            {current.sales?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-2">#</th>
                      <th className="text-left pb-2">Cliente</th>
                      <th className="text-right pb-2">Total</th>
                      <th className="text-left pb-2">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.sales.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50">
                        <td className="py-2 font-mono text-gray-500">#{s.id}</td>
                        <td className="py-2">{s.client?.name || 'Consumidor Final'}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(s.total)}</td>
                        <td className="py-2 text-gray-500">{s.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin ventas en esta sesión</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-800">Historial de Cierres</h2>
        </div>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">Apertura</th>
                  <th className="text-left pb-2">Cierre</th>
                  <th className="text-left pb-2">Usuario</th>
                  <th className="text-right pb-2">Saldo Final</th>
                  <th className="text-right pb-2">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} className="border-b border-gray-50">
                    <td className="py-2 text-sm">{formatDate(h.openingDate)}</td>
                    <td className="py-2 text-sm">{h.closingDate ? formatDate(h.closingDate) : '-'}</td>
                    <td className="py-2">{h.user?.name}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(h.closingBalance)}</td>
                    <td className={`py-2 text-right font-mono ${((h.closingBalance ?? 0) - h.openingBalance) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {h.closingBalance != null ? formatCurrency(h.closingBalance - h.openingBalance) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No hay cierres registrados</p>
        )}
      </div>

      {showOpenForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Abrir Caja</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Apertura</label>
                <input type="number" value={openForm.openingBalance} onChange={(e) => setOpenForm({...openForm, openingBalance: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input type="text" value={openForm.notes} onChange={(e) => setOpenForm({...openForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowOpenForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={openRegister} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Abrir</button>
            </div>
          </div>
        </div>
      )}

      {showMovementForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Agregar Movimiento</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={movementForm.type} onChange={(e) => setMovementForm({...movementForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input type="number" value={movementForm.amount} onChange={(e) => setMovementForm({...movementForm, amount: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" value={movementForm.description} onChange={(e) => setMovementForm({...movementForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowMovementForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={addMovement} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {showCloseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Cerrar Caja</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Final</label>
                <input type="number" value={closeForm.closingBalance} onChange={(e) => setCloseForm({...closeForm, closingBalance: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input type="text" value={closeForm.notes} onChange={(e) => setCloseForm({...closeForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCloseForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={closeRegister} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
