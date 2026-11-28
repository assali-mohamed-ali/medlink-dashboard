import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChartColumn,
  Clock,
  ShieldAlert,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { actionLabel, outcomeView } from '@/features/audit'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { fetchAccountsOverview, fetchAuditEntries, fetchPractitioners } from '../api'
import type { AccountsOverview, AuditEntry, OverviewPractitioner } from '../types'
import styles from './StaffHome.module.css'

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }

/** Reads one source of the home; each part loads, fails and is read again on its own. */
function useLoad<T>(read: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<{ key: number; load: Load<T> } | null>(null)
  useEffect(() => {
    let current = true
    read().then(
      (data) => current && setAnswer({ key: attempt, load: { status: 'ready', data } }),
      (error) => current && setAnswer({ key: attempt, load: { status: 'error', message: messageFor(error) } }),
    )
    return () => {
      current = false
    }
  }, [read, attempt])
  const load: Load<T> = answer?.key === attempt ? answer.load : { status: 'loading' }
  return { load, retry: () => setAttempt((n) => n + 1) }
}

type Audit = { recent: AuditEntry[]; today: number; denied: number }

/** The latest actions, and today's counts (from local midnight): one request each, the smallest page. */
function readAudit(): Promise<Audit> {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  return Promise.all([
    fetchAuditEntries({ size: 6 }),
    fetchAuditEntries({ from, size: 1 }),
    fetchAuditEntries({ from, action: 'ACCESS_DENIED', size: 1 }),
  ]).then(([recent, today, denied]) => ({ recent: recent.items, today: today.totalElements, denied: denied.totalElements }))
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`
}

const TODAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const DAY = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "14:52" today, "Hier · 13:05" yesterday, "09/11 · 08:30" before. */
function when(iso: string, now: Date) {
  const date = new Date(iso)
  const time = TIME.format(date)
  if (sameDay(date, now)) return time
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  return `${sameDay(date, yesterday) ? 'Hier' : DAY.format(date)} · ${time}`
}

/** What the audited thing is, in French; the API's word when it is a new one. */
const RESOURCES: Record<string, string> = {
  USER: 'Compte utilisateur',
  APPOINTMENT: 'Rendez-vous',
  SLOT: 'Créneau',
  PATIENT_RECORD: 'Dossier patient',
  CONSULTATION_REPORT: 'Compte rendu',
  PATIENT_REPORTS: 'Comptes rendus',
  PATIENT_DOCUMENT: 'Document patient',
}

/** "Compte utilisateur · a1b2…e9f0": an id only, shortened, never a name. */
function resource(entry: AuditEntry) {
  if (!entry.resourceType) return null
  const kind = RESOURCES[entry.resourceType] ?? entry.resourceType
  const id = entry.resourceId
  return id && id.length > 12 ? `${kind} · ${id.slice(0, 4)}…${id.slice(-4)}` : id ? `${kind} · ${id}` : kind
}

/** Each clinic with how many practitioners work there (one practitioner counts in each of their clinics). */
function clinicsOf(practitioners: readonly OverviewPractitioner[]) {
  const clinics = new Map<string, { name: string; count: number }>()
  for (const practitioner of practitioners) {
    for (const clinic of practitioner.clinics) {
      const known = clinics.get(clinic.id) ?? { name: clinic.name, count: 0 }
      clinics.set(clinic.id, { ...known, count: known.count + 1 })
    }
  }
  return [...clinics.entries()]
    .map(([id, clinic]) => ({ id, ...clinic }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function countAccounts({ items }: AccountsOverview) {
  return {
    patients: items.filter((account) => account.role === 'PATIENT').length,
    staff: items.filter((account) => account.role === 'PRACTITIONER' || account.role === 'ADMINISTRATIVE_STAFF').length,
    toActivate: items.filter((account) => account.enabled && !account.emailVerified).length,
    disabled: items.filter((account) => !account.enabled).length,
    toRepair: items.filter((account) => account.ambiguousRole || account.role === null).length,
  }
}

function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.failed}>
      <Alert tone="error">{message}</Alert>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  )
}

function Figure({ icon, tone, label, value, note }: { icon: ReactNode; tone: string; label: string; value: string; note: string }) {
  return (
    <li className={styles.figure}>
      <span className={styles.figureIcon} data-tone={tone} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.figureText}>
        <small>{label}</small>
        <b>{value}</b>
        <em>{note}</em>
      </span>
    </li>
  )
}

/**
 * The staff's home, in the Stitch family of the patient's and the practitioner's: the day, the network in figures,
 * the latest audited actions, the clinics and the accounts to watch. Only what the API gives the staff: the accounts
 * (first page, and the total), the practitioners with their clinics, and the audit trail (ids only, never a name).
 */
export default function StaffHome({ firstName }: { firstName?: string }) {
  const ids = useId()
  const [now] = useState(() => new Date())
  const accounts = useLoad(fetchAccountsOverview)
  const practitioners = useLoad(fetchPractitioners)
  const audit = useLoad(readAudit)

  const counted = accounts.load.status === 'ready' ? countAccounts(accounts.load.data) : null
  const team = practitioners.load.status === 'ready' ? practitioners.load.data : null
  const clinics = team ? clinicsOf(team) : null
  const trail = audit.load.status === 'ready' ? audit.load.data : null
  const pending = (status: string) => (status === 'error' ? '—' : '…')

  return (
    <div className={styles.home} data-width="wide">
      <section className={styles.hello} aria-labelledby={`${ids}-hello`}>
        <div>
          <p className={styles.today}>
            <CalendarDays size={14} aria-hidden="true" />
            {TODAY.format(now)}
          </p>
          <h2 id={`${ids}-hello`} className={styles.title}>
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h2>
          <p className={styles.sentence}>
            {team && clinics && counted ? (
              <>
                Le réseau aujourd’hui : <strong>{plural(team.length, 'praticien', 'praticiens')}</strong> dans{' '}
                <strong>{plural(clinics.length, 'clinique', 'cliniques')}</strong>,{' '}
                <strong>{plural(counted.toActivate, 'compte', 'comptes')}</strong> à activer.
              </>
            ) : (
              'Les comptes et l’organisation des trois cliniques.'
            )}
          </p>
        </div>
        <div className={styles.quick}>
          <Link to={paths.staff.booking} className={styles.add}><CalendarDays size={18} aria-hidden="true" /> Nouveau rendez-vous</Link>
          <Link to={`${paths.staff.accounts}?nouveau`} className={styles.open}>
            <UserPlus size={18} aria-hidden="true" />
            Nouveau compte
          </Link>
          <Link to={paths.staff.activity} className={styles.open}>
            <CalendarDays size={18} aria-hidden="true" />
            Rendez-vous des cliniques
          </Link>
        </div>
      </section>

      <ul className={styles.figures} aria-label="Le réseau en chiffres">
        <Figure
          icon={<Users size={20} />}
          tone="1"
          label="Comptes"
          value={accounts.load.status === 'ready' ? String(accounts.load.data.total) : pending(accounts.load.status)}
          note={counted ? `${counted.patients} patients · ${counted.staff} personnel` : ' '}
        />
        <Figure
          icon={<Stethoscope size={20} />}
          tone="2"
          label="Praticiens"
          value={team ? String(team.length) : pending(practitioners.load.status)}
          note={clinics ? `dans ${plural(clinics.length, 'clinique', 'cliniques')}` : ' '}
        />
        <Figure
          icon={<Clock size={20} />}
          tone="3"
          label="À activer"
          value={counted ? String(counted.toActivate) : pending(accounts.load.status)}
          note="mail d’activation envoyé"
        />
        <Figure
          icon={<ShieldAlert size={20} />}
          tone="4"
          label="Accès refusés aujourd’hui"
          value={trail ? String(trail.denied) : pending(audit.load.status)}
          note={trail ? `sur ${plural(trail.today, 'action tracée', 'actions tracées')}` : ' '}
        />
      </ul>

      <div className={styles.row}>
        <section className={styles.card} aria-labelledby={`${ids}-activity`}>
          <div className={styles.cardHead}>
            <h3 id={`${ids}-activity`} className={styles.cardTitle}>
              Activité récente
            </h3>
            <Link to={paths.staff.audit} className={styles.all}>
              Voir le journal d’audit
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.hint}>
            Les dernières actions tracées : jamais de nom ni de donnée médicale, seulement l’action et son résultat.
          </p>
          {audit.load.status === 'loading' && <Skeleton lines={4} label="Chargement de l’activité…" />}
          {audit.load.status === 'error' && <Failed message={audit.load.message} onRetry={audit.retry} />}
          {trail && trail.recent.length === 0 && <p className={styles.none}>Aucune action tracée pour l’instant.</p>}
          {trail && trail.recent.length > 0 && (
            <ul className={styles.lines}>
              {trail.recent.map((entry) => {
                const outcome = outcomeView(entry.outcome)
                const what = resource(entry)
                return (
                  <li key={entry.id} className={styles.line}>
                    <span className={styles.lineText}>
                      <b>{actionLabel(entry.action)}</b>
                      {what && <small>{what}</small>}
                    </span>
                    <span className={styles.lineSide}>
                      <span className={styles.time}>{when(entry.timestamp, now)}</span>
                      <span className={styles.outcome} data-tone={outcome.tone}>
                        {outcome.label}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className={styles.side}>
          <section className={styles.card} aria-labelledby={`${ids}-operations`}>
            <h3 id={`${ids}-operations`} className={styles.cardTitle}>Opérations à traiter</h3>
            <div className={styles.taskLinks}>
              <Link to={paths.staff.reassignments}>Suivre les réaffectations <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to={paths.staff.deletionRequests}>Examiner les demandes de suppression <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to={paths.staff.clinicAssignments}>Gérer les affectations aux cliniques <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </section>
          <section className={styles.card} aria-labelledby={`${ids}-network`}>
            <div className={styles.cardHead}>
              <h3 id={`${ids}-network`} className={styles.cardTitle}>
                Le réseau
              </h3>
              <Link to={paths.staff.activity} className={styles.all}>
                Rendez-vous
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.hint}>Un praticien peut exercer dans plusieurs cliniques.</p>
            {practitioners.load.status === 'loading' && <Skeleton lines={3} label="Chargement des cliniques…" />}
            {practitioners.load.status === 'error' && (
              <Failed message={practitioners.load.message} onRetry={practitioners.retry} />
            )}
            {clinics && clinics.length === 0 && <p className={styles.none}>Aucun praticien pour l’instant.</p>}
            {clinics && clinics.length > 0 && (
              <ul className={styles.clinics}>
                {clinics.map((clinic, index) => (
                  <li key={clinic.id} className={styles.clinic} data-tone={(index % 3) + 1}>
                    <Building2 size={18} aria-hidden="true" />
                    <b>{clinic.name}</b>
                    <span>{plural(clinic.count, 'praticien', 'praticiens')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby={`${ids}-watch`}>
            <div className={styles.cardHead}>
              <h3 id={`${ids}-watch`} className={styles.cardTitle}>
                Comptes à surveiller
              </h3>
              <Link to={paths.staff.accounts} className={styles.all}>
                Gérer les comptes
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {accounts.load.status === 'loading' && <Skeleton lines={3} label="Chargement des comptes…" />}
            {accounts.load.status === 'error' && <Failed message={accounts.load.message} onRetry={accounts.retry} />}
            {counted && accounts.load.status === 'ready' && (
              <>
                <ul className={styles.watch}>
                  <li className={styles.watchRow}>
                    <b>{counted.toActivate}</b>
                    <span>en attente d’activation</span>
                    <span className={styles.pill} data-tone={counted.toActivate ? 'wait' : 'ok'}>
                      {counted.toActivate ? 'Mail envoyé' : 'Tout va bien'}
                    </span>
                  </li>
                  <li className={styles.watchRow}>
                    <b>{counted.disabled}</b>
                    <span>{counted.disabled > 1 ? 'désactivés' : 'désactivé'}</span>
                    <span className={styles.pill} data-tone={counted.disabled ? 'off' : 'ok'}>
                      {counted.disabled ? 'Bloqué' : 'Tout va bien'}
                    </span>
                  </li>
                  <li className={styles.watchRow}>
                    <b>{counted.toRepair}</b>
                    <span>{counted.toRepair > 1 ? 'rôles à réparer' : 'rôle à réparer'}</span>
                    <span className={styles.pill} data-tone={counted.toRepair ? 'off' : 'ok'}>
                      {counted.toRepair ? 'À réparer' : 'Tout va bien'}
                    </span>
                  </li>
                </ul>
                {accounts.load.data.total > accounts.load.data.items.length && (
                  <p className={styles.hint}>
                    Sur les {accounts.load.data.items.length} premiers comptes ({accounts.load.data.total} au total).
                  </p>
                )}
              </>
            )}
          </section>

          <Link to={paths.staff.stats} className={styles.export}>
            <span className={styles.exportIcon} aria-hidden="true">
              <ChartColumn size={20} />
            </span>
            <span className={styles.exportText}>
              <b>Statistiques anonymisées</b>
              Rendez-vous par jour, statut et spécialité, en CSV.
            </span>
            <span className={styles.exportGo} aria-hidden="true">
              Ouvrir
              <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
