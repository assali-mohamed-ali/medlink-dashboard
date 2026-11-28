import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Page, Proposal, SlotRef } from '../types'
import ApprovalPage from './ApprovalPage'
import StaffReassignmentsPage from './StaffReassignmentsPage'

vi.mock('../api', () => ({
  fetchProposals: vi.fn(), decideProposal: vi.fn(), fetchPractitioners: vi.fn(),
  fetchCandidates: vi.fn(), fetchTargets: vi.fn(), createProposal: vi.fn(),
}))

const original: SlotRef = {
  id: 's1', clinicId: 'c1', clinicName: 'Clinique Test', practitionerId: 'p1',
  firstName: 'Rim', lastName: 'Test', startsAt: '2026-12-01T08:00:00Z', endsAt: '2026-12-01T08:30:00Z',
}
const target: SlotRef = { ...original, id: 's2', practitionerId: 'p2', firstName: 'Sami' }
const proposal: Proposal = {
  id: 'r1', appointmentId: 'a1', original, target, status: 'PENDING', patientAccepted: false, practitionerAccepted: false,
}
const page = <T,>(items: T[]): Page<T> => ({ items, page: 0, size: 20, total: items.length })

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchProposals).mockResolvedValue(page([proposal]))
  vi.mocked(api.fetchPractitioners).mockResolvedValue([{ id: 'p1', firstName: 'Rim', lastName: 'Test', clinics: [{ id: 'c1', name: 'Clinique Test' }] }])
  vi.mocked(api.fetchCandidates).mockResolvedValue(page([{ appointmentId: 'a1', patientFirstName: 'Amel', patientLastName: 'Test', original }]))
  vi.mocked(api.fetchTargets).mockResolvedValue(page([target]))
  vi.mocked(api.createProposal).mockResolvedValue(proposal)
})

test('the patient confirms an approval and waits for the other party', async () => {
  const user = userEvent.setup()
  vi.mocked(api.decideProposal).mockResolvedValue({ ...proposal, patientAccepted: true })
  render(<ApprovalPage party="patient" />)
  await user.click(await screen.findByRole('button', { name: 'Accepter la proposition' }))
  expect(api.decideProposal).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Confirmer l’acceptation' }))
  await waitFor(() => expect(api.decideProposal).toHaveBeenCalledWith('patient', 'r1', true))
  expect(await screen.findByText('Décision enregistrée.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Accepter la proposition' })).toBeNull()
  expect(screen.getByText('En attente des accords')).toBeInTheDocument()
})

test('the receiving practitioner can decline and the source is preserved', async () => {
  const user = userEvent.setup()
  vi.mocked(api.decideProposal).mockResolvedValue({ ...proposal, status: 'DECLINED' })
  render(<ApprovalPage party="practitioner" />)
  await user.click(await screen.findByRole('button', { name: 'Refuser la proposition' }))
  await user.click(screen.getByRole('button', { name: 'Confirmer le refus' }))
  expect(await screen.findByText('Proposition refusée')).toBeInTheDocument()
  expect(api.decideProposal).toHaveBeenCalledWith('practitioner', 'r1', false)
})

test('the staff selects a future appointment and a target without typing an identifier', async () => {
  const user = userEvent.setup()
  render(<StaffReassignmentsPage />)
  await screen.findByRole('option', { name: 'Rim Test' })
  await user.selectOptions(screen.getByLabelText('Praticien à réaffecter'), 'p1')
  await user.selectOptions(screen.getByLabelText('Clinique'), 'c1')
  await user.click(screen.getByRole('button', { name: 'Rechercher les rendez-vous' }))
  await screen.findByLabelText('Rendez-vous à transférer')
  await user.selectOptions(screen.getByLabelText('Rendez-vous à transférer'), 'a1')
  await user.click(screen.getByRole('button', { name: 'Rechercher les créneaux repreneurs' }))
  await screen.findByLabelText('Créneau repreneur')
  await user.selectOptions(screen.getByLabelText('Créneau repreneur'), 's2')
  await user.click(screen.getByRole('button', { name: 'Proposer la réaffectation' }))
  expect(await screen.findByText(/Proposition enregistrée/)).toBeInTheDocument()
  expect(api.createProposal).toHaveBeenCalledWith('a1', 's2')
})

test('a refused decision is visible and can be retried', async () => {
  const user = userEvent.setup()
  vi.mocked(api.decideProposal).mockRejectedValue(new ApiError(409, 'DECISION_ALREADY_RECORDED', 'Décision déjà enregistrée.'))
  render(<ApprovalPage party="patient" />)
  await user.click(await screen.findByRole('button', { name: 'Accepter la proposition' }))
  await user.click(screen.getByRole('button', { name: 'Confirmer l’acceptation' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Décision déjà enregistrée.')
  expect(screen.getByRole('button', { name: 'Confirmer l’acceptation' })).toBeEnabled()
})

test('an unavailable final transfer is displayed without claiming success', async () => {
  const user = userEvent.setup()
  vi.mocked(api.decideProposal).mockResolvedValue({ ...proposal, status: 'FAILED', patientAccepted: true, practitionerAccepted: true })
  render(<ApprovalPage party="patient" />)
  await user.click(await screen.findByRole('button', { name: 'Accepter la proposition' }))
  await user.click(screen.getByRole('button', { name: 'Confirmer l’acceptation' }))
  expect(await screen.findByText('Transfert impossible — rendez-vous initial conservé')).toBeInTheDocument()
})
