// The patient record contract of api-MedLink (MLink-31, GET /api/patients/{id}/record).

/** What a practitioner sees of the patient: never the address or the e-mail. */
export type PatientIdentity = {
  id: string
  firstName: string
  lastName: string
  /** yyyy-MM-dd */
  birthDate: string
  phone: string | null
  /** US-22: MED-000042 (absent from an API older than V31). */
  recordNumber?: string | null
}

/**
 * The record: the identity and the consultation reports (typed by MLink-32; always empty until then).
 * `canWriteReport`: a consultation with the patient has started, so a report may be written (MLink-32 follow-up).
 */
export type PatientRecord = { patient: PatientIdentity; reports: unknown[]; canWriteReport: boolean }

/** A consultation report (MLink-32, GET/POST /api/patients/{id}/reports): the text is decrypted by the API. */
export type Report = { id: string; createdAt: string; content: string }

/** What the editor sends: the text only (the API knows the author and the patient). */
export type NewReport = { content: string }
