import { apiFetch } from '@/shared/api/apiClient'
import type { AdminPractitioner, ClinicActivity, ClinicSummary, SupervisedAgenda } from './types'

// One function per endpoint (api-MedLink MLink-35; ADMINISTRATIVE_STAFF only). Components never call fetch().

/** Endpoint 16c: every practitioner, by last then first name. */
export function fetchPractitioners() {
  return apiFetch<AdminPractitioner[]>('/admin/practitioners')
}

/** Endpoint 16d: one practitioner's slots of the period (31 days at most); 404 PRACTITIONER_NOT_FOUND. */
export function fetchPractitionerAgenda(practitionerId: string, from: string, to: string) {
  const query = new URLSearchParams({ practitionerId, from, to })
  return apiFetch<SupervisedAgenda>(`/admin/agenda?${query}`)
}

export function fetchClinics() {
  return apiFetch<ClinicSummary[]>('/admin/clinics')
}

export function fetchClinicActivity(id: string, from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return apiFetch<ClinicActivity>(`/admin/clinics/${encodeURIComponent(id)}/activity?${query}`)
}
