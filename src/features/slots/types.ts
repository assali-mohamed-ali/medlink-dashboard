/** GET /api/slots/filters (api-MedLink MLink-163): the lists of the search form, in French order by name. */
export type SlotFilters = {
  clinics: { id: string; name: string; city: string }[]
  specialties: { id: string; name: string }[]
  practitioners: {
    id: string
    firstName: string
    lastName: string
    specialtyId: string
    clinicIds: string[]
  }[]
}

/** One free slot of GET /api/slots (MLink-98): instants in UTC, shown in the patient's time zone. */
export type Slot = {
  slotId: string
  startsAt: string
  endsAt: string
  clinic: { id: string; name: string }
  practitioner: { id: string; firstName: string; lastName: string }
  specialty: string
}

/** One page of the search; `message` only when nothing matches at all (MLink-100). */
export type SlotPage = {
  items: Slot[]
  total: number
  message?: string
}

/** The query of GET /api/slots: `[from, to)` as ISO instants, 31 days at most; pages of 1 to 50. */
export type SlotSearch = {
  from: string
  to: string
  clinicId?: string
  practitionerId?: string
  specialtyId?: string
  page: number
  size: number
}
