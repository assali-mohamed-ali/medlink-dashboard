import type { AuthUser } from '@/features/auth'

/** POST /api/auth/mfa/setup (plan.md §4, endpoint 8). Shown once, never stored or logged by the front. */
export type MfaSetup = {
  otpauthUrl: string
  /** A PNG as a data URL: data:image/png;base64,… */
  qrCode: string
  /** The same secret in Base32, for typing it by hand. */
  secret: string
}

/** POST /api/auth/mfa/verify (endpoint 9): the session is open. */
export type MfaVerified = {
  user: AuthUser
}
