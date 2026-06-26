import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, Trash2, DollarSign, TrendingDown, X } from 'lucide-react'

const CATEGORIES = [
  'rent', 'utilities', 'salaries', 'supplies', 'maintenance',
  'transport', 'marketing', 'taxes', 'insurance', 'other',
]

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Alquiler', utilities: 'Servicios', salaries: 'Sueldos',
  supplies: 'Insumos', maintenance: 'Mantenimiento', transport: 'Transporte',
  marketing: 'Marketing', taxes: 'Impuestos', insurance: 'Seguros', other: 'Otros',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
}

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ description: '', amount: 0, category: 'other', paymentMethod: 'cash', reference: '', notes: '' })

  useEffect(() => { loadExpenses() }, [search, categoryFilter])

  const loadExpenses = async () => {
    try {
      const params: any = {}
      if (search) params.q = search
      if (categoryFilter) params.category = categoryFilter
      if (startDate) params.start = startDate
      if (endDate) params.end = endDate
      const res = await api.get('/expenses', { params })
      setExpenses(res.data)
    } catch {}
  }

  const loadSummary = async () => {
    try {
      const params: any = {}
      if (startDate) params.start = startDate
      if (endDate) params.end = endDate
      const res = await api.get('/expenses/summary', { params })
      setSummary(res.data)
    } catch {}
  }

  useEffect(() => { loadSummary() }, [startDate, endDate])

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, form)
      } else {
        await api.post('/expenses', form)
      }
      setShowForm(false)
      setEditing(null)
      setForm({ description: '', amount: 0, category: 'other', paymentMethod: 'cash', reference: '', notes: '' })
      loadExpenses()
      loadSummary()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este gasto?')) return
    try {
      await api.delete(`/expenses/${id}`)
      loadExpenses()
      loadSummary()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-red-500" /> Gastos
        </h1>
        {can(user?.role, 'expenses', 'edit') && (
          <button onClick={() => { setEditing(null); setForm({ description: '', amount: 0, category: 'other', paymentMethod: 'cash', reference: '', notes: '' }); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Gasto
          </button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Gastos</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Cantidad</p>
            <p className="text-2xl font-bold text-gray-800">{summary.count}</p>
          </div>
          {summary.byCategory?.slice(0, 2).map((c: any) => (
            <div key={c.category} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{CATEGORY_LABELS[c.category] || c.category}</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(c.total)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar gastos..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Descripción</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-right px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Pago</th>
              <th className="text-left px-4 py-3">Ref.</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Registró</th>
              {can(user?.role, 'expenses', 'edit') && <th className="text-right px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.description}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {CATEGORY_LABELS[e.category] || e.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-600">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{METHOD_LABELS[e.paymentMethod] || e.paymentMethod}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.reference || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(e.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{e.user?.name}</td>
                {can(user?.role, 'expenses', 'edit') && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(e); setForm({ description: e.description, amount: e.amount, category: e.category, paymentMethod: e.paymentMethod, reference: e.reference, notes: e.notes }); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded">
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No hay gastos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({...form, paymentMethod: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (factura/recibo)</label>
                <input type="text" value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editing ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
