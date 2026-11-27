import { apiFetch, apiFetchBlob } from '@/shared/api/apiClient'
import type { DocumentPage, PatientChoice, PatientDocument } from './types'

// One function per endpoint (api-MedLink MLink-123/125). Components never call fetch().

/** Rows per page of the documents table (the API takes 1 to 50). */
export const PAGE_SIZE = 20

/** The API's upload limit. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/** The only types the API accepts, from the file's magic bytes (the extension is not trusted). */
export const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const

/** GET /api/patients/{patientId}/documents: the patient's documents, newest first. */
export function fetchDocuments(patientId: string, page: number) {
  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  return apiFetch<DocumentPage>(`/patients/${encodeURIComponent(patientId)}/documents?${query}`)
}

/** POST /api/patients/{patientId}/documents (staff only): multipart title + file. */
export function uploadDocument(patientId: string, title: string, file: File) {
  const body = new FormData()
  body.append('title', title)
  body.append('file', file)
  return apiFetch<PatientDocument>(`/patients/${encodeURIComponent(patientId)}/documents`, {
    method: 'POST',
    body,
  })
}

/** GET /api/patients/{patientId}/documents/{documentId}: the plaintext bytes, as an attachment. */
export function downloadDocument(patientId: string, documentId: string) {
  return apiFetchBlob(
    `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
  )
}

type AccountRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string | null
  roles: string[]
}

/**
 * The patients the staff can search in the accounts list (GET /api/admin/users). The API page is capped at
 * 100 rows; the search field narrows it, and only a single PATIENT role is kept.
 */
export async function searchPatients(search: string): Promise<PatientChoice[]> {
  const query = new URLSearchParams({ search, page: '0', size: '100' })
  const page = await apiFetch<{ items: AccountRow[] }>(`/admin/users?${query}`)
  return page.items
    .filter((account) => account.role === 'PATIENT' && account.roles.length === 1)
    .map(({ id, firstName, lastName, email }) => ({ id, firstName, lastName, email }))
}
