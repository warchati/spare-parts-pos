import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { BarChart3, TrendingUp, Users, Package, ShoppingCart, DollarSign, UserX } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function Analytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10) })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [productTab, setProductTab] = useState<'top' | 'low' | 'never'>('top')
  const [showAllProducts, setShowAllProducts] = useState(false)

  useEffect(() => { loadData() }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/analytics', { params: { startDate, endDate } })
      setData(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fmt = (n: number) => formatCurrency(n)

  if (loading && !data) return <div className="p-6 text-center text-gray-400">Cargando analisis...</div>
  if (!data) return <div className="p-6 text-center text-gray-400">Error al cargar datos</div>

  const neverSold = data.productPerformance.filter((p: any) => p.timesSold === 0)
  const lowSold = data.productPerformance.filter((p: any) => p.timesSold > 0 && p.timesSold <= 3)
  const topSellers = data.productPerformance.filter((p: any) => p.timesSold > 3).slice(0, 20)

  const topBarData = topSellers.slice(0, 10).map((p: any) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
    vendidos: p.totalQty,
    ganancia: Math.round(p.totalRevenue - p.totalCost),
  }))

  const pieStockData = [
    { name: 'Sin stock', value: data.inventorySummary.outOfStock, color: '#ef4444' },
    { name: 'Bajo minimo', value: data.inventorySummary.lowStock, color: '#f59e0b' },
    { name: 'OK', value: data.inventorySummary.okStock, color: '#10b981' },
  ].filter((d: any) => d.value > 0)

  const paymentLabels: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Credito' }
  const paymentPieData = data.paymentDistribution.map((p: any) => ({
    name: paymentLabels[p.method] || p.method,
    value: p.total,
    count: p.count,
  }))

  const trendData = data.dailyTrend.map((d: any) => ({
    date: d.date.slice(5),
    ingresos: d.revenue,
    ventas: d.count,
    items: d.items,
  }))

  const activeTabProducts = productTab === 'top' ? topSellers : productTab === 'low' ? lowSold : neverSold
  const visibleProducts = showAllProducts ? activeTabProducts : activeTabProducts.slice(0, 10)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Analisis del Negocio
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Desde:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="text-sm text-gray-500">Hasta:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Ingresos', value: fmt(data.kpi.totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Ventas', value: data.kpi.totalSales, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Items Vendidos', value: data.kpi.totalItems, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Ticket Promedio', value: fmt(data.kpi.avgTicket), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Productos Activos', value: data.kpi.productCount, icon: BarChart3, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* SECTION: PRODUCT PERFORMANCE */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Rendimiento de Productos</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setProductTab('top'); setShowAllProducts(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${productTab === 'top' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Mas vendidos ({data.productPerformance.filter((p: any) => p.timesSold > 3).length})
          </button>
          <button onClick={() => { setProductTab('low'); setShowAllProducts(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${productTab === 'low' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Poco vendidos ({lowSold.length})
          </button>
          <button onClick={() => { setProductTab('never'); setShowAllProducts(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${productTab === 'never' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Nunca vendidos ({neverSold.length})
          </button>
        </div>

        {productTab === 'top' && topBarData.length > 0 && (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="vendidos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-4 py-2">Codigo</th>
                <th className="text-left px-4 py-2">Producto</th>
                <th className="text-left px-4 py-2">Categoria</th>
                <th className="text-right px-4 py-2">Vendidos</th>
                <th className="text-right px-4 py-2">Ingresos</th>
                <th className="text-right px-4 py-2">Costo</th>
                <th className="text-right px-4 py-2">Ganancia</th>
                <th className="text-right px-4 py-2">Margen</th>
                <th className="text-right px-4 py-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p: any) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-500">{p.code}</td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-gray-500">{p.category}</td>
                  <td className="px-4 py-2 text-right font-mono">{p.totalQty}</td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(p.totalRevenue)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">{fmt(p.totalCost)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-medium ${p.totalRevenue - p.totalCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(p.totalRevenue - p.totalCost)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.margin >= 30 ? 'bg-green-100 text-green-700' : p.margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${p.stock <= 0 ? 'text-red-600 font-bold' : p.stock <= p.minStock ? 'text-yellow-600' : ''}`}>
                    {p.stock}
                  </td>
                </tr>
              ))}
              {activeTabProducts.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6 text-gray-400">No hay productos para este filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {activeTabProducts.length > 10 && (
          <button onClick={() => setShowAllProducts(!showAllProducts)} className="mt-3 text-blue-600 hover:underline text-sm">
            {showAllProducts ? 'Ver menos' : `Ver todos (${activeTabProducts.length})`}
          </button>
        )}
      </div>

      {/* SECTION: SALES TREND */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Tendencia de Ventas</h2>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, name: string) => name === 'ingresos' ? fmt(v) : v} />
              <Legend />
              <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={2} dot={false} yAxisId={0} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-8">No hay datos de ventas en este periodo</p>
        )}

        <h3 className="text-md font-bold text-gray-700 mt-6 mb-3">Ventas Mensuales</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.monthlySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any, name: string) => name === 'revenue' ? fmt(v) : v} />
            <Legend />
            <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="count" name="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION: CLIENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Top Clientes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Cliente</th>
                  <th className="text-right px-3 py-2">Compras</th>
                  <th className="text-right px-3 py-2">Total Gastado</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((c: any, i: number) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-right">{c.totalSales}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-green-600">{fmt(c.totalSpent)}</td>
                  </tr>
                ))}
                {data.topClients.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5" /> Clientes Inactivos (60+ dias)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2">Cliente</th>
                  <th className="text-right px-3 py-2">Ultima Compra</th>
                  <th className="text-right px-3 py-2">Dias Sin Comprar</th>
                </tr>
              </thead>
              <tbody>
                {data.inactiveClients.slice(0, 10).map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{new Date(c.lastPurchaseAt).toLocaleDateString('es')}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${c.daysSince > 90 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {c.daysSince} dias
                      </span>
                    </td>
                  </tr>
                ))}
                {data.inactiveClients.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400">Todos los clientes estan activos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION: PAYMENTS + INVENTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Distribucion de Pagos</h2>
          {paymentPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                    {paymentPieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {paymentPieData.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{p.name}</span>
                    <span className="font-mono font-medium ml-auto">{fmt(p.value)}</span>
                    <span className="text-gray-400 text-xs">({p.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">No hay datos de pagos</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Inventario</h2>
          {pieStockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieStockData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                  {pieStockData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-8">Sin datos de inventario</p>
          )}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total productos</span>
              <span className="font-mono font-medium">{data.inventorySummary.totalProducts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor del inventario</span>
              <span className="font-mono font-bold text-blue-600">{fmt(data.inventorySummary.totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sin stock</span>
              <span className="font-mono text-red-600">{data.inventorySummary.outOfStock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bajo minimo</span>
              <span className="font-mono text-yellow-600">{data.inventorySummary.lowStock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">OK</span>
              <span className="font-mono text-green-600">{data.inventorySummary.okStock}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
