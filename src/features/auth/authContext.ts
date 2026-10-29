import { createContext } from 'react'
import type { AuthUser, LoginResponse } from './types'
import type { Role } from './roles'

export type AuthState = {
  user: AuthUser | null
  roles: Role[]
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
