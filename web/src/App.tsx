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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PermissionGuard({ module, action, children }: { module: string; action: string; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!can(user?.role, module, action)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export default function App() {
  useEffect(() => { loadCurrency() }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="clients" element={<Clients />} />
        <Route path="suppliers" element={<PermissionGuard module="suppliers" action="view"><Suppliers /></PermissionGuard>} />
        <Route path="sales" element={<Sales />} />
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
      </Route>
    </Routes>
  )
}
