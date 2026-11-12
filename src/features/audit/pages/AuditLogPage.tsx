import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { FileText } from 'lucide-react'
import StatusBadge from '@/shared/components/StatusBadge'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, EmptyState, Select, Skeleton, TextField } from '@/shared/ui'
import { fetchAuditEntries } from '../api'
import { ACTION_LABELS, actionLabel, formatWhen, outcomeView } from '../format'
import type { AuditFilters, AuditPage, AuditQuery } from '../types'
import styles from './AuditLogPage.module.css'

const PAGE_SIZE = 50
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Draft = { from: string; to: string; userId: string; action: string }
type Errors = Partial<Record<keyof Draft, string>>
type Result = { request: AuditQuery; reloads: number; data?: AuditPage; message?: string }

const EMPTY: Draft = { from: '', to: '', userId: '', action: '' }

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
  if (draft.action) filters.action = draft.action
  const from = draft.from ? dayStart(draft.from) : null
  const to = draft.to ? dayEnd(draft.to) : null
  if (from && to && from.getTime() > to.getTime()) errors.to = 'La date de fin doit suivre la date de début.'
  if (from) filters.from = from.toISOString()
  if (to) filters.to = to.toISOString()
  return { errors, filters }
}

/** The audit log for the administrative staff (MLink-116): a table of events with filters and pages. */
export default function AuditLogPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [applied, setApplied] = useState<AuditFilters>({})
  const [page, setPage] = useState(0)
  const [reloads, setReloads] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

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

  // An answer counts only for the request that asked for it: another one is under way when they differ
  const loading = result === null || result.request !== request || result.reloads !== reloads
  const data = loading ? undefined : result?.data
  const message = loading ? undefined : result?.message

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const checked = check(draft)
    setErrors(checked.errors)
    if (Object.keys(checked.errors).length > 0) return
    setApplied(checked.filters)
    setPage(0)
  }

  function reset() {
    setDraft(EMPTY)
    setErrors({})
    setApplied({})
    setPage(0)
  }

  let content: ReactNode
  if (loading) {
    content = <Skeleton lines={6} label="Chargement du journal d'audit…" />
  } else if (message !== undefined) {
    content = (
      <>
        <Alert tone="error">{message}</Alert>
        <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
          Réessayer
        </Button>
      </>
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
        <p>{`${total} événement${total > 1 ? 's' : ''}`}</p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">Événements du journal d&apos;audit</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Utilisateur</th>
                <th scope="col">Action</th>
                <th scope="col">Ressource</th>
                <th scope="col">Adresse IP</th>
                <th scope="col">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => {
                const outcome = outcomeView(entry.outcome)
                const resource = [entry.resourceType, entry.resourceId].filter(Boolean).join(' ')
                return (
                  <tr key={entry.id}>
                    <td>{formatWhen(entry.timestamp)}</td>
                    <td className={styles.mono}>{entry.userId ?? '—'}</td>
                    <td>{actionLabel(entry.action)}</td>
                    <td className={styles.mono}>{resource || '—'}</td>
                    <td>{entry.ipAddress ?? '—'}</td>
                    <td>
                      <StatusBadge tone={outcome.tone}>{outcome.label}</StatusBadge>
                    </td>
                  </tr>
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
    <>
      <h2>Journal d&apos;audit</h2>
      <p className={styles.intro}>
        Les actions sensibles enregistrées par l&apos;application. Ce journal est en lecture seule.
      </p>
      <Card title="Filtres" headingLevel={3}>
        <form onSubmit={submit} noValidate aria-label="Filtres du journal">
          <div className={styles.filters}>
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
              hint="L'identifiant (UUID) affiché dans le tableau."
              autoComplete="off"
              value={draft.userId}
              onChange={(event) => setDraft({ ...draft, userId: event.target.value })}
              error={errors.userId}
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
          </div>
          <div className={styles.actions}>
            <Button type="submit">Filtrer</Button>
            <Button variant="secondary" onClick={reset}>
              Réinitialiser
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Événements" headingLevel={3}>
        {content}
      </Card>
    </>
  )
}
