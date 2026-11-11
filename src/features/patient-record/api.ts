import { apiFetch } from '@/shared/api/apiClient'
import type { PatientRecord } from './types'

// One function per endpoint (api-MedLink, MLink-31). Components never call fetch() themselves.

/**
 * The record of a patient attached to the caller (a booked appointment with them): 200, or 403 for a patient
 * who is not attached, who does not exist or whose id is malformed (the same answer for all three).
 */
export function fetchPatientRecord(patientId: string) {
  return apiFetch<PatientRecord>(`/patients/${encodeURIComponent(patientId)}/record`)
}
