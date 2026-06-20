import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Car, Link as LinkIcon, Trash2, X, Package } from 'lucide-react'

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  products?: any[]
}

export default function Vehicles() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ brand: '', model: '', year: new Date().getFullYear() })
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])

  useEffect(() => { loadVehicles() }, [search])

  const loadVehicles = async () => {
    try {
      const res = await api.get('/vehicles', { params: { q: search || undefined } })
      setVehicles(res.data)
    } catch (e) { console.error(e) }
  }

  const loadProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!productSearch.trim()) { setFilteredProducts([]); return }
    setFilteredProducts(products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    ))
  }, [productSearch, products])

  const handleSave = async () => {
    try {
      await api.post('/vehicles', form)
      setShowForm(false)
      setForm({ brand: '', model: '', year: new Date().getFullYear() })
      loadVehicles()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al guardar') }
  }

  const linkProduct = async (productId: number) => {
    try {
      await api.post(`/vehicles/${selectedVehicle!.id}/products`, { productId })
      setShowLinkModal(false)
      setProductSearch('')
      loadVehicles()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al vincular') }
  }

  const deleteVehicle = async (id: number) => {
    if (!confirm('¿Eliminar este vehículo?')) return
    try {
      await api.delete(`/vehicles/${id}`)
      loadVehicles()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar') }
  }

  const filtered = vehicles.filter(v =>
    v.brand.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Car className="w-6 h-6" /> Vehículos
        </h1>
        {can(user?.role, 'vehicles', 'create') && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Vehículo
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por marca o modelo..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Marca</th>
              <th className="text-left px-4 py-3">Modelo</th>
              <th className="text-left px-4 py-3">Año</th>
              <th className="text-center px-4 py-3">Productos</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.brand}</td>
                <td className="px-4 py-3 text-gray-600">{v.model}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{v.year}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => { setSelectedVehicle(v); loadProducts() }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {v.products?.length || 0} productos
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'vehicles', 'edit') && (
                      <button
                        onClick={() => { setSelectedVehicle(v); setShowLinkModal(true); loadProducts() }}
                        className="p-1.5 hover:bg-blue-50 rounded"
                        title="Vincular Producto"
                      >
                        <LinkIcon className="w-4 h-4 text-blue-500" />
                      </button>
                    )}
                    {can(user?.role, 'vehicles', 'delete') && (
                      <button onClick={() => deleteVehicle(v.id)} className="p-1.5 hover:bg-red-50 rounded" title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay vehículos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Nuevo Vehículo</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                <input type="text" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                <input type="text" value={form.model} onChange={(e) => setForm({...form, model: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <input type="number" value={form.year} onChange={(e) => setForm({...form, year: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {selectedVehicle && !showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})</h2>
              <button onClick={() => setSelectedVehicle(null)}><X className="w-5 h-5" /></button>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Productos Vinculados</h3>
            {selectedVehicle.products?.length > 0 ? (
              <div className="space-y-2">
                {selectedVehicle.products.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <Package className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin productos vinculados</p>
            )}
          </div>
        </div>
      )}

      {showLinkModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Vincular Producto</h2>
              <button onClick={() => { setShowLinkModal(false); setProductSearch('') }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{selectedVehicle.brand} {selectedVehicle.model}</p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar producto..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {filteredProducts.length > 0 && (
              <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => linkProduct(p.id)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500 ml-2">{p.code}</span>
                  </button>
                ))}
              </div>
            )}
            {productSearch && filteredProducts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
