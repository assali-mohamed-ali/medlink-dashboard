import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import PublishResultForm from './PublishResultForm'

// US-25: review then publish; the attachment is picked from the patient's documents or uploaded here; one request
// id per draft so a retry never publishes twice; a refusal is announced and the draft kept.
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchPublishedResults: vi.fn(),
  fetchPatientFiles: vi.fn(),
  publishResult: vi.fn(),
  uploadPatientFile: vi.fn(),
}))
const fetchPublishedResults = vi.mocked(api.fetchPublishedResults)
const fetchPatientFiles = vi.mocked(api.fetchPatientFiles)
const publishResult = vi.mocked(api.publishResult)
const uploadPatientFile = vi.mocked(api.uploadPatientFile)

const SAVED: api.ExamResult = {
  id: 'r1', publishedAt: '2026-11-20T09:00:00Z', examDate: '2026-11-18', examType: '', documentId: null, isNew: false,
  title: '', content: null, practitioner: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchPublishedResults.mockResolvedValue({ items: [], page: 0, size: 20, total: 0, unseen: 0 })
  fetchPatientFiles.mockResolvedValue({ items: [
    { id: 'd1', title: 'Compte-rendu IRM', originalFilename: 'irm.pdf', createdAt: '2026-11-01T09:00:00Z' },
  ], total: 1 })
})

async function fill() {
  await userEvent.type(screen.getByLabelText('Titre de l’examen'), 'IRM lombaire')
  await userEvent.type(screen.getByLabelText('Type d’examen'), 'Imagerie')
  await userEvent.type(screen.getByLabelText('Date de l’examen'), '2026-11-18')
  await userEvent.type(screen.getByLabelText('Résultat'), 'Pas de hernie.')
}

test('an existing document is picked, the draft is reviewed, and a failed then retried publication keeps one request id', async () => {
  publishResult.mockRejectedValueOnce(new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service indisponible.'))
  publishResult.mockResolvedValueOnce({ ...SAVED, documentId: 'd1' })
  render(<PublishResultForm patientId="p1" />)

  await userEvent.selectOptions(await screen.findByLabelText('Document du patient à joindre (facultatif)'), 'd1')
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Relire le résultat' }))
  expect(screen.getByText('Pièce jointe : Compte-rendu IRM')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la publication' }))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la publication' }))

  expect(await screen.findByRole('status')).toHaveTextContent('Résultat publié')
  const [first, second] = publishResult.mock.calls.map((call) => call[1])
  expect(first.requestId).toBeTruthy()
  expect(second.requestId).toBe(first.requestId)
  expect(second).toMatchObject({ title: 'IRM lombaire', documentId: 'd1' })
  expect(screen.getByText('IRM lombaire · 2026-11-18')).toBeInTheDocument()
})

test('a new file is uploaded once before the publication, which then points at it', async () => {
  uploadPatientFile.mockResolvedValue({ id: 'd9', title: 'IRM lombaire', originalFilename: 'irm.pdf', createdAt: '2026-11-20T09:00:00Z' })
  publishResult.mockResolvedValue({ ...SAVED, documentId: 'd9' })
  render(<PublishResultForm patientId="p1" />)
  await screen.findByLabelText('Document du patient à joindre (facultatif)')

  await fill()
  await userEvent.upload(screen.getByLabelText(/Ou déposer un nouveau fichier/),
    new File(['%PDF-1.7'], 'irm.pdf', { type: 'application/pdf' }))
  await userEvent.click(screen.getByRole('button', { name: 'Relire le résultat' }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirmer la publication' }))

  await screen.findByRole('status')
  expect(uploadPatientFile).toHaveBeenCalledTimes(1)
  expect(uploadPatientFile.mock.calls[0][0]).toBe('p1')
  expect(publishResult.mock.calls[0][1]).toMatchObject({ documentId: 'd9' })
  expect(publishResult.mock.calls[0][1]).not.toHaveProperty('file')
})

test('a title and a result are required before the review', async () => {
  render(<PublishResultForm patientId="p1" />)
  await screen.findByLabelText('Document du patient à joindre (facultatif)')

  await userEvent.click(screen.getByRole('button', { name: 'Relire le résultat' }))

  expect(publishResult).not.toHaveBeenCalled()
})
