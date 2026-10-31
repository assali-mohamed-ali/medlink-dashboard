import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { setUnauthorizedHandler } from '@/shared/api/apiClient'
import { AuthContext } from './authContext'
import type { SessionStatus } from './authContext'
import { fetchMe, login as loginRequest, logout as logoutRequest } from './api'
import type { AuthUser, LoginResponse } from './types'

/**
 * The session as the front knows it. The API is the source of truth: on load we ask it who is logged in
 * (GET /api/auth/me), and any call answering 401 UNAUTHENTICATED / SESSION_EXPIRED clears the session
 * here (the guards then send the user to /connexion). Nothing is stored in the browser.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [sessionExpired, setSessionExpired] = useState(false)
  // Whether a session is open right now: a 401 then means it ended; before, it only means "nobody yet"
  const sessionOpen = useRef(false)

  const openSession = useCallback((next: AuthUser) => {
    sessionOpen.current = true
    setUser(next)
    setStatus('authenticated')
    setSessionExpired(false)
  }, [])

  const closeSession = useCallback(() => {
    sessionOpen.current = false
    setUser(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((response) => {
        if (!cancelled) openSession(response.user)
      })
      .catch(() => {
        // 401: nobody is logged in. Unreachable API: same, the login page will say so on submit.
        if (!cancelled) closeSession()
      })
    return () => {
      cancelled = true
    }
  }, [openSession, closeSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // The page load's GET /api/auth/me answers 401 for a visitor too: not an expired session
      if (sessionOpen.current) setSessionExpired(true)
      closeSession()
    })
    return () => setUnauthorizedHandler(null)
  }, [closeSession])

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const result = await loginRequest(email, password)
      if (result.user) openSession(result.user)
      return result
    },
    [openSession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // The session is already over on the server side: clear it here too.
    }
    setSessionExpired(false)
    closeSession()
  }, [closeSession])

  const value = useMemo(
    () => ({
      status,
      user,
      role: user?.roles[0] ?? null,
      sessionExpired,
      login,
      completeLogin: openSession,
      logout,
    }),
    [status, user, sessionExpired, login, openSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
