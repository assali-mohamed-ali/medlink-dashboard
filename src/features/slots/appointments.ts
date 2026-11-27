// The patient's appointments, read the same way by "Mes rendez-vous" and by the patient's home. Pure functions.
import type { Appointment } from './types'

export type Kind = 'toCome' | 'cancelled' | 'past'

/** Cancelled, already started (past), or still to come. */
export function kindOf(appointment: Appointment, now: number): Kind {
  if (appointment.status === 'CANCELLED') return 'cancelled'
  return Date.parse(appointment.startsAt) <= now ? 'past' : 'toCome'
}

/** The appointments still to come, soonest first (the API gives the latest first). */
export function toComeOf(items: readonly Appointment[], now: number) {
  return items.filter((a) => kindOf(a, now) === 'toCome').sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

/** Calendar days from today to `start`, in the patient's time zone: 0 today, 1 tomorrow. */
export function daysUntil(start: Date, now: number) {
  const today = new Date(now)
  return Math.round(
    (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  )
}

/** "aujourd’hui", "demain", "dans 2 jours" */
export function whenLabel(start: Date, now: number) {
  const days = daysUntil(start, now)
  if (days <= 0) return 'aujourd’hui'
  return days === 1 ? 'demain' : `dans ${days} jours`
}
