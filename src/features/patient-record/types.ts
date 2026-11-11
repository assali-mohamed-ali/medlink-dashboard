// The patient record contract of api-MedLink (MLink-31, GET /api/patients/{id}/record).

/** What a practitioner sees of the patient: never the address or the e-mail. */
export type PatientIdentity = {
  id: string
  firstName: string
  lastName: string
  /** yyyy-MM-dd */
  birthDate: string
  phone: string | null
}

/** The record: the identity and the consultation reports (typed by MLink-32; always empty until then). */
export type PatientRecord = { patient: PatientIdentity; reports: unknown[] }
