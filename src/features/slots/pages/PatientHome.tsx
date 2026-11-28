import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Clock,
  FileText,
  Hourglass,
  MapPin,
  MessageSquare,
  Repeat,
  X,
} from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { cancelAppointment, fetchMyAppointments } from '../api'
import { daysUntil, toComeOf } from '../appointments'
import { Dialog, DialogActions, FieldError, Summary } from '../components/Dialog'
import type { Appointment } from '../types'
import { dayLabel, fullDateLabel, timeLabel } from '../week'
import styles from './PatientHome.module.css'

/** The API's largest page: the appointments to come are the latest ones, so they are on this first page. */
const PAGE_SIZE = 50

const SHORT_WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const SHORT_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

type Load = { status: 'loading' } | { status: 'ready'; items: Appointment[] } | { status: 'error'; message: string }

/** "demain à 08:00", "le vendredi 13 novembre à 09:00" */
function nextSentence(start: Date, now: number) {
  const days = daysUntil(start, now)
  const day = days <= 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `le ${dayLabel(start)}`
  return `${day} à ${timeLabel(start)}`
}

/** "Aujourd’hui", "Demain", "Dans 2 jours" */
function soonBadge(start: Date, now: number) {
  const days = daysUntil(start, now)
  if (days <= 0) return 'Aujourd’hui'
  return days === 1 ? 'Demain' : `Dans ${days} jours`
}

/**
 * The patient's home (Stitch design): the greeting with today's date and when the next appointment is, the two quick
 * actions (book, my appointments), the next appointment with "Reporter" and "Annuler", then what is not built yet.
 * Only the patient's own appointments from the API: no fake document, message or figure.
 */
export default function PatientHome({ firstName }: { firstName?: string }) {
  // Read once: "now" does not move while the page is open
  const [now] = useState(() => Date.now())
  const [reload, setReload] = useState(0)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [toCancel, setToCancel] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const ids = useId()

  useEffect(() => {
    let current = true
    fetchMyAppointments(0, PAGE_SIZE).then(
      (page) => current && setLoad({ status: 'ready', items: page.items }),
      (error) => current && setLoad({ status: 'error', message: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [reload])

  async function confirmCancel() {
    if (!toCancel) return
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelAppointment(toCancel.id)
      setToCancel(null)
      setNotice('Votre rendez-vous est annulé. Le créneau est de nouveau proposé aux autres patients.')
      setReload((n) => n + 1)
    } catch (error) {
      setCancelError(messageFor(error))
    } finally {
      setCancelling(false)
    }
  }

  const toCome = load.status === 'ready' ? toComeOf(load.items, now) : []
  const [next, after] = toCome
  const nextStart = next ? new Date(next.startsAt) : null

  return (
    <div className={styles.home} data-width="wide">
      <section className={styles.hello} aria-labelledby={`${ids}-hello`}>
        <div>
          <p className={styles.today}>
            <CalendarDays size={14} aria-hidden="true" />
            <span>{fullDateLabel(new Date(now))}</span>
          </p>
          <h2 id={`${ids}-hello`} className={styles.title}>
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h2>
          {load.status === 'ready' && (
            <p className={styles.sentence}>
              {nextStart ? (
                <>
                  Votre prochain rendez-vous est <strong>{nextSentence(nextStart, now)}</strong>.
                </>
              ) : (
                'Vous n’avez pas de rendez-vous prévu.'
              )}
            </p>
          )}
        </div>
        <div className={styles.quick}>
          <Link to={paths.patient.slots} className={styles.book}>
            <CalendarPlus size={18} aria-hidden="true" />
            Prendre rendez-vous
          </Link>
          <Link to={paths.patient.appointments} className={styles.mine}>
            <CalendarCheck size={18} aria-hidden="true" />
            Mes rendez-vous
            {toCome.length > 0 && <span className={styles.mineCount}>{toCome.length} à venir</span>}
          </Link>
        </div>
      </section>

      {notice && <Alert tone="success">{notice}</Alert>}

      <div className={styles.row}>
        <section className={styles.card} aria-labelledby={`${ids}-next`}>
          <div className={styles.cardHead}>
            <h3 id={`${ids}-next`} className={styles.cardTitle}>
              Prochain rendez-vous
            </h3>
            <Link to={paths.patient.appointments} className={styles.all}>
              Voir tous mes rendez-vous
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {load.status === 'loading' && <Skeleton lines={3} label="Chargement de vos rendez-vous…" />}
          {load.status === 'error' && <><Alert tone="error">{load.message}</Alert><Button variant="secondary" onClick={() => { setLoad({ status: 'loading' }); setReload(n => n + 1) }}>Réessayer</Button></>}
          {load.status === 'ready' && !next && <p className={styles.none}>Aucun rendez-vous à venir.</p>}
          {next && nextStart && (
            <>
              <div className={styles.next}>
                {/* The date is said in full on the line below: the tile is for the eye */}
                <span className={styles.tile} aria-hidden="true">
                  <small>{SHORT_WEEKDAY.format(nextStart)}</small>
                  <b>{nextStart.getDate()}</b>
                  <span>{SHORT_MONTH.format(nextStart)}</span>
                </span>
                <div className={styles.nextText}>
                  <span className={styles.badge}>
                    <Hourglass size={12} aria-hidden="true" />
                    {soonBadge(nextStart, now)}
                  </span>
                  <p className={styles.who}>
                    Dr {next.practitioner.firstName} {next.practitioner.lastName}
                  </p>
                  <p className={styles.when}>
                    <Clock size={14} aria-hidden="true" />
                    <span className={styles.capitalize}>{fullDateLabel(nextStart)}</span> ·{' '}
                    <span>
                      {timeLabel(nextStart)} – {timeLabel(new Date(next.endsAt))}
                    </span>
                  </p>
                  <span className={styles.clinic}>
                    <MapPin size={12} aria-hidden="true" />
                    <span>{next.clinic.name}</span>
                  </span>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.move} to={`${paths.patient.slots}?reporter=${next.id}`}>
                    <Repeat size={14} aria-hidden="true" />
                    Reporter
                  </Link>
                  <button
                    type="button"
                    className={styles.cancel}
                    onClick={() => {
                      setNotice(null)
                      setCancelError(null)
                      setToCancel(next)
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                    Annuler
                  </button>
                </div>
              </div>
              {after && (
                <p className={styles.then}>
                  <span>
                    Ensuite : <strong>{dayLabel(new Date(after.startsAt))} · {timeLabel(new Date(after.startsAt))}</strong> avec Dr{' '}
                    {after.practitioner.firstName} {after.practitioner.lastName}, {after.clinic.name}
                  </span>
                  {toCome.length > 2 && (
                    <span className={styles.more}>
                      + {toCome.length - 2} autre{toCome.length - 2 > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              )}
            </>
          )}
        </section>

        <div className={styles.side}>
          <Part
            icon={<FileText size={20} aria-hidden="true" />}
            title="Comptes-rendus"
            text="Les comptes-rendus de vos consultations"
            link={{ to: paths.patient.reports, label: 'Voir mes comptes-rendus' }}
          />
          <Part icon={<FileText size={20} aria-hidden="true" />} title="Mes résultats" text="Les résultats transmis par vos praticiens" link={{ to: paths.patient.results, label: 'Consulter mes résultats' }} />
          <Part icon={<FileText size={20} aria-hidden="true" />} title="Mes documents" text="Vos documents médicaux disponibles" link={{ to: paths.patient.documents, label: 'Ouvrir mes documents' }} />
          <Soon icon={<MessageSquare size={20} aria-hidden="true" />} title="Messages" text="Vos échanges avec vos soignants" />
          <aside className={styles.help} aria-label="Un empêchement ?">
            <strong>Un empêchement ?</strong>
            Reportez ou annulez vous-même jusqu’à 12 heures avant le rendez-vous : le créneau est aussitôt proposé à un
            autre patient.
          </aside>
        </div>
      </div>

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

/** A part of the space with its page (MLink-32 follow-up: the consultation reports). */
function Part({ icon, title, text, link }: { icon: ReactNode; title: string; text: string; link: { to: string; label: string } }) {
  const id = useId()
  return (
    <section className={styles.soon} aria-labelledby={id}>
      <span className={styles.soonIcon}>{icon}</span>
      <div className={styles.soonText}>
        <h3 id={id} className={styles.soonTitle}>
          {title}
        </h3>
        <span>{text}</span>
      </div>
      <Link to={link.to} className={styles.partLink}>
        {link.label}
      </Link>
    </section>
  )
}

/** A part that is not built yet: said plainly, with no link to a page that does not exist. */
function Soon({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  const id = useId()
  return (
    <section className={styles.soon} aria-labelledby={id}>
      <span className={styles.soonIcon}>{icon}</span>
      <div className={styles.soonText}>
        <h3 id={id} className={styles.soonTitle}>
          {title}
        </h3>
        <span>{text}</span>
      </div>
      <span className={styles.pill}>Bientôt disponible</span>
    </section>
  )
}
