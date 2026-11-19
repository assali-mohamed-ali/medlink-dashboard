import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Stethoscope } from 'lucide-react'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Spinner } from '@/shared/ui'
import { bookSlot, fetchSlotFilters, rescheduleAppointment, searchSlots } from '../api'
import { Dialog, DialogActions, DoneLine, FieldError, Summary } from '../components/Dialog'
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

/**
 * The API gives 50 slots at most per call: a week is read page by page, to its last page (review on #18: no cap, a
 * busy week of more than 500 slots is shown whole). An empty page ends the reading, so it never runs away.
 */
const PAGE_SIZE = 50
const FIELDS = ['from', 'to', 'clinicId', 'specialtyId', 'practitionerId'] as const
type Field = (typeof FIELDS)[number]

/** Cards, dots and avatars are tinted by specialty, from the team's tokens only (Stitch "Prendre un rendez-vous"). */
const TINTS = [styles.tintA, styles.tintB, styles.tintC]

/** "2 créneaux libres", "1 créneau libre", "aucun créneau libre" */
function free(n: number) {
  if (n === 0) return 'aucun créneau libre'
  return n === 1 ? '1 créneau libre' : `${n} créneaux libres`
}

/** How many slots of the week shown fall under each key. */
function countBy(slots: Slot[], key: (slot: Slot) => string) {
  const counts = new Map<string, number>()
  for (const slot of slots) counts.set(key(slot), (counts.get(key(slot)) ?? 0) + 1)
  return counts
}

/** A row of the grid: one time range of the week, "09:00 – 09:30", in the patient's local time. */
type Row = { key: string; start: string; end: string }
const rowOf = (slot: Slot): Row => {
  const start = timeLabel(new Date(slot.startsAt))
  const end = timeLabel(new Date(slot.endsAt))
  return { key: `${start}-${end}`, start, end }
}

type Result = { slots: Slot[]; total: number; message?: string }

/**
 * MLink-101: a patient finds a free slot without calling the clinic. Filters on the left (month calendar, clinic,
 * specialty, practitioner), the week on the right: one column per day, one row per time range of the week. MLink-105:
 * a slot is booked from its card, after a confirmation, and a confirmation screen follows. The counts of the filters
 * and of the legend are those of the week shown: a group that is filtered is not counted (its other choices were not
 * searched).
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
  /** MLink-109: "Reporter" from my appointments opens this page with ?reporter=<appointment id>. */
  const [searchParams] = useSearchParams()
  const moving = searchParams.get('reporter')
  const navigate = useNavigate()
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
        for (let page = 1; slots.length < first.total && current; page++) {
          const next = await searchSlots({ ...search, page, size: PAGE_SIZE })
          if (next.items.length === 0) break
          slots = slots.concat(next.items)
        }
        // The count is what the grid holds: never more than the patient can see and book
        if (current) setResult({ slots, total: slots.length, message: first.message })
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
      setBooked(await (moving ? rescheduleAppointment(moving, choice.slotId) : bookSlot(choice.slotId)))
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
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tintOf = (specialty: string | undefined) =>
    TINTS[Math.max(0, filters.specialties.findIndex((s) => s.name === specialty)) % TINTS.length]
  const periodError = errors.from ?? errors.to

  const slots = useMemo(() => result?.slots ?? [], [result])
  const bySpecialty = useMemo(() => countBy(slots, (s) => s.specialty), [slots])
  const byClinic = useMemo(() => countBy(slots, (s) => s.clinic.id), [slots])
  const byPractitioner = useMemo(() => countBy(slots, (s) => s.practitioner.id), [slots])
  const rows = useMemo(() => {
    const unique = new Map(slots.map((s) => [rowOf(s).key, rowOf(s)]))
    return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key))
  }, [slots])
  /** Counts only once the week is read, and never for the group that is filtered. */
  const counted = result !== null && !loading
  const specialtyName = (id: string) => filters.specialties.find((s) => s.id === id)?.name

  return (
    <div className={styles.page} data-width="wide">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          <CalendarDays size={14} aria-hidden="true" /> Planification réseau MedLink
        </p>
        <h2 className={styles.title}>Prendre un rendez-vous</h2>
        <p className={styles.lead}>Trouvez un créneau libre dans nos trois cliniques, sans appeler le standard.</p>
        {moving && (
          <Alert tone="info">
            Report d’un rendez-vous : choisissez le nouveau créneau. L’ancien est libéré seulement si le nouveau est
            confirmé.
          </Alert>
        )}
      </header>

      <div className={styles.layout}>
        <aside className={styles.filters} aria-label="Filtres de la recherche">
          <Link to={paths.patient.appointments} className={styles.mine}>
            <CalendarCheck size={18} aria-hidden="true" />
            Mes rendez-vous
          </Link>

          <section className={styles.month} aria-label="Calendrier">
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

          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Spécialité</legend>
            <Choice
              group={`${ids}-specialty`}
              label="Toutes les spécialités"
              count={counted && !specialtyId ? slots.length : undefined}
              checked={!specialtyId}
              onChange={() => chooseSpecialty(undefined)}
            />
            {filters.specialties.map((specialty) => (
              <Choice
                key={specialty.id}
                group={`${ids}-specialty`}
                label={specialty.name}
                tint={tintOf(specialty.name)}
                count={counted && !specialtyId ? (bySpecialty.get(specialty.name) ?? 0) : undefined}
                checked={specialtyId === specialty.id}
                onChange={() => chooseSpecialty(specialty.id)}
              />
            ))}
            {errors.specialtyId && <FieldError message={errors.specialtyId} />}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Clinique</legend>
            <Choice
              group={`${ids}-clinic`}
              label="Toutes les cliniques"
              detail={filters.clinics.map((c) => c.city).join(', ')}
              checked={!clinicId}
              onChange={() => chooseClinic(undefined)}
            />
            {filters.clinics.map((clinic) => (
              <Choice
                key={clinic.id}
                group={`${ids}-clinic`}
                label={clinic.city}
                detail={clinic.name}
                count={counted && !clinicId ? (byClinic.get(clinic.id) ?? 0) : undefined}
                checked={clinicId === clinic.id}
                onChange={() => chooseClinic(clinic.id)}
              />
            ))}
            {errors.clinicId && <FieldError message={errors.clinicId} />}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>Praticien</legend>
            <Choice
              group={`${ids}-practitioner`}
              label="Tous les praticiens"
              checked={!practitionerId}
              onChange={() => setPractitionerId(undefined)}
            />
            {practitioners.map((p) => (
              <Choice
                key={p.id}
                group={`${ids}-practitioner`}
                label={`Dr ${p.firstName} ${p.lastName}`}
                initials={`${p.firstName.charAt(0)}${p.lastName.charAt(0)}`}
                tint={tintOf(specialtyName(p.specialtyId))}
                detail={specialtyName(p.specialtyId)}
                count={counted && !practitionerId ? (byPractitioner.get(p.id) ?? 0) : undefined}
                checked={practitionerId === p.id}
                onChange={() => setPractitionerId(p.id)}
              />
            ))}
            {errors.practitionerId && <FieldError message={errors.practitionerId} />}
          </fieldset>
        </aside>

        <section className={styles.board} aria-labelledby={`${ids}-week`}>
          <div className={styles.boardBar}>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.arrow}
                aria-label="Semaine précédente"
                onClick={() => showWeekOf(addDays(week, -7))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.arrow}
                aria-label="Semaine suivante"
                onClick={() => showWeekOf(addDays(week, 7))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.weekText}>
              <div className={styles.weekTitleRow}>
                <h3 id={`${ids}-week`} className={styles.weekTitle}>
                  {weekTitle(week)}
                </h3>
                <button type="button" className={styles.todayButton} onClick={() => showWeekOf(today)}>
                  Aujourd’hui
                </button>
              </div>
              {result && result.total > 0 && (
                <p className={styles.count}>
                  Réseau MedLink · <span>{free(result.total)}</span>
                </p>
              )}
            </div>
            <span className={styles.zone}>
              <Clock size={14} aria-hidden="true" /> Heure locale
            </span>
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
            <>
              <div className={styles.scroller}>
                <div className={styles.grid}>
                  {/* The times repeat what each card says: for the eye only */}
                  <div className={styles.times} style={{ gridRow: `1 / span ${rows.length + 1}` }} aria-hidden="true">
                    <span className={styles.timesHead}>Horaires</span>
                    {rows.map((row) => (
                      <span key={row.key} className={styles.time}>
                        {row.start} — {row.end}
                      </span>
                    ))}
                  </div>
                  {days.map((day) => {
                    const ofDay = slots
                      .filter((s) => sameDay(new Date(s.startsAt), day))
                      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                    return (
                      <section
                        key={day.getTime()}
                        className={styles.day}
                        style={{ gridRow: `1 / span ${rows.length + 1}` }}
                        aria-label={dayLabel(day)}
                        data-past={day < todayStart || undefined}
                      >
                        <p className={sameDay(day, today) ? `${styles.dayHead} ${styles.dayToday}` : styles.dayHead}>
                          <span className={styles.dayName}>{shortDayLabel(day)}</span>
                          <span className={styles.dayNumber}>{day.getDate()}</span>
                        </p>
                        {rows.map((row) => {
                          const here = ofDay.filter((s) => rowOf(s).key === row.key)
                          return (
                            <div key={row.key} className={styles.cell}>
                              {here.length === 0 ? (
                                <span className={styles.none} aria-hidden="true">
                                  —
                                </span>
                              ) : (
                                here.map((s) => (
                                  <SlotCard key={s.slotId} slot={s} tint={tintOf(s.specialty)} onChoose={() => choose(s)} />
                                ))
                              )}
                            </div>
                          )
                        })}
                      </section>
                    )
                  })}
                </div>
              </div>

              <div className={styles.legendBar}>
                <ul className={styles.legend} aria-label="Légende des spécialités">
                  {filters.specialties
                    .filter((s) => !specialtyId || s.id === specialtyId)
                    .map((s) => (
                      <li key={s.id}>
                        <span className={`${styles.dot} ${tintOf(s.name)}`} aria-hidden="true" />
                        {s.name} ({bySpecialty.get(s.name) ?? 0})
                      </li>
                    ))}
                </ul>
                <p className={styles.hint}>
                  <Check size={16} aria-hidden="true" /> Réservation en deux clics, confirmée tout de suite
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      {choice && (
        <Dialog
          title={moving ? 'Confirmer le report ?' : 'Confirmer ce rendez-vous ?'}
          onClose={booking ? undefined : () => setChoice(null)}
        >
          <Summary
            start={choice.startsAt}
            end={choice.endsAt}
            who={`Dr ${choice.practitioner.firstName} ${choice.practitioner.lastName} · ${choice.specialty}`}
            clinic={choice.clinic.name}
          />
          {bookingError && <FieldError message={bookingError} />}
          <DialogActions>
            <Button variant="secondary" onClick={() => setChoice(null)} disabled={booking}>
              Annuler
            </Button>
            <Button onClick={confirmBooking} loading={booking} autoFocus>
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {booked && (
        <Dialog title={moving ? 'Rendez-vous reporté' : 'Rendez-vous confirmé'} onClose={backToSlots}>
          <DoneLine icon={<CalendarCheck size={20} aria-hidden="true" />}>
            {moving ? 'Votre rendez-vous est déplacé.' : 'Votre rendez-vous est enregistré.'}
          </DoneLine>
          <Summary
            start={booked.startsAt}
            end={booked.endsAt}
            who={`Dr ${booked.practitioner.firstName} ${booked.practitioner.lastName}`}
            clinic={booked.clinic.name}
          />
          <DialogActions>
            {moving ? (
              <Button onClick={() => navigate(paths.patient.appointments)} autoFocus>
                Voir mes rendez-vous
              </Button>
            ) : (
              <Button onClick={backToSlots} autoFocus>
                Retour aux créneaux
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </div>
  )
}

type ChoiceProps = {
  group: string
  label: string
  /** A second line: the clinic's name, the practitioner's specialty. */
  detail?: string
  /** The free slots of the week shown; none while the group is filtered. */
  count?: number
  tint?: string
  initials?: string
  checked: boolean
  onChange: () => void
}

/** A radio of the filters: its name is the label alone, the detail and the count are its description. */
function Choice({ group, label, detail, count, tint, initials, checked, onChange }: ChoiceProps) {
  const id = useId()
  const description = [detail, count === undefined ? undefined : `${free(count)} cette semaine`].filter(Boolean).join(' · ')
  return (
    <label className={styles.choice} data-checked={checked || undefined}>
      <input
        type="radio"
        name={group}
        checked={checked}
        onChange={onChange}
        aria-labelledby={`${id}-name`}
        aria-describedby={description ? `${id}-description` : undefined}
        data-name={label}
      />
      {initials ? (
        <span className={`${styles.initials} ${tint ?? ''}`} aria-hidden="true">
          {initials}
        </span>
      ) : (
        tint && <span className={`${styles.dot} ${tint}`} aria-hidden="true" />
      )}
      <span className={styles.choiceText}>
        <span id={`${id}-name`}>{label}</span>
        {detail && (
          <small className={styles.choiceDetail} aria-hidden="true">
            {detail}
          </small>
        )}
      </span>
      {count !== undefined && (
        <span className={styles.badge} aria-hidden="true">
          {count}
        </span>
      )}
      {description && (
        <span id={`${id}-description`} hidden>
          {description}
        </span>
      )}
    </label>
  )
}

function SlotCard({ slot, tint, onChoose }: { slot: Slot; tint: string; onChoose: () => void }) {
  const { firstName, lastName } = slot.practitioner
  const time = `${timeLabel(new Date(slot.startsAt))} – ${timeLabel(new Date(slot.endsAt))}`
  return (
    <article className={`${styles.slot} ${tint}`} aria-label={`Dr ${firstName} ${lastName}, ${time}`}>
      <div className={styles.slotTop}>
        <p className={styles.name}>
          Dr {firstName} {lastName}
        </p>
        <Stethoscope size={15} aria-hidden="true" />
      </div>
      <span className={styles.pill}>{slot.specialty}</span>
      <p className={styles.meta}>
        <span>{time}</span> · <span>{slot.clinic.name}</span>
      </p>
      <button type="button" className={styles.book} onClick={onChoose}>
        Réserver
      </button>
    </article>
  )
}
