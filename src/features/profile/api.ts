import { apiFetch, apiFetchBlob } from '@/shared/api/apiClient'

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

/** What the patient's profile counts of an appointment (GET /api/appointments/me, MLink-108). */
export type MyAppointment = { id: string; status: string; startsAt: string }
export type MyAppointments = { items: MyAppointment[]; total: number }

/** The patient's appointments, latest first (the API's largest page is 50). Read here for the same reason as the week. */
export function fetchMyAppointments(page: number, size: number) {
  return apiFetch<MyAppointments>(`/appointments/me?page=${page}&size=${size}`)
}

export type ContactDetails = { phone: string | null; address: string | null }
export type DeletionRequest = {
  requested: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  requestedAt?: string | null
  dueAt: string | null
  decisionNote: string | null
  decidedAt?: string | null
  /** When an approval closed the account (api-MedLink V30). */
  accountClosedAt?: string | null
}

/** US-15: the optional mails (GET/PUT /api/patients/me/notification-preferences). E-mail is the only channel. */
export type NotificationPreferences = { appointmentReminders: boolean; examResults: boolean }

export function fetchContactDetails() {
  return apiFetch<ContactDetails>('/patients/me')
}

export function saveContactDetails(phone: string, address: string) {
  return apiFetch<ContactDetails>('/patients/me', { method: 'PUT', body: { phone, address } })
}

export function fetchNotificationPreferences() {
  return apiFetch<NotificationPreferences>('/patients/me/notification-preferences')
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  return apiFetch<NotificationPreferences>('/patients/me/notification-preferences', { method: 'PUT', body: preferences })
}

export function deletionRequest(method = 'GET') {
  return apiFetch<DeletionRequest>('/patients/me/deletion-request', { method })
}

export function exportPatientData() {
  return apiFetchBlob('/patients/me/export')
}
