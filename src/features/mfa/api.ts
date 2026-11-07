import { apiFetch } from '@/shared/api/apiClient'
import type { MfaSetup, MfaVerified } from './types'

// Endpoints 8 and 9 of plan.md §4 (api-MedLink). Both need the pending code step the login opened
// (same browser, 5 minutes); without it they answer 401 UNAUTHORIZED.

/** First time only: the token comes from the link mailed at login (`/configurer-code?token=…`). */
export function setupMfa(token: string) {
  return apiFetch<MfaSetup>('/auth/mfa/setup', { method: 'POST', body: { token } })
}

export function verifyMfa(code: string) {
  return apiFetch<MfaVerified>('/auth/mfa/verify', { method: 'POST', body: { code } })
}
