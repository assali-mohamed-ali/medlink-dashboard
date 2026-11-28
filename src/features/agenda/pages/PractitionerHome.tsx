import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  Clock,
  FolderOpen,
  Hourglass,
  MapPin,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { onNewAlerts } from '@/shared/lib/alertEvents'
import { Alert, Skeleton } from '@/shared/ui'
import { fetchAgenda } from '../api'
import { shortName, toneOf } from '../clinicTones'
import type { Agenda, AgendaItem } from '../types'
import { mondayOf, timeLabel, tunisDay, weekPeriod } from '../week'
import styles from './PractitionerHome.module.css'

type Load = { status: 'loading' } | { status: 'ready'; agenda: Agenda } | { status: 'error'; message: string }

const FULL_DATE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Tunis',
})

/** A slot held by a patient (a cancelled appointment leaves the slot free: 37.7). */
const isBooked = (item: AgendaItem) => item.status === 'BOOKED' && item.appointment?.status === 'BOOKED'
const cancelledOf = (item: AgendaItem) =>
  item.appointment?.status === 'CANCELLED' ? item.appointment.patient : undefined
const span = (item: AgendaItem) => `${timeLabel(item.startsAt)} – ${timeLabel(item.endsAt)}`
const fullName = (patient: { firstName: string; lastName: string }) => `${patient.firstName} ${patient.lastName}`

/** "dans 20 min", "dans 1 h", "dans 2 h 15" */
function soon(startsAt: string, now: number) {
  const minutes = Math.max(0, Math.ceil((Date.parse(startsAt) - now) / 60_000))
  if (minutes < 60) return `dans ${minutes} min`
  const rest = minutes % 60
  return `dans ${Math.floor(minutes / 60)} h${rest ? ` ${String(rest).padStart(2, '0')}` : ''}`
}

/** What a screen reader hears for a slot of the day. */
function rowLabel(item: AgendaItem) {
  const cancelled = cancelledOf(item)
  if (isBooked(item)) return `${span(item)}, ${fullName(item.appointment!.patient)}, confirmé`
  if (cancelled) return `${span(item)}, rendez-vous de ${fullName(cancelled)} annulé, créneau de nouveau libre`
  return `${span(item)}, ${item.status === 'CLOSED' ? 'créneau fermé' : 'créneau disponible'}`
}

/**
 * The practitioner's home (Stitch design, like the patient's): the day at a glance from this week's agenda, the next
 * consultation first with its record, the rest of the day, the counts of the week and the patients of the day. Only
 * the API's agenda (MLink-26), read again when the bell sees a cancellation (37.7): no fake message or figure.
 */
export default function PractitionerHome({ firstName }: { firstName?: string }) {
  // Read once: "now" does not move while the page is open
  const [now] = useState(() => Date.now())
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const ids = useId()
  const today = tunisDay(new Date(now))

  useEffect(() => onNewAlerts(() => setAttempt((n) => n + 1)), [])

  useEffect(() => {
    let current = true
    const { from, to } = weekPeriod(mondayOf(today))
    fetchAgenda(from, to).then(
      (agenda) => current && setLoad({ status: 'ready', agenda }),
      (error) => current && setLoad({ status: 'error', message: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [today, attempt])

  const agenda = load.status === 'ready' ? load.agenda : null
  const week = agenda?.items ?? []
  const day = week
    .filter((item) => tunisDay(item.startsAt) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const consultations = day.filter(isBooked)
  const next = consultations.find((item) => Date.parse(item.startsAt) > now)
  const rest = day.filter((item) => item !== next)
  const tones = toneOf(agenda?.clinics ?? [])
  const bookedWeek = week.filter((item) => item.status === 'BOOKED').length
  const openWeek = week.filter((item) => item.status === 'OPEN').length
  const rate = bookedWeek + openWeek === 0 ? 0 : Math.round((bookedWeek / (bookedWeek + openWeek)) * 100)
  const patients = consultations.filter(
    (item, index) => consultations.findIndex((other) => other.appointment!.patient.id === item.appointment!.patient.id) === index,
  )

  return (
    <div className={styles.home} data-width="wide">
      <section className={styles.hello} aria-labelledby={`${ids}-hello`}>
        <div>
          <p className={styles.today}>
            <CalendarDays size={14} aria-hidden="true" />
            <span>{FULL_DATE.format(new Date(now))}</span>
          </p>
          <h2 id={`${ids}-hello`} className={styles.title}>
            Bonjour{firstName ? ` ${firstName}` : ''}
          </h2>
          {agenda && (
            <p className={styles.sentence}>
              {consultations.length === 0 ? (
                'Aucune consultation aujourd’hui.'
              ) : (
                <>
                  Vous avez{' '}
                  <strong>
                    {consultations.length} consultation{consultations.length > 1 ? 's' : ''} aujourd’hui
                  </strong>
                  {next ? (
                    <>
                      , la prochaine à <strong>{timeLabel(next.startsAt)}</strong>.
                    </>
                  ) : (
                    ', toutes passées.'
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <div className={styles.quick}>
          <Link to={paths.practitioner.agenda} className={styles.add}>
            <CalendarDays size={18} aria-hidden="true" />
            Ouvrir l’agenda
          </Link>
          <Link to={`${paths.practitioner.agenda}?ajouter`} className={styles.open}>
            <CalendarPlus size={18} aria-hidden="true" />
            Ajouter un créneau
          </Link>
        </div>
      </section>

      {agenda && (
        <ul className={styles.counts} aria-label="Cette semaine">
          <Count icon={<CalendarCheck size={20} aria-hidden="true" />} tint={styles.mint} n={String(bookedWeek)} label="Rendez-vous cette semaine" />
          <Count icon={<Plus size={20} aria-hidden="true" />} tint={styles.lavender} n={String(openWeek)} label="Créneaux libres" />
          <Count icon={<ChartColumn size={20} aria-hidden="true" />} tint={styles.cream} n={`${rate} %`} label="Occupation de la semaine">
            <span className={styles.bar} aria-hidden="true">
              <span style={{ width: `${rate}%` }} />
            </span>
          </Count>
        </ul>
      )}

      <div className={styles.row}>
        <section className={styles.card} aria-labelledby={`${ids}-day`}>
          <div className={styles.cardHead}>
            <div className={styles.titleRow}>
              <h3 id={`${ids}-day`} className={styles.cardTitle}>
                Aujourd’hui
              </h3>
              {agenda && (
                <span className={styles.cardCount}>
                  {day.length} créneau{day.length > 1 ? 'x' : ''}
                </span>
              )}
            </div>
            <Link to={paths.practitioner.agenda} className={styles.all}>
              Voir la semaine
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {load.status === 'loading' && <Skeleton lines={4} label="Chargement de votre journée…" />}
          {load.status === 'error' && <Alert tone="error">{load.message}</Alert>}
          {agenda && day.length === 0 && <p className={styles.none}>Aucun créneau aujourd’hui.</p>}

          {next && (
            <article className={styles.next} data-tone={tones.get(next.clinic.id) ?? 1} aria-label="Prochaine consultation">
              <span className={styles.tile} aria-hidden="true">
                <span>{timeLabel(next.startsAt)}</span>
                <Hourglass size={18} />
                <span>{timeLabel(next.endsAt)}</span>
              </span>
              <div className={styles.nextText}>
                <span className={styles.badge}>
                  <Hourglass size={12} aria-hidden="true" />
                  {`Prochain · ${soon(next.startsAt, now)}`}
                </span>
                <p className={styles.patient}>{fullName(next.appointment!.patient)}</p>
                <p className={styles.when}>
                  <Clock size={14} aria-hidden="true" />
                  <span>{span(next)}</span>
                </p>
                <span className={styles.clinic}>
                  <MapPin size={12} aria-hidden="true" />
                  <span>{next.clinic.name}</span>
                </span>
              </div>
              <RecordLink item={next} className={styles.record}>
                Ouvrir le dossier
              </RecordLink>
            </article>
          )}

          {rest.length > 0 && (
            <>
              {next && <p className={styles.sub}>Le reste de la journée</p>}
              <ul className={styles.lines} aria-label="Le reste de la journée">
                {rest.map((item) => (
                  <DayLine key={item.slotId} item={item} past={Date.parse(item.startsAt) <= now} />
                ))}
              </ul>
            </>
          )}
        </section>

        <div className={styles.side}>
          <section className={styles.card} aria-labelledby={`${ids}-patients`}>
            <h3 id={`${ids}-patients`} className={styles.cardTitle}>
              Patients du jour
            </h3>
            {agenda && patients.length === 0 && <p className={styles.none}>Aucun patient aujourd’hui.</p>}
            {patients.length > 0 && (
              <ul className={styles.patients}>
                {patients.map((item) => {
                  const patient = item.appointment!.patient
                  return (
                    <li key={patient.id} className={styles.patientRow}>
                      <span className={styles.initials} aria-hidden="true">
                        {patient.firstName.charAt(0)}
                        {patient.lastName.charAt(0)}
                      </span>
                      <span className={styles.patientText}>
                        <strong>{fullName(patient)}</strong>
                        <span>
                          {timeLabel(item.startsAt)} · {shortName(item.clinic.name)}
                        </span>
                      </span>
                      <RecordLink item={item} className={styles.recordLink}>
                        Dossier
                      </RecordLink>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby={`${ids}-actions`}>
            <h3 id={`${ids}-actions`} className={styles.cardTitle}>Actions de planning</h3>
            <div className={styles.taskLinks}>
              <Link to={paths.practitioner.patients}>Rechercher un dossier patient <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to={paths.practitioner.absences}>Gérer les absences <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link to={paths.practitioner.reassignments}>Consulter les réaffectations <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </section>
          <section className={styles.soon} aria-labelledby={`${ids}-messages`}>
            <span className={styles.soonIcon}>
              <MessageSquare size={20} aria-hidden="true" />
            </span>
            <div className={styles.soonText}>
              <h3 id={`${ids}-messages`} className={styles.soonTitle}>
                Messages
              </h3>
              <span>Vos échanges avec vos patients et l’équipe</span>
            </div>
            <span className={styles.pill}>Bientôt disponible</span>
          </section>

          <aside className={styles.help} aria-label="Une annulation ?">
            <strong>Une annulation ?</strong>
            La cloche vous prévient, et le créneau libéré s’affiche avec le nom du patient barré dans votre agenda.
          </aside>
        </div>
      </div>
    </div>
  )
}

function Count({ icon, tint, n, label, children }: { icon: ReactNode; tint: string; n: string; label: string; children?: ReactNode }) {
  return (
    <li className={styles.count}>
      <span className={`${styles.countIcon} ${tint}`}>{icon}</span>
      <span className={styles.countText}>
        <b>{n}</b>
        <span>{label}</span>
        {children}
      </span>
    </li>
  )
}

/** MLink-31: the patient's record, from their appointment. */
function RecordLink({ item, className, children }: { item: AgendaItem; className: string; children: ReactNode }) {
  const patient = item.appointment!.patient
  return (
    <Link
      to={`${paths.practitioner.patients}/${encodeURIComponent(patient.id)}`}
      className={className}
      aria-label={`Ouvrir le dossier de ${fullName(patient)}`}
    >
      <FolderOpen size={14} aria-hidden="true" />
      {children}
    </Link>
  )
}

function DayLine({ item, past }: { item: AgendaItem; past: boolean }) {
  const cancelled = cancelledOf(item)
  const booked = isBooked(item)
  const kind = booked ? 'booked' : cancelled ? 'cancelled' : item.status === 'CLOSED' ? 'closed' : 'open'
  return (
    <li className={styles.line} aria-label={rowLabel(item)} data-past={past || undefined}>
      <span className={styles.dot} data-kind={kind} aria-hidden="true" />
      <span className={styles.lineTime} aria-hidden="true">
        {span(item)}
      </span>
      <span className={styles.lineWhat} aria-hidden="true">
        {booked && <strong>{fullName(item.appointment!.patient)}</strong>}
        {cancelled && (
          <>
            <s>{fullName(cancelled)}</s> <em>· rendez-vous annulé, créneau de nouveau libre</em>
          </>
        )}
        {!booked && !cancelled && (item.status === 'CLOSED' ? 'Créneau fermé' : 'Créneau disponible')}
      </span>
      <span className={styles.lineClinic} aria-hidden="true">
        {item.clinic.name}
      </span>
      <span className={styles.status} data-kind={kind} aria-hidden="true">
        {booked ? 'Confirmé' : cancelled ? 'Annulé' : item.status === 'CLOSED' ? 'Fermé' : 'Libre'}
      </span>
      {booked ? (
        <RecordLink item={item} className={styles.recordLink}>
          Dossier
        </RecordLink>
      ) : (
        <span />
      )}
    </li>
  )
}
