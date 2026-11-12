/** The French words of the audit actions the screen knows; an unknown one is shown as the API sends it. */
export const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  PASSWORD_CHANGE_REQUIRED: 'Changement de mot de passe exigé',
  ACCOUNT_UPDATED: 'Compte modifié',
  ACCESS_DENIED: 'Accès refusé',
  DATA_READ: 'Consultation de données',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

const OUTCOMES = {
  SUCCESS: { label: 'Réussi', tone: 'success' },
  FAILURE: { label: 'Échec', tone: 'danger' },
} as const

export function outcomeView(outcome: string) {
  return OUTCOMES[outcome as keyof typeof OUTCOMES] ?? { label: outcome, tone: 'neutral' as const }
}

const WHEN = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })

/** The date and time in the browser's time zone, in French; the raw text if the API sent something unreadable. */
export function formatWhen(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : WHEN.format(date)
}
