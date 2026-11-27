/** The French words of the audit actions of the API; an unknown one is shown as the API sends it. */
export const ACTION_LABELS: Record<string, string> = {
  ACCESS_DENIED: 'Accès refusé',
  LOGIN: 'Connexion',
  PASSWORD_CHANGE_REQUIRED: 'Changement de mot de passe exigé',
  DATA_READ: 'Consultation de données',
  ACCOUNT_CREATED: 'Compte créé',
  ACCOUNT_UPDATED: 'Compte modifié',
  ROLE_CHANGED: 'Rôle modifié',
  ACCOUNT_ENABLED: 'Compte activé',
  ACCOUNT_DISABLED: 'Compte désactivé',
  SLOT_OPENED: 'Créneau ouvert',
  SLOT_CLOSED: 'Créneau fermé',
  DOCUMENT_LIST: 'Liste des documents consultée',
  DOCUMENT_READ: 'Document téléchargé',
  DOCUMENT_UPLOAD: 'Document ajouté',
  RECORD_VIEWED: 'Dossier patient consulté',
  REPORT_CREATED: 'Compte rendu de consultation créé',
  REPORT_VIEWED: 'Comptes rendus de consultation consultés',
  STATS_EXPORTED: 'Statistiques anonymisées exportées',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

const OUTCOMES = {
  SUCCESS: { label: 'Réussi', tone: 'success' },
  FAILURE: { label: 'Échec', tone: 'danger' },
  DENIED: { label: 'Refusé', tone: 'danger' },
  // Written before an operation outside our database starts; a SUCCESS or FAILURE entry closes it.
  // One that is never closed shows an operation to check, so it is not shown as a success.
  ATTEMPTED: { label: 'Tentative', tone: 'neutral' },
  NOT_NEEDED: { label: 'Non nécessaire', tone: 'neutral' },
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

/** What an audited thing is, in French; the API's word when the screen does not know it yet. */
const RESOURCE_LABELS: Record<string, string> = {
  USER: 'Compte utilisateur',
  APPOINTMENT: 'Rendez-vous',
  SLOT: 'Créneau',
  PATIENT_RECORD: 'Dossier patient',
  CONSULTATION_REPORT: 'Compte rendu',
  PATIENT_REPORTS: 'Comptes rendus',
  PATIENT_DOCUMENT: 'Document patient',
  ALL: 'Tous',
}

export function resourceLabel(type: string): string {
  return RESOURCE_LABELS[type] ?? type
}

/** "3f1c…4a5b" for a long id (a UUID), the id itself when it is short. */
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id
}

const LOCAL_ADDRESSES = /* @__PURE__ */ new Set(['0:0:0:0:0:0:0:1', '::1', '127.0.0.1'])

/** "Local" for this machine (the dev stack), the address otherwise. */
export function ipLabel(ip: string): string {
  return LOCAL_ADDRESSES.has(ip) ? 'Local' : ip
}

const DAY_IN_YEAR = /* @__PURE__ */ new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const DAY_WITH_YEAR = /* @__PURE__ */ new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** The local day of an instant, as a key: "2026-11-27". */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** "Aujourd’hui · vendredi 27 novembre", "Hier · jeudi 26 novembre", else "vendredi 20 novembre 2026". */
export function dayHeading(date: Date, now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(date) === dayKey(now)) return `Aujourd’hui · ${DAY_IN_YEAR.format(date)}`
  if (dayKey(date) === dayKey(yesterday)) return `Hier · ${DAY_IN_YEAR.format(date)}`
  return DAY_WITH_YEAR.format(date)
}
