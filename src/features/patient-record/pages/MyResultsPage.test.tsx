import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import * as api from '../api'
import MyResultsPage from './MyResultsPage'

// US-13: the patient's own results: the new ones marked and counted, the author, the attachment, one page at a time.
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'me', email: 'amel@example.com', firstName: 'Amel', lastName: 'Ben Salah', roles: ['PATIENT'] } }),
}))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchMyResults: vi.fn(),
  downloadResultDocument: vi.fn(),
}))
const fetchMyResults = vi.mocked(api.fetchMyResults)
const downloadResultDocument = vi.mocked(api.downloadResultDocument)

const RESULT: api.ExamResult = {
  id: 'r1', publishedAt: '2026-11-20T09:00:00Z', examDate: '2026-11-18', examType: 'Biologie', documentId: 'd1',
  isNew: true, title: 'Bilan sanguin', content: 'Glycémie normale.', practitioner: { firstName: 'Leila', lastName: 'Ben Ali' },
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('new results are counted and marked, with their author, and the attachment downloads from the patient route', async () => {
  fetchMyResults.mockResolvedValue({ items: [RESULT], page: 0, size: 20, total: 1, unseen: 1 })
  downloadResultDocument.mockResolvedValue({ blob: new Blob(['%PDF']), filename: 'bilan.pdf', contentType: 'application/pdf' })
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  render(<MyResultsPage />)

  expect(await screen.findByText('1 nouveau résultat depuis votre dernière visite.')).toBeInTheDocument()
  expect(screen.getByText('Bilan sanguin · Nouveau')).toBeInTheDocument()
  expect(screen.getByText(/Leila Ben Ali/)).toBeInTheDocument()
  await userEvent.click(screen.getByText('Bilan sanguin · Nouveau'))
  await userEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))

  expect(downloadResultDocument).toHaveBeenCalledWith('me', 'd1')
})

test('a second page is asked for when there are more results than a page', async () => {
  fetchMyResults.mockResolvedValueOnce({ items: [RESULT], page: 0, size: 20, total: 21, unseen: 0 })
  fetchMyResults.mockResolvedValueOnce({ items: [{ ...RESULT, id: 'r21', title: 'Ancien bilan', isNew: false }],
    page: 1, size: 20, total: 21, unseen: 0 })
  render(<MyResultsPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Page suivante' }))

  expect(fetchMyResults).toHaveBeenLastCalledWith(1)
  expect(await screen.findByText('Ancien bilan')).toBeInTheDocument()
  expect(screen.queryByText(/depuis votre dernière visite/)).toBeNull()
})

test('no result yet says so', async () => {
  fetchMyResults.mockResolvedValue({ items: [], page: 0, size: 20, total: 0, unseen: 0 })
  render(<MyResultsPage />)

  expect(await screen.findByText('Aucun résultat publié.')).toBeInTheDocument()
})

test('an unsuccessful results request can be retried without navigating away', async () => {
  fetchMyResults.mockRejectedValueOnce(new Error('Network unavailable'))
  fetchMyResults.mockResolvedValueOnce({ items: [RESULT], page: 0, size: 20, total: 1, unseen: 1 })
  render(<MyResultsPage />)
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByText('Bilan sanguin · Nouveau')).toBeInTheDocument()
  expect(fetchMyResults).toHaveBeenCalledTimes(2)
})
