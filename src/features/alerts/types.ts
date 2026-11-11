// The alerts contract of api-MedLink (MLink-37, 37.3): GET /api/practitioner/alerts?unread=true and
// POST /api/practitioner/alerts/{id}/read (204). Fixed before the API so the front can be built first (option A).

/** Why the alert exists; only cancellations for now (MLink-37). */
export type AlertType = 'APPOINTMENT_CANCELLED'

export type Alert = {
  id: string
  type: AlertType
  /** Written by the API in French ("Rendez-vous annulé : …"). */
  message: string
  appointmentId: string | null
  /** ISO instant (UTC). */
  createdAt: string
}
