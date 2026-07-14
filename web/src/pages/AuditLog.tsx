import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { formatCurrency } from '../lib/currency'
import { Shield, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
}

const ENTITY_LABELS: Record<string, string> = {
  cashRegister: 'Caja',
  cashMovement: 'Mov. Caja',
  product: 'Producto',
  expense: 'Gasto',
  sale: 'Venta',
  purchase: 'Compra',
  client: 'Cliente',
  supplier: 'Proveedor',
  user: 'Usuario',
  inventoryAdjustment: 'Ajuste Inv.',
  warehouse: 'Almacén',
  location: 'Ubicación',
}

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterEntity, setFilterEntity] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => { loadLogs() }, [page, filterEntity, filterAction, filterFrom, filterTo])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (filterEntity) params.set('entity', filterEntity)
      if (filterAction) params.set('action', filterAction)
      if (filterFrom) params.set('from', filterFrom)
      if (filterTo) params.set('to', filterTo)
      const res = await api.get(`/audit?${params.toString()}`)
      setLogs(res.data.logs)
      setTotalPages(res.data.totalPages)
      setTotal(res.data.total)
    } catch { console.error('Error loading audit logs') }
    finally { setLoading(false) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-AR')

  const formatMetadata = (meta: any) => {
    if (!meta) return ''
    const entries = Object.entries(meta)
    if (entries.length === 0) return ''
    return entries.map(([k, v]) => {
      if (k === 'amount' || k === 'closingBalance' || k === 'openingBalance') {
        return `${k}: ${formatCurrency(Number(v))}`
      }
      return `${k}: ${String(v)}`
    }).join(' | ')
  }

  const hasFilters = filterEntity || filterAction || filterFrom || filterTo

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6" /> Auditoría
        </h1>
        <span className="text-sm text-gray-500">{total} registros</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Entidad</label>
            <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Acción</label>
            <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1) }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterEntity(''); setFilterAction(''); setFilterFrom(''); setFilterTo(''); setPage(1) }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-4">
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No hay registros de auditoría</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Acción</th>
                  <th className="text-left px-4 py-3">Entidad</th>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Detalle</th>
                  <th className="text-left px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-2.5 font-medium">{log.user?.name || 'Sistema'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{ENTITY_LABELS[log.entity] || log.entity}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">#{log.entityId || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{formatMetadata(log.metadata)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{log.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
