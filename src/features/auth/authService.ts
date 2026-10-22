import { apiFetch } from '../../services/apiClient'
import type { Role } from './roles'

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: Role[]
}

export type LoginResponse = {
  user?: AuthUser
  mfaRequired?: boolean
  mfaSetupRequired?: boolean
  passwordChangeRequired?: boolean
}

export function fetchCsrf() {
  return apiFetch('/auth/csrf')
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function resendVerification(email: string) {
  return apiFetch<{ message?: string }>('/auth/verify-email/resend', {
    method: 'POST',
    body: { email },
  })
}
