// What staff read to supervise the clinics (api-MedLink MLink-35, endpoints 16c and 16d). Read only.

export type ClinicRef = { id: string; name: string }

/** GET /api/admin/practitioners: names, specialty and clinics, never an email. */
export type AdminPractitioner = {
  id: string
  firstName: string
  lastName: string
  specialty: { id: string; name: string }
  clinics: ClinicRef[]
}

export type SlotStatus = 'OPEN' | 'BOOKED' | 'CLOSED'

/** One slot of the supervised agenda: the practitioner's own item, the patient's names on a booked one. */
export type SupervisedSlot = {
  slotId: string
  status: SlotStatus
  /** ISO instants (UTC). */
  startsAt: string
  endsAt: string
  clinic: ClinicRef
  appointment?: { id: string; status: string; patient: { id: string; firstName: string; lastName: string } }
}

/** GET /api/admin/agenda: the practitioner's clinics and their slots of the period, earliest first. */
export type SupervisedAgenda = { clinics: ClinicRef[]; items: SupervisedSlot[] }
