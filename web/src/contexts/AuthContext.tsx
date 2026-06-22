import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from '../lib/api'

interface User {
  id: number
  username: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  permissions: { module: string, action: string }[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [permissions, setPermissions] = useState<{ module: string, action: string }[]>([])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  useEffect(() => {
    if (token) {
      refreshPermissions()
    }
  }, [token])

  const refreshPermissions = async () => {
    try {
      const res = await api.get('/permissions/mine')
      setPermissions(res.data)
    } catch {
      setPermissions([])
    }
  }

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password })
    const { user: userData, token: newToken } = res.data
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setPermissions([])
  }

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, isAuthenticated: !!token, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
