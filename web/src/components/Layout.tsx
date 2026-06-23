import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Package, Users, Truck, Receipt, ClipboardList, LogOut, Store, LayoutDashboard, DollarSign, UserCog, Car, CreditCard, Percent, Shield, BarChart3 } from 'lucide-react'
import { can, setPermissions } from '../lib/permissions'
import { useEffect, useRef } from 'react'

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
  { to: '/tax-report', label: 'Reporte IVA', icon: BarChart3, module: 'dashboard', action: 'view' },
  { to: '/taxes', label: 'Impuestos', icon: Percent, module: 'taxes', action: 'view' },
  { to: '/currencies', label: 'Monedas', icon: DollarSign, module: 'currencies', action: 'view' },
]

export default function Layout() {
  const { user, logout, permissions } = useAuth()
  const navigate = useNavigate()
  const userRole = user?.role
  const prevUserId = useRef(user?.id)

  useEffect(() => {
    if (prevUserId.current !== user?.id) {
      setPermissions([])
      prevUserId.current = user?.id
    }
    if (permissions && permissions.length > 0) {
      setPermissions(permissions)
    }
  }, [permissions, user?.id])

  const visibleItems = navItems.filter(item => can(userRole, item.module, item.action))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-800">AutoRepuestos</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Sistema de Postventa</p>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
