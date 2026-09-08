import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import * as api from './api.js'
import { getSession } from './authToken.js'
import {
  IDLE_TIMEOUT_MS,
  SESSION_CHECK_INTERVAL_MS,
  REFRESH_BEFORE_EXPIRY_MS,
  recordActivity,
  seedActivity,
  getLastActivity,
} from './sessionActivity.js'

const AuthContext = createContext(null)

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef(null)
  userRef.current = user
  const refreshingRef = useRef(false)

  // Logs out and bounces to /login. A `reason` appends ?reason= so the
  // login page can explain what happened (idle | expired). Manual logouts
  // pass none — those callers navigate themselves, as before.
  const logout = useCallback(async (reason) => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
    if (reason && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?reason=${encodeURIComponent(reason)}`
    }
  }, [])

  const logoutRef = useRef(logout)
  logoutRef.current = logout

  useEffect(() => {
    // A stored session that already passed its absolute expiry is dead —
    // don't even bother the server, just start logged out.
    const session = getSession()
    if (session && session.expiresAt <= Date.now()) {
      api.logout().catch(() => null)
      setLoading(false)
      return
    }
    seedActivity()
    api.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Session watchdog: one interval drives all three timers —
  // 1. absolute expiry (both classes) → logout('expired')
  // 2. idle timeout (default class only) → logout('idle'), deferred while
  //    requests are on the wire so uploads are never killed mid-flight
  // 3. proactive sliding refresh (default class, still active) → renews
  //    the 30-minute token before it dies; the server hard-caps at 24 h.
  useEffect(() => {
    const onInteract = () => recordActivity()
    for (const evt of INTERACTION_EVENTS) {
      window.addEventListener(evt, onInteract, { passive: true })
    }
    const timer = setInterval(async () => {
      if (!userRef.current) return
      const session = getSession()
      if (!session) return
      const now = Date.now()

      if (session.expiresAt <= now) {
        await logoutRef.current('expired')
        return
      }

      if (!session.remember) {
        const idleFor = now - (getLastActivity() || now)
        if (idleFor > IDLE_TIMEOUT_MS) {
          if (api.getInflightCount() > 0) return // busy — recheck next round
          await logoutRef.current('idle')
          return
        }
        if (!refreshingRef.current && session.expiresAt - now < REFRESH_BEFORE_EXPIRY_MS && idleFor <= IDLE_TIMEOUT_MS) {
          refreshingRef.current = true
          try {
            await api.refreshSession()
          } catch {
            // A failed refresh resolves itself: the token's natural expiry
            // (or the next check) 401s, and the api layer bounces to login.
          } finally {
            refreshingRef.current = false
          }
        }
      }
    }, SESSION_CHECK_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      for (const evt of INTERACTION_EVENTS) {
        window.removeEventListener(evt, onInteract)
      }
    }
  }, [])

  const login = useCallback(async (email, password, rememberMe = false) => {
    const u = await api.login(email, password, rememberMe)
    seedActivity()
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password, name) => {
    const u = await api.register(email, password, name)
    seedActivity()
    setUser(u)
    return u
  }, [])

  // Used by GoogleSignInButton: the /auth/google endpoint already returns the
  // full user object in one round trip, so we just adopt it directly rather
  // than wrapping another api call like login()/register() do.
  const setUserDirectly = useCallback((u) => {
    seedActivity()
    setUser(u)
  }, [])

  // Re-fetches the current user from the server — used after a flow that
  // changes server-side user state without going through login/register,
  // e.g. returning from the Drive backup OAuth redirect (Branding.jsx).
  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe()
      setUser(u)
      return u
    } catch {
      return null
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserDirectly, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
