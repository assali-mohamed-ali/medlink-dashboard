import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Building2, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, Stethoscope } from 'lucide-react'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { Alert, Button, Spinner } from '@/shared/ui'
import { bookSlot, fetchSlotFilters, searchSlots } from '../api'
import type { Appointment, Slot, SlotFilters } from '../types'
import {
  DAYS_SHOWN,
  addDays,
  dayLabel,
  fullDateLabel,
  monthGrid,
  monthLabel,
  sameDay,
  shortDayLabel,
  startOfWeek,
  timeLabel,
  weekPeriod,
  weekTitle,
} from '../week'
import styles from './SlotSearchPage.module.css'

/** The API gives 50 slots at most per call: a week is read page by page, up to this many pages. */
const PAGE_SIZE = 50
const MAX_PAGES = 10
const FIELDS = ['from', 'to', 'clinicId', 'specialtyId', 'practitionerId'] as const
type Field = (typeof FIELDS)[number]

/** Cards are tinted by specialty, from the team's tokens only (Stitch "Prendre un rendez-vous"). */
const TINTS = [styles.tintA, styles.tintB, styles.tintC]

type Result = { slots: Slot[]; total: number; message?: string }

/**
 * MLink-101: a patient finds a free slot without calling the clinic. Filters on the left (month calendar, clinic,
 * specialty, practitioner), the week on the right, one column per day. MLink-105: a slot is booked from its card,
 * after a confirmation, and a confirmation screen follows.
 */
export default function SlotSearchPage() {
  // Read once: "today" does not move while the page is open
  const [today] = useState(() => new Date())
  const [monday, setMonday] = useState(() => startOfWeek(today).getTime())
  const [month, setMonth] = useState(() => new Date(monday))
  const [clinicId, setClinicId] = useState<string>()
  const [specialtyId, setSpecialtyId] = useState<string>()
  const [practitionerId, setPractitionerId] = useState<string>()
  const [filters, setFilters] = useState<SlotFilters>({ clinics: [], specialties: [], practitioners: [] })
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  /** Bumped to read the week again (after a booking, or when a slot turned out taken). */
  const [reload, setReload] = useState(0)
  /** The slot being confirmed, then the booked appointment (MLink-105). */
  const [choice, setChoice] = useState<Slot | null>(null)
  const [booked, setBooked] = useState<Appointment | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const ids = useId()

  useEffect(() => {
    fetchSlotFilters()
      .then(setFilters)
      .catch((e: unknown) => setError(messageFor(e)))
  }, [])

  useEffect(() => {
    let current = true
    const search = {
      ...weekPeriod(new Date(monday)),
      ...(clinicId && { clinicId }),
      ...(specialtyId && { specialtyId }),
      ...(practitionerId && { practitionerId }),
    }
    async function load() {
      setLoading(true)
      setError(null)
      setErrors({})
      try {
        const first = await searchSlots({ ...search, page: 0, size: PAGE_SIZE })
        let slots = first.items
        const pages = Math.min(Math.ceil(first.total / PAGE_SIZE), MAX_PAGES)
        for (let page = 1; page < pages && current; page++) {
          slots = slots.concat((await searchSlots({ ...search, page, size: PAGE_SIZE })).items)
        }
        if (current) setResult({ slots, total: first.total, message: first.message })
      } catch (e) {
        if (!current) return
        setResult(null)
        const byField = e instanceof ApiError ? fieldErrors(e.details, FIELDS) : {}
        setErrors(byField)
        setError(Object.keys(byField).length ? null : messageFor(e))
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => {
      current = false
    }
  }, [monday, clinicId, specialtyId, practitionerId, reload])

  function choose(slot: Slot) {
    setNotice(null)
    setBookingError(null)
    setChoice(slot)
  }

  async function confirmBooking() {
    if (!choice) return
    setBooking(true)
    setBookingError(null)
    try {
      setBooked(await bookSlot(choice.slotId))
      setChoice(null)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SLOT_TAKEN') {
        // Someone was quicker: say so on the page and show the week as it is now
        setChoice(null)
        setNotice(messageFor(e))
        setReload((n) => n + 1)
      } else {
        setBookingError(messageFor(e))
      }
    } finally {
      setBooking(false)
    }
  }

  function backToSlots() {
    setBooked(null)
    setReload((n) => n + 1)
  }

  /** The practitioners of the chosen clinic and specialty: the list never offers an impossible choice. */
  const practitioners = useMemo(
    () =>
      filters.practitioners.filter(
        (p) => (!clinicId || p.clinicIds.includes(clinicId)) && (!specialtyId || p.specialtyId === specialtyId),
      ),
    [filters, clinicId, specialtyId],
  )

  function showWeekOf(date: Date) {
    const start = startOfWeek(date)
    setMonday(start.getTime())
    setMonth(start)
  }

  function chooseClinic(id: string | undefined) {
    setClinicId(id)
    const kept = filters.practitioners.find((p) => p.id === practitionerId)
    if (kept && id && !kept.clinicIds.includes(id)) setPractitionerId(undefined)
  }

  function chooseSpecialty(id: string | undefined) {
    setSpecialtyId(id)
    const kept = filters.practitioners.find((p) => p.id === practitionerId)
    if (kept && id && kept.specialtyId !== id) setPractitionerId(undefined)
  }

  const week = new Date(monday)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(week, i))
  const tintOf = (specialty: string) =>
    TINTS[Math.max(0, filters.specialties.findIndex((s) => s.name === specialty)) % TINTS.length]
  const periodError = errors.from ?? errors.to

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          <CalendarDays size={14} aria-hidden="true" /> Planification réseau MedLink
        </p>
        <h2 className={styles.title}>Prendre un rendez-vous</h2>
        <p className={styles.lead}>Trouvez un créneau libre dans nos trois cliniques, sans appeler le standard.</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.filters} aria-label="Filtres de la recherche">
          <section className={styles.panel} aria-label="Calendrier">
            <div className={styles.monthBar}>
              <span className={styles.monthName}>{monthLabel(month)}</span>
              <span className={styles.monthNav}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Mois précédent"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Mois suivant"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </span>
            </div>
            <div className={styles.calendar}>
              {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
                <span key={d} className={styles.calendarHead} aria-hidden="true">
                  {d}
                </span>
              ))}
              {monthGrid(month).map((day) => {
                const inWeek = day >= week && day < addDays(week, DAYS_SHOWN)
                const classes = [
                  styles.calendarDay,
                  day.getMonth() !== month.getMonth() && styles.otherMonth,
                  inWeek && styles.inWeek,
                  sameDay(day, today) && styles.today,
                ]
                return (
                  <button
                    key={day.getTime()}
                    type="button"
                    className={classes.filter(Boolean).join(' ')}
                    aria-label={fullDateLabel(day)}
                    aria-pressed={inWeek}
                    onClick={() => showWeekOf(day)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </section>

          <section className={styles.panel}>
            <div role="group" aria-labelledby={`${ids}-clinic`}>
              <p id={`${ids}-clinic`} className={styles.label}>
                Clinique
              </p>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-pressed={!clinicId}
                  onClick={() => chooseClinic(undefined)}
                >
                  Toutes
                </button>
                {filters.clinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    type="button"
                    className={styles.chip}
                    aria-pressed={clinicId === clinic.id}
                    title={clinic.name}
                    onClick={() => chooseClinic(clinic.id)}
                  >
                    {clinic.city}
                  </button>
                ))}
              </div>
              {errors.clinicId && <FieldError message={errors.clinicId} />}
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Spécialité</legend>
              <label className={styles.option}>
                <input
                  type="radio"
                  name={`${ids}-specialty`}
                  checked={!specialtyId}
                  onChange={() => chooseSpecialty(undefined)}
                />
                Toutes les spécialités
              </label>
              {filters.specialties.map((specialty) => (
                <label key={specialty.id} className={styles.option}>
                  <input
                    type="radio"
                    name={`${ids}-specialty`}
                    checked={specialtyId === specialty.id}
                    onChange={() => chooseSpecialty(specialty.id)}
                  />
                  {specialty.name}
                </label>
              ))}
              {errors.specialtyId && <FieldError message={errors.specialtyId} />}
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-practitioner`}>
                Praticien
              </label>
              <select
                id={`${ids}-practitioner`}
                className={styles.select}
                value={practitionerId ?? ''}
                onChange={(e) => setPractitionerId(e.target.value || undefined)}
              >
                <option value="">Tous les praticiens</option>
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    Dr {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
              {errors.practitionerId && <FieldError message={errors.practitionerId} />}
            </div>
          </section>
        </aside>

        <section className={styles.board} aria-labelledby={`${ids}-week`}>
          <div className={styles.boardBar}>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine précédente"
                onClick={() => showWeekOf(addDays(week, -7))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine suivante"
                onClick={() => showWeekOf(addDays(week, 7))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.weekText}>
              <h3 id={`${ids}-week`} className={styles.weekTitle}>
                {weekTitle(week)}
              </h3>
              {result && result.total > 0 && (
                <p className={styles.count}>
                  {result.total} {result.total > 1 ? 'créneaux libres' : 'créneau libre'}
                </p>
              )}
            </div>
            <Button variant="secondary" onClick={() => showWeekOf(today)}>
              Aujourd’hui
            </Button>
          </div>

          {periodError && <FieldError message={periodError} />}
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="error">{notice}</Alert>}
          {loading && (
            <div className={styles.loading}>
              <Spinner label="Recherche des créneaux…" />
            </div>
          )}

          {!loading && result && result.total === 0 && (
            <div className={styles.empty}>
              <CalendarDays size={28} aria-hidden="true" />
              <p>{result.message ?? 'Aucun créneau disponible cette semaine.'}</p>
            </div>
          )}

          {!loading && result && result.total > 0 && (
            <div className={styles.week}>
              {days.map((day) => {
                const slots = result.slots
                  .filter((s) => sameDay(new Date(s.startsAt), day))
                  .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                return (
                  <section key={day.getTime()} className={styles.day} aria-label={dayLabel(day)}>
                    <p className={sameDay(day, today) ? `${styles.dayHead} ${styles.dayToday}` : styles.dayHead}>
                      <span className={styles.dayName}>{shortDayLabel(day)}</span>
                      <span className={styles.dayNumber}>{day.getDate()}</span>
                    </p>
                    {slots.length === 0 && <p className={styles.dayEmpty}>—</p>}
                    {slots.map((s) => (
                      <SlotCard key={s.slotId} slot={s} tint={tintOf(s.specialty)} onChoose={() => choose(s)} />
                    ))}
                  </section>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {choice && (
        <Dialog title="Confirmer ce rendez-vous ?" onClose={booking ? undefined : () => setChoice(null)}>
          <Summary
            start={choice.startsAt}
            end={choice.endsAt}
            who={`Dr ${choice.practitioner.firstName} ${choice.practitioner.lastName} · ${choice.specialty}`}
            clinic={choice.clinic.name}
          />
          {bookingError && <FieldError message={bookingError} />}
          <div className={styles.dialogActions}>
            <Button variant="secondary" onClick={() => setChoice(null)} disabled={booking}>
              Annuler
            </Button>
            <Button onClick={confirmBooking} loading={booking} autoFocus>
              Confirmer
            </Button>
          </div>
        </Dialog>
      )}

      {booked && (
        <Dialog title="Rendez-vous confirmé" onClose={backToSlots}>
          <p className={styles.confirmed}>
            <CalendarCheck size={20} aria-hidden="true" /> Votre rendez-vous est enregistré.
          </p>
          <Summary
            start={booked.startsAt}
            end={booked.endsAt}
            who={`Dr ${booked.practitioner.firstName} ${booked.practitioner.lastName}`}
            clinic={booked.clinic.name}
          />
          <div className={styles.dialogActions}>
            <Button onClick={backToSlots} autoFocus>
              Retour aux créneaux
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function SlotCard({ slot, tint, onChoose }: { slot: Slot; tint: string; onChoose: () => void }) {
  const { firstName, lastName } = slot.practitioner
  return (
    <article className={`${styles.slot} ${tint}`}>
      <p className={styles.slotTime}>
        <Clock size={13} aria-hidden="true" />
        <span>
          {timeLabel(new Date(slot.startsAt))} – {timeLabel(new Date(slot.endsAt))}
        </span>
      </p>
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {firstName.charAt(0)}
          {lastName.charAt(0)}
        </span>
        <div>
          <p className={styles.name}>
            Dr {firstName} {lastName}
          </p>
          <p className={styles.meta}>
            <Stethoscope size={12} aria-hidden="true" />
            <span>{slot.specialty}</span>
          </p>
        </div>
      </div>
      <p className={styles.meta}>
        <Building2 size={12} aria-hidden="true" />
        <span>{slot.clinic.name}</span>
      </p>
      <Button className={styles.choose} onClick={onChoose} fullWidth>
        Choisir ce créneau
      </Button>
    </article>
  )
}

/** A modal box over the page (MLink-105): named by its title, Escape closes it unless a request runs. */
function Dialog({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const titleId = useId()
  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.()
        }}
      >
        <h3 id={titleId} className={styles.dialogTitle}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

/** Where, with whom and when: the same four lines on the confirmation and on the booked screen. */
function Summary({ start, end, who, clinic }: { start: string; end: string; who: string; clinic: string }) {
  return (
    <dl className={styles.summary}>
      <dt>Date</dt>
      <dd>{fullDateLabel(new Date(start))}</dd>
      <dt>Heure</dt>
      <dd>
        {timeLabel(new Date(start))} – {timeLabel(new Date(end))}
      </dd>
      <dt>Praticien</dt>
      <dd>{who}</dd>
      <dt>Clinique</dt>
      <dd>{clinic}</dd>
    </dl>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className={styles.fieldError}>
      {message}
    </p>
  )
}
