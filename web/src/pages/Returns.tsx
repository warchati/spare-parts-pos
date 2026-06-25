import { useState } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { Search, ArrowLeft, RotateCcw, CheckCircle, Barcode, FileText } from 'lucide-react'

interface Product {
  id: number
  code: string
  barcode: string
  name: string
  sellPrice: number
}

interface SaleItem {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Sale {
  id: number
  invoiceNumber: string
  createdAt: string
  subtotal: number
  discount: number
  taxTotal: number
  total: number
  paymentMethod: string
  client: { id: number; name: string } | null
  items: SaleItem[]
  returns: { items: { productId: number; quantity: number }[] }[]
}

interface LookupResult {
  product: Product
  sales: Sale[]
}

export default function Returns() {
  const [searchMode, setSearchMode] = useState<'barcode' | 'invoice'>('barcode')
  const [barcode, setBarcode] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null)
  const [error, setError] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [returnQty, setReturnQty] = useState(1)
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const searchByBarcode = async () => {
    if (!barcode.trim()) return
    setLoading(true)
    setError('')
    setLookup(null)
    setInvoiceSale(null)
    setSelectedSale(null)
    setResult(null)
    try {
      const res = await api.get(`/sales/by-barcode/${encodeURIComponent(barcode.trim())}`)
      setLookup(res.data)
      if (res.data.sales.length === 0) setError('No hay ventas completadas con este producto')
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al buscar el producto')
    } finally {
      setLoading(false)
    }
  }

  const searchByInvoice = async () => {
    if (!invoiceNumber.trim()) return
    setLoading(true)
    setError('')
    setLookup(null)
    setInvoiceSale(null)
    setSelectedSale(null)
    setResult(null)
    try {
      const res = await api.get(`/sales/by-invoice/${encodeURIComponent(invoiceNumber.trim())}`)
      setInvoiceSale(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al buscar la factura')
    } finally {
      setLoading(false)
    }
  }

  const alreadyReturned = (sale: Sale): number => {
    let total = 0
    for (const r of sale.returns) {
      for (const ri of r.items) {
        if (ri.productId === lookup?.product.id) total += ri.quantity
      }
    }
    return total
  }

  const availableQty = (sale: Sale): number => {
    const item = sale.items[0]
    if (!item) return 0
    return Math.max(0, item.quantity - alreadyReturned(sale))
  }

  const processReturn = async () => {
    if (!selectedSale || !reason.trim()) return
    setProcessing(true)
    try {
      const res = await api.post(`/sales/${selectedSale.id}/returns`, {
        items: [{ productId: lookup!.product.id, quantity: returnQty }],
        reason,
      })
      setResult(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al procesar devolución')
    } finally {
      setProcessing(false)
    }
  }

  const resetAll = () => {
    setBarcode('')
    setInvoiceNumber('')
    setLookup(null)
    setInvoiceSale(null)
    setSelectedSale(null)
    setReturnQty(1)
    setReason('')
    setResult(null)
    setError('')
  }

  const methodLabel: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito' }

  if (result) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Devolución Procesada</h2>
          <p className="text-lg font-mono text-blue-600 font-bold mb-1">{result.creditNoteNumber}</p>
          <p className="text-sm text-gray-500 mb-6">Nota de Crédito</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Producto</span>
              <span className="font-medium">{lookup?.product.name || selectedSale?.items[0]?.productName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cantidad</span>
              <span className="font-medium">{returnQty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Venta original</span>
              <span className="font-medium">{selectedSale?.invoiceNumber}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Reembolso</span>
              <span className="text-green-600">{formatCurrency(result.totalRefund)}</span>
            </div>
          </div>

          <button onClick={resetAll} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Nueva Devolución
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <RotateCcw className="w-6 h-6" /> Devoluciones
      </h1>

      {!lookup && !invoiceSale && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setSearchMode('barcode'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${searchMode === 'barcode' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Barcode className="w-4 h-4" /> Código de barras
            </button>
            <button
              onClick={() => { setSearchMode('invoice'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${searchMode === 'invoice' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FileText className="w-4 h-4" /> Número de factura
            </button>
          </div>

          {searchMode === 'barcode' ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">Escanear o ingresar código de barras</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchByBarcode()}
                  placeholder="Código de barras..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                  autoFocus
                />
                <button
                  onClick={searchByBarcode}
                  disabled={loading || !barcode.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Buscando...' : <><Search className="w-5 h-5" /> Buscar</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ingresar número de factura</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && searchByInvoice()}
                  placeholder="Ej: INV-2026-0001"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                  autoFocus
                />
                <button
                  onClick={searchByInvoice}
                  disabled={loading || !invoiceNumber.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'Buscando...' : <><Search className="w-5 h-5" /> Buscar</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {invoiceSale && !selectedSale && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-bold text-gray-800">{invoiceSale.invoiceNumber}</p>
              <p className="text-sm text-gray-500">{new Date(invoiceSale.createdAt).toLocaleString('es-AR')}</p>
              <p className="text-sm text-gray-500">{invoiceSale.client?.name || 'Consumidor Final'} &middot; Total: {formatCurrency(invoiceSale.total)}</p>
            </div>
          </div>

          <button onClick={resetAll} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3 h-3" /> Nueva búsqueda
          </button>

          <h3 className="text-sm font-medium text-gray-700 mb-3">Seleccionar producto a devolver</h3>
          <div className="space-y-2">
            {invoiceSale.items.map((item) => {
              const returned = invoiceSale.returns.reduce((sum, r) => sum + r.items.filter(ri => ri.productId === item.productId).reduce((s, ri) => s + ri.quantity, 0), 0)
              const avail = item.quantity - returned
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${avail > 0 ? 'hover:border-blue-300 cursor-pointer border-gray-200' : 'border-gray-100 bg-gray-50 opacity-50'}`}
                  onClick={() => {
                    if (avail <= 0) return
                    setLookup({ product: { id: item.productId, code: '', barcode: '', name: item.productName, sellPrice: item.unitPrice }, sales: [{ ...invoiceSale, items: [item] }] })
                    setSelectedSale({ ...invoiceSale, items: [item] })
                    setReturnQty(1)
                  }}
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.productName}</p>
                    <p className="text-sm text-gray-500">{item.unitPrice} x {item.quantity}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                    {avail > 0 ? (
                      <span className="text-green-600">{avail} disponible{avail !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-red-500">Agotado</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {lookup && !selectedSale && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-3">
              <Barcode className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-bold text-gray-800">{lookup.product.name}</p>
                <p className="text-sm text-gray-500">Código: {lookup.product.code} / Barras: {lookup.product.barcode}</p>
                <p className="text-sm text-gray-500">Precio venta: {formatCurrency(lookup.product.sellPrice)}</p>
              </div>
            </div>
            <button onClick={resetAll} className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Cambiar producto
            </button>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-3">Seleccionar venta</h2>
          {lookup.sales.map((sale) => {
            const avail = availableQty(sale)
            return (
              <div
                key={sale.id}
                className="bg-white rounded-xl border border-gray-200 p-4 mb-3 hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => { if (avail > 0) { setSelectedSale(sale); setReturnQty(1) } }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{sale.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{new Date(sale.createdAt).toLocaleString('es-AR')}</p>
                    <p className="text-sm text-gray-500">{sale.client?.name || 'Consumidor Final'} &middot; {methodLabel[sale.paymentMethod] || sale.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(sale.total)}</p>
                    <p className="text-sm text-gray-500">Total venta</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Cantidad original: {sale.items[0]?.quantity || 0}
                    {alreadyReturned(sale) > 0 && <span className="text-orange-500 ml-2">({alreadyReturned(sale)} devueltos)</span>}
                  </span>
                  {avail > 0 ? (
                    <span className="text-green-600 font-medium">{avail} disponible{avail !== 1 ? 's' : ''}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Agotado</span>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {selectedSale && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <button onClick={() => setSelectedSale(null)} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3 h-3" /> Volver a seleccionar venta
          </button>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
            <p className="font-bold text-gray-800">{selectedSale.invoiceNumber}</p>
            <p className="text-gray-500">{new Date(selectedSale.createdAt).toLocaleString('es-AR')}</p>
            <p className="text-gray-500">{selectedSale.client?.name || 'Consumidor Final'}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto a devolver</label>
            <div className="p-3 bg-blue-50 rounded-lg text-sm font-medium text-blue-800">
              {lookup?.product.name}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad a devolver (máx: {availableQty(selectedSale)})
            </label>
            <input
              type="number"
              min={1}
              max={availableQty(selectedSale)}
              value={returnQty}
              onChange={(e) => setReturnQty(Math.min(Number(e.target.value) || 1, availableQty(selectedSale)))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de devolución</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Ej: producto defectuoso, cambio de opinión, error en compra..."
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal (items)</span>
              <span>{formatCurrency(selectedSale.items[0]?.unitPrice * returnQty)}</span>
            </div>
            {selectedSale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Descuento proporcional</span>
                <span className="text-red-500">-{formatCurrency(Math.round(selectedSale.discount * (selectedSale.items[0]?.unitPrice * returnQty / selectedSale.subtotal) * 100) / 100)}</span>
              </div>
            )}
            {selectedSale.taxTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">TVA proporcional</span>
                <span>{formatCurrency(Math.round(selectedSale.taxTotal * (selectedSale.items[0]?.unitPrice * returnQty / selectedSale.subtotal) * 100) / 100)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total reembolso</span>
              <span className="text-green-600">{formatCurrency(
                (selectedSale.items[0]?.unitPrice * returnQty) -
                (selectedSale.discount > 0 ? Math.round(selectedSale.discount * (selectedSale.items[0]?.unitPrice * returnQty / selectedSale.subtotal) * 100) / 100 : 0) +
                (selectedSale.taxTotal > 0 ? Math.round(selectedSale.taxTotal * (selectedSale.items[0]?.unitPrice * returnQty / selectedSale.subtotal) * 100) / 100 : 0)
              )}</span>
            </div>
          </div>

          <button
            onClick={processReturn}
            disabled={processing || !reason.trim()}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
          >
            {processing ? 'Procesando...' : <><RotateCcw className="w-4 h-4" /> Procesar Devolución</>}
          </button>
        </div>
      )}
    </div>
  )
}
