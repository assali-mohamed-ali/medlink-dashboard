import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import { ApiError } from '@/shared/api/apiClient'
import { paths } from '@/shared/config/paths'
import * as documentsApi from './api'

vi.mock('@/features/auth/api', () => ({
  changePassword: vi.fn(),
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
vi.mock('./api', () => ({
  PAGE_SIZE: 20,
  MAX_FILE_BYTES: 10 * 1024 * 1024,
  ACCEPTED_TYPES: ['application/pdf', 'image/png', 'image/jpeg'],
  fetchDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
  searchPatients: vi.fn(),
}))

const fetchMe = vi.mocked(authApi.fetchMe)
const fetchDocuments = vi.mocked(documentsApi.fetchDocuments)
const searchPatients = vi.mocked(documentsApi.searchPatients)

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
    user: { id: 'p1', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
}

function renderAt(path: string) {
  render(
    <AuthProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
  fetchDocuments.mockResolvedValue({ items: [], page: 0, size: 20, total: 0 })
  searchPatients.mockResolvedValue([])
})

test('the patient reaches their documents from the menu', async () => {
  loggedInAs('PATIENT')
  renderAt(paths.patient.documents)

  expect(await screen.findByRole('heading', { level: 2, name: 'Mes documents' })).toBeInTheDocument()
  expect(fetchDocuments).toHaveBeenCalledWith('p1', 0)
  const entry = within(screen.getByRole('navigation', { name: 'Menu de l’espace' })).getByRole('link', {
    name: 'Mes documents',
  })
  expect(entry).toHaveAttribute('aria-current', 'page')
})

test('the administrative staff reach the patient documents page from the menu', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt(paths.staff.documents)

  expect(await screen.findByRole('heading', { level: 2, name: 'Documents patients' })).toBeInTheDocument()
  expect(searchPatients).toHaveBeenCalledWith('')
  const entry = within(screen.getByRole('navigation', { name: 'Menu de l’espace' })).getByRole('link', {
    name: 'Documents patients',
  })
  expect(entry).toHaveAttribute('aria-current', 'page')
})

test('a practitioner opening a documents page gets "Accès refusé" and nothing is requested', async () => {
  loggedInAs('PRACTITIONER')
  renderAt(paths.staff.documents)

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(searchPatients).not.toHaveBeenCalled()
})
