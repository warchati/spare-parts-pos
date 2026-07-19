import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Car, Link as LinkIcon, Trash2, X, Package, Loader2, Pencil, Unlink, Filter } from 'lucide-react'

interface VehicleProduct {
  id: number
  name: string
  code: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number | null
  products?: { product: VehicleProduct }[]
}

export default function Vehicles() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState({ brand: '', model: '', year: new Date().getFullYear() })
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [linking, setLinking] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const loadVehicles = useCallback(async (q?: string, brand?: string) => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (brand) params.brand = brand
      const res = await api.get('/vehicles', { params })
      setVehicles(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const loadBrands = async () => {
    try {
      const res = await api.get('/vehicles/brands')
      setBrands(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadBrands() }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadVehicles(search || undefined, brandFilter || undefined)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, brandFilter, loadVehicles])

  const loadProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!productSearch.trim()) { setFilteredProducts([]); return }
    const lower = productSearch.toLowerCase()
    setFilteredProducts(products.filter(p =>
      p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower)
    ))
  }, [productSearch, products])

  const openCreateForm = () => {
    setEditingVehicle(null)
    setForm({ brand: '', model: '', year: new Date().getFullYear() })
    setShowForm(true)
  }

  const openEditForm = (v: Vehicle) => {
    setEditingVehicle(v)
    setForm({ brand: v.brand, model: v.model, year: v.year || new Date().getFullYear() })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, form)
      } else {
        await api.post('/vehicles', form)
      }
      setShowForm(false)
      setEditingVehicle(null)
      setForm({ brand: '', model: '', year: new Date().getFullYear() })
      loadVehicles(search || undefined, brandFilter || undefined)
      loadBrands()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al guardar') }
  }

  const linkProduct = async (productId: number) => {
    if (!selectedVehicle) return
    setLinking(productId)
    try {
      await api.post(`/vehicles/${selectedVehicle.id}/products`, { productId })
      setShowLinkModal(false)
      setProductSearch('')
      loadVehicles(search || undefined, brandFilter || undefined)
    } catch (e: any) { alert(e.response?.data?.error || 'Error al vincular') }
    finally { setLinking(null) }
  }

  const unlinkProduct = async (productId: number) => {
    if (!selectedVehicle) return
    if (!confirm('¿Desvincular este producto del vehículo?')) return
    try {
      await api.delete(`/vehicles/${selectedVehicle.id}/products/${productId}`)
      setSelectedVehicle(prev => prev ? {
        ...prev,
        products: prev.products?.filter(p => p.product.id !== productId) || [],
      } : null)
      loadVehicles(search || undefined, brandFilter || undefined)
    } catch (e: any) { alert(e.response?.data?.error || 'Error al desvincular') }
  }

  const deleteVehicle = async (id: number) => {
    if (!confirm('¿Eliminar este vehículo y todos sus vínculos?')) return
    try {
      await api.delete(`/vehicles/${id}`)
      loadVehicles(search || undefined, brandFilter || undefined)
      loadBrands()
    } catch (e: any) { alert(e.response?.data?.error || 'Error al eliminar') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Car className="w-6 h-6" /> Vehículos
        </h1>
        {can(user?.role, 'vehicles', 'create') && (
          <button onClick={openCreateForm} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nuevo Vehículo
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca o modelo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {brands.length > 0 && (
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
            >
              <option value="">Todas las marcas</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[500px]">
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
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Cargando...
              </td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                {search || brandFilter ? 'No se encontraron vehículos' : 'No hay vehículos registrados'}
              </td></tr>
            ) : vehicles.map(v => (
              <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.brand}</td>
                <td className="px-4 py-3 text-gray-600">{v.model}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{v.year || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => { setSelectedVehicle(v); setShowLinkModal(false) }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {v.products?.length || 0} productos
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {can(user?.role, 'vehicles', 'edit') && (
                      <>
                        <button
                          onClick={() => openEditForm(v)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => { setSelectedVehicle(v); setShowLinkModal(true); loadProducts() }}
                          className="p-1.5 hover:bg-blue-50 rounded"
                          title="Vincular Producto"
                        >
                          <LinkIcon className="w-4 h-4 text-blue-500" />
                        </button>
                      </>
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
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">{editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
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
              <button onClick={() => { setShowForm(false); setEditingVehicle(null) }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {selectedVehicle && !showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year ? `(${selectedVehicle.year})` : ''}</h2>
              <button onClick={() => setSelectedVehicle(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Productos Vinculados</h3>
              {can(user?.role, 'vehicles', 'edit') && (
                <button
                  onClick={() => { setShowLinkModal(true); loadProducts() }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Vincular
                </button>
              )}
            </div>
            {selectedVehicle.products && selectedVehicle.products.length > 0 ? (
              <div className="space-y-2">
                {selectedVehicle.products.map((vp) => (
                  <div key={vp.product.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{vp.product.name}</p>
                        <p className="text-xs text-gray-500">{vp.product.code}</p>
                      </div>
                    </div>
                    {can(user?.role, 'vehicles', 'edit') && (
                      <button
                        onClick={() => unlinkProduct(vp.product.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                        title="Desvincular"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin productos vinculados</p>
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
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            {filteredProducts.length > 0 && (
              <div className="max-h-60 overflow-auto border border-gray-200 rounded-lg">
                {filteredProducts.map(p => {
                  const alreadyLinked = selectedVehicle.products?.some(vp => vp.product.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => !alreadyLinked && linkProduct(p.id)}
                      disabled={alreadyLinked || linking === p.id}
                      className={`w-full text-left px-3 py-2 border-b last:border-0 text-sm flex items-center justify-between ${
                        alreadyLinked ? 'bg-gray-50 text-gray-400 cursor-default' : 'hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-gray-500 ml-2">{p.code}</span>
                      </div>
                      {linking === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      ) : alreadyLinked ? (
                        <span className="text-xs text-gray-400">Vinculado</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
            {productSearch && filteredProducts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin resultados para "{productSearch}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
