import { apiFetch } from '@/shared/api/apiClient'

// One function per endpoint (api-MedLink, MLink-26). The profile reads the practitioner's week from the agenda route
// itself, so the agenda feature's code does not have to load with the app's first page (npm run check:budget).

export type ClinicRef = { id: string; name: string }
export type WeekSlot = { slotId: string; status: 'OPEN' | 'BOOKED' | 'CLOSED' }
export type Week = { clinics: ClinicRef[]; items: WeekSlot[] }

/** Tunis is UTC+1 all year (no daylight saving). */
const TUNIS_OFFSET_MS = 3_600_000
const DAY_MS = 86_400_000

/** This week in Tunis: Monday 00:00 to Sunday 00:00 (the agenda shows Monday to Saturday), as the agenda page asks. */
export function thisWeek(now: Date) {
  const tunis = new Date(now.getTime() + TUNIS_OFFSET_MS)
  const sinceMonday = (tunis.getUTCDay() + 6) % 7
  const monday = Date.UTC(tunis.getUTCFullYear(), tunis.getUTCMonth(), tunis.getUTCDate() - sinceMonday)
  const from = new Date(monday - TUNIS_OFFSET_MS)
  return { from: from.toISOString(), to: new Date(from.getTime() + 6 * DAY_MS).toISOString() }
}

/** The practitioner's clinics and this week's slots (GET /api/practitioner/agenda). */
export function fetchWeek(from: string, to: string) {
  return apiFetch<Week>(`/practitioner/agenda?${new URLSearchParams({ from, to })}`)
}
