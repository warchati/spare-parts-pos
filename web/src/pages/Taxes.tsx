import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Percent, Plus, Pencil, X, Check, AlertCircle, Star } from 'lucide-react'

interface Tax {
  id: number
  name: string
  percentage: number
  isDefault: boolean
  isActive: boolean
}

export default function Taxes() {
  const { user } = useAuth()
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tax | null>(null)
  const [form, setForm] = useState({ name: '', percentage: 0, isDefault: false })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => { loadTaxes() }, [])

  const loadTaxes = async () => {
    try {
      const res = await api.get('/taxes')
      setTaxes(res.data)
    } catch (e) { console.error(e) }
  }

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/taxes/${editing.id}`, form)
        showAlert('success', 'Impuesto actualizado correctamente')
      } else {
        await api.post('/taxes', form)
        showAlert('success', 'Impuesto creado correctamente')
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', percentage: 0, isDefault: false })
      loadTaxes()
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Error al guardar')
    }
  }

  const toggleActive = async (tax: Tax) => {
    try {
      await api.put(`/taxes/${tax.id}`, { isActive: !tax.isActive })
      showAlert('success', `Impuesto ${tax.isActive ? 'desactivado' : 'activado'} correctamente`)
      loadTaxes()
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Error al cambiar estado')
    }
  }

  const editTax = (tax: Tax) => {
    setEditing(tax)
    setForm({ name: tax.name, percentage: tax.percentage, isDefault: tax.isDefault })
    setShowForm(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Percent className="w-6 h-6" /> Impuestos
        </h1>
        {can(user?.role, 'taxes', 'create') && (
          <button
            onClick={() => { setEditing(null); setForm({ name: '', percentage: 0, isDefault: false }); setShowForm(true) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Nuevo Impuesto
          </button>
        )}
      </div>

      {alert && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${alert.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {alert.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {alert.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Porcentaje</th>
              <th className="text-center px-4 py-3">Default</th>
              <th className="text-center px-4 py-3">Activo</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map(tax => (
              <tr key={tax.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{tax.name}</td>
                <td className="px-4 py-3">{tax.percentage}%</td>
                <td className="px-4 py-3 text-center">
                  {tax.isDefault ? <Star className="w-4 h-4 text-yellow-500 mx-auto" /> : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tax.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {tax.isActive ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'taxes', 'edit') && (
                      <>
                        <button onClick={() => editTax(tax)} className="p-1.5 hover:bg-gray-100 rounded">
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => toggleActive(tax)} className="p-1.5 hover:bg-gray-100 rounded">
                          {tax.isActive ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {taxes.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay impuestos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Impuesto' : 'Nuevo Impuesto'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje</label>
                <input type="number" value={form.percentage} onChange={(e) => setForm({...form, percentage: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" step="0.01" min="0" max="100" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => setForm({...form, isDefault: e.target.checked})} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="isDefault" className="text-sm text-gray-700">Impuesto por defecto</label>
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
