import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
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
import Taxes from './pages/Taxes'
import Currencies from './pages/Currencies'
import Permissions from './pages/Permissions'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="clients" element={<Clients />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="users" element={<Users />} />
        <Route path="cash-register" element={<CashRegister />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="credit" element={<CreditPayments />} />
        <Route path="taxes" element={<Taxes />} />
        <Route path="currencies" element={<Currencies />} />
        <Route path="permissions" element={<Permissions />} />
      </Route>
    </Routes>
  )
}
