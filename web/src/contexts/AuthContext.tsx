import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from '../lib/api'
import { updateLatestPermissions } from '../lib/permissions'

interface User {
  id: number
  username: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  permissions: { module: string, action: string }[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [permissions, setPermissions] = useState<{ module: string, action: string }[]>([])

  useEffect(() => {
    if (user) refreshPermissions()
  }, [])

  useEffect(() => {
    if (!user) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPermissions()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(refreshPermissions, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [user])

  const refreshPermissions = async () => {
    try {
      const res = await api.get('/permissions/mine')
      setPermissions(res.data)
      updateLatestPermissions(res.data)
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }
      setPermissions([])
      updateLatestPermissions([])
    }
  }

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password })
    const { user: userData, token } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    await refreshPermissions()
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPermissions([])
    updateLatestPermissions([])
  }

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, isAuthenticated: !!user, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
