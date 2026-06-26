import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Package, Users, Truck, Receipt, ClipboardList, LogOut, Store, LayoutDashboard, DollarSign, UserCog, Car, CreditCard, Percent, Shield, BarChart3, Award, RotateCcw, FileText, TrendingDown } from 'lucide-react'
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
  { to: '/cash-register', label: 'Caja', icon: DollarSign, module: 'cashRegister', action: 'movements' },
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
]

export default function Layout() {
  const { user, logout, permissions } = useAuth()
  const navigate = useNavigate()
  const userRole = user?.role
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [storeConfig, setStoreConfig] = useState<any>(null)

  useEffect(() => {
    api.get('/store-config').then(res => setStoreConfig(res.data)).catch(() => {})
    const handler = () => {
      api.get('/store-config').then(res => setStoreConfig(res.data)).catch(() => {})
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

      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {storeConfig?.logoUrl ? (
              <img src={storeConfig.logoUrl} alt="" className="w-6 h-6 object-contain" />
            ) : (
              <Store className="w-6 h-6 text-blue-600" />
            )}
            <h1 className="text-lg font-bold text-gray-800">{storeConfig?.companyName || 'AutoRepuestos'}</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">{storeConfig?.description || 'Sistema de Postventa'}</p>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <div className="lg:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {storeConfig?.logoUrl ? (
              <img src={storeConfig.logoUrl} alt="" className="w-5 h-5 object-contain" />
            ) : (
              <Store className="w-5 h-5 text-blue-600" />
            )}
            <h1 className="text-base font-bold text-gray-800">{storeConfig?.companyName || 'AutoRepuestos'}</h1>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
