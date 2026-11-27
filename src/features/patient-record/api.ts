import { apiFetch, apiFetchBlob } from '@/shared/api/apiClient'
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

export type PatientSummary = { id: string; firstName: string; lastName: string }
export type ExamResult = {
  id: string
  publishedAt: string
  examDate: string
  examType: string
  documentId: string | null
  isNew: boolean
  title: string
  content: string | null
  practitioner: { firstName: string; lastName: string } | null
}

export function searchPatients(query: string) {
  return apiFetch<PatientSummary[]>(`/practitioner/patients?${new URLSearchParams({ q: query })}`)
}

export type ResultInput = { title: string; examType: string; examDate: string; content: string; documentId?: string }

export function publishResult(patientId: string, result: ResultInput) {
  return apiFetch<ExamResult>(`/patients/${encodeURIComponent(patientId)}/results`, {
    method: 'POST', body: result,
  })
}

export function fetchMyResults() {
  return apiFetch<ExamResult[]>('/results/me')
}

export function fetchPublishedResults(patientId: string) {
  return apiFetch<ExamResult[]>(`/patients/${encodeURIComponent(patientId)}/results`)
}

export function downloadResultDocument(patientId: string, documentId: string) {
  return apiFetchBlob(`/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`)
}
