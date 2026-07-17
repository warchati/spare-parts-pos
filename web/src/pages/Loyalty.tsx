import { useState, useEffect } from 'react'
import api from '../lib/api'
import { formatCurrency, getSymbol } from '../lib/currency'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'
import { Search, Award, History, Settings } from 'lucide-react'

interface ClientPoints {
  id: number
  name: string
  phone: string
  pointsBalance: number
  _count: { loyaltyTransactions: number }
}

interface Transaction {
  id: number
  clientId: number
  type: string
  points: number
  balanceBefore: number
  balanceAfter: number
  referenceType: string
  referenceId: string
  description: string
  createdAt: string
  expiresAt: string | null
  client: { id: number; name: string }
  createdBy: { id: number; name: string }
}

export default function Loyalty() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'clients' | 'history' | 'config'>('clients')
  const [clients, setClients] = useState<ClientPoints[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [config, setConfig] = useState({ earnRate: 10, redeemRate: 0.05, expireMonths: 12 })
  const [editConfig, setEditConfig] = useState({ key: '', value: '' })
  const [histClientSearch, setHistClientSearch] = useState('')
  const [histType, setHistType] = useState('')
  const [histStart, setHistStart] = useState('')
  const [histEnd, setHistEnd] = useState('')
  const [clientsLookup, setClientsLookup] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    loadClients()
    loadConfig()
  }, [])

  useEffect(() => {
    if (tab === 'history') loadTransactions()
  }, [tab])

  useEffect(() => {
    if (histClientSearch.length < 2) { setClientsLookup([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/loyalty/clients', { params: { q: histClientSearch } })
        setClientsLookup(res.data)
      } catch (e) { console.error('Failed to load client lookup:', e); setClientsLookup([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [histClientSearch])

  const loadClients = async () => {
    try {
      const res = await api.get('/loyalty/clients', { params: { q: search || undefined, sortBy: 'points', order: 'desc' } })
      setClients(res.data)
    } catch (e) { console.error('Failed to load loyalty config:', e) }
  }

  const loadTransactions = async () => {
    try {
      const params: any = { limit: 100 }
      if (histClientSearch) {
        const res = await api.get('/loyalty/clients', { params: { q: histClientSearch } })
        if (res.data.length === 1) params.clientId = res.data[0].id
      }
      if (histType) params.type = histType
      if (histStart) params.start = histStart
      if (histEnd) params.end = histEnd
      const res = await api.get('/loyalty/transactions', { params })
      setTransactions(res.data)
    } catch (e) { console.error('Failed to load transactions:', e) }
  }

  const loadConfig = async () => {
    try {
      const res = await api.get('/loyalty/config')
      setConfig(res.data)
    } catch (e) { console.error('Failed to load loyalty config:', e) }
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    setTimeout(() => loadClients(), 300)
  }

  const handleUpdateConfig = async () => {
    if (!editConfig.key || !editConfig.value) return
    try {
      await api.put('/loyalty/config', editConfig)
      setEditConfig({ key: '', value: '' })
      loadConfig()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error updating config')
    }
  }

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      EARN: 'bg-green-100 text-green-700',
      REDEEM: 'bg-blue-100 text-blue-700',
      REVERSE: 'bg-yellow-100 text-yellow-700',
      EXPIRE: 'bg-red-100 text-red-700',
      ADJUST: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      EARN: 'Ganados',
      REDEEM: 'Canjeados',
      REVERSE: 'Reversión',
      EXPIRE: 'Caducados',
      ADJUST: 'Ajuste',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" /> Puntos de Lealtad
        </h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'clients' as const, label: 'Clientes', icon: Award },
          { id: 'history' as const, label: 'Historial', icon: History },
          ...(can(user?.role, 'loyalty', 'edit') ? [{ id: 'config' as const, label: 'Configuración', icon: Settings }] : []),
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

          {tab === 'clients' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar clientes..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-500">
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Teléfono</th>
                  <th className="text-right px-4 py-3">Puntos</th>
                  <th className="text-right px-4 py-3">Valor ({getSymbol()})</th>
                  <th className="text-right px-4 py-3">Transacciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const pointsValue = Math.round(c.pointsBalance * config.redeemRate * 100) / 100
                  return (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
                          <Award className="w-3.5 h-3.5" /> {c.pointsBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-600">
                        {formatCurrency(pointsValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">{c._count.loyaltyTransactions}</td>
                    </tr>
                  )
                })}
                {clients.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={histClientSearch}
                onChange={(e) => setHistClientSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              />
              {clientsLookup.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                  {clientsLookup.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setHistClientSearch(c.name); setClientsLookup([]) }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-yellow-50"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select
              value={histType}
              onChange={(e) => setHistType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Todos los tipos</option>
              <option value="EARN">Ganados</option>
              <option value="REDEEM">Canjeados</option>
              <option value="REVERSE">Reversión</option>
              <option value="EXPIRE">Caducados</option>
              <option value="ADJUST">Ajuste</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Desde</label>
              <input
                type="date"
                value={histStart}
                onChange={(e) => setHistStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Hasta</label>
              <input
                type="date"
                value={histEnd}
                onChange={(e) => setHistEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <button
              onClick={loadTransactions}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
            >
              Filtrar
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-500">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Puntos</th>
                  <th className="text-right px-4 py-3">Saldo Anterior</th>
                  <th className="text-right px-4 py-3">Saldo Nuevo</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-left px-4 py-3">Por</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-medium">{t.client.name}</td>
                    <td className="px-4 py-3">{typeBadge(t.type)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${
                      t.type === 'EARN' ? 'text-green-600' : t.type === 'REDEEM' ? 'text-blue-600' : 'text-yellow-600'
                    }`}>
                      {t.type === 'EARN' ? '+' : '-'}{t.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{t.balanceBefore.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{t.balanceAfter.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{t.description}</td>
                    <td className="px-4 py-3 text-gray-500">{t.createdBy.name}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sin transacciones</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Configuración de Puntos</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Tasa de ganancia</p>
                  <p className="text-xs text-gray-500">1 punto por cada X unidades gastadas</p>
                </div>
                <span className="text-lg font-bold text-yellow-600">1 / {config.earnRate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Valor de canje</p>
                  <p className="text-xs text-gray-500">Cada punto equivale a</p>
                </div>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(config.redeemRate)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Caducidad</p>
                  <p className="text-xs text-gray-500">Los puntos expiran después de</p>
                </div>
                <span className="text-lg font-bold text-gray-600">{config.expireMonths} meses</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Actualizar Configuración</h4>
              <div className="flex gap-2 mb-3">
                <select
                  value={editConfig.key}
                  onChange={(e) => setEditConfig({ ...editConfig, key: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Seleccionar clave...</option>
                  <option value="EARN_RATE">Tasa de ganancia (unidad monetaria por punto)</option>
                  <option value="REDEEM_RATE">Valor de canje (descuento por punto)</option>
                  <option value="EXPIRE_MONTHS">Meses hasta caducidad</option>
                </select>
              </div>
              {editConfig.key && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={editConfig.value}
                    onChange={(e) => setEditConfig({ ...editConfig, value: e.target.value })}
                    placeholder="Nuevo valor..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={handleUpdateConfig}
                    disabled={!editConfig.value}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
