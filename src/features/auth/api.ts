import { apiFetch } from '@/shared/api/apiClient'
import type { AuthUser, LoginResponse, RegisterPayload, RegisterResponse } from './types'

// One function per endpoint of plan.md §4 (api-MedLink). Components never call fetch() themselves.

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

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}
