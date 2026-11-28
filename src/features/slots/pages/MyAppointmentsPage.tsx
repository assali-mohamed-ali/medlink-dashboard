import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarDays, CalendarPlus, CalendarX, Check, Hourglass, MapPin, RotateCcwClock, Stethoscope } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Spinner } from '@/shared/ui'
import { cancelAppointment, fetchMyAppointments } from '../api'
import { kindOf, toComeOf, whenLabel, type Kind } from '../appointments'
import { Dialog, DialogActions, FieldError, Summary } from '../components/Dialog'
import type { Appointment, AppointmentPage } from '../types'
import { fullDateLabel, timeLabel } from '../week'
import styles from './MyAppointmentsPage.module.css'

const PAGE_SIZE = 20

/** "nov." for the date tiles, "lundi 23 nov." for the history */
const SHORT_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

/** The cards to come are tinted by clinic, from the team's clinic tokens. */
const TINTS = [styles.tintA, styles.tintB, styles.tintC]

type History = 'all' | 'cancelled' | 'past'

/**
 * MLink-109: a patient manages their appointments alone. The page of the API (latest first, cancelled ones included) is
 * shown in two parts: the appointments to come, soonest first, the next one marked, each can be cancelled (after a
 * confirmation) or moved (the slot search, in move mode); then the history, cancelled and past, which can be narrowed.
 */
export default function MyAppointmentsPage() {
  // Read once: "now" does not move while the page is open
  const [now] = useState(() => Date.now())
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<AppointmentPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<History>('all')
  const ids = useId()

  useEffect(() => {
    let current = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const loaded = await fetchMyAppointments(page, PAGE_SIZE)
        if (current) setResult(loaded)
      } catch (e) {
        if (current) setError(messageFor(e))
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => {
      current = false
    }
  }, [page, reload])

  function askCancel(appointment: Appointment) {
    setNotice(null)
    setCancelError(null)
    setToCancel(appointment)
  }

  async function confirmCancel() {
    if (!toCancel) return
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelAppointment(toCancel.id)
      setToCancel(null)
      setNotice('Votre rendez-vous est annulé.')
      setReload((n) => n + 1)
    } catch (e) {
      setCancelError(messageFor(e))
    } finally {
      setCancelling(false)
    }
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1
  const items = result?.items ?? []
  const toCome = toComeOf(items, now)
  const cancelled = items.filter((a) => kindOf(a, now) === 'cancelled')
  const past = items.filter((a) => kindOf(a, now) === 'past')
  const shownHistory = items.filter((a) => {
    const kind = kindOf(a, now)
    return kind !== 'toCome' && (history === 'all' || kind === history)
  })
  const clinics = [...new Set(items.map((a) => a.clinic.name))].sort()
  const tintOf = (a: Appointment) => TINTS[clinics.indexOf(a.clinic.name) % TINTS.length]

  return (
    <div className={styles.page} data-width="wide">
      <header className={styles.head}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <CalendarDays size={14} aria-hidden="true" /> Espace patient
          </p>
          <h2 className={styles.title}>Mes rendez-vous</h2>
          <p className={styles.lead}>Vos rendez-vous à venir et votre historique. Annulez ou reportez-les vous-même.</p>
          <Link to={paths.patient.reassignments}>Propositions de réaffectation</Link>
        </div>
        <Link className={styles.newOne} to={paths.patient.slots}>
          <CalendarPlus size={18} aria-hidden="true" />
          Nouveau rendez-vous
        </Link>
      </header>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {loading && (
        <div className={styles.loading}>
          <Spinner label="Chargement de vos rendez-vous…" />
        </div>
      )}

      {!loading && result && result.total === 0 && (
        <div className={styles.empty}>
          <CalendarDays size={28} aria-hidden="true" />
          <p>Vous n’avez pas encore de rendez-vous.</p>
          <Link className={styles.linkButton} to={paths.patient.slots}>
            Prendre rendez-vous
          </Link>
        </div>
      )}

      {!loading && result && result.total > 0 && (
        <>
          <div className={styles.glanceBar}>
            <ul className={styles.glance} aria-label="En bref">
              <Count icon={<CalendarCheck size={20} aria-hidden="true" />} tint={styles.mint} n={toCome.length} label="À venir" />
              <Count
                icon={<CalendarX size={20} aria-hidden="true" />}
                tint={styles.rose}
                n={cancelled.length}
                label={cancelled.length > 1 ? 'Annulés' : 'Annulé'}
              />
              <Count
                icon={<RotateCcwClock size={20} aria-hidden="true" />}
                tint={styles.lavender}
                n={past.length}
                label={past.length > 1 ? 'Passés' : 'Passé'}
              />
            </ul>
            {result.total > items.length && (
              <p className={styles.pageNote}>Comptés sur les {items.length} rendez-vous de cette page.</p>
            )}
          </div>

          <section className={styles.card} aria-labelledby={`${ids}-to-come`}>
            {/* The count stays out of the heading: the section is named "À venir" */}
            <div className={styles.titleRow}>
              <h3 id={`${ids}-to-come`} className={styles.cardTitle}>
                À venir
              </h3>
              <span className={styles.cardCount}>{toCome.length}</span>
            </div>
            {toCome.length === 0 ? (
              <p className={styles.none}>Aucun rendez-vous à venir.</p>
            ) : (
              <ul className={styles.toCome}>
                {toCome.map((a, i) => (
                  <ToComeCard
                    key={a.id}
                    appointment={a}
                    tint={tintOf(a)}
                    next={i === 0 ? whenLabel(new Date(a.startsAt), now) : undefined}
                    onCancel={() => askCancel(a)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby={`${ids}-history`}>
            <div className={styles.cardHead}>
              <div className={styles.titleRow}>
                <h3 id={`${ids}-history`} className={styles.cardTitle}>
                  <RotateCcwClock size={18} aria-hidden="true" /> Historique
                </h3>
                <span className={styles.cardCount}>{cancelled.length + past.length}</span>
              </div>
              <div className={styles.chips}>
                <Chip on={history === 'all'} onClick={() => setHistory('all')}>
                  Tous
                </Chip>
                <Chip on={history === 'cancelled'} onClick={() => setHistory('cancelled')}>
                  Annulés · {cancelled.length}
                </Chip>
                <Chip on={history === 'past'} onClick={() => setHistory('past')}>
                  Passés · {past.length}
                </Chip>
              </div>
            </div>
            {shownHistory.length === 0 ? (
              <p className={styles.none}>Aucun rendez-vous dans l’historique.</p>
            ) : (
              <ul className={styles.timeline}>
                {shownHistory.map((a) => (
                  <HistoryRow key={a.id} appointment={a} kind={kindOf(a, now)} />
                ))}
              </ul>
            )}
            <p className={styles.hint}>
              <Check size={14} aria-hidden="true" /> Un créneau libéré peut être réservé à nouveau s’il reste disponible.
            </p>
            {pages > 1 && (
              <nav className={styles.pager} aria-label="Pages de rendez-vous">
                <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {pages}
                </span>
                <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>
                  Suivant
                </Button>
              </nav>
            )}
          </section>
        </>
      )}

      {toCancel && (
        <Dialog title="Annuler ce rendez-vous ?" onClose={cancelling ? undefined : () => setToCancel(null)}>
          <Summary
            start={toCancel.startsAt}
            end={toCancel.endsAt}
            who={`Dr ${toCancel.practitioner.firstName} ${toCancel.practitioner.lastName}`}
            clinic={toCancel.clinic.name}
          />
          {cancelError && <FieldError message={cancelError} />}
          <DialogActions>
            <Button variant="secondary" onClick={() => setToCancel(null)} disabled={cancelling}>
              Garder mon rendez-vous
            </Button>
            <Button onClick={confirmCancel} loading={cancelling} autoFocus>
              Confirmer l’annulation
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  )
}

function Count({ icon, tint, n, label }: { icon: ReactNode; tint: string; n: number; label: string }) {
  return (
    <li className={styles.count}>
      <span className={`${styles.countIcon} ${tint}`}>{icon}</span>
      <span className={styles.countText}>
        <b>{n}</b>
        <span>{label}</span>
      </span>
    </li>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={styles.chip} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

function Tile({ start }: { start: Date }) {
  // The date is said in full by the card's name: the tile is for the eye
  return (
    <span className={styles.tile} aria-hidden="true">
      <b>{start.getDate()}</b>
      <span>{SHORT_MONTH.format(start)}</span>
    </span>
  )
}

type ToComeProps = { appointment: Appointment; tint: string; next?: string; onCancel: () => void }

function ToComeCard({ appointment, tint, next, onCancel }: ToComeProps) {
  const start = new Date(appointment.startsAt)
  const { firstName, lastName } = appointment.practitioner
  return (
    <li
      className={`${styles.upcoming} ${tint}`}
      aria-label={`Rendez-vous du ${fullDateLabel(start)}`}
      data-next={next ? true : undefined}
    >
      <Tile start={start} />
      <div className={styles.upcomingText}>
        {next && (
          <span className={styles.next}>
            <Hourglass size={12} aria-hidden="true" /> Prochain · {next}
          </span>
        )}
        <p className={styles.upcomingWhen}>
          <span className={styles.capitalize}>{fullDateLabel(start)}</span> ·{' '}
          <span>
            {timeLabel(start)} – {timeLabel(new Date(appointment.endsAt))}
          </span>
          <span className={styles.srOnly}> Confirmé</span>
        </p>
        <p className={styles.upcomingWho}>
          <Stethoscope size={12} aria-hidden="true" />
          <span>
            Dr {firstName} {lastName}
          </span>
        </p>
        <span className={styles.clinic}>
          <MapPin size={11} aria-hidden="true" />
          <span>{appointment.clinic.name}</span>
        </span>
        {appointment.bookedByStaff && <p>Pris par l’accueil</p>}
      </div>
      <div className={styles.actions}>
        <Link className={styles.move} to={`${paths.patient.slots}?reporter=${appointment.id}`}>
          Reporter
        </Link>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </li>
  )
}

function HistoryRow({ appointment, kind }: { appointment: Appointment; kind: Kind }) {
  const start = new Date(appointment.startsAt)
  const { firstName, lastName } = appointment.practitioner
  const cancelled = kind === 'cancelled'
  return (
    <li className={styles.line} aria-label={`Rendez-vous du ${fullDateLabel(start)}`}>
      <span className={cancelled ? `${styles.dot} ${styles.dotCancelled}` : styles.dot} aria-hidden="true" />
      <span className={`${styles.lineDate} ${styles.capitalize}`}>{SHORT_DATE.format(start)}</span>
      <span className={styles.lineTime}>
        {timeLabel(start)} – {timeLabel(new Date(appointment.endsAt))}
      </span>
      <span className={styles.lineWho}>
        <span>
          Dr {firstName} {lastName}
        </span>{' '}
        · <span>{appointment.clinic.name}</span>
        {appointment.bookedByStaff && <span>Pris par l’accueil</span>}
      </span>
      <span className={`${styles.status} ${cancelled ? styles.cancelled : styles.past}`}>
        {cancelled ? 'Annulé' : 'Passé'}
      </span>
    </li>
  )
}
