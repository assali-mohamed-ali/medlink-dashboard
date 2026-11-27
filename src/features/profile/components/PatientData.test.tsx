import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import PatientData from './PatientData'

// US-16: the patient exports their data and follows their deletion request until staff decide it. One test per state
// the API reports, and the recent-login refusal of the export.
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  deletionRequest: vi.fn(),
  exportPatientData: vi.fn(),
}))
const deletionRequest = vi.mocked(api.deletionRequest)
const exportPatientData = vi.mocked(api.exportPatientData)

const NONE: api.DeletionRequest = { requested: false, status: null, dueAt: null, decisionNote: null }

beforeEach(() => {
  vi.resetAllMocks()
})

test('without a request the patient asks, confirms, and sees it pending with its due date', async () => {
  deletionRequest.mockImplementation(async (method = 'GET') => method === 'POST'
    ? { requested: true, status: 'PENDING', dueAt: '2026-12-27T10:00:00Z', decisionNote: null }
    : NONE)
  render(<PatientData />)

  await userEvent.click(await screen.findByRole('button', { name: 'Demander la suppression' }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la demande' }))

  expect(deletionRequest).toHaveBeenCalledWith('POST')
  expect(await screen.findByText(/en cours de traitement par le personnel administratif/)).toHaveTextContent('27 décembre 2026')
  expect(screen.getByRole('button', { name: 'Retirer la demande' })).toBeInTheDocument()
})

test('a refused request shows the reason staff gave and lets the patient ask again', async () => {
  deletionRequest.mockResolvedValue({
    requested: true, status: 'REJECTED', dueAt: null, decisionNote: 'Dossier à conserver : suivi en cours.',
    decidedAt: '2026-11-20T09:00:00Z',
  })
  render(<PatientData />)

  expect(await screen.findByText('Motif : Dossier à conserver : suivi en cours.')).toBeInTheDocument()
  expect(screen.getByText(/refusée le 20 novembre 2026/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Faire une nouvelle demande' }))
  expect(screen.getByRole('button', { name: 'Confirmer la demande' })).toBeInTheDocument()
})

test('an approved request says the account is closed and the record kept, never that data was erased', async () => {
  deletionRequest.mockResolvedValue({
    requested: true, status: 'APPROVED', dueAt: null, decisionNote: null, decidedAt: '2026-11-21T09:00:00Z',
    accountClosedAt: '2026-11-21T09:00:00Z',
  })
  render(<PatientData />)

  expect(await screen.findByText(/Votre compte est clôturé/)).toHaveTextContent('durée légale')
  expect(screen.queryByText(/supprimées|effacées/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Retirer la demande' })).toBeNull()
})

test('the export asks for a recent login: the API refusal is shown, nothing is downloaded', async () => {
  deletionRequest.mockResolvedValue(NONE)
  exportPatientData.mockRejectedValue(new ApiError(403, 'RECENT_LOGIN_REQUIRED', 'Reconnectez-vous pour continuer.'))
  render(<PatientData />)

  await userEvent.click(await screen.findByRole('button', { name: 'Télécharger mes données' }))

  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('Téléchargement de votre export lancé.')).toBeNull()
})

test('the export lists what it holds, results and attachments included', async () => {
  deletionRequest.mockResolvedValue(NONE)
  render(<PatientData />)

  expect(await screen.findByText(/résultats d’examens/)).toHaveTextContent('pièces jointes des résultats')
})
