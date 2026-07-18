import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Package, Users, Truck, Receipt, ClipboardList, LogOut, Store, LayoutDashboard, DollarSign, UserCog, Car, CreditCard, Percent, Shield, BarChart3, Award, RotateCcw, FileText, TrendingDown, Warehouse, MapPin, ClipboardCheck, ArrowUpDown, ShieldCheck } from 'lucide-react'
import { can } from '../lib/permissions'
import api from '../lib/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard', action: 'view' },
  { to: '/pos', label: 'POS', icon: ShoppingCart, module: 'pos', action: 'sell' },
  { to: '/products', label: 'Productos', icon: Package, module: 'products', action: 'view' },
  { to: '/clients', label: 'Clientes', icon: Users, module: 'clients', action: 'view' },
  { to: '/suppliers', label: 'Proveedores', icon: Truck, module: 'suppliers', action: 'view' },
  { to: '/sales', label: 'Ventas', icon: Receipt, module: 'sales', action: 'view' },
  { to: '/purchases', label: 'Compras', icon: ClipboardList, module: 'purchases', action: 'view' },
  { to: '/cash-register', label: 'Caja', icon: DollarSign, module: 'cashRegister', action: 'open' },
  { to: '/users', label: 'Usuarios', icon: UserCog, module: 'users', action: 'view' },
  { to: '/permissions', label: 'Permisos', icon: Shield, module: 'permissions', action: 'edit' },
  { to: '/vehicles', label: 'Vehículos', icon: Car, module: 'vehicles', action: 'view' },
  { to: '/credit', label: 'Crédito', icon: CreditCard, module: 'credit', action: 'view' },
  { to: '/tax-report', label: 'Reporte TVA', icon: BarChart3, module: 'dashboard', action: 'view' },
  { to: '/taxes', label: 'Impuestos', icon: Percent, module: 'taxes', action: 'view' },
  { to: '/currencies', label: 'Monedas', icon: DollarSign, module: 'currencies', action: 'view' },
  { to: '/loyalty', label: 'Lealtad', icon: Award, module: 'loyalty', action: 'view' },
  { to: '/returns', label: 'Devoluciones', icon: RotateCcw, module: 'returns', action: 'view' },
  { to: '/expenses', label: 'Gastos', icon: TrendingDown, module: 'expenses', action: 'view' },
  { to: '/invoice-config', label: 'Config. Factura', icon: FileText, module: 'storeConfig', action: 'edit' },
  { to: '/site-config', label: 'Config. Sitio', icon: Store, module: 'storeConfig', action: 'edit' },
  { to: '/warehouses', label: 'Almacenes', icon: Warehouse, module: 'warehouses', action: 'view' },
  { to: '/locations', label: 'Ubicaciones', icon: MapPin, module: 'warehouses', action: 'view' },
  { to: '/inventory', label: 'Inventario', icon: ClipboardCheck, module: 'inventory', action: 'view' },
  { to: '/stock-movements', label: 'Mov. Stock', icon: ArrowUpDown, module: 'inventory', action: 'view' },
  { to: '/audit-log', label: 'Auditoría', icon: ShieldCheck, module: 'audit', action: 'view' },
  { to: '/analytics', label: 'Análisis', icon: BarChart3, module: 'analytics', action: 'view' },
]

export default function Layout() {
  const { user, logout, permissions } = useAuth()
  const navigate = useNavigate()
  const userRole = user?.role
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [storeConfig, setStoreConfig] = useState<any>(null)

  useEffect(() => {
    api.get('/store-config').then(res => setStoreConfig(res.data)).catch((e) => console.warn('Failed to load store config:', e))
    const handler = () => {
      api.get('/store-config').then(res => setStoreConfig(res.data)).catch((e) => console.warn('Failed to load store config:', e))
    }
    window.addEventListener('store-changed', handler)
    return () => window.removeEventListener('store-changed', handler)
  }, [])

  const visibleItems = navItems.filter(item => {
    if (permissions.length > 0) {
      return permissions.some(p => p.module === item.module && p.action === item.action)
    }
    return can(userRole, item.module, item.action)
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col transition-transform duration-200 shadow-xl`}>
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            {storeConfig?.logoUrl ? (
              <img src={storeConfig.logoUrl} alt="" className="w-8 h-8 object-contain rounded-md" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">{storeConfig?.companyName || 'AutoRepuestos'}</h1>
              <p className="text-[11px] text-slate-400">{storeConfig?.description || 'Sistema de Postventa'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" title="Cerrar sesión">
              <LogOut className="w-4 h-4 text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <div className="lg:hidden flex items-center gap-2 p-3 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-slate-700/50 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {storeConfig?.logoUrl ? (
              <img src={storeConfig.logoUrl} alt="" className="w-5 h-5 object-contain rounded" />
            ) : (
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
            )}
            <h1 className="text-base font-bold text-white">{storeConfig?.companyName || 'AutoRepuestos'}</h1>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
