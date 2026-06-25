import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { DollarSign, Plus, Pencil, X, Check, AlertCircle, Star } from 'lucide-react'

interface Currency {
  id: number
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
  isActive: boolean
}

export default function Currencies() {
  const { user } = useAuth()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Currency | null>(null)
  const [form, setForm] = useState({ code: '', name: '', symbol: '', exchangeRate: 1, isBase: false })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => { loadCurrencies() }, [])

  const loadCurrencies = async () => {
    try {
      const res = await api.get('/currencies')
      setCurrencies(res.data)
    } catch (e) { console.error(e) }
  }

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleSave = async () => {
    try {
      const payload = { ...form, code: form.code.toUpperCase() }
      if (editing) {
        await api.put(`/currencies/${editing.id}`, payload)
        showAlert('success', 'Moneda actualizada correctamente')
      } else {
        await api.post('/currencies', payload)
        showAlert('success', 'Moneda creada correctamente')
      }
      setShowForm(false)
      setEditing(null)
      setForm({ code: '', name: '', symbol: '', exchangeRate: 1, isBase: false })
      loadCurrencies()
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Error al guardar')
    }
  }

  const toggleActive = async (currency: Currency) => {
    try {
      await api.put(`/currencies/${currency.id}`, { isActive: !currency.isActive })
      showAlert('success', `Moneda ${currency.isActive ? 'desactivada' : 'activada'} correctamente`)
      loadCurrencies()
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Error al cambiar estado')
    }
  }

  const editCurrency = (currency: Currency) => {
    setEditing(currency)
    setForm({ code: currency.code, name: currency.name, symbol: currency.symbol, exchangeRate: currency.exchangeRate, isBase: currency.isBase })
    setShowForm(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6" /> Monedas
        </h1>
        {can(user?.role, 'currencies', 'create') && (
          <button
            onClick={() => { setEditing(null); setForm({ code: '', name: '', symbol: '', exchangeRate: 1, isBase: false }); setShowForm(true) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Nueva Moneda
          </button>
        )}
      </div>

      {alert && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${alert.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {alert.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {alert.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Símbolo</th>
              <th className="text-right px-4 py-3">Tasa de Cambio</th>
              <th className="text-center px-4 py-3">Base</th>
              <th className="text-center px-4 py-3">Activo</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(currency => (
              <tr key={currency.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium">{currency.code}</td>
                <td className="px-4 py-3">{currency.name}</td>
                <td className="px-4 py-3 text-lg">{currency.symbol}</td>
                <td className="px-4 py-3 text-right font-mono">{currency.exchangeRate.toFixed(4)}</td>
                <td className="px-4 py-3 text-center">
                  {currency.isBase ? <Star className="w-4 h-4 text-yellow-500 mx-auto" /> : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${currency.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {currency.isActive ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'currencies', 'edit') && (
                      <>
                        <button onClick={() => editCurrency(currency)} className="p-1.5 hover:bg-gray-100 rounded">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => toggleActive(currency)} className="p-1.5 hover:bg-gray-100 rounded">
                          {currency.isActive ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {currencies.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay monedas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Moneda' : 'Nueva Moneda'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase" maxLength={3} placeholder="USD" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dólar Americano" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo</label>
                <input type="text" value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="$" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Cambio</label>
                <input type="number" value={form.exchangeRate} onChange={(e) => setForm({...form, exchangeRate: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" step="0.0001" min="0" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isBase" checked={form.isBase} onChange={(e) => setForm({...form, isBase: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="isBase" className="text-sm text-gray-700">Moneda base</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
