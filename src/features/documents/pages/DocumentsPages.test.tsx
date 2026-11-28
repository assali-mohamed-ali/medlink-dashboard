import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { DocumentPage, PatientChoice } from '../types'
import PatientDocumentsPage from './PatientDocumentsPage'
import StaffDocumentsPage from './StaffDocumentsPage'

vi.mock('../api', () => ({
  PAGE_SIZE: 20,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  ACCEPTED_TYPES: ['application/pdf', 'image/png', 'image/jpeg'],
  fetchDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
  searchPatients: vi.fn(),
}))
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'p1', email: 'amel@example.com', firstName: 'Amel', lastName: 'Ben Salah', roles: ['PATIENT'] } }),
}))

const fetchDocuments = vi.mocked(api.fetchDocuments)
const uploadDocument = vi.mocked(api.uploadDocument)
const downloadDocument = vi.mocked(api.downloadDocument)
const searchPatients = vi.mocked(api.searchPatients)

const DOCUMENT = {
  id: 'd1',
  patientId: 'p1',
  uploadedBy: 's1',
  title: 'Compte rendu de consultation',
  originalFilename: 'compte-rendu.pdf',
  contentType: 'application/pdf',
  sizeBytes: 12345,
  createdAt: '2026-11-02T10:15:30Z',
}

const PAGE: DocumentPage = { items: [DOCUMENT], page: 0, size: 20, total: 1 }
const AMEL: PatientChoice = { id: 'p1', firstName: 'Amel', lastName: 'Ben Salah', email: 'amel@example.com' }

beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:document') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  fetchDocuments.mockResolvedValue(PAGE)
  searchPatients.mockResolvedValue([AMEL])
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPatient() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <PatientDocumentsPage />
    </MemoryRouter>,
  )
  return user
}

function renderStaff() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <StaffDocumentsPage />
    </MemoryRouter>,
  )
  return user
}

test('the patient sees their own documents, with no upload form', async () => {
  renderPatient()

  expect(screen.getByRole('heading', { level: 2, name: 'Mes documents' })).toBeInTheDocument()
  const table = await screen.findByRole('table', { name: 'Documents du patient' })
  const row = within(table).getByRole('row', { name: /Compte rendu de consultation/ })
  expect(row).toHaveTextContent('compte-rendu.pdf')
  expect(row).toHaveTextContent('PDF')
  expect(row).toHaveTextContent('12 Ko')
  expect(screen.queryByLabelText('Fichier')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Ajouter le document' })).toBeNull()
  expect(fetchDocuments).toHaveBeenCalledWith('p1', 0)
})

test('the patient downloads a document through the API', async () => {
  downloadDocument.mockResolvedValue({
    blob: new Blob(['%PDF-1.7']),
    filename: 'compte-rendu.pdf',
    contentType: 'application/pdf',
  })
  const user = renderPatient()

  await user.click(await screen.findByRole('button', { name: 'Télécharger Compte rendu de consultation' }))

  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith('p1', 'd1'))
  expect(URL.createObjectURL).toHaveBeenCalled()
})

test('a failed load shows the message and "Réessayer" asks again', async () => {
  fetchDocuments
    .mockRejectedValueOnce(new ApiError(503, 'STORAGE_UNAVAILABLE', 'Le stockage est indisponible.'))
    .mockResolvedValueOnce(PAGE)
  const user = renderPatient()

  expect(await screen.findByRole('alert')).toHaveTextContent('Le stockage est indisponible.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('table', { name: 'Documents du patient' })).toBeInTheDocument()
})

test('staff search a patient, then see and upload that patient documents', async () => {
  uploadDocument.mockResolvedValue(DOCUMENT)
  const user = renderStaff()

  const picker = await screen.findByLabelText('Patient')
  expect(within(picker).getByRole('option', { name: 'Ben Salah Amel · amel@example.com' })).toBeInTheDocument()
  const documents = screen.getByRole('region', { name: 'Documents du patient' })
  expect(within(documents).getByRole('heading', { name: 'Aucun patient sélectionné' })).toBeInTheDocument()
  expect(fetchDocuments).not.toHaveBeenCalled()

  await user.selectOptions(picker, 'p1')
  expect(fetchDocuments).toHaveBeenCalledWith('p1', 0)
  expect(await screen.findByRole('button', { name: 'Ajouter le document' })).toBeInTheDocument()

  await user.type(screen.getByLabelText('Titre'), 'Ordonnance')
  const file = new File(['%PDF-1.7'], 'ordonnance.pdf', { type: 'application/pdf' })
  await user.upload(screen.getByLabelText('Fichier'), file)
  await user.click(screen.getByRole('button', { name: 'Ajouter le document' }))

  await waitFor(() => expect(uploadDocument).toHaveBeenCalledWith('p1', 'Ordonnance', file))
  expect(await screen.findByText('Le document a été ajouté.')).toBeInTheDocument()
})

test('staff cannot add a document without a title or a file', async () => {
  const user = renderStaff()
  await user.selectOptions(await screen.findByLabelText('Patient'), 'p1')

  await user.click(await screen.findByRole('button', { name: 'Ajouter le document' }))
  expect(screen.getByText('Le titre est obligatoire.')).toBeInTheDocument()

  await user.type(screen.getByLabelText('Titre'), 'Ordonnance')
  await user.click(screen.getByRole('button', { name: 'Ajouter le document' }))
  expect(screen.getByText('Choisissez un fichier.')).toBeInTheDocument()
  expect(uploadDocument).not.toHaveBeenCalled()
})
