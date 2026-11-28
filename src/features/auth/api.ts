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

/**
 * Endpoint 14 (MLink-71): the first password of a staff account, with the mailed token. 204; 400 INVALID_TOKEN,
 * 410 TOKEN_EXPIRED, 400 PASSWORD_POLICY (Keycloak's rule, in French, under `details.password`).
 */
export function activateAccount(token: string, password: string) {
  return apiFetch('/auth/account/activate', { method: 'POST', body: { token, password } })
}

/** Endpoint 15: a new activation link. 202 with the same neutral message whether or not the account exists. */
export function resendActivation(email: string) {
  return apiFetch<{ message?: string }>('/auth/account/activate/resend', { method: 'POST', body: { email } })
}

export function currentConsent() {
  return apiFetch<{ version: string; text: string; required: boolean }>('/auth/consent')
}

export function requestPasswordReset(email: string) {
  return apiFetch('/auth/password/forgot', { method: 'POST', body: { email } })
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch('/auth/password/reset', { method: 'POST', body: { token, newPassword } })
}
