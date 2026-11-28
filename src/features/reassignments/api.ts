import { apiFetch } from '@/shared/api/apiClient'
import type { Candidate, Page, Party, Practitioner, Proposal, SlotRef } from './types'

const pageQuery = (page: number) => new URLSearchParams({ page: String(page), size: '20' })
const pathFor = (party: Party | 'staff') => party === 'patient' ? '/patients/me/reassignments'
  : party === 'practitioner' ? '/practitioner/reassignments' : '/admin/reassignments'

export function fetchProposals(party: Party | 'staff', page = 0) {
  return apiFetch<Page<Proposal>>(`${pathFor(party)}?${pageQuery(page)}`)
}
export function decideProposal(party: Party, id: string, accepted: boolean) {
  return apiFetch<Proposal>(`${pathFor(party)}/${encodeURIComponent(id)}/decision`, {
    method: 'POST', body: { accepted },
  })
}
export function fetchPractitioners() {
  return apiFetch<Practitioner[]>('/admin/practitioners')
}
export function fetchCandidates(practitionerId: string, clinicId: string, page = 0) {
  const query = pageQuery(page)
  query.set('practitionerId', practitionerId)
  query.set('clinicId', clinicId)
  return apiFetch<Page<Candidate>>(`/admin/reassignments/candidates?${query}`)
}
export function fetchTargets(appointmentId: string, page = 0) {
  const query = pageQuery(page)
  query.set('appointmentId', appointmentId)
  return apiFetch<Page<SlotRef>>(`/admin/reassignments/targets?${query}`)
}
export function createProposal(appointmentId: string, targetSlotId: string) {
  return apiFetch<Proposal>('/admin/reassignments', { method: 'POST', body: { appointmentId, targetSlotId } })
}
