import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import PatientDirectoryPage from './PatientDirectoryPage'

// US-22: the practitioner's directory: name or record number, the record number shown, one page at a time.
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  searchPatients: vi.fn(),
}))
const searchPatients = vi.mocked(api.searchPatients)

const AMEL = { id: 'p1', firstName: 'Amel', lastName: 'Ben Salah', recordNumber: 'MED-000042' }

beforeEach(() => {
  vi.resetAllMocks()
})

function renderPage() {
  return render(<MemoryRouter><PatientDirectoryPage /></MemoryRouter>)
}

test('a record number is searched as typed and the patient is shown with it, linking to the record', async () => {
  searchPatients.mockResolvedValue({ items: [], page: 0, size: 20, total: 0 })
  renderPage()
  await screen.findByText('Aucun patient trouvé parmi vos patients.')
  searchPatients.mockResolvedValue({ items: [AMEL], page: 0, size: 20, total: 1 })

  await userEvent.type(screen.getByLabelText('Nom, prénom ou numéro de dossier'), 'MED-000042')
  await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }))

  expect(searchPatients).toHaveBeenLastCalledWith('MED-000042', 0)
  expect(await screen.findByRole('link', { name: 'Amel Ben Salah' })).toHaveAttribute('href', '/praticien/patients/p1')
  expect(screen.getByText(/Dossier MED-000042/)).toBeInTheDocument()
})

test('more patients than a page: the total is said and the next page is asked for', async () => {
  searchPatients.mockResolvedValueOnce({ items: [AMEL], page: 0, size: 20, total: 25 })
  searchPatients.mockResolvedValueOnce({ items: [{ ...AMEL, id: 'p21', firstName: 'Zied' }], page: 1, size: 20, total: 25 })
  renderPage()

  expect(await screen.findByText('25 patients trouvés')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Page précédente' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }))

  expect(searchPatients).toHaveBeenLastCalledWith('', 1)
  expect(await screen.findByRole('link', { name: 'Zied Ben Salah' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Page suivante' })).toBeDisabled()
})

test('a refused search is announced', async () => {
  searchPatients.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.'))
  renderPage()

  expect(await screen.findByRole('alert')).toBeInTheDocument()
})
