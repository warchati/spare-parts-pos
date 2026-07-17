import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { downloadExport } from '../lib/download'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Pencil, Package, Download, Image, Car, Upload, Trash2, X, Eye } from 'lucide-react'

interface Product {
  id: number
  code: string
  barcode: string
  name: string
  brand: string
  category: string
  stock: number
  minStock: number
  sellPrice: number
  buyPrice: number
  wholesalePrice: number
  location: string
  defaultLocationId: number | null
  defaultLocation?: { id: number; name: string; code: string } | null
  images?: { id: number, url: string }[]
  vehicles?: { id: number, brand: string, model: string, year: number }[]
}

interface LocationOption {
  id: number
  name: string
  code: string
  warehouse?: { name: string }
}

const CLOUDINARY_CLOUD = 'vidcanal'
const CLOUDINARY_PRESET = 'm5vtjzdl'

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ code: '', barcode: '', name: '', description: '', category: '', brand: '', vehicleType: '', oemNumber: '', buyPrice: 0, sellPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, location: '', defaultLocationId: 0 })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [locations, setLocations] = useState<LocationOption[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => { loadProducts() }, [search])

  useEffect(() => {
    api.get('/locations').then(r => setLocations(r.data)).catch((e) => console.error('Failed to load locations:', e))
  }, [])

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { params: { q: search || undefined } })
      setProducts(res.data)
    } catch (e) { console.error(e) }
  }

  const handleSave = async () => {
    try {
      const payload = { ...form, defaultLocationId: form.defaultLocationId > 0 ? form.defaultLocationId : null }
      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      setShowForm(false)
      setEditing(null)
      resetForm()
      loadProducts()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    try {
      setUploadingImage(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', CLOUDINARY_PRESET)
      fd.append('folder', 'products')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Error al subir imagen')
      }
      const data = await res.json()
      await api.post(`/images/product/${editing.id}`, { url: data.secure_url })
      loadProducts()
    } catch (err: any) {
      alert(err.message || 'Error al subir imagen')
    } finally {
      setUploadingImage(false)
    }
  }

  const deleteImage = async (imageId: number) => {
    if (!editing) return
    try {
      await api.delete(`/images/${imageId}`)
      loadProducts()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar imagen')
    }
  }

  const resetForm = () => setForm({ code: '', barcode: '', name: '', description: '', category: '', brand: '', vehicleType: '', oemNumber: '', buyPrice: 0, sellPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, location: '', defaultLocationId: 0 })

  const editProduct = (p: Product) => {
    setEditing(p)
    setForm({
      code: p.code,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      category: p.category,
      brand: p.brand,
      vehicleType: p.vehicleType,
      oemNumber: p.oemNumber,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      wholesalePrice: p.wholesalePrice,
      stock: p.stock,
      minStock: p.minStock,
      location: p.location || '',
      defaultLocationId: p.defaultLocationId ?? 0,
    })
    setShowForm(true)
  }

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock)
  const outOfStock = products.filter(p => p.stock <= 0)
  const okStock = products.filter(p => p.stock > p.minStock)

  const filteredProducts = products.filter(p => {
    if (stockFilter === 'out') return p.stock <= 0
    if (stockFilter === 'low') return p.stock > 0 && p.stock <= p.minStock
    if (stockFilter === 'ok') return p.stock > p.minStock
    return true
  })

  const stockDot = (p: Product) => {
    if (p.stock <= 0) return 'bg-red-500'
    if (p.stock <= p.minStock) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const canViewCost = can(user?.role, 'products', 'viewCost')
  const canViewWholesale = can(user?.role, 'products', 'viewWholesale')



  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6" /> Productos
        </h1>
        <div className="flex items-center gap-2">
            <button onClick={() => downloadExport('/exports/products/csv', 'productos.xlsx')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
              Exportar CSV
            </button>
          {can(user?.role, 'products', 'create') && (
            <button onClick={() => { setEditing(null); resetForm(); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
          Stock bajo: {lowStock.map(p => `${p.name} (${p.stock})`).join(', ')}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px]">
          <option value="">Todos ({products.length})</option>
          <option value="out">🔴 Sin stock ({outOfStock.length})</option>
          <option value="low">🟡 Bajo mínimo ({lowStock.length})</option>
          <option value="ok">🟢 OK ({okStock.length})</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Marca</th>
              <th className="text-center px-4 py-3">Stock</th>
              {canViewCost && <th className="text-right px-4 py-3">Costo</th>}
              <th className="text-right px-4 py-3">Precio</th>
              {canViewWholesale && <th className="text-right px-4 py-3">Por Mayor</th>}
              <th className="text-left px-4 py-3">Ubicación</th>
              <th className="text-center px-4 py-3">Img</th>
              <th className="text-center px-4 py-3">Veh.</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-500">
                  <div>{p.code}</div>
                  {p.barcode && <div className="text-xs text-gray-300">{p.barcode}</div>}
                </td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.brand}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${stockDot(p)}`} />
                    <span className={`font-mono ${p.stock <= p.minStock ? 'text-red-600 font-bold' : ''}`}>{p.stock}</span>
                  </div>
                </td>
                {canViewCost && <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.buyPrice)}</td>}
                <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(p.sellPrice)}</td>
                {canViewWholesale && <td className="px-4 py-3 text-right font-mono text-gray-500">{p.wholesalePrice ? formatCurrency(p.wholesalePrice) : '-'}</td>}
                <td className="px-4 py-3 text-sm text-gray-500">{p.defaultLocation?.name || p.location || '-'}</td>
                <td className="px-4 py-3 text-center">
                  {p.images && p.images.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <button onClick={() => setViewImage(p.images[0].url)} className="hover:opacity-80 transition-opacity">
                        <img src={p.images[0].url} alt="" className="w-8 h-8 object-cover rounded" />
                      </button>
                    </div>
                  ) : (
                    <Image className="w-4 h-4 text-gray-300 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.vehicles && p.vehicles.length > 0 ? (
                    <button
                      onClick={() => setSelectedProduct(p)}
                      className="text-blue-600 hover:underline text-xs"
                      title={p.vehicles.map(v => `${v.brand} ${v.model}`).join(', ')}
                    >
                      {p.vehicles.length}
                    </button>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {can(user?.role, 'products', 'edit') && (
                    <button onClick={() => editProduct(p)} className="p-1 hover:bg-gray-100 rounded">
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={9 + (canViewCost ? 1 : 0) + (canViewWholesale ? 1 : 0)} className="text-center py-8 text-gray-400">{products.length === 0 ? 'No hay productos' : 'No hay productos con este filtro'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{selectedProduct.name} - Vehículos</h2>
            {selectedProduct.vehicles && selectedProduct.vehicles.length > 0 ? (
              <div className="space-y-2">
                {selectedProduct.vehicles.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{v.brand} {v.model} ({v.year})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin vehículos vinculados</p>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Barras</label>
                <input type="text" value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <input type="text" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input type="text" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nro OEM</label>
                <input type="text" value={form.oemNumber} onChange={(e) => setForm({...form, oemNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Vehículo</label>
                <input type="text" value={form.vehicleType} onChange={(e) => setForm({...form, vehicleType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <select value={form.defaultLocationId} onChange={(e) => {
                  const id = Number(e.target.value)
                  const loc = locations.find(l => l.id === id)
                  setForm({...form, defaultLocationId: id, location: loc ? `${loc.name} (${loc.code})` : '' })
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value={0}>Sin ubicación</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.warehouse?.name ? `${loc.warehouse.name} / ` : ''}{loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
              {canViewCost && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra</label>
                <input type="number" value={form.buyPrice} onChange={(e) => setForm({...form, buyPrice: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                <input type="number" value={form.sellPrice} onChange={(e) => setForm({...form, sellPrice: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {canViewWholesale && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio por Mayor</label>
                <input type="number" value={form.wholesalePrice} onChange={(e) => setForm({...form, wholesalePrice: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm({...form, minStock: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {editing && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imágenes</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editing.images?.map(img => (
                      <div key={img.id} className="relative group">
                        <button onClick={() => setViewImage(img.url)} className="hover:opacity-80 transition-opacity">
                          <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                        </button>
                        <button
                          onClick={() => deleteImage(img.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editing ? 'Actualizar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setViewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg z-10">
              <X className="w-5 h-5" />
            </button>
            <img src={viewImage} alt="" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
