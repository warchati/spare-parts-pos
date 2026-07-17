import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, Trash2, Warehouse, MapPin, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Warehouses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', code: '', address: '' })

  useEffect(() => { loadWarehouses() }, [search])

  const loadWarehouses = async () => {
    try {
      const res = await api.get('/warehouses')
      let data = res.data
      if (search) data = data.filter((w: any) =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.code.toLowerCase().includes(search.toLowerCase())
      )
      setWarehouses(data)
    } catch (e) { console.error('Failed to load warehouses:', e) }
  }

  const handleSave = async () => {
    try {
      if (editing) await api.put(`/warehouses/${editing.id}`, form)
      else await api.post('/warehouses', form)
      setShowForm(false); setEditing(null); loadWarehouses()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este almacén?')) return
    try {
      await api.delete(`/warehouses/${id}`)
      loadWarehouses()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Warehouse className="w-6 h-6" /> Almacenes</h1>
        {can(user?.role, 'warehouses', 'create') && (
          <button onClick={() => { setEditing(null); setForm({ name: '', code: '', address: '' }); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Almacén</button>
        )}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar almacenes..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-center px-4 py-3">Ubicaciones</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map(w => (
              <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-500">{w.code}</td>
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{w.address || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => navigate(`/locations?warehouseId=${w.id}`)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <MapPin className="w-4 h-4" /> {w._count?.locations || 0}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'warehouses', 'edit') && (
                      <button onClick={() => { setEditing(w); setForm(w); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
                    )}
                    {can(user?.role, 'warehouses', 'delete') && (
                      <button onClick={() => handleDelete(w.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {warehouses.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay almacenes</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Almacén' : 'Nuevo Almacén'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
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
