// The week of the supervision page in Tunis time (MLink-35), like the agenda's (features/agenda/week.ts). Kept here so
// the page's chunk carries it: exported from the agenda's index, its formatters would join the first visit's JavaScript.

/** Tunisia is UTC+1 all year (no daylight saving time since 2009). */
const TUNIS_OFFSET_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
/** Monday to Saturday, as the agenda shows it. */
const DAYS_SHOWN = 6

const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' })
const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long' })
const asDate = (day: string) => new Date(`${day}T12:00:00Z`)

/** The day in Tunis of an instant: '2026-11-12'. */
export const tunisDay = (instant: Date | string) =>
  new Date(new Date(instant).getTime() + TUNIS_OFFSET_MS).toISOString().slice(0, 10)

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/** The Monday of the week holding `day`. */
export const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7))

const tunisMidnight = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - TUNIS_OFFSET_MS).toISOString()

/** Monday 00:00 to the day after Saturday, Tunis time: the period the API is asked for. */
export const weekPeriod = (monday: string) => ({ from: tunisMidnight(monday), to: tunisMidnight(addDays(monday, DAYS_SHOWN)) })

export const weekDays = (monday: string) => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(monday, i))

/** "09:30", Tunis time. */
export const timeLabel = (instant: string) => TIME.format(new Date(instant))

/** "mardi 1 décembre" */
export const longDayLabel = (day: string) => LONG_DAY.format(asDate(day))

/** "Semaine du 30 novembre au 5 décembre 2026", "Semaine du 7 au 12 décembre 2026". */
export function weekTitle(monday: string): string {
  const last = addDays(monday, DAYS_SHOWN - 1)
  const [firstYear, lastYear] = [monday.slice(0, 4), last.slice(0, 4)]
  if (firstYear !== lastYear) {
    return `Semaine du ${DAY_MONTH.format(asDate(monday))} ${firstYear} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
  }
  if (monday.slice(5, 7) !== last.slice(5, 7)) {
    return `Semaine du ${DAY_MONTH.format(asDate(monday))} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
  }
  return `Semaine du ${Number(monday.slice(8, 10))} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
}

/** The ISO week number of a Monday: "Semaine 49". */
export function isoWeek(monday: string): number {
  const thursday = new Date(Date.parse(`${addDays(monday, 3)}T00:00:00Z`))
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - yearStart) / DAY_MS / 7) + 1
}

const SHORT_WEEKDAY = /* @__PURE__ */ new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' })

/** "MAR" */
export const shortWeekday = (day: string) => SHORT_WEEKDAY.format(asDate(day)).replace('.', '').toUpperCase()

/** "1" */
export const dayOfMonth = (day: string) => String(Number(day.slice(8, 10)))
