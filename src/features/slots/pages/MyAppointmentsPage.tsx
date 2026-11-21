import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarCheck, CalendarDays, Clock, Stethoscope } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Spinner } from '@/shared/ui'
import { cancelAppointment, fetchMyAppointments } from '../api'
import { Dialog, DialogActions, FieldError, Summary } from '../components/Dialog'
import type { Appointment, AppointmentPage } from '../types'
import { fullDateLabel, timeLabel } from '../week'
import styles from './MyAppointmentsPage.module.css'

const PAGE_SIZE = 20

/**
 * MLink-109: a patient manages their appointments alone. The list comes latest first (cancelled ones included); an
 * appointment still to come can be cancelled (after a confirmation) or moved (the slot search, in move mode).
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
      setNotice('Votre rendez-vous est annulé. Le créneau est de nouveau proposé aux autres patients.')
      setReload((n) => n + 1)
    } catch (e) {
      setCancelError(messageFor(e))
    } finally {
      setCancelling(false)
    }
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          <CalendarDays size={14} aria-hidden="true" /> Espace patient
        </p>
        <h2 className={styles.title}>Mes rendez-vous</h2>
        <p className={styles.lead}>Vos rendez-vous, du plus récent au plus ancien. Annulez ou reportez-les vous-même.</p>
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
          <ul className={styles.list}>
            {result.items.map((a) => (
              <AppointmentCard key={a.id} appointment={a} now={now} onCancel={() => askCancel(a)} />
            ))}
          </ul>
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

function AppointmentCard({ appointment, now, onCancel }: { appointment: Appointment; now: number; onCancel: () => void }) {
  const start = new Date(appointment.startsAt)
  const cancelled = appointment.status === 'CANCELLED'
  const past = !cancelled && start.getTime() <= now
  const status = cancelled ? 'Annulé' : past ? 'Passé' : 'Confirmé'
  const statusClass = cancelled ? styles.cancelled : past ? styles.past : styles.booked
  const { firstName, lastName } = appointment.practitioner
  return (
    <li className={styles.card} aria-label={`Rendez-vous du ${fullDateLabel(start)}`}>
      <div className={styles.when}>
        <p className={styles.date}>
          <CalendarCheck size={16} aria-hidden="true" />
          <span>{fullDateLabel(start)}</span>
        </p>
        <p className={styles.meta}>
          <Clock size={13} aria-hidden="true" />
          <span>
            {timeLabel(start)} – {timeLabel(new Date(appointment.endsAt))}
          </span>
        </p>
      </div>
      <div className={styles.where}>
        <p className={styles.meta}>
          <Stethoscope size={13} aria-hidden="true" />
          <span>
            Dr {firstName} {lastName}
          </span>
        </p>
        <p className={styles.meta}>
          <Building2 size={13} aria-hidden="true" />
          <span>{appointment.clinic.name}</span>
        </p>
      </div>
      <span className={`${styles.status} ${statusClass}`}>{status}</span>
      {!cancelled && !past && (
        <div className={styles.actions}>
          <Link className={styles.linkButton} to={`${paths.patient.slots}?reporter=${appointment.id}`}>
            Reporter
          </Link>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      )}
    </li>
  )
}
