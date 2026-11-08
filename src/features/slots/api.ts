import { apiFetch } from '@/shared/api/apiClient'
import type { Appointment, SlotFilters, SlotPage, SlotSearch } from './types'

// One function per endpoint (api-MedLink, epic MLink-8). Components never call fetch() themselves.

/** MLink-163: the clinics, specialties and practitioners the search form offers (patients only). */
export function fetchSlotFilters() {
  return apiFetch<SlotFilters>('/slots/filters')
}

/** MLink-98: the free slots of a period, earliest first; the filters left out are not sent. */
export function searchSlots(search: SlotSearch) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(search)) {
    if (value !== undefined) query.set(name, String(value))
  }
  return apiFetch<SlotPage>(`/slots?${query}`)
}

/** MLink-102: the patient books a slot for themselves (apiFetch adds the CSRF header). */
export function bookSlot(slotId: string) {
  return apiFetch<Appointment>('/appointments', { method: 'POST', body: { slotId } })
}
