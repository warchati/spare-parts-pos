import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { BarChart3, DollarSign, Receipt, TrendingUp, TrendingDown, Percent, Package } from 'lucide-react'

const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }

export default function TaxReport() {
  useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10))

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/tax-summary', { params: { startDate, endDate } })
      setData(res.data)
    } catch { alert('Error al cargar reporte') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  useEffect(() => { loadReport() }, [loadReport])

  const formatCurrency = (n: number) => {
    return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
  }

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{title}</p>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Reporte de Ganancias e Impuestos
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <button onClick={loadReport} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
          {loading ? 'Cargando...' : 'Generar Reporte'}
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard title="Ingresos" value={formatCurrency(data.summary.totalRevenue)} icon={TrendingUp} color="text-green-500" />
            <SummaryCard title="Costo de Ventas" value={formatCurrency(data.summary.totalCost)} icon={TrendingDown} color="text-red-500" />
            <SummaryCard title="Ganancia Bruta" value={formatCurrency(data.summary.grossProfit)} icon={DollarSign} color="text-blue-500" />
            <SummaryCard title="Margen" value={`${data.summary.profitMargin.toFixed(1)}%`} icon={Percent} color="text-purple-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard title="Ventas" value={data.summary.salesCount} icon={Receipt} color="text-gray-500" />
            <SummaryCard title="Artículos Vendidos" value={data.summary.itemsSold} icon={Package} color="text-gray-500" />
            <SummaryCard title="IVA a Pagar (Hacienda)" value={formatCurrency(data.summary.totalTax)} icon={Percent} color="text-orange-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Desglose por Método de Pago</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">Método</th>
                  <th className="text-right pb-2">Total</th>
                  <th className="text-right pb-2">%</th>
                </tr>
              </thead>
              <tbody>
                {data.byPaymentMethod?.map((pm: any) => (
                  <tr key={pm.method} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{methodLabel[pm.method] || pm.method}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(pm.total)}</td>
                    <td className="py-2 text-right text-gray-500">{((pm.total / data.summary.totalRevenue) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
