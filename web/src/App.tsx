import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { can } from './lib/permissions'
import { loadCurrency } from './lib/currency'
import Layout from './components/Layout'
import Login from './pages/Login'
import POS from './pages/POS'
import Products from './pages/Products'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import CashRegister from './pages/CashRegister'
import Vehicles from './pages/Vehicles'
import CreditPayments from './pages/CreditPayments'
import TaxReport from './pages/TaxReport'
import Taxes from './pages/Taxes'
import Currencies from './pages/Currencies'
import Permissions from './pages/Permissions'
import Loyalty from './pages/Loyalty'
import Returns from './pages/Returns'
import StoreConfig from './pages/StoreConfig'
import Expenses from './pages/Expenses'
import SiteConfig from './pages/SiteConfig'
import Warehouses from './pages/Warehouses'
import Locations from './pages/Locations'
import Inventory from './pages/Inventory'
import StockMovements from './pages/StockMovements'
import AuditLog from './pages/AuditLog'
import Analytics from './pages/Analytics'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PermissionGuard({ module, action, children }: { module: string; action: string; children: React.ReactNode }) {
  const { user, permissions } = useAuth()
  const hasAccess = permissions.length > 0
    ? permissions.some(p => p.module === module && p.action === action)
    : can(user?.role, module, action)
  if (!hasAccess) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Sin permisos</h2>
        <p className="text-sm text-gray-500">No tienes acceso a esta seccion.</p>
      </div>
    </div>
  )
  return <>{children}</>
}

export default function App() {
  useEffect(() => { loadCurrency() }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PermissionGuard module="dashboard" action="view"><Dashboard /></PermissionGuard>} />
        <Route path="pos" element={<PermissionGuard module="pos" action="sell"><POS /></PermissionGuard>} />
        <Route path="products" element={<PermissionGuard module="products" action="view"><Products /></PermissionGuard>} />
        <Route path="clients" element={<PermissionGuard module="clients" action="view"><Clients /></PermissionGuard>} />
        <Route path="suppliers" element={<PermissionGuard module="suppliers" action="view"><Suppliers /></PermissionGuard>} />
        <Route path="sales" element={<PermissionGuard module="sales" action="view"><Sales /></PermissionGuard>} />
        <Route path="purchases" element={<PermissionGuard module="purchases" action="view"><Purchases /></PermissionGuard>} />
        <Route path="users" element={<PermissionGuard module="users" action="view"><Users /></PermissionGuard>} />
        <Route path="cash-register" element={<PermissionGuard module="cashRegister" action="movements"><CashRegister /></PermissionGuard>} />
        <Route path="vehicles" element={<PermissionGuard module="vehicles" action="view"><Vehicles /></PermissionGuard>} />
        <Route path="credit" element={<PermissionGuard module="credit" action="view"><CreditPayments /></PermissionGuard>} />
        <Route path="tax-report" element={<PermissionGuard module="dashboard" action="view"><TaxReport /></PermissionGuard>} />
        <Route path="taxes" element={<PermissionGuard module="taxes" action="view"><Taxes /></PermissionGuard>} />
        <Route path="currencies" element={<PermissionGuard module="currencies" action="view"><Currencies /></PermissionGuard>} />
        <Route path="permissions" element={<PermissionGuard module="permissions" action="edit"><Permissions /></PermissionGuard>} />
        <Route path="loyalty" element={<PermissionGuard module="loyalty" action="view"><Loyalty /></PermissionGuard>} />
        <Route path="returns" element={<PermissionGuard module="returns" action="view"><Returns /></PermissionGuard>} />
        <Route path="invoice-config" element={<PermissionGuard module="storeConfig" action="edit"><StoreConfig /></PermissionGuard>} />
        <Route path="expenses" element={<PermissionGuard module="expenses" action="view"><Expenses /></PermissionGuard>} />
        <Route path="site-config" element={<PermissionGuard module="storeConfig" action="edit"><SiteConfig /></PermissionGuard>} />
        <Route path="warehouses" element={<PermissionGuard module="warehouses" action="view"><Warehouses /></PermissionGuard>} />
        <Route path="locations" element={<PermissionGuard module="warehouses" action="view"><Locations /></PermissionGuard>} />
        <Route path="inventory" element={<PermissionGuard module="inventory" action="view"><Inventory /></PermissionGuard>} />
        <Route path="stock-movements" element={<PermissionGuard module="inventory" action="view"><StockMovements /></PermissionGuard>} />
        <Route path="audit-log" element={<PermissionGuard module="audit" action="view"><AuditLog /></PermissionGuard>} />
        <Route path="analytics" element={<PermissionGuard module="analytics" action="view"><Analytics /></PermissionGuard>} />
      </Route>
    </Routes>
  )
}
