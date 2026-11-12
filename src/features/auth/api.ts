import { apiFetch } from '@/shared/api/apiClient'
import type { AuthUser, LoginResponse, RegisterPayload, RegisterResponse } from './types'

// One function per endpoint of plan.md §4 (api-MedLink). Components never call fetch() themselves.

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function verifyEmail(token: string) {
  return apiFetch('/auth/verify-email', { method: 'POST', body: { token } })
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

/**
 * Endpoint 10. Logged in: `{ currentPassword, newPassword }`, and the API ends every session of the user. After a
 * login that answered `passwordChangeRequired`: `{ newPassword }` only. Either way the user logs in again.
 */
export function changePassword(body: { currentPassword?: string; newPassword: string }) {
  return apiFetch('/auth/password', { method: 'POST', body })
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
