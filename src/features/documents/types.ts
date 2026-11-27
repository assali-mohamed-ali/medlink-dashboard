/** One document as the API returns it (MLink-123/125); never a byte of the document. */
export type PatientDocument = {
  id: string
  patientId: string
  uploadedBy: string | null
  title: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  /** ISO-8601 instant (UTC). */
  createdAt: string
}

/** GET /api/patients/{patientId}/documents: one page, newest first. */
export type DocumentPage = {
  items: PatientDocument[]
  page: number
  size: number
  total: number
}

/** A patient the staff can attach documents to, from the accounts search. */
export type PatientChoice = {
  id: string
  firstName: string
  lastName: string
  email: string
}
