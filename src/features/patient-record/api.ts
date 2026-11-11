import { apiFetch } from '@/shared/api/apiClient'
import type { NewReport, PatientRecord, Report } from './types'

// One function per endpoint (api-MedLink, MLink-31). Components never call fetch() themselves.

/**
 * The record of a patient attached to the caller (a booked appointment with them): 200, or 403 for a patient
 * who is not attached, who does not exist or whose id is malformed (the same answer for all three).
 */
export function fetchPatientRecord(patientId: string) {
  return apiFetch<PatientRecord>(`/patients/${encodeURIComponent(patientId)}/record`)
}

/** The patient's consultation reports (MLink-32): the same access rule as the record (403 otherwise). */
export function fetchReports(patientId: string) {
  return apiFetch<Report[]>(`/patients/${encodeURIComponent(patientId)}/reports`)
}

/** Saves a report: 201 + the report, 400 VALIDATION_FAILED (details.content), 500 REPORT_SAVE_FAILED (nothing saved). */
export function createReport(patientId: string, report: NewReport) {
  return apiFetch<Report>(`/patients/${encodeURIComponent(patientId)}/reports`, { method: 'POST', body: report })
}
