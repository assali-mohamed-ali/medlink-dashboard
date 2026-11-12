import { ApiError } from './apiClient'

const GENERIC_MESSAGE = 'Un problème est survenu de notre côté. Réessayez dans un instant.'

// The API's messages are already French: only the codes a screen words itself are listed here.
// Add a line when a screen needs its own text for a code; never repeat the API's message.
const MESSAGES: Record<string, string> = {
  INVALID_CODE: 'Code incorrect. Vérifiez le code affiché dans votre application.',
  MFA_LOCKED: "Trop d'essais. Reconnectez-vous dans 15 minutes.",
  TOKEN_EXPIRED: 'Ce lien a expiré ou a déjà servi.',
  INVALID_TOKEN: "Ce lien n'est pas valide.",
}

/** The French text to show for any error a call can throw. */
export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC_MESSAGE
  return MESSAGES[error.code] ?? error.message ?? GENERIC_MESSAGE
}

/**
 * The per-field messages of a 400 VALIDATION_FAILED (`details` = `{ field: message }`), kept only for
 * the fields the form shows, so a server message always lands under its own field.
 */
export function fieldErrors<F extends string>(
  details: unknown,
  fields: readonly F[],
): Partial<Record<F, string>> {
  if (!details || typeof details !== 'object') return {}
  const out: Partial<Record<F, string>> = {}
  for (const field of fields) {
    const value = (details as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) out[field] = value
  }
  return out
}
