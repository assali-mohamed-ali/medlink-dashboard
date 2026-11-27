import { Fragment, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  CalendarPlus,
  Copy,
  Eye,
  FileText,
  Lock,
  LogIn,
  ShieldAlert,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import StatusBadge from '@/shared/components/StatusBadge'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, EmptyState, Select, Skeleton, TextField } from '@/shared/ui'
import { fetchAuditEntries } from '../api'
import { ACTION_LABELS, actionLabel, dayHeading, dayKey, ipLabel, outcomeView, resourceLabel, shortId } from '../format'
import type { AuditEntry, AuditFilters, AuditPage, AuditQuery } from '../types'
import AuditPatientPicker from './AuditPatientPicker'
import styles from './AuditLogPage.module.css'

const PAGE_SIZE = 50
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Draft = { from: string; to: string; userId: string; patientId: string; action: string }
type Errors = Partial<Record<keyof Draft, string>>
type Result = { request: AuditQuery; reloads: number; data?: AuditPage; message?: string }

const EMPTY: Draft = { from: '', to: '', userId: '', patientId: '', action: '' }

function dayStart(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function dayEnd(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

/** What the person typed, as the filters the API takes; or the message to show under each wrong field. */
function check(draft: Draft): { errors: Errors; filters: AuditFilters } {
  const errors: Errors = {}
  const filters: AuditFilters = {}
  const userId = draft.userId.trim()
  if (userId) {
    if (UUID.test(userId)) filters.userId = userId
    else errors.userId = 'Saisissez un identifiant valide (UUID).'
  }
  const patientId = draft.patientId.trim()
  if (patientId) {
    if (UUID.test(patientId)) filters.patientId = patientId
    else errors.patientId = 'Saisissez un identifiant valide (UUID).'
  }
  if (draft.action) filters.action = draft.action
  const from = draft.from ? dayStart(draft.from) : null
  const to = draft.to ? dayEnd(draft.to) : null
  if (from && to && from.getTime() > to.getTime()) errors.to = 'La date de fin doit suivre la date de début.'
  if (from) filters.from = from.toISOString()
  if (to) filters.to = to.toISOString()
  return { errors, filters }
}

/** The quick filters: one click, the same fields filled as if typed. */
const QUICK = [
  { key: 'all', label: 'Tout', draft: () => EMPTY },
  { key: 'today', label: 'Aujourd’hui', draft: () => ({ ...EMPTY, from: dayKey(new Date()) }) },
  { key: 'logins', label: 'Connexions', draft: () => ({ ...EMPTY, action: 'LOGIN' }) },
  { key: 'denied', label: 'Accès refusés', draft: () => ({ ...EMPTY, action: 'ACCESS_DENIED' }) },
] as const

function sameFilters(a: AuditFilters, b: AuditFilters) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof AuditFilters>
  return [...keys].every((key) => a[key] === b[key])
}

/** An icon and a tone per family of actions. */
function actionLook(action: string): { icon: LucideIcon; tone: string } {
  if (action === 'LOGIN') return { icon: LogIn, tone: 'sage' }
  if (action === 'ACCESS_DENIED') return { icon: ShieldAlert, tone: 'rose' }
  if (action.startsWith('ACCOUNT_') || action === 'ROLE_CHANGED' || action.startsWith('PASSWORD')) {
    return { icon: UserPlus, tone: 'blue' }
  }
  if (action.startsWith('REPORT_')) return { icon: FileText, tone: 'amber' }
  if (action === 'RECORD_VIEWED' || action === 'DATA_READ') return { icon: Eye, tone: 'amber' }
  if (action.startsWith('SLOT_') || action.startsWith('APPOINTMENT_')) return { icon: CalendarPlus, tone: 'sage' }
  return { icon: FileText, tone: 'sage' }
}

const TIME = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' })

function timeOf(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : TIME.format(date)
}

/** A user id, shortened, its whole value as its title, with a button that copies it (to paste in the filter). */
function UserId({ id, onCopied }: { id: string; onCopied: () => void }) {
  const short = shortId(id)
  return (
    <span className={styles.id}>
      <span title={id}>{short}</span>
      <button
        type="button"
        className={styles.copy}
        aria-label={`Copier l’identifiant ${short}`}
        title="Copier l’identifiant complet"
        onClick={() => navigator.clipboard?.writeText(id).then(onCopied, () => undefined)}
      >
        <Copy size={14} aria-hidden="true" />
      </button>
    </span>
  )
}

function Resource({ entry }: { entry: AuditEntry }) {
  if (!entry.resourceType) return <>—</>
  const kind = resourceLabel(entry.resourceType)
  if (!entry.resourceId) return <>{kind}</>
  const short = shortId(entry.resourceId)
  return (
    <span title={`${kind} ${entry.resourceId}`}>
      {kind} · {short}
    </span>
  )
}

/**
 * The audit log for the administrative staff (MLink-116), after the Stitch design of the staff space: quick filters,
 * the detailed filters on one line, the events grouped by day with an icon per action, short ids that copy whole.
 * Read only, and never a name or a medical value: ids only.
 */
export default function AuditLogPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [applied, setApplied] = useState<AuditFilters>({})
  const [page, setPage] = useState(0)
  const [patientPickerReset, resetPatientPicker] = useState(0)
  const [reloads, setReloads] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)
  // "Today" for the day headings, read once when the page opens
  const [now] = useState(() => new Date())

  const request = useMemo<AuditQuery>(() => ({ ...applied, page, size: PAGE_SIZE }), [applied, page])

  useEffect(() => {
    let current = true
    fetchAuditEntries(request)
      .then((data) => {
        if (current) setResult({ request, reloads, data })
      })
      .catch((error: unknown) => {
        if (current) setResult({ request, reloads, message: messageFor(error) })
      })
    return () => {
      current = false
    }
  }, [request, reloads])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timer)
  }, [copied])

  // An answer counts only for the request that asked for it: another one is under way when they differ
  const loading = result === null || result.request !== request || result.reloads !== reloads
  const data = loading ? undefined : result?.data
  const message = loading ? undefined : result?.message

  function apply(next: Draft) {
    const checked = check(next)
    setErrors(checked.errors)
    if (Object.keys(checked.errors).length > 0) return
    setApplied(checked.filters)
    setPage(0)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    apply(draft)
  }

  function reset() {
    setDraft(EMPTY)
    resetPatientPicker((count) => count + 1)
    setErrors({})
    setApplied({})
    setPage(0)
  }

  let content: ReactNode
  if (loading) {
    content = <Skeleton lines={6} label="Chargement du journal d'audit…" />
  } else if (message !== undefined) {
    content = (
      <div className={styles.failed}>
        <Alert tone="error">{message}</Alert>
        <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
          Réessayer
        </Button>
      </div>
    )
  } else if (data && data.items.length === 0) {
    content = (
      <EmptyState icon={FileText} title="Aucun événement" compact>
        Aucune entrée du journal ne correspond à ces critères.
      </EmptyState>
    )
  } else if (data) {
    const total = data.totalElements
    content = (
      <>
        <div className={styles.summary}>
          <p className={styles.total}>{`${total} événement${total > 1 ? 's' : ''}`}</p>
          <span className={styles.order}>du plus récent au plus ancien</span>
          {copied && (
            <span className={styles.copied} role="status">
              Identifiant copié.
            </span>
          )}
        </div>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">Événements du journal d&apos;audit</caption>
            <thead>
              <tr>
                <th scope="col">Heure</th>
                <th scope="col">Action</th>
                <th scope="col">Utilisateur</th>
                <th scope="col">Ressource</th>
                <th scope="col">Adresse IP</th>
                <th scope="col">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry, index) => {
                const date = new Date(entry.timestamp)
                const previous = data.items[index - 1]
                const newDay =
                  !Number.isNaN(date.getTime()) &&
                  (!previous || dayKey(new Date(previous.timestamp)) !== dayKey(date))
                const outcome = outcomeView(entry.outcome)
                const look = actionLook(entry.action)
                const Icon = look.icon
                return (
                  <Fragment key={entry.id}>
                    {newDay && (
                      <tr className={styles.dayRow}>
                        <th scope="rowgroup" colSpan={6} role="rowheader">
                          {dayHeading(date, now)}
                        </th>
                      </tr>
                    )}
                    <tr>
                      <td className={styles.time}>{timeOf(entry.timestamp)}</td>
                      <td>
                        <span className={styles.action}>
                          <span className={styles.actionIcon} data-tone={look.tone} aria-hidden="true">
                            <Icon size={16} />
                          </span>
                          <span>{actionLabel(entry.action)}</span>
                        </span>
                      </td>
                      <td>{entry.userId ? <UserId id={entry.userId} onCopied={() => setCopied(true)} /> : '—'}</td>
                      <td className={styles.resource}>
                        <Resource entry={entry} />
                      </td>
                      <td className={styles.ip}>{entry.ipAddress ? ipLabel(entry.ipAddress) : '—'}</td>
                      <td>
                        <StatusBadge tone={outcome.tone}>{outcome.label}</StatusBadge>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <nav aria-label="Pagination" className={styles.pager}>
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>
            Précédent
          </Button>
          <span>{`Page ${data.page + 1} sur ${data.totalPages}`}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page + 1 >= data.totalPages}
            onClick={() => setPage((n) => n + 1)}
          >
            Suivant
          </Button>
        </nav>
      </>
    )
  }

  return (
    <section className={styles.page} data-width="wide" aria-labelledby="audit-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" />
            Espace administratif
          </p>
          <h2 id="audit-title" className={styles.title}>
            Journal d&apos;audit
          </h2>
          <p className={styles.intro}>
            Les actions sensibles enregistrées par MedLink : jamais de nom ni de donnée médicale, seulement des
            identifiants.
          </p>
        </div>
        <span className={styles.readOnly}>
          <Lock size={16} aria-hidden="true" />
          Lecture seule
        </span>
      </header>

      <div className={styles.card}>
        <div className={styles.quick} role="group" aria-label="Filtres rapides">
          {QUICK.map((quick) => {
            const pressed = sameFilters(applied, check(quick.draft()).filters)
            return (
              <button
                key={quick.key}
                type="button"
                className={styles.chip}
                aria-pressed={pressed}
                onClick={() => {
                  const next = quick.draft()
                  setDraft(next)
                  apply(next)
                }}
              >
                {quick.label}
              </button>
            )
          })}
        </div>
        <form onSubmit={submit} noValidate aria-label="Filtres du journal" className={styles.filters}>
          <TextField
            label="Date de début"
            type="date"
            value={draft.from}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            error={errors.from}
          />
          <TextField
            label="Date de fin"
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            error={errors.to}
          />
          <TextField
            label="Identifiant de l'utilisateur"
            placeholder="Collez un identifiant (UUID)"
            autoComplete="off"
            value={draft.userId}
            onChange={(event) => setDraft({ ...draft, userId: event.target.value })}
            error={errors.userId}
          />
          <AuditPatientPicker
            key={patientPickerReset}
            value={draft.patientId}
            error={errors.patientId}
            onChange={(patientId) => setDraft((fields) => ({ ...fields, patientId }))}
          />
          <Select
            label="Action"
            value={draft.action}
            onChange={(event) => setDraft({ ...draft, action: event.target.value })}
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <div className={styles.actions}>
            <Button type="submit">Filtrer</Button>
            <Button variant="secondary" onClick={reset}>
              Réinitialiser
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.card}>{content}</div>
    </section>
  )
}
