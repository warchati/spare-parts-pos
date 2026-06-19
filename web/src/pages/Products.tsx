import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Search, Plus, Pencil, Package } from 'lucide-react'

interface Product {
  id: number
  code: string
  name: string
  brand: string
  category: string
  stock: number
  minStock: number
  sellPrice: number
  buyPrice: number
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ code: '', barcode: '', name: '', description: '', category: '', brand: '', vehicleType: '', oemNumber: '', buyPrice: 0, sellPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, location: '' })

  useEffect(() => { loadProducts() }, [search])

  const loadProducts = async () => {
    try {
      const res = await api.get('/products', { params: { q: search || undefined } })
      setProducts(res.data)
    } catch {}
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form)
      } else {
        await api.post('/products', form)
      }
      setShowForm(false)
      setEditing(null)
      resetForm()
      loadProducts()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar')
    }
  }

  const resetForm = () => setForm({ code: '', barcode: '', name: '', description: '', category: '', brand: '', vehicleType: '', oemNumber: '', buyPrice: 0, sellPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, location: '' })

  const editProduct = (p: Product) => {
    setEditing(p)
    setForm(p as any)
    setShowForm(true)
  }

  const lowStock = products.filter(p => p.stock <= p.minStock)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6" /> Productos
        </h1>
        <button onClick={() => { setEditing(null); resetForm(); setShowForm(true) }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
          Stock bajo: {lowStock.map(p => `${p.name} (${p.stock})`).join(', ')}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Marca</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Costo</th>
              <th className="text-right px-4 py-3">Precio</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-500">{p.code}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.brand}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.category}</td>
                <td className={`px-4 py-3 text-right font-mono ${p.stock <= p.minStock ? 'text-red-600 font-bold' : ''}`}>{p.stock}</td>
                <td className="px-4 py-3 text-right font-mono">${p.buyPrice.toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 text-right font-mono font-bold">${p.sellPrice.toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => editProduct(p)} className="p-1 hover:bg-gray-100 rounded">
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No hay productos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                <input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra</label>
                <input type="number" value={form.buyPrice} onChange={(e) => setForm({...form, buyPrice: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                <input type="number" value={form.sellPrice} onChange={(e) => setForm({...form, sellPrice: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
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
