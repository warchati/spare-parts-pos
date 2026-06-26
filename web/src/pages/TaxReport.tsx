import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { formatCurrency, getSymbol } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { BarChart3, DollarSign, Receipt, TrendingUp, TrendingDown, Percent, Package, Download, Wallet } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Alquiler', utilities: 'Servicios', salaries: 'Sueldos',
  supplies: 'Insumos', maintenance: 'Mantenimiento', transport: 'Transporte',
  marketing: 'Marketing', taxes: 'Impuestos', insurance: 'Seguros', other: 'Otros',
}

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

  const downloadPDF = () => {
    if (!data) return
    const sym = getSymbol()
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 190
    let y = 20

    doc.setFontSize(18)
    doc.text('Declaración de TVA', pageW / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(10)
    doc.text(`Período: ${startDate} al ${endDate}`, pageW / 2, y, { align: 'center' })
    y += 6
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, pageW / 2, y, { align: 'center' })
    y += 10

    doc.setDrawColor(200)
    doc.line(10, y, 200, y)
    y += 8

    doc.setFontSize(12)
    doc.text('Resumen', 10, y)
    y += 7

    const summary = data.summary
    const summaryRows = [
      ['Ingresos (sin IVA)', `${sym} ${summary.revenueExcludingTax.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['IVA Cobrado (Ventas)', `${sym} ${summary.totalTax.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Ingresos + IVA', `${sym} ${summary.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Costo de Ventas', `${sym} ${summary.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Ganancia Bruta', `${sym} ${summary.grossProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Margen Bruto', `${summary.profitMargin.toFixed(1)}%`],
      ['Gastos Operativos', `${sym} ${summary.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Ganancia Neta', `${sym} ${summary.netProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Margen Neto', `${summary.netMargin.toFixed(1)}%`],
      ['IVA Deducible (Gastos)', `${sym} ${summary.tvaDeducible.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['TVA a Pagar (Hacienda)', `${sym} ${summary.tvaDue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`],
      ['Ventas Realizadas', String(summary.salesCount)],
      ['Artículos Vendidos', String(summary.itemsSold)],
    ]

    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Valor']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 10

      if (data.byPaymentMethod?.length) {
        doc.setFontSize(12)
        doc.text('Desglose por Método de Pago', 10, y)
        y += 7

        const payRows = data.byPaymentMethod.map((pm: any) => [
          methodLabel[pm.method] || pm.method,
          `${sym} ${pm.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
          `${((pm.total / summary.totalRevenue) * 100).toFixed(1)}%`,
        ])

        autoTable(doc, {
          startY: y,
          head: [['Método', 'Total', '%']],
          body: payRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60, halign: 'right' }, 2: { cellWidth: 40, halign: 'right' } },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

      if (data.expensesByCategory?.length) {
        doc.setFontSize(12)
        doc.text('Desglose de Gastos por Categoría', 10, y)
        y += 7

        const catLabels: Record<string, string> = {
          rent: 'Alquiler', utilities: 'Servicios', salaries: 'Sueldos',
          supplies: 'Insumos', maintenance: 'Mantenimiento', transport: 'Transporte',
          marketing: 'Marketing', taxes: 'Impuestos', insurance: 'Seguros', other: 'Otros',
        }

        const catRows = data.expensesByCategory.map((c: any) => [
          catLabels[c.category] || c.category,
          `${sym} ${c.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
          `${sym} ${c.taxAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
          String(c.count),
        ])

        autoTable(doc, {
          startY: y,
          head: [['Categoría', 'Total', 'IVA', 'Cantidad']],
          body: catRows,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50, halign: 'right' }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' } },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

    doc.setFontSize(8)
    doc.text('Documento generado automáticamente por AutoRepuestos - POS', pageW / 2, 285, { align: 'center' })

    doc.save(`declaracion-tva-${startDate}-a-${endDate}.pdf`)
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
        {data && (
          <button onClick={downloadPDF} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        )}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard title="Ingresos (sin IVA)" value={formatCurrency(data.summary.revenueExcludingTax)} icon={TrendingUp} color="text-green-500" />
            <SummaryCard title="IVA Cobrado (Ventas)" value={formatCurrency(data.summary.totalTax)} icon={TrendingUp} color="text-orange-500" />
            <SummaryCard title="IVA Deducible (Gastos)" value={formatCurrency(data.summary.tvaDeducible)} icon={TrendingDown} color="text-red-500" />
            <SummaryCard title="TVA a Pagar (Hacienda)" value={formatCurrency(data.summary.tvaDue)} icon={Percent} color="text-red-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard title="Costo de Ventas" value={formatCurrency(data.summary.totalCost)} icon={TrendingDown} color="text-red-500" />
            <SummaryCard title="Ganancia Bruta" value={formatCurrency(data.summary.grossProfit)} icon={DollarSign} color="text-blue-500" />
            <SummaryCard title="Gastos Operativos" value={formatCurrency(data.summary.totalExpenses)} icon={Wallet} color="text-red-500" />
            <SummaryCard title="Ganancia Neta" value={formatCurrency(data.summary.netProfit)} icon={DollarSign} color="text-green-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard title="Margen Bruto" value={`${data.summary.profitMargin.toFixed(1)}%`} icon={Percent} color="text-purple-500" />
            <SummaryCard title="Margen Neto" value={`${data.summary.netMargin.toFixed(1)}%`} icon={Percent} color="text-blue-600" />
            <SummaryCard title="Ventas" value={data.summary.salesCount} icon={Receipt} color="text-gray-500" />
            <SummaryCard title="Artículos Vendidos" value={data.summary.itemsSold} icon={Package} color="text-gray-500" />
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

          {data.expensesByCategory?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Desglose de Gastos por Categoría</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left pb-2">Categoría</th>
                    <th className="text-right pb-2">Total</th>
                    <th className="text-right pb-2">IVA</th>
                    <th className="text-right pb-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expensesByCategory?.map((c: any) => (
                    <tr key={c.category} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{CATEGORY_LABELS[c.category] || c.category}</td>
                      <td className="py-2 text-right font-mono text-red-600">{formatCurrency(c.total)}</td>
                      <td className="py-2 text-right font-mono text-orange-600">{formatCurrency(c.taxAmount)}</td>
                      <td className="py-2 text-right text-gray-500">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
