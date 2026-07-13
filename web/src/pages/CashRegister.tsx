import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { formatCurrency } from '../lib/currency'
import { DollarSign, Plus, History, Receipt, ArrowUpRight, ArrowDownRight, Download, Filter, X } from 'lucide-react'

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
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterUser, setFilterUser] = useState('')

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

  const uniqueUsers = useMemo(() => {
    const names = history.map((h: any) => h.user?.name).filter(Boolean)
    return [...new Set(names)]
  }, [history])

  const filteredHistory = useMemo(() => {
    return history.filter((h: any) => {
      if (filterStart) {
        const openDate = new Date(h.openingDate)
        if (openDate < new Date(filterStart)) return false
      }
      if (filterEnd) {
        const openDate = new Date(h.openingDate)
        const end = new Date(filterEnd)
        end.setHours(23, 59, 59, 999)
        if (openDate > end) return false
      }
      if (filterUser && h.user?.name !== filterUser) return false
      return true
    })
  }, [history, filterStart, filterEnd, filterUser])

  const clearFilters = () => {
    setFilterStart('')
    setFilterEnd('')
    setFilterUser('')
  }

  const hasFilters = filterStart || filterEnd || filterUser

  const exportExcel = () => {
    const fmt = (n: number) => n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const fmtDate = (d: string) => new Date(d).toLocaleString('es-DO')
    const totalSaldoFinal = filteredHistory.reduce((s: number, h: any) => s + (h.closingBalance ?? 0), 0)
    const totalDiferencia = filteredHistory.reduce((s: number, h: any) => s + (h.closingBalance != null ? h.closingBalance - h.openingBalance : 0), 0)
    const totalApertura = filteredHistory.reduce((s: number, h: any) => s + h.openingBalance, 0)

    const rows = filteredHistory.map((h: any) => {
      const diff = h.closingBalance != null ? h.closingBalance - h.openingBalance : 0
      const diffColor = diff === 0 ? '#166534' : diff > 0 ? '#1e40af' : '#b91c1c'
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${fmtDate(h.openingDate)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${h.closingDate ? fmtDate(h.closingDate) : '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${h.user?.name || ''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;">${fmt(h.openingBalance)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;">${fmt(h.closingBalance ?? 0)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:Consolas,monospace;color:${diffColor};font-weight:600;">${h.closingBalance != null ? fmt(diff) : '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${h.notes || ''}</td>
      </tr>`
    }).join('')

    const diffTotalColor = totalDiferencia === 0 ? '#166534' : totalDiferencia > 0 ? '#1e40af' : '#b91c1c'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;width:100%;">
  <thead>
    <tr>
      <td colspan="7" style="padding:12px 10px;font-size:16pt;font-weight:bold;color:#1e3a5f;border-bottom:3px solid #1e3a5f;">
        Historial de Cierres de Caja
      </td>
    </tr>
    <tr>
      <td colspan="7" style="padding:2px 10px 10px;font-size:10pt;color:#6b7280;">
        Generado: ${new Date().toLocaleString('es-DO')} | Registros: ${filteredHistory.length}
      </td>
    </tr>
    <tr style="background-color:#1e3a5f;color:#ffffff;">
      <th style="padding:8px 10px;text-align:left;font-weight:600;">Apertura</th>
      <th style="padding:8px 10px;text-align:left;font-weight:600;">Cierre</th>
      <th style="padding:8px 10px;text-align:left;font-weight:600;">Usuario</th>
      <th style="padding:8px 10px;text-align:right;font-weight:600;">Monto Apertura</th>
      <th style="padding:8px 10px;text-align:right;font-weight:600;">Saldo Final</th>
      <th style="padding:8px 10px;text-align:right;font-weight:600;">Diferencia</th>
      <th style="padding:8px 10px;text-align:left;font-weight:600;">Notas</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
  <tfoot>
    <tr style="background-color:#f3f4f6;font-weight:bold;border-top:2px solid #1e3a5f;">
      <td colspan="3" style="padding:8px 10px;font-size:10pt;">TOTALES (${filteredHistory.length} sesiones)</td>
      <td style="padding:8px 10px;text-align:right;font-family:Consolas,monospace;">${fmt(totalApertura)}</td>
      <td style="padding:8px 10px;text-align:right;font-family:Consolas,monospace;">${fmt(totalSaldoFinal)}</td>
      <td style="padding:8px 10px;text-align:right;font-family:Consolas,monospace;color:${diffTotalColor};">${fmt(totalDiferencia)}</td>
      <td style="padding:8px 10px;"></td>
    </tr>
  </tfoot>
</table>
</body>
</html>`

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `historial-caja-${new Date().toISOString().slice(0, 10)}.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

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
                <p className="text-sm text-gray-500">Ingresos (ventas + movimientos)</p>
                <p className="font-bold text-green-600">{formatCurrency(
                  (current.sales?.reduce((sum: number, s: any) => sum + s.total, 0) || 0)
                  + (current.movements?.filter((m: any) => m.type === 'income').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)
                )}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Egresos</p>
                <p className="font-bold text-red-600">{formatCurrency(current.movements?.filter((m: any) => m.type === 'expense').reduce((sum: number, m: any) => sum + m.amount, 0) || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo Esperado</p>
                <p className="font-bold">{formatCurrency(
                  (current.openingBalance || 0)
                  + (current.sales?.reduce((sum: number, s: any) => sum + s.total, 0) || 0)
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-800">Historial de Cierres</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (hasFilters) clearFilters()
                else document.getElementById('history-filters')?.classList.toggle('hidden')
              }}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border ${hasFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              Filtros{hasFilters ? ' (activos)' : ''}
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <div id="history-filters" className={`${hasFilters ? '' : 'hidden'} mb-4 bg-gray-50 rounded-lg p-3`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usuario</label>
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {uniqueUsers.map((name: string) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-4">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length > 0 ? (
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
                {filteredHistory.map((h: any) => (
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
          <p className="text-sm text-gray-400">{hasFilters ? 'No hay resultados para los filtros seleccionados' : 'No hay cierres registrados'}</p>
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
            {(() => {
              const salesTotal = current.sales?.reduce((sum: number, s: any) => sum + s.total, 0) || 0
              const totalIncome = current.movements?.filter((m: any) => m.type === 'income').reduce((sum: number, m: any) => sum + m.amount, 0) || 0
              const totalExpense = current.movements?.filter((m: any) => m.type === 'expense').reduce((sum: number, m: any) => sum + m.amount, 0) || 0
              const expected = (current.openingBalance || 0) + salesTotal + totalIncome - totalExpense
              const diff = closeForm.closingBalance - expected
              return (
                <>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Apertura:</span><span className="font-medium">{formatCurrency(current.openingBalance)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">+ Ventas:</span><span className="font-medium text-green-600">{formatCurrency(salesTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">+ Otros ingresos:</span><span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">- Egresos:</span><span className="font-medium text-red-600">{formatCurrency(totalExpense)}</span></div>
                    <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="font-bold">Saldo Esperado:</span><span className="font-bold">{formatCurrency(expected)}</span></div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Real (contado)</label>
                      <input type="number" value={closeForm.closingBalance} onChange={(e) => setCloseForm({...closeForm, closingBalance: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {closeForm.closingBalance > 0 && (
                      <div className={`flex justify-between text-sm font-bold px-1 ${diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        <span>{diff === 0 ? 'Cuadra' : diff > 0 ? 'Sobrante:' : 'Faltante:'}</span>
                        <span>{formatCurrency(Math.abs(diff))}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                      <input type="text" value={closeForm.notes} onChange={(e) => setCloseForm({...closeForm, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </>
              )
            })()}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCloseForm(false); setCloseForm({ closingBalance: 0, notes: '' }) }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={closeRegister} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
