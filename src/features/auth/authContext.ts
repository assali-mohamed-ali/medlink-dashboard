import { createContext } from 'react'
import type { AuthUser, LoginResponse } from './types'
import type { Role } from './roles'

/** loading: asking the API who is logged in (page load) · anonymous: nobody · authenticated: `user` is set. */
export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export type AuthState = {
  status: SessionStatus
  user: AuthUser | null
  /** The person's role: one role per person (api-MedLink rule), null when nobody is logged in. */
  role: Role | null
  /** True once the API ended the session (expired, revoked, account disabled) until the next login. */
  sessionExpired: boolean
  /** POST /api/auth/login; opens the session when the answer holds the user (patients). */
  login: (email: string, password: string) => Promise<LoginResponse>
  /** Opens the session with the user an extra step returned (POST /api/auth/mfa/verify). */
  completeLogin: (user: AuthUser) => void
  /** POST /api/auth/logout; the session is cleared here even if the call fails. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
