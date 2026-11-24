// The agenda contract of api-MedLink (MLink-26, GET/POST/PATCH /api/practitioner/...).

/** The API's slot statuses: OPEN (bookable), BOOKED (a patient holds it), CLOSED (closed by the practitioner). */
export type SlotStatus = 'OPEN' | 'BOOKED' | 'CLOSED'

export type ClinicRef = { id: string; name: string }

export type AgendaItem = {
  slotId: string
  status: SlotStatus
  /** ISO instants (UTC). */
  startsAt: string
  endsAt: string
  clinic: ClinicRef
  /** Only on a booked slot: the patient's id (to open their record later) and names, nothing more. */
  appointment?: { id: string; status: string; patient: { id: string; firstName: string; lastName: string } }
}

/** The practitioner's clinics (legend, filter, form) and the slots of the period, earliest first. */
export type Agenda = { clinics: ClinicRef[]; items: AgendaItem[] }

export type OpenSlotInput = { clinicId: string; startsAt: string; endsAt: string }
