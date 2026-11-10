import { CalendarX, MapPin, Plus } from 'lucide-react'
import UserAvatar from '@/shared/components/UserAvatar'
import { EmptyState } from '@/shared/ui'
import { shortName, sortedClinics } from '../clinicTones'
import type { Agenda, AgendaItem } from '../types'
import { dayOfMonth, hourRow, longDayLabel, shortWeekday, timeLabel, tunisDay, weekDays, weekdayName } from '../week'
import styles from '../agenda.module.css'

const STATUS_WORDS: Record<AgendaItem['status'], string> = {
  OPEN: 'disponible',
  BOOKED: 'réservé',
  CLOSED: 'fermé',
}

type Props = {
  /** The table's name: the week title. */
  title: string
  monday: string
  today: string
  agenda: Agenda
  tones: ReadonlyMap<string, number>
  hidden: ReadonlySet<string>
}

/**
 * The week as a table (Stitch design): a row per hour that holds a slot, a column per day (Monday to Saturday),
 * the sites of the week above and the legend below. A slot shows only what the API knows: no consultation type.
 */
export default function WeekTable({ title, monday, today, agenda, tones, hidden }: Props) {
  const days = weekDays(monday)
  const shown = agenda.items.filter((item) => !hidden.has(item.clinic.id))
  const cells = new Map<string, AgendaItem[]>()
  for (const item of shown) {
    const key = `${tunisDay(item.startsAt)} ${hourRow(item.startsAt)}`
    cells.set(key, [...(cells.get(key) ?? []), item])
  }
  const hours = [...new Set(shown.map((item) => hourRow(item.startsAt)))].sort()

  // Which clinic on which days: "Sousse (lundi, mercredi)"
  const sites = sortedClinics(agenda.clinics)
    .map((clinic) => ({
      clinic,
      days: days.filter((day) => shown.some((item) => item.clinic.id === clinic.id && tunisDay(item.startsAt) === day)),
    }))
    .filter((site) => site.days.length > 0)

  return (
    <>
      {sites.length > 0 && (
        <div className={styles.sites}>
          <span className={styles.sitesLabel} aria-hidden="true">
            Sites de présence :
          </span>
          <ul className={styles.chips} aria-label="Sites de présence">
            {sites.map(({ clinic, days: siteDays }) => (
              <li key={clinic.id} className={styles.chip} data-tone={tones.get(clinic.id)}>
                <span className={styles.dot} aria-hidden="true" />
                {shortName(clinic.name)} ({siteDays.map(weekdayName).join(', ')})
              </li>
            ))}
          </ul>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon={CalendarX} title="Aucun créneau cette semaine" compact headingLevel={4}>
          Ouvrez un créneau, ou changez de semaine ou de cliniques.
        </EmptyState>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table} aria-label={title}>
            <thead>
              <tr>
                <th scope="col" className={styles.hourHead}>
                  Heure
                </th>
                {days.map((day) => {
                  const isToday = day === today
                  const clinics = [
                    ...new Set(
                      shown.filter((item) => tunisDay(item.startsAt) === day).map((item) => shortName(item.clinic.name)),
                    ),
                  ]
                  return (
                    <th key={day} scope="col" className={styles.dayHead} data-today={isToday || undefined} aria-current={isToday ? 'date' : undefined}>
                      <span className={styles.weekday}>{shortWeekday(day)}</span>
                      <span className={styles.dayNumber}>{dayOfMonth(day)}</span>
                      <span className={styles.dayClinics}>
                        {[clinics.join(' · '), isToday ? 'Ce jour' : ''].filter(Boolean).join(' • ') || '—'}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <th scope="row" className={styles.hour}>
                    {hour}
                  </th>
                  {days.map((day) => {
                    const slots = cells.get(`${day} ${hour}`) ?? []
                    return (
                      <td key={day} className={styles.cell} data-empty={slots.length === 0 || undefined}>
                        {slots.length > 0 && (
                          <ul className={styles.slots}>
                            {slots
                              .filter((item) => item.status !== 'OPEN')
                              .map((item) => (
                                <SlotCard key={item.slotId} item={item} day={day} tone={tones.get(item.clinic.id) ?? 1} />
                              ))}
                            <FreeSlots slots={slots.filter((item) => item.status === 'OPEN')} day={day} />
                          </ul>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className={styles.legend} aria-label="Légende">
        {sortedClinics(agenda.clinics).map((clinic) => (
          <li key={clinic.id} className={styles.legendItem} data-tone={tones.get(clinic.id)}>
            <span className={styles.swatch} aria-hidden="true" />
            {shortName(clinic.name)}
          </li>
        ))}
        <li className={styles.legendItem}>
          <span className={styles.confirmed} aria-hidden="true" />
          Rendez-vous confirmé
        </li>
        <li className={styles.legendItem}>
          <span className={styles.swatchOpen} aria-hidden="true" />
          Créneau disponible
        </li>
        <li className={styles.legendItem}>
          <span className={styles.swatchClosed} aria-hidden="true" />
          Créneau fermé
        </li>
      </ul>
    </>
  )
}

/** The free slots of a cell in one dashed box (Stitch: "+ Créneau dispo"), each time its own item. */
function FreeSlots({ slots, day }: { slots: readonly AgendaItem[]; day: string }) {
  if (slots.length === 0) return null
  return (
    <li className={styles.free}>
      <span className={styles.freeTitle} aria-hidden="true">
        <Plus size={14} />
        Créneau{slots.length > 1 ? 'x' : ''} dispo
      </span>
      <ul className={styles.freeTimes}>
        {slots.map((item) => {
          const time = `${timeLabel(item.startsAt)} – ${timeLabel(item.endsAt)}`
          return (
            <li
              key={item.slotId}
              className={styles.freeTime}
              aria-label={`${longDayLabel(day)}, ${time}, ${item.clinic.name}, ${STATUS_WORDS.OPEN}`}
            >
              {timeLabel(item.startsAt)}
              <span className="visually-hidden">Créneau disponible</span>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

function SlotCard({ item, day, tone }: { item: AgendaItem; day: string; tone: number }) {
  const time = `${timeLabel(item.startsAt)} – ${timeLabel(item.endsAt)}`
  const patient = item.appointment?.patient
  return (
    <li
      className={styles.slot}
      data-tone={tone}
      data-status={item.status}
      aria-label={`${longDayLabel(day)}, ${time}, ${item.clinic.name}, ${STATUS_WORDS[item.status]}${patient ? `, ${patient.firstName} ${patient.lastName}` : ''}`}
    >
      {patient ? (
        <>
          <span className={styles.slotPatient}>
            <UserAvatar firstName={patient.firstName} lastName={patient.lastName} size="sm" />
            {/* "Ahmed K." on the card (Stitch design, less on screen); the full name is in the card's name */}
            <span className={styles.slotName} title={`${patient.firstName} ${patient.lastName}`}>
              {patient.firstName} {patient.lastName.charAt(0)}.
            </span>
            <span className={styles.confirmed}>
              <span className="visually-hidden">Rendez-vous confirmé</span>
            </span>
          </span>
          <span className={styles.slotTime}>{time}</span>
          <span className={styles.slotClinic}>
            <MapPin size={12} aria-hidden="true" />
            {shortName(item.clinic.name)}
          </span>
        </>
      ) : (
        <>
          <span className={styles.slotState}>Créneau fermé</span>
          <span className={styles.slotTime}>{time}</span>
        </>
      )}
    </li>
  )
}
