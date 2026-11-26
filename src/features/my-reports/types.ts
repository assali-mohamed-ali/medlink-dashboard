// The patient's own consultation reports (api-MedLink, MLink-32 follow-up, GET /api/reports/me).

/** Who wrote a report: what the patient needs to recognise their doctor. */
export type ReportAuthor = { firstName: string; lastName: string; specialty: string }

/** A consultation report as its patient reads it: the text is decrypted by the API. */
export type MyReport = { id: string; createdAt: string; content: string; practitioner: ReportAuthor }
