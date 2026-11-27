import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import DeletionRequestsPage from './DeletionRequestsPage'

// US-16, staff side: the pending requests, a refusal that needs a reason, an approval that closes the account, and
// the 409 the API gives while the retention period runs.
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchDeletionRequests: vi.fn(),
  decideDeletion: vi.fn(),
}))
const fetchDeletionRequests = vi.mocked(api.fetchDeletionRequests)
const decideDeletion = vi.mocked(api.decideDeletion)

const PENDING: api.PendingDeletion = {
  patientId: 'p1', firstName: 'Nour', lastName: 'Synthétique', dueAt: '2026-12-27T10:00:00Z', retainedUntil: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchDeletionRequests.mockResolvedValue([PENDING])
})

async function open() {
  render(<DeletionRequestsPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Nour Synthétique' }))
}

test('a refusal without a reason is stopped before the API', async () => {
  await open()

  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la décision' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Un motif est obligatoire')
  expect(decideDeletion).not.toHaveBeenCalled()
})

test('a refusal with a reason is sent and the patient is said to read it', async () => {
  decideDeletion.mockResolvedValue({ status: 'REJECTED', accountClosedAt: null })
  await open()

  await userEvent.type(screen.getByLabelText('Motif transmis au patient'), 'Suivi en cours.')
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la décision' }))

  expect(decideDeletion).toHaveBeenCalledWith('p1', 'REJECTED', 'Suivi en cours.')
  expect(await screen.findByRole('status')).toHaveTextContent('le patient voit le motif')
  expect(screen.queryByRole('button', { name: 'Nour Synthétique' })).toBeNull()
})

test('the form says what an approval does, and an approval reports the closed account', async () => {
  decideDeletion.mockResolvedValue({ status: 'APPROVED', accountClosedAt: '2026-11-27T10:00:00Z' })
  await open()

  expect(screen.getByText(/clôture le compte du patient et ferme ses sessions/)).toHaveTextContent('purge')
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Décision' }), 'APPROVED')
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la décision' }))

  expect(decideDeletion).toHaveBeenCalledWith('p1', 'APPROVED', '')
  expect(await screen.findByRole('status')).toHaveTextContent('le compte est clôturé')
})

test('the 409 of a running retention period is shown and the request stays open', async () => {
  fetchDeletionRequests.mockResolvedValue([{ ...PENDING, retainedUntil: '2046-11-20T00:00:00Z' }])
  decideDeletion.mockRejectedValue(new ApiError(409, 'RETENTION_APPLIES',
    'Le dossier doit être conservé : la durée de conservation n’est pas terminée.'))
  await open()

  expect(screen.getByText(/Conservation prévue jusqu’au/)).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Décision' }), 'APPROVED')
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la décision' }))

  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Nour Synthétique' })).toBeInTheDocument()
})
