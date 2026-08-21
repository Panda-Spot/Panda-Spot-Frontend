import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await api.login(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password, name) => {
    const u = await api.register(email, password, name)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }, [])

  // Used by GoogleSignInButton: the /auth/google endpoint already returns the
  // full user object in one round trip, so we just adopt it directly rather
  // than wrapping another api call like login()/register() do.
  const setUserDirectly = useCallback((u) => {
    setUser(u)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserDirectly }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
