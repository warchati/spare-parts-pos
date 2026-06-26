import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { BarChart3, DollarSign, Package, ShoppingCart, AlertTriangle, Receipt, CreditCard, Building2, Landmark, TrendingUp, Calendar, TrendingDown, Wallet } from 'lucide-react'

const payMethodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }
const payMethodColor: Record<string, string> = { cash: 'bg-green-500', card: 'bg-blue-500', transfer: 'bg-purple-500', credit: 'bg-orange-500' }
const payMethodIcon: Record<string, any> = { cash: DollarSign, card: CreditCard, transfer: Building2, credit: Landmark }

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [dailySales, setDailySales] = useState<any[]>([])
  const [todayExpenses, setTodayExpenses] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const navigate = useNavigate()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10)
      const [reportsRes, salesRes, expensesRes] = await Promise.all([
        api.get('/reports'),
        api.get('/reports/sales'),
        api.get(`/expenses/summary?start=${dateStr}&end=${dateStr}`),
      ])
      setData(reportsRes.data)
      setDailySales(salesRes.data)
      setTodayExpenses(expensesRes.data.total ?? 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }


  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')
  const formatDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>
  if (!data) return <div className="p-6 text-center text-gray-400">No hay datos</div>

  const today = data.today || {}
  const paymentMethodsArray = Object.entries(today.byPaymentMethod || {}).map(([method, total]) => ({ method, total: total as number }))
  const totalPayments = paymentMethodsArray.reduce((s, p) => s + p.total, 0)
  const activeRegister = data.activeRegister

  if (!can(user?.role, 'dashboard', 'view')) return null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" /> Dashboard
      </h1>

      {activeRegister && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Caja abierta</p>
              <p className="text-sm text-blue-600">
                Apertura: {formatCurrency(activeRegister.openingBalance)}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/cash-register')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Ir a Caja
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Ventas hoy</p>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{today.salesCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Ingresos hoy</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(today.revenue ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Gastos hoy</p>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(todayExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Artículos vendidos</p>
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{today.itemsSold ?? 0}</p>
        </div>
      </div>

      {/* Resumen de ventas por día */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-800">Ventas por Día</h2>
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
        <div className="space-y-2">
          {dailySales.slice(0, period === 'week' ? 7 : 30).map((d: any) => (
            <div key={d.date} className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-28">{formatDay(d.date)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all flex items-center justify-end px-2" style={{ width: `${Math.min((d.revenue / (today.revenue || 1)) * 100, 100)}%` }}>
                  <span className="text-xs text-white font-medium">{d.count} ventas</span>
                </div>
              </div>
              <span className="text-sm font-bold w-24 text-right">{formatCurrency(d.revenue)}</span>
            </div>
          ))}
          {dailySales.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin ventas en este período</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Métodos de Pago</h2>
          <div className="space-y-3">
            {paymentMethodsArray.map((pm) => {
              const pct = totalPayments > 0 ? ((pm.total / totalPayments) * 100) : 0
              const Icon = payMethodIcon[pm.method] || DollarSign
              return (
                <div key={pm.method}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span>{payMethodLabel[pm.method] || pm.method}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(pm.total)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`${payMethodColor[pm.method] || 'bg-gray-500'} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {paymentMethodsArray.length === 0 && <p className="text-sm text-gray-400">Sin ventas hoy</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Top 10 Más Vendidos (Histórico)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">#</th>
                  <th className="text-left pb-2">Producto</th>
                  <th className="text-right pb-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.topAllTime?.slice(0, 10).map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400 w-8">{i + 1}</td>
                    <td className="py-2 font-medium">{p.productName}</td>
                    <td className="py-2 text-right font-bold">{p.totalQuantity}</td>
                  </tr>
                ))}
                {(!data.topAllTime || data.topAllTime.length === 0) && (
                  <tr><td colSpan={3} className="text-center py-4 text-gray-400">No hay datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-800">Alertas de Stock</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">Producto</th>
                  <th className="text-right pb-2">Stock</th>
                  <th className="text-right pb-2">Stock Mín.</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock?.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-right text-red-600 font-bold">{p.stock}</td>
                    <td className="py-2 text-right">{p.minStock}</td>
                  </tr>
                ))}
                {(!data.lowStock || data.lowStock.length === 0) && (
                  <tr><td colSpan={3} className="text-center py-4 text-gray-400">Stock suficiente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-800">Últimas Ventas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">#</th>
                  <th className="text-left pb-2">Cliente</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales?.slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 font-mono text-gray-500">#{s.id}</td>
                    <td className="py-2">{s.client?.name || 'Consumidor Final'}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
                {(!data.recentSales || data.recentSales.length === 0) && (
                  <tr><td colSpan={3} className="text-center py-4 text-gray-400">No hay ventas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
