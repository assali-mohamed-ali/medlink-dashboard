export type Party = 'patient' | 'practitioner'
export type ProposalStatus = 'PENDING' | 'DONE' | 'DECLINED' | 'FAILED'
export type SlotRef = {
  id: string
  clinicId: string
  clinicName: string
  practitionerId: string
  firstName: string
  lastName: string
  startsAt: string
  endsAt: string
}
export type Proposal = {
  id: string
  appointmentId: string
  original: SlotRef
  target: SlotRef
  status: ProposalStatus
  patientAccepted: boolean
  practitionerAccepted: boolean
}
export type Candidate = {
  appointmentId: string
  patientFirstName: string
  patientLastName: string
  original: SlotRef
}
export type Practitioner = {
  id: string
  firstName: string
  lastName: string
  clinics: { id: string; name: string }[]
}
export type Page<T> = { items: T[]; page: number; size: number; total: number }
