import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './authContext'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
} from './authService'
import type { AuthUser, LoginResponse } from './authService'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((response) => {
        if (!cancelled) setUser(response.user)
      })
      .catch(() => {
        // A 401 simply means nobody is logged in.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const result = await loginRequest(email, password)
      if (result.user) setUser(result.user)
      return result
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // The session is already over on the server side: clear it here too.
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, roles: user?.roles ?? [], loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
