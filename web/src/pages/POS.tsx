import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Plus, Minus, Trash2, X, User, CreditCard, DollarSign, Building2, Award, Gift, AlertTriangle } from 'lucide-react'
import InvoiceReceipt from './InvoiceReceipt'

interface Product {
  id: number
  code: string
  name: string
  sellPrice: number
  stock: number
}

interface Currency {
  id: number
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
  isActive: boolean
}

interface CartItem {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Client {
  id: number
  name: string
  phone: string
}

export default function POS() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showClientModal, setShowClientModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [defaultTax, setDefaultTax] = useState<any>(null)
  const [loyaltyConfig, setLoyaltyConfig] = useState({ earnRate: 10, redeemRate: 0.05, expireMonths: 12 })
  const [clientPoints, setClientPoints] = useState<{ balance: number; value: number } | null>(null)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [showPointsInput, setShowPointsInput] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [storeConfig, setStoreConfig] = useState<any>(null)
  const [currentRegister, setCurrentRegister] = useState<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    searchRef.current?.focus()
    loadCurrencies()
    loadDefaultTax()
    loadLoyaltyConfig()
    loadCurrentRegister()
  }, [])

  const loadCurrentRegister = async () => {
    try {
      const res = await api.get('/cash-register/current')
      setCurrentRegister(res.data)
    } catch (e) { console.error('Failed to load current register:', e); setCurrentRegister(null) }
  }

  const loadDefaultTax = async () => {
    try {
      const res = await api.get('/taxes')
      const def = res.data.find((t: any) => t.isDefault)
      if (def) setDefaultTax(def)
    } catch (e) { console.error('Failed to load products:', e) }
  }

  const loadLoyaltyConfig = async () => {
    try {
      const res = await api.get('/loyalty/config')
      setLoyaltyConfig(res.data)
    } catch (e) { console.error('Failed to load currencies:', e) }
  }

  const loadClientPoints = async (clientId: number) => {
    try {
      const res = await api.get(`/loyalty/clients/${clientId}`)
      const value = Math.round(res.data.pointsBalance * loyaltyConfig.redeemRate * 100) / 100
      setClientPoints({ balance: res.data.pointsBalance, value })
    } catch {
      setClientPoints(null)
    }
  }

  const loadCurrencies = async () => {
    try {
      const res = await api.get('/currencies')
      const active = res.data.filter((c: Currency) => c.isActive)
      setCurrencies(active)
      const base = active.find((c: Currency) => c.isBase)
      if (base) setSelectedCurrency(base)
      else if (active.length > 0) setSelectedCurrency(active[0])
    } catch (e) { console.error('Failed to load currencies:', e); setCurrencies([]) }
  }

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get('/products', { params: { q: search, active: true } })
        setResults(res.data.filter((p: Product) => p.stock > 0))
      } catch (e) { console.error('Failed to load products:', e); setResults([]) }
    }, 300)
    return () => clearTimeout(searchTimeout.current)
  }, [search])

  const searchClients = async (q: string) => {
    if (!q.trim()) { setClientResults([]); return }
    try {
      const res = await api.get('/clients', { params: { q } })
      setClientResults(res.data)
    } catch (e) { console.error('Failed to search clients:', e); setClientResults([]) }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        )
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellPrice,
        totalPrice: product.sellPrice,
      }]
    })
    setSearch('')
    setResults([])
    searchRef.current?.focus()
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity: Math.max(1, i.quantity + delta), totalPrice: Math.max(1, i.quantity + delta) * i.unitPrice }
        : i
    ))
  }

  const removeItem = (productId: number) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0)
  const taxRate = defaultTax?.percentage || 0
  const afterDiscount = subtotal // sin descuento por ahora
  const taxAmount = afterDiscount * taxRate / 100
  const pointsDiscount = Math.round(pointsToRedeem * loyaltyConfig.redeemRate * 100) / 100
  const total = afterDiscount + taxAmount - pointsDiscount
  const pointsEarned = Math.floor(total / loyaltyConfig.earnRate)

  const handlePayment = async () => {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const res = await api.post('/sales', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        clientId: client?.id || null,
        userId: user!.id,
        paymentMethod,
        cashRegisterId: currentRegister?.id || null,
        currencyId: selectedCurrency?.id || null,
        pointsToRedeem: pointsToRedeem || 0,
      })
      setLastSale(res.data)
      setCart([])
      setClient(null)
      setClientPoints(null)
      setPointsToRedeem(0)
      setShowPointsInput(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      const configRes = await api.get('/store-config')
      setStoreConfig(configRes.data)
      setShowInvoice(true)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al procesar venta')
    } finally {
      setLoading(false)
      setShowPaymentModal(false)
    }
  }

  const handleSelectClient = (c: Client) => {
    setClient(c)
    setShowClientModal(false)
    setClientSearch('')
    setClientResults([])
    loadClientPoints(c.id)
  }



  return (
    <div className="h-full flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col p-4">
        {!currentRegister && can(user?.role, 'cashRegister', 'open') && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2.5 rounded-xl mb-4 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            No hay caja abierta. Las ventas no se vincularán a una sesión de caja.
          </div>
        )}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre, OEM..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-4 max-h-60 overflow-auto">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-0 text-left"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <p className="text-sm text-gray-500">Cód: {p.code} | Stock: {p.stock}</p>
                </div>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(p.sellPrice)}</p>
              </button>
            ))}
          </div>
        )}

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Busca productos para comenzar</p>
              <p className="text-sm mt-1">Escanea el código de barras o escribe el nombre</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="bg-white rounded-lg p-3 flex items-center gap-3 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100 rounded">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100 rounded">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-bold text-gray-800 w-20 lg:w-24 text-right text-sm lg:text-base">{formatCurrency(item.totalPrice)}</p>
                  <button onClick={() => removeItem(item.productId)} className="p-1 hover:bg-red-50 rounded text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 bg-white border-l border-gray-200 p-4 flex flex-col">
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-center font-medium">
            Venta completada con éxito!
          </div>
        )}

        <div className="mb-4 space-y-2">
          <button
            onClick={() => setShowClientModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
          >
            <User className="w-4 h-4 text-gray-400" />
            <span className={client ? 'text-gray-800' : 'text-gray-400'}>
              {client ? client.name : 'Cliente general'}
            </span>
            {client && <X className="w-4 h-4 ml-auto text-gray-400" onClick={(e) => { e.stopPropagation(); setClient(null); setClientPoints(null); setPointsToRedeem(0); setShowPointsInput(false) }} />}
          </button>

          {currencies.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCurrency?.id || ''}
                onChange={(e) => {
                  const curr = currencies.find(c => c.id === Number(e.target.value))
                  if (curr) setSelectedCurrency(curr)
                }}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700"
              >
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.symbol}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {client && clientPoints && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-yellow-700">
                <Award className="w-4 h-4" /> Puntos del cliente
              </div>
              <span className="text-sm font-bold text-yellow-700">{clientPoints.balance.toLocaleString()} pts</span>
            </div>
            <p className="text-xs text-yellow-600 mb-2">Valor: {formatCurrency(clientPoints.value)}</p>
            {clientPoints.balance > 0 && can(user?.role, 'loyalty', 'redeem') && (
              <button
                onClick={() => setShowPointsInput(!showPointsInput)}
                className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 hover:text-yellow-800"
              >
                <Gift className="w-3.5 h-3.5" /> {showPointsInput ? 'Cancelar canje' : 'Canjear puntos'}
              </button>
            )}
            {showPointsInput && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={clientPoints.balance}
                    value={pointsToRedeem || ''}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value) || 0, clientPoints.balance)
                      setPointsToRedeem(val)
                    }}
                    placeholder="Puntos a canjear"
                    className="flex-1 px-2 py-1.5 text-sm border border-yellow-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                  />
                </div>
                {pointsToRedeem > 0 && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <p className="flex justify-between">
                      <span>Descuento:</span>
                      <span className="font-bold text-green-600">-{formatCurrency(pointsDiscount)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Puntos restantes:</span>
                      <span>{clientPoints.balance - pointsToRedeem} pts</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {defaultTax && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>TVA ({defaultTax.percentage}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desc. puntos</span>
                <span>-{formatCurrency(pointsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-800">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {client && pointsEarned > 0 && (
              <div className="flex justify-between text-xs text-yellow-600">
                <span>Puntos a ganar</span>
                <span className="font-bold">{pointsEarned} pts</span>
              </div>
            )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { method: 'cash', icon: DollarSign, label: 'Efectivo' },
              { method: 'card', icon: CreditCard, label: 'Tarjeta' },
              { method: 'transfer', icon: Building2, label: 'Transf.' },
            ].map(({ method, icon: Icon, label }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${
                  paymentMethod === method
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>

          {can(user?.role, 'pos', 'sell') && (
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cart.length === 0 ? 'Agrega productos' : `Cobrar ${formatCurrency(total)}`}
            </button>
          )}
        </div>
      </div>

      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Seleccionar Cliente</h2>
              <button onClick={() => setShowClientModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); searchClients(e.target.value) }}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-auto">
              {clientResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg"
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">{c.phone}</p>
                </button>
              ))}
              {clientResults.length === 0 && clientSearch && (
                <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showInvoice && lastSale && storeConfig && (
        <InvoiceReceipt sale={lastSale} config={storeConfig} onClose={() => setShowInvoice(false)} />
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-lg font-bold mb-4">Confirmar Venta</h2>
            <div className="max-h-40 overflow-auto mb-4 space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span>{item.productName} x{item.quantity}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mb-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {defaultTax && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA ({defaultTax.percentage}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desc. puntos</span>
                  <span>-{formatCurrency(pointsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 capitalize">Pago: {paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handlePayment} disabled={loading} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Procesando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
