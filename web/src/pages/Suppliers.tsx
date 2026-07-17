import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, Truck } from 'lucide-react'

export default function Suppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { loadSuppliers() }, [search])

  const loadSuppliers = async () => {
    try {
      const res = await api.get('/suppliers', { params: { q: search || undefined } })
      setSuppliers(res.data)
    } catch (e) { console.error('Failed to load suppliers:', e) }
  }

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        alert('El nombre es requerido')
        return
      }
      if (editing) await api.put(`/suppliers/${editing.id}`, form)
      else await api.post('/suppliers', form)
      setShowForm(false); setEditing(null); loadSuppliers()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck className="w-6 h-6" /> Proveedores</h1>
        {can(user?.role, 'suppliers', 'create') && (
          <button onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '', notes: '' }); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Proveedor</button>
        )}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedores..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Contacto</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.contact}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.email}</td>
                <td className="px-4 py-3 text-right">
                  {can(user?.role, 'suppliers', 'edit') && (
                    <button onClick={() => { setEditing(s); setForm(s); setShowForm(true) }} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Nombre *', field: 'name', type: 'text' },
                { label: 'Contacto', field: 'contact', type: 'text' },
                { label: 'Teléfono', field: 'phone', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
                { label: 'Dirección', field: 'address', type: 'text' },
                { label: 'Notas', field: 'notes', type: 'text' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={(e) => setForm({...form, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
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
