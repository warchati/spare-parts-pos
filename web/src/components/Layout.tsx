import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Package, Users, Truck, Receipt, ClipboardList, LogOut, Store } from 'lucide-react'

const navItems = [
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/suppliers', label: 'Proveedores', icon: Truck },
  { to: '/sales', label: 'Ventas', icon: Receipt },
  { to: '/purchases', label: 'Compras', icon: ClipboardList },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
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
