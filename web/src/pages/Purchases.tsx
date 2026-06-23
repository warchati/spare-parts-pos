import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { ClipboardList, Plus, Search, Package, Download, Upload, FileText, Trash2 } from 'lucide-react'

export default function Purchases() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [receivedDateFilter, setReceivedDateFilter] = useState('')
  const invoiceFileRef = useRef<HTMLInputElement>(null)
  const [uploadingInvoice, setUploadingInvoice] = useState<number | null>(null)

  useEffect(() => { loadPurchases(); loadProducts(); loadSuppliers() }, [])

  const loadPurchases = async () => {
    try {
      const params: any = {}
      if (receivedDateFilter) params.receivedDate = receivedDateFilter
      const res = await api.get('/purchases', { params })
      setPurchases(res.data)
    } catch (e) { console.error(e) }
  }
  const loadProducts = async () => {
    try { const res = await api.get('/products'); setProducts(res.data) } catch {}
  }
  const loadSuppliers = async () => {
    try { const res = await api.get('/suppliers'); setSuppliers(res.data) } catch {}
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()))
  )

  const addItem = (product: any) => {
    const existing = selectedItems.find(i => i.productId === product.id)
    if (existing) {
      setSelectedItems(selectedItems.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1, totalCost: (i.quantity + 1) * i.unitCost } : i
      ))
    } else {
      setSelectedItems([...selectedItems, { productId: product.id, productName: product.name, quantity: 1, unitCost: product.buyPrice, totalCost: product.buyPrice }])
    }
    setProductSearch('')
  }

  const createPurchase = async () => {
    if (!selectedSupplier || selectedItems.length === 0) return
    try {
      const userId = user!.id
      await api.post('/purchases', { supplierId: Number(selectedSupplier), userId, items: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })) })
      setShowForm(false)
      setSelectedItems([])
      setSelectedSupplier('')
      loadPurchases()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const receivePurchase = async (id: number) => {
    try {
      await api.patch(`/purchases/${id}/receive`)
      loadPurchases()
    } catch (e: any) { alert(e.response?.data?.error || 'Error') }
  }

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>, purchaseId: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setUploadingInvoice(purchaseId)
        await api.post(`/uploads/purchase-invoice/${purchaseId}`, { dataUrl: reader.result })
        loadPurchases()
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al subir factura')
      } finally {
        setUploadingInvoice(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const deleteInvoice = async (purchaseId: number) => {
    try {
      await api.delete(`/uploads/purchase-invoice/${purchaseId}`)
      loadPurchases()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar factura')
    }
  }


  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardList className="w-6 h-6" /> Órdenes de Compra</h1>
        <div className="flex items-center gap-2">
          <a
            href={`${import.meta.env.VITE_API_URL || '/api'}/exports/stock/csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4" /> Exportar Stock
          </a>
          {can(user?.role, 'purchases', 'create') && (
            <button onClick={() => { setShowForm(true); setSelectedItems([]); setSelectedSupplier('') }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /> Nueva Compra</button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="date" value={receivedDateFilter} onChange={(e) => { setReceivedDateFilter(e.target.value); setTimeout(loadPurchases, 0) }} className="px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-sm text-gray-500">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Proveedor</th>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Creado por</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-center px-4 py-3">Factura</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-500">#{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.supplier?.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.user?.name || '-'}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(p.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'received' ? 'bg-green-100 text-green-700' : p.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status === 'received' ? 'Recibida' : p.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {p.invoiceFile ? (
                      <>
                        <a href={p.invoiceFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="Ver factura">
                          <FileText className="w-4 h-4" />
                        </a>
                        {can(user?.role, 'purchases', 'edit') && (
                          <button onClick={() => deleteInvoice(p.id)} className="text-red-400 hover:text-red-600" title="Eliminar factura">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                    {can(user?.role, 'purchases', 'edit') && (
                      <>
                        <input
                          type="file"
                          ref={invoiceFileRef}
                          onChange={(e) => handleInvoiceUpload(e, p.id)}
                          accept="image/*,.pdf"
                          className="hidden"
                          id={`invoice-upload-${p.id}`}
                        />
                        <button
                          onClick={() => document.getElementById(`invoice-upload-${p.id}`)?.click()}
                          disabled={uploadingInvoice === p.id}
                          className="text-gray-400 hover:text-blue-600"
                          title="Subir factura"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === 'pending' && can(user?.role, 'purchases', 'receive') && (
                    <button onClick={() => receivePurchase(p.id)} className="text-sm text-blue-600 hover:underline">Recibir</button>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No hay compras</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-bold mb-4">Nueva Orden de Compra</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar producto para agregar..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {productSearch && (
              <div className="bg-white border border-gray-200 rounded-lg mb-4 max-h-40 overflow-auto">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500 ml-2">Stock: {p.stock} | {formatCurrency(p.buyPrice)}</span>
                    {p.barcode && <span className="text-gray-400 ml-2 text-xs">Código de Barras: {p.barcode}</span>}
                  </button>
                ))}
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <div className="flex-1 text-sm font-medium">{item.productName}</div>
                    <input type="number" value={item.quantity} onChange={(e) => {
                      const q = Number(e.target.value)
                      setSelectedItems(selectedItems.map((i, j) => j === idx ? { ...i, quantity: q, totalCost: q * i.unitCost } : i))
                    }} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" min="1" />
                    <input type="number" value={item.unitCost} onChange={(e) => {
                      const c = Number(e.target.value)
                      setSelectedItems(selectedItems.map((i, j) => j === idx ? { ...i, unitCost: c, totalCost: c * i.quantity } : i))
                    }} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" min="0" />
                    <span className="text-sm font-bold w-20 text-right">{formatCurrency(item.totalCost)}</span>
                    <button onClick={() => setSelectedItems(selectedItems.filter((_, j) => j !== idx))} className="text-red-400 text-sm">X</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={createPurchase} disabled={!selectedSupplier || selectedItems.length === 0} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Crear Orden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
