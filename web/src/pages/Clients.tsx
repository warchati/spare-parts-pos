import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, Users, Award } from 'lucide-react'

interface Client {
  id: number
  name: string
  phone: string
  email: string
  vehicle: string
  creditLimit: number
  currentBalance: number
  pointsBalance: number
}

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', document: '', vehicle: '', notes: '', creditLimit: 0 })

  useEffect(() => { loadClients() }, [search])

  const loadClients = async () => {
    try {
      const res = await api.get('/clients', { params: { q: search || undefined } })
      setClients(res.data)
    } catch (e) { console.error('Failed to load clients:', e) }
  }

  const handleSave = async () => {
    try {
      if (editing) await api.put(`/clients/${editing.id}`, form)
      else await api.post('/clients', form)
      setShowForm(false); setEditing(null); loadClients()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-6 h-6" /> Clientes</h1>
        {can(user?.role, 'clients', 'create') && (
          <button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', document: '', vehicle: '', notes: '', creditLimit: 0 }); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nuevo Cliente</button>
        )}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Vehículo</th>
              <th className="text-right px-4 py-3">Puntos</th>
              <th className="text-right px-4 py-3">Límite Crédito</th>
              <th className="text-right px-4 py-3">Saldo</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.vehicle}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1 text-yellow-700 font-medium text-sm">
                    <Award className="w-3.5 h-3.5" /> {c.pointsBalance?.toLocaleString() || '0'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.creditLimit)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.currentBalance)}</td>
                <td className="px-4 py-3 text-right">
                  {can(user?.role, 'clients', 'edit') && (
                    <button onClick={() => { setEditing(c); setForm(c as any); setShowForm(true) }} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-400" /></button>
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
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Nombre *', field: 'name', type: 'text' },
                { label: 'Teléfono', field: 'phone', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
                { label: 'Dirección', field: 'address', type: 'text' },
                { label: 'Documento', field: 'document', type: 'text' },
                { label: 'Vehículo', field: 'vehicle', type: 'text' },
                { label: 'Notas', field: 'notes', type: 'text' },
                { label: 'Límite Crédito', field: 'creditLimit', type: 'number' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={(e) => setForm({...form, [field]: type === 'number' ? Number(e.target.value) : e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
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
