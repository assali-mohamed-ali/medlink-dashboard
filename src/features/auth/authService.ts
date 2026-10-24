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

export function fetchMe() {
  return apiFetch<{ user: AuthUser }>('/auth/me')
}

export function logout() {
  return apiFetch('/auth/logout', { method: 'POST' })
}

export type RegisterPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  address: string
}

export type RegisterResponse = {
  message?: string
}

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}
