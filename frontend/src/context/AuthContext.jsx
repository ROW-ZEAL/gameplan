import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore user from stored profile or fetch it
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored && localStorage.getItem('access')) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register/', payload)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh')
    try {
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch {
      // token already invalid — ignore
    } finally {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      localStorage.removeItem('user')
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
