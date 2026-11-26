// Dates of the agenda, in Tunis time whatever the browser's time zone (the three clinics are in Tunisia).
// Days are plain 'YYYY-MM-DD' strings; instants are ISO strings (UTC) as the API sends and reads them.

/** Tunisia is UTC+1 all year (no daylight saving time since 2009). */
const TUNIS_OFFSET_MS = 60 * 60 * 1000
const TUNIS = 'Africa/Tunis'
const DAY_MS = 24 * 60 * 60 * 1000

/** The days the grid shows: Monday to Saturday. */
export const DAYS_SHOWN = 6

/** The day in Tunis of an instant: '2026-11-12'. */
export function tunisDay(instant: Date | string): string {
  return new Date(new Date(instant).getTime() + TUNIS_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/** The Monday of the week holding `day`. */
export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
  return addDays(day, -((weekday + 6) % 7))
}

/** The instant of a day and time read in Tunis: ('2026-11-12', '09:30') → '2026-11-12T08:30:00.000Z'. */
export function tunisInstant(day: string, time: string): string {
  return new Date(Date.parse(`${day}T${time}:00Z`) - TUNIS_OFFSET_MS).toISOString()
}

/** The period the API is asked for: Monday 00:00 to the day after the last day shown, Tunis time. */
export function weekPeriod(monday: string): { from: string; to: string } {
  return { from: tunisInstant(monday, '00:00'), to: tunisInstant(addDays(monday, DAYS_SHOWN), '00:00') }
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(monday, i))
}

const TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: TUNIS, hour: '2-digit', minute: '2-digit' })
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' })
const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long' })

const asDate = (day: string) => new Date(`${day}T12:00:00Z`)

/** "09:30", Tunis time. */
export const timeLabel = (instant: string) => TIME.format(new Date(instant))
/** "LUN" */
export const shortWeekday = (day: string) => WEEKDAY.format(asDate(day)).replace('.', '').toUpperCase()
/** "lundi 9 novembre" */
export const longDayLabel = (day: string) => LONG_DAY.format(asDate(day))
/** The day of the month: 9 */
export const dayOfMonth = (day: string) => Number(day.slice(8, 10))

/** "Semaine du 9 au 14 novembre 2026", "… du 30 novembre au 5 décembre 2026", "… du 28 décembre 2026 au 2 janvier 2027". */
export function weekTitle(monday: string): string {
  const last = addDays(monday, DAYS_SHOWN - 1)
  const [firstYear, lastYear] = [monday.slice(0, 4), last.slice(0, 4)]
  if (firstYear !== lastYear) {
    return `Semaine du ${DAY_MONTH.format(asDate(monday))} ${firstYear} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
  }
  if (monday.slice(5, 7) !== last.slice(5, 7)) {
    return `Semaine du ${DAY_MONTH.format(asDate(monday))} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
  }
  return `Semaine du ${dayOfMonth(monday)} au ${DAY_MONTH.format(asDate(last))} ${lastYear}`
}

/** The ISO week number of a day (weeks start on Monday; week 1 holds the year's first Thursday). */
export function isoWeek(day: string): number {
  const date = new Date(`${day}T00:00:00Z`)
  const thursday = date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * DAY_MS
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1)
  return 1 + Math.floor((thursday - yearStart) / (7 * DAY_MS))
}

/** The first day of the month holding `day`: '2026-11-01'. */
export const monthOf = (day: string) => `${day.slice(0, 7)}-01`

/** The first day of the month `months` away from the month of `day`. */
export function addMonths(day: string, months: number): string {
  const date = new Date(`${monthOf(day)}T00:00:00Z`)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)).toISOString().slice(0, 10)
}

/** The 6 weeks (42 days, Monday first) of the month calendar of `month`. */
export function monthGrid(month: string): string[] {
  const first = mondayOf(monthOf(month))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' })
const LONG_WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' })

/** "Novembre 2026" */
export function monthTitle(month: string): string {
  const title = MONTH_YEAR.format(asDate(monthOf(month)))
  return title.charAt(0).toUpperCase() + title.slice(1)
}
/** "lundi" */
export const weekdayName = (day: string) => LONG_WEEKDAY.format(asDate(day))
/** The hour of an instant in Tunis, as a row of the week table: "09:00". */
export const hourRow = (instant: string) => `${timeLabel(instant).slice(0, 2)}:00`
