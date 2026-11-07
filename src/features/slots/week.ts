// Dates of the week grid, in the patient's local time. Pure functions: no state, no API.

/** The days the grid shows: Monday to Saturday (the clinics do not open on Sunday). */
export const DAYS_SHOWN = 6

/** Monday 00:00 (local time) of the week holding `date`. */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** The search period of a week: Monday 00:00 to Sunday 00:00, so it ends with the last day shown. */
export function weekPeriod(monday: Date): { from: string; to: string } {
  return { from: monday.toISOString(), to: addDays(monday, DAYS_SHOWN).toISOString() }
}

const DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const FULL_DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** "mardi 10 novembre" */
export const dayLabel = (date: Date) => DAY.format(date)
/** "vendredi 20 novembre 2026" */
export const fullDateLabel = (date: Date) => FULL_DATE.format(date)
/** "MAR" */
export const shortDayLabel = (date: Date) => SHORT_DAY.format(date).replace('.', '').toUpperCase()
/** "novembre 2026" */
export const monthLabel = (date: Date) => MONTH_YEAR.format(date)
/** "09:00" */
export const timeLabel = (date: Date) => TIME.format(date)

/** "Semaine du 9 au 14 novembre 2026", "… du 30 novembre au 5 décembre 2026", "… du 28 décembre 2026 au 2 janvier 2027". */
export function weekTitle(monday: Date): string {
  const last = addDays(monday, DAYS_SHOWN - 1)
  if (monday.getFullYear() !== last.getFullYear()) {
    return `Semaine du ${DAY_MONTH.format(monday)} ${monday.getFullYear()} au ${DAY_MONTH.format(last)} ${last.getFullYear()}`
  }
  if (monday.getMonth() !== last.getMonth()) {
    return `Semaine du ${DAY_MONTH.format(monday)} au ${DAY_MONTH.format(last)} ${last.getFullYear()}`
  }
  return `Semaine du ${monday.getDate()} au ${DAY_MONTH.format(last)} ${last.getFullYear()}`
}

/** The 6 weeks (42 days, Monday first) of the month calendar holding `month`. */
export function monthGrid(month: Date): Date[] {
  const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}
