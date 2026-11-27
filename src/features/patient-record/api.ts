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

/** US-22: a linked patient; `recordNumber` reads like MED-000042. */
export type PatientSummary = { id: string; firstName: string; lastName: string; recordNumber: string | null }
export type PatientPage = { items: PatientSummary[]; page: number; size: number; total: number }
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
/** US-13 / US-25: one page of results; `unseen` counts the patient's new ones before this page was read. */
export type ResultPage = { items: ExamResult[]; page: number; size: number; total: number; unseen: number }

/** Rows per page of the directory and the result lists (the API takes 1 to 50). */
export const PAGE_SIZE = 20

/** GET /api/practitioner/patients: linked patients by name, full name or record number, one page. */
export function searchPatients(query: string, page = 0) {
  const params = new URLSearchParams({ q: query, page: String(page), size: String(PAGE_SIZE) })
  return apiFetch<PatientPage>(`/practitioner/patients?${params}`)
}

/** `requestId`: generated once per reviewed draft, so a repeated confirmation never publishes twice. */
export type ResultInput = {
  title: string
  examType: string
  examDate: string
  content: string
  documentId?: string
  requestId?: string
}

/** 201 for a new result, 200 for a request id already published (the same result again). */
export function publishResult(patientId: string, result: ResultInput) {
  return apiFetch<ExamResult>(`/patients/${encodeURIComponent(patientId)}/results`, {
    method: 'POST', body: result,
  })
}

export function fetchMyResults(page = 0) {
  return apiFetch<ResultPage>(`/results/me?${new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })}`)
}

export function fetchPublishedResults(patientId: string, page = 0) {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  return apiFetch<ResultPage>(`/patients/${encodeURIComponent(patientId)}/results?${params}`)
}

/** A document of the patient, as the practitioner picks a result's attachment (metadata only). */
export type PatientFile = { id: string; title: string; originalFilename: string; createdAt: string }
export type PatientFilePage = { items: PatientFile[]; total: number }

/** US-25: the attached patient's documents (403 for a patient not attached to the caller). */
export function fetchPatientFiles(patientId: string) {
  return apiFetch<PatientFilePage>(`/patients/${encodeURIComponent(patientId)}/documents?page=0&size=50`)
}

/** US-25: an attached practitioner uploads the attachment (PDF, PNG or JPEG, 10 MiB at most), multipart. */
export function uploadPatientFile(patientId: string, title: string, file: File) {
  const body = new FormData()
  body.append('title', title)
  body.append('file', file)
  return apiFetch<PatientFile>(`/patients/${encodeURIComponent(patientId)}/documents`, { method: 'POST', body })
}

export function downloadResultDocument(patientId: string, documentId: string) {
  return apiFetchBlob(`/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`)
}
