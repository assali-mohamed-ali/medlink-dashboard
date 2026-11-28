import { apiFetch } from '@/shared/api/apiClient'
import type { Agenda, AgendaItem, OpenSlotInput } from './types'

// One function per endpoint (api-MedLink, MLink-26). Components never call fetch() themselves.

/** The caller's slots of the period, in the three clinics (31 days at most). */
export function fetchAgenda(from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return apiFetch<Agenda>(`/practitioner/agenda?${query}`)
}

/** Opens a slot in one of the caller's clinics: 201 + the slot, 409 SLOT_OVERLAP, 400 VALIDATION_FAILED. */
export function openSlot(input: OpenSlotInput) {
  return apiFetch<AgendaItem>('/practitioner/slots', { method: 'POST', body: input })
}

/** Closes (CLOSED) or reopens (OPEN) one of the caller's slots: 409 SLOT_BOOKED, SLOT_IN_PAST, 403. */
export function changeSlotStatus(slotId: string, status: 'OPEN' | 'CLOSED') {
  return apiFetch<AgendaItem>(`/practitioner/slots/${encodeURIComponent(slotId)}`, {
    method: 'PATCH',
    body: { status },
  })
}

export type Absence = { id: string; startsAt: string; endsAt: string; reason: string | null }
export type AffectedAppointment = {
  appointmentId: string
  startsAt: string
  clinic: string
  patientFirstName: string
  patientLastName: string
}
export function fetchAbsences() {
  return apiFetch<Absence[]>('/practitioner/absences')
}
export function declareAbsence(startsAt: string, endsAt: string, reason: string) {
  return apiFetch<Absence>('/practitioner/absences', { method: 'POST', body: { startsAt, endsAt, reason } })
}
export function fetchAffectedAppointments(id: string) {
  return apiFetch<AffectedAppointment[]>(`/practitioner/absences/${encodeURIComponent(id)}/appointments`)
}
export function decideAffectedAppointment(id: string, action: 'CANCEL' | 'POSTPONE') {
  return apiFetch(`/practitioner/appointments/${encodeURIComponent(id)}/absence-decision`, { method: 'POST', body: { action } })
}
